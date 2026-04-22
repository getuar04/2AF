import { LoginPolicy } from "../../domain/auth/loginPolicy";
import { LoginUserInputDto, LoginUserOutputDto } from "../dtos/authDtos";
import { AppError } from "../errors/appError";
import { UserLoggedInEvent } from "../events/userLoggedInEvent";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { CacheProvider } from "../ports/cacheProvider";
import { EventBus } from "../ports/eventBus";
import { IdGenerator } from "../ports/idGenerator";
import { PasswordHasher } from "../ports/passwordHasher";
import { TokenProvider } from "../ports/tokenProvider";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";
import { AuthService } from "../services/authService";
import { LoginChallengeService } from "../services/loginChallengeService";

export class LoginUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenProvider: TokenProvider,
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator,
    private readonly loginChallengeTtlSeconds: number
  ) {}

  async execute(input: LoginUserInputDto): Promise<LoginUserOutputDto> {
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    LoginPolicy.validateEmail(email);
    LoginPolicy.validatePassword(password);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (user.isTwoFactorEnabled) {
      const challengeId = this.idGenerator.generate();
      const cacheKey = AuthService.buildLoginChallengeCacheKey(challengeId);
      const serialized = LoginChallengeService.serialize({
        challengeId,
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString()
      });
      await this.cacheProvider.set(cacheKey, serialized, { ttlSeconds: this.loginChallengeTtlSeconds });
      return {
        status: "REQUIRE_2FA",
        challengeId,
        userId: user.id,
        email: user.email,
        message: "Two-factor authentication is required"
      };
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = await this.tokenProvider.generateAccessToken(tokenPayload);
    const refreshToken = await this.tokenProvider.generateRefreshToken(tokenPayload);

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "LOGIN",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ viaTwoFactor: false, role: user.role }),
      createdAt: new Date()
    });

    const event: UserLoggedInEvent = {
      eventName: "user.logged_in",
      payload: { userId: user.id, email: user.email, loggedInAt: new Date().toISOString(), viaTwoFactor: false }
    };
    await this.eventBus.publish(event);

    return { status: "SUCCESS", accessToken, refreshToken };
  }
}
