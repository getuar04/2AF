import { RefreshTokenOutputDto } from "../dtos/authDtos";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { CacheProvider } from "../ports/cacheProvider";
import { IdGenerator } from "../ports/idGenerator";
import { TokenProvider } from "../ports/tokenProvider";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";
import { AppError } from "../errors/appError";

export class RefreshToken {
  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly userRepository: UserRepository,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly idGenerator: IdGenerator,
    private readonly cacheProvider: CacheProvider,
    private readonly refreshTokenTtlSeconds: number = 7 * 24 * 60 * 60,
  ) {}

  async execute(
    refreshToken: string,
  ): Promise<RefreshTokenOutputDto & { newRefreshToken: string }> {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400, "REFRESH_TOKEN_REQUIRED");
    }

    // Kontrollo blacklist (token i përdorur më parë)
    const blacklistKey = `auth:refresh:blacklist:${refreshToken}`;
    const isBlacklisted = await this.cacheProvider.get(blacklistKey);
    if (isBlacklisted) {
      throw new AppError("Refresh token has already been used", 401, "REFRESH_TOKEN_REUSED");
    }

    const payload = await this.tokenProvider.verifyRefreshToken(refreshToken);

    // Kontrollo session generation — logout nga të gjitha pajisjet
    const generationKey = `auth:session:generation:${payload.userId}`;
    const currentGeneration = await this.cacheProvider.get(generationKey);
    if (currentGeneration) {
      const tokenIssuedAt = (payload as { iat?: number }).iat ?? 0;
      const generationTime = parseInt(currentGeneration, 10);
      if (tokenIssuedAt * 1000 < generationTime) {
        throw new AppError("Session has been invalidated", 401, "SESSION_INVALIDATED");
      }
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Gjenero tokenat e rinj
    const accessToken = await this.tokenProvider.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = await this.tokenProvider.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Vendos token-in e vjetër në blacklist
    await this.cacheProvider.set(blacklistKey, "1", {
      ttlSeconds: this.refreshTokenTtlSeconds,
    });

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "REFRESH_TOKEN",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ role: user.role, rotation: true }),
      createdAt: new Date(),
    });

    return { accessToken, newRefreshToken };
  }
}