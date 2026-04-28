import { AppError } from "../errors/appError";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { CacheProvider } from "../ports/cacheProvider";
import { EventBus } from "../ports/eventBus";
import { IdGenerator } from "../ports/idGenerator";
import { PasswordHasher } from "../ports/passwordHasher";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";

export interface DisableTwoFactorInput {
  userId: string;
  password: string;
}

export interface DisableTwoFactorOutput {
  message: string;
  isTwoFactorEnabled: false;
}

export class DisableTwoFactor {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: DisableTwoFactorInput): Promise<DisableTwoFactorOutput> {
    const { userId, password } = input;

    if (!userId) {
      throw new AppError("userId is required", 400, "USER_ID_REQUIRED");
    }

    if (!password) {
      throw new AppError(
        "Password is required to disable 2FA",
        400,
        "PASSWORD_REQUIRED",
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.isTwoFactorEnabled) {
      throw new AppError(
        "2FA is not enabled for this user",
        400,
        "TWO_FACTOR_NOT_ENABLED",
      );
    }

    // Verifiko passwordin para çaktivizimit — siguri shtesë
    const isPasswordValid = await this.passwordHasher.compare(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.authAuditRepository.create({
        id: this.idGenerator.generate(),
        userId: user.id,
        email: user.email,
        action: "DISABLE_2FA",
        status: "FAILED",
        reason: "Invalid password",
        metadata: AuditService.buildMetadata({}),
        createdAt: new Date(),
      });
      throw new AppError("Invalid password", 401, "INVALID_PASSWORD");
    }

    // Çaktivizo 2FA në databazë
    await this.userRepository.disableTwoFactor(userId);

    // Fshi çdo cache setup 2FA aktiv për këtë user
    await this.cacheProvider.deleteByPrefix(`auth:2fa:setup:${userId}:`);

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "DISABLE_2FA",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ role: user.role }),
      createdAt: new Date(),
    });

    await this.eventBus.publish({
      userId: user.id,
      email: user.email,
      disabledAt: new Date().toISOString(),
    } as any);

    return {
      message: "Two-factor authentication disabled successfully",
      isTwoFactorEnabled: false,
    };
  }
}
