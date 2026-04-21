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
  };

  const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockTokenProvider: jest.Mocked<TokenProvider> = {
    generateAccessToken: jest.fn(),
  };

  const mockCacheProvider: jest.Mocked<CacheProvider> = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn(),
  };

  const mockEventBus: jest.Mocked<EventBus> = {
    publish: jest.fn(),
  };

  const mockIdGenerator: jest.Mocked<IdGenerator> = {
    generate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return token when 2FA is disabled", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Getuar",
      email: "getaur@test.ts",
      passwordHash: "hashed-password",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPasswordHasher.compare.mockResolvedValue(true);
    mockTokenProvider.generateAccessToken.mockResolvedValue("jwt-token");
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

    const result = await useCase.execute({
      email: "getaur@test.ts",
      password: "12345678",
    });

    expect(result).toEqual({
      status: "SUCCESS",
      accessToken: "jwt-token",
    });

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "user.logged_in",
      }),
    );
  });

  it("should require 2FA when enabled", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Getuar",
      email: "getaur@test.ts",
      passwordHash: "hashed-password",
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

    const result = await useCase.execute({
      email: "getaur@test.ts",
      password: "12345678",
    });

    expect(result).toEqual({
      status: "REQUIRE_2FA",
      challengeId: "challenge-id",
      userId: "user-1",
      email: "getaur@test.ts",
      message: "Two-factor authentication is required",
    });

    expect(mockCacheProvider.set).toHaveBeenCalled();
  });
});
