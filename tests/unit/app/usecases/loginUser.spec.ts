import { LoginUser } from "../../../../src/app/usecases/loginUser";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { TokenProvider } from "../../../../src/app/ports/tokenProvider";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("LoginUser", () => {
  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
disableTwoFactor: jest.fn(),
  };
  const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const mockTokenProvider: jest.Mocked<TokenProvider> = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
  const mockCacheProvider: jest.Mocked<CacheProvider> = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
deleteByPrefix: jest.fn(),
  };
  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const mockEventBus: jest.Mocked<EventBus> = { publish: jest.fn() };
  const mockIdGenerator: jest.Mocked<IdGenerator> = { generate: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it("should return accessToken and refreshToken when 2FA is disabled", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Getuar",
      email: "getuar@test.ts",
      passwordHash: "hashed-password",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPasswordHasher.compare.mockResolvedValue(true);
    mockTokenProvider.generateAccessToken.mockResolvedValue("access-jwt");
    mockTokenProvider.generateRefreshToken.mockResolvedValue("refresh-jwt");
    mockIdGenerator.generate.mockReturnValue("audit-id");

    const useCase = new LoginUser(
      mockUserRepository,
      mockPasswordHasher,
      mockTokenProvider,
      mockCacheProvider,
      mockAuditRepository,
      mockEventBus,
      mockIdGenerator,
      300,
    );

    const { output, refreshToken } = await useCase.execute({
      email: "getuar@test.ts",
      password: "12345678",
    });

    expect(output).toEqual({ status: "SUCCESS", accessToken: "access-jwt" });
    expect(refreshToken).toBe("refresh-jwt");
    expect(mockTokenProvider.generateRefreshToken).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "user.logged_in" }),
    );
  });

  it("should require 2FA when enabled", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Getuar",
      email: "getuar@test.ts",
      passwordHash: "hashed-password",
      role: "user",
      isTwoFactorEnabled: true,
      twoFactorSecret: "SECRET",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPasswordHasher.compare.mockResolvedValue(true);
    mockIdGenerator.generate
      .mockReturnValueOnce("challenge-id")
      .mockReturnValueOnce("audit-id");

    const useCase = new LoginUser(
      mockUserRepository,
      mockPasswordHasher,
      mockTokenProvider,
      mockCacheProvider,
      mockAuditRepository,
      mockEventBus,
      mockIdGenerator,
      300,
    );

    const { output } = await useCase.execute({
      email: "getuar@test.ts",
      password: "12345678",
    });

    expect(output).toEqual({
      status: "REQUIRE_2FA",
      challengeId: "challenge-id",
      userId: "user-1",
      email: "getuar@test.ts",
      message: "Two-factor authentication is required",
    });
    expect(mockCacheProvider.set).toHaveBeenCalled();
  });
});
