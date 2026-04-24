import { CacheProvider } from "../ports/cacheProvider";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { IdGenerator } from "../ports/idGenerator";
import { AppError } from "../errors/appError";

export class LogoutUser {
  constructor(
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly idGenerator: IdGenerator,
    private readonly accessTokenTtlSeconds: number = 900
  ) {}

  async execute(userId: string, email: string, accessToken: string): Promise<{ message: string }> {
    if (!accessToken) {
      throw new AppError("Access token is required", 400, "TOKEN_REQUIRED");
    }

    // Vendos accessToken ne blacklist deri sa skadon
    const blacklistKey = `auth:blacklist:${accessToken}`;
    await this.cacheProvider.set(blacklistKey, "1", { ttlSeconds: this.accessTokenTtlSeconds });

    // Fshi refresh token cookie duke i vendosur vlere bosh (behet ne controller)

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId,
      email,
      action: "LOGOUT",
      status: "SUCCESS",
      createdAt: new Date()
    });

    return { message: "Logged out successfully" };
  }
}
