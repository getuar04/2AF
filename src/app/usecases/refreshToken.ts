import { RefreshTokenInputDto, RefreshTokenOutputDto } from "../dtos/authDtos";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { IdGenerator } from "../ports/idGenerator";
import { TokenProvider } from "../ports/tokenProvider";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";

export class RefreshToken {
  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly userRepository: UserRepository,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(input: RefreshTokenInputDto): Promise<RefreshTokenOutputDto> {
    const payload = await this.tokenProvider.verifyRefreshToken(input.refreshToken);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const accessToken = await this.tokenProvider.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      email: user.email,
      action: "REFRESH_TOKEN",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ role: user.role }),
      createdAt: new Date()
    });

    return { accessToken };
  }
}
