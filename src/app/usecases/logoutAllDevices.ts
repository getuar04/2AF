import { CacheProvider } from "../ports/cacheProvider";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { IdGenerator } from "../ports/idGenerator";
import { AppError } from "../errors/appError";

export class LogoutAllDevices {
  constructor(
    private readonly cacheProvider: CacheProvider,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(userId: string, email: string): Promise<{ message: string }> {
    if (!userId) {
      throw new AppError("userId is required", 400, "USER_ID_REQUIRED");
    }

    // Vendos një "generation" të re — të gjitha refresh tokens të vjetra bëhen invalid
    const generationKey = `auth:session:generation:${userId}`;
    const newGeneration = Date.now().toString();
    await this.cacheProvider.set(generationKey, newGeneration, {
      ttlSeconds: 7 * 24 * 60 * 60, // 7 ditë
    });

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId,
      email,
      action: "LOGOUT_ALL_DEVICES",
      status: "SUCCESS",
      createdAt: new Date(),
    });

    return { message: "Logged out from all devices successfully" };
  }
}