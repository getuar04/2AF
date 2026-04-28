import { LoginUser } from "../../../../src/app/usecases/loginUser";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { TokenProvider } from "../../../../src/app/ports/tokenProvider";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";
import { AppError } from "../../../../src/app/errors/appError";

describe("LoginUser - error cases", () => {
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
  const mockIdGenerator: jest.Mocked<IdGenerator> = {
    generate: jest.fn().mockReturnValue("id"),
  };

  const makeUseCase = () =>
    new LoginUser(
      mockUserRepository,
      mockPasswordHasher,
      mockTokenProvider,
      mockCacheProvider,
      mockAuditRepository,
      mockEventBus,
      mockIdGenerator,
      300,
    );

  beforeEach(() => jest.clearAllMocks());

  it("should throw INVALID_CREDENTIALS when user not found", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    try {
      await makeUseCase().execute({
        email: "notfound@test.com",
        password: "Password123",
      });
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("INVALID_CREDENTIALS");
      expect((e as AppError).statusCode).toBe(401);
    }
  });

  it("should throw INVALID_CREDENTIALS when password is wrong", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Test",
      email: "user@test.com",
      passwordHash: "hash",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPasswordHasher.compare.mockResolvedValue(false);
    try {
      await makeUseCase().execute({
        email: "user@test.com",
        password: "wrongpassword",
      });
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("should throw INVALID_EMAIL for bad email format", async () => {
    await expect(
      makeUseCase().execute({ email: "bademail", password: "Password123" }),
    ).rejects.toThrow(AppError);
  });

  it("should throw PASSWORD_REQUIRED for empty password", async () => {
    await expect(
      makeUseCase().execute({ email: "user@test.com", password: "" }),
    ).rejects.toThrow(AppError);
  });

  it("should not call token provider when credentials are invalid", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    try {
      await makeUseCase().execute({
        email: "bad@test.com",
        password: "Pass123",
      });
    } catch {}
    expect(mockTokenProvider.generateAccessToken).not.toHaveBeenCalled();
    expect(mockTokenProvider.generateRefreshToken).not.toHaveBeenCalled();
  });

  it("should not publish event when login fails", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    try {
      await makeUseCase().execute({
        email: "bad@test.com",
        password: "Pass123",
      });
    } catch {}
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it("should cache challenge when 2FA is required", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      fullName: "Test",
      email: "user@test.com",
      passwordHash: "hash",
      role: "user",
      isTwoFactorEnabled: true,
      twoFactorSecret: "SECRET",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPasswordHasher.compare.mockResolvedValue(true);
    mockIdGenerator.generate.mockReturnValueOnce("challenge-id");

    const { output } = await makeUseCase().execute({
      email: "user@test.com",
      password: "Password123",
    });

    expect(output.status).toBe("REQUIRE_2FA");
    expect(mockCacheProvider.set).toHaveBeenCalledWith(
      expect.stringContaining("challenge-id"),
      expect.any(String),
      expect.objectContaining({ ttlSeconds: 300 }),
    );
  });
});
