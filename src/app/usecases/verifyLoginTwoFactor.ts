import { TwoFactorPolicy } from "../../domain/auth/twoFactorPolicy";
import { VerifyLoginTwoFactorInputDto, VerifyLoginTwoFactorOutputDto } from "../dtos/authDtos";
import { AppError } from "../errors/appError";
import { UserLoggedInEvent } from "../events/userLoggedInEvent";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { CacheProvider } from "../ports/cacheProvider";
import { EventBus } from "../ports/eventBus";
import { IdGenerator } from "../ports/idGenerator";
import { TokenProvider } from "../ports/tokenProvider";
import { TwoFactorProvider } from "../ports/twoFactorProvider";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";
import { AuthService } from "../services/authService";
import { LoginChallengeService } from "../services/loginChallengeService";

export class VerifyLoginTwoFactor {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly twoFactorProvider: TwoFactorProvider,
    private readonly tokenProvider: TokenProvider,
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(input: VerifyLoginTwoFactorInputDto): Promise<VerifyLoginTwoFactorOutputDto> {
    const email = input.email.trim().toLowerCase();
    const code = input.code.trim();
    const challengeId = input.challengeId.trim();

    TwoFactorPolicy.validateCode(code);
    TwoFactorPolicy.validateChallengeId(challengeId);

    const cacheKey = AuthService.buildLoginChallengeCacheKey(challengeId);
    const serializedChallenge = await this.cacheProvider.get(cacheKey);
    if (!serializedChallenge) {
      throw new AppError("Login challenge expired or not found", 400, "LOGIN_CHALLENGE_EXPIRED");
    }

    const challenge = LoginChallengeService.deserialize(serializedChallenge);
    if (challenge.email !== email) {
      throw new AppError("Challenge does not match the provided email", 400, "CHALLENGE_EMAIL_MISMATCH");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError("Two-factor authentication is not enabled", 400, "TWO_FACTOR_NOT_ENABLED");
    }

    const isValid = this.twoFactorProvider.verifyCode(user.twoFactorSecret, code);
    if (!isValid) {
      throw new AppError("Invalid 2FA code", 401, "INVALID_2FA_CODE");
    }

    const accessToken = await this.tokenProvider.generateAccessToken({ userId: user.id, email: user.email });
    await this.cacheProvider.delete(cacheKey);
    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "VERIFY_LOGIN_2FA",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ viaTwoFactor: true, challengeId }),
      createdAt: new Date()
    });
    const event: UserLoggedInEvent = {
      eventName: "user.logged_in",
      payload: { userId: user.id, email: user.email, loggedInAt: new Date().toISOString(), viaTwoFactor: true }
    };
    await this.eventBus.publish(event);
    return { accessToken };
  }
}
