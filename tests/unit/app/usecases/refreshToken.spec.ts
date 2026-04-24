import { RefreshToken } from "../../../../src/app/usecases/refreshToken";
import { TokenProvider } from "../../../../src/app/ports/tokenProvider";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("RefreshToken", () => {
  const mockTokenProvider: jest.Mocked<TokenProvider> = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
  };
  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const mockIdGenerator: jest.Mocked<IdGenerator> = {
    generate: jest.fn().mockReturnValue("audit-id"),
  };

  const makeUseCase = () => new RefreshToken(
    mockTokenProvider, mockUserRepository, mockAuditRepository, mockIdGenerator
  );

  beforeEach(() => jest.clearAllMocks());

  it("should return new accessToken with valid refresh token", async () => {
    mockTokenProvider.verifyRefreshToken.mockResolvedValue({
      userId: "user-1", email: "user@test.com", role: "user"
    });
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1", fullName: "Test", email: "user@test.com",
      passwordHash: "hash", role: "user", isTwoFactorEnabled: false,
      createdAt: new Date(), updatedAt: new Date(),
    });
    mockTokenProvider.generateAccessToken.mockResolvedValue("new-access-token");

    const result = await makeUseCase().execute("valid-refresh-token");

    expect(result.accessToken).toBe("new-access-token");
    expect(mockTokenProvider.generateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", email: "user@test.com", role: "user" })
    );
  });

  it("should save audit log on successful refresh", async () => {
    mockTokenProvider.verifyRefreshToken.mockResolvedValue({
      userId: "user-1", email: "user@test.com", role: "user"
    });
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1", fullName: "Test", email: "user@test.com",
      passwordHash: "hash", role: "user", isTwoFactorEnabled: false,
      createdAt: new Date(), updatedAt: new Date(),
    });
    mockTokenProvider.generateAccessToken.mockResolvedValue("new-access-token");

    await makeUseCase().execute("valid-refresh-token");

    expect(mockAuditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REFRESH_TOKEN", status: "SUCCESS" })
    );
  });

  it("should throw when refresh token is invalid", async () => {
    mockTokenProvider.verifyRefreshToken.mockRejectedValue(new Error("Invalid token"));

    await expect(makeUseCase().execute("bad-token"))
      .rejects.toThrow("Invalid token");
  });

  it("should throw when user not found", async () => {
    mockTokenProvider.verifyRefreshToken.mockResolvedValue({
      userId: "ghost-id", email: "ghost@test.com", role: "user"
    });
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(makeUseCase().execute("valid-token"))
      .rejects.toThrow();
  });

  it("should not generate access token when user not found", async () => {
    mockTokenProvider.verifyRefreshToken.mockResolvedValue({
      userId: "ghost-id", email: "ghost@test.com", role: "user"
    });
    mockUserRepository.findById.mockResolvedValue(null);

    try { await makeUseCase().execute("valid-token"); } catch {}

    expect(mockTokenProvider.generateAccessToken).not.toHaveBeenCalled();
  });

  it("should throw REFRESH_TOKEN_REQUIRED when token is empty", async () => {
    await expect(makeUseCase().execute(""))
      .rejects.toThrow();
  });
});
