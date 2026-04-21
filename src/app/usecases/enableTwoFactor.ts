import { TwoFactorPolicy } from "../../domain/auth/twoFactorPolicy";
import {
  EnableTwoFactorConfirmInputDto,
  EnableTwoFactorConfirmOutputDto,
  EnableTwoFactorInitInputDto,
  EnableTwoFactorInitOutputDto,
} from "../dtos/authDtos";
import { AppError } from "../errors/appError";
import { TwoFactorEnabledEvent } from "../events/twoFactorEnabledEvent";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { CacheProvider } from "../ports/cacheProvider";
import { EventBus } from "../ports/eventBus";
import { IdGenerator } from "../ports/idGenerator";
import { QRCodeProvider } from "../ports/qrCodeProvider";
import { TwoFactorProvider } from "../ports/twoFactorProvider";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";
import { AuthService } from "../services/authService";

export class EnableTwoFactor {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly twoFactorProvider: TwoFactorProvider,
    private readonly qrCodeProvider: QRCodeProvider,
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator,
    private readonly setupTtlSeconds: number,
  ) {}

  async init(
    input: EnableTwoFactorInitInputDto,
  ): Promise<EnableTwoFactorInitOutputDto> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    if (user.isTwoFactorEnabled) {
      throw new AppError(
        "Two-factor authentication is already enabled",
        400,
        "TWO_FACTOR_ALREADY_ENABLED",
      );
    }

    const generatedSecret = this.twoFactorProvider.generateSecret({
      label: user.email,
      issuer: "Authentication Service",
    });

    const setupToken = this.idGenerator.generate();
    const cacheKey = AuthService.buildTwoFactorSetupCacheKey(
      user.id,
      setupToken,
    );
    await this.cacheProvider.set(cacheKey, generatedSecret.base32, {
      ttlSeconds: this.setupTtlSeconds,
    });
    const qrCodeDataUrl = await this.qrCodeProvider.generateDataUrl(
      generatedSecret.otpauthUrl,
    );

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "ENABLE_2FA_INIT",
      status: "INFO",
      metadata: AuditService.buildMetadata({ setupToken }),
      createdAt: new Date(),
    });

    return {
      qrCodeDataUrl,
      manualEntryKey: generatedSecret.base32,
      setupToken,
    };
  }

  async confirm(
    input: EnableTwoFactorConfirmInputDto,
  ): Promise<EnableTwoFactorConfirmOutputDto> {
    TwoFactorPolicy.validateCode(input.code);
    TwoFactorPolicy.validateSetupToken(input.setupToken);

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const cacheKey = AuthService.buildTwoFactorSetupCacheKey(
      user.id,
      input.setupToken,
    );
    console.log("🧺 cacheKey:", cacheKey);
    const pendingSecret = await this.cacheProvider.get(cacheKey);
console.log('🦃 pendingSecret:', pendingSecret);
    if (!pendingSecret) {
      throw new AppError(
        "2FA setup session expired or not found",
        400,
        "SETUP_SESSION_EXPIRED",
      );
    }

    const isValid = this.twoFactorProvider.verifyCode(
      pendingSecret,
      input.code,
    );
    if (!isValid) {
      throw new AppError("Invalid 2FA code", 401, "INVALID_2FA_CODE");
    }

    await this.userRepository.enableTwoFactor({
      userId: user.id,
      secret: pendingSecret,
    });
    await this.cacheProvider.delete(cacheKey);

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "ENABLE_2FA_CONFIRM",
      status: "SUCCESS",
      createdAt: new Date(),
    });

    const event: TwoFactorEnabledEvent = {
      eventName: "user.two_factor_enabled",
      payload: {
        userId: user.id,
        email: user.email,
        enabledAt: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);

    return {
      message: "Two-factor authentication enabled successfully",
      isTwoFactorEnabled: true,
    };
  }
}
