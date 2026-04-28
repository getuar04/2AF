import { DisableTwoFactor } from "../../../../src/app/usecases/disableTwoFactor";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";
import { User } from "../../../../src/app/types/auth";

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  fullName: "Test User",
  email: "test@test.com",
  passwordHash: "hashed-pw",
  role: "user",
  isTwoFactorEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("DisableTwoFactor", () => {
  const mockUserRepo: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn().mockResolvedValue(undefined),
  };

  const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockCache: jest.Mocked<CacheProvider> = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  const mockAudit: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
  };

  const mockEventBus: jest.Mocked<EventBus> = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockIdGen: jest.Mocked<IdGenerator> = {
    generate: jest.fn().mockReturnValue("id-1"),
  };

  const makeUseCase = () =>
    new DisableTwoFactor(
      mockUserRepo,
      mockPasswordHasher,
      mockCache,
      mockAudit,
      mockEventBus,
      mockIdGen,
    );

  beforeEach(() => jest.clearAllMocks());

  it("throws USER_ID_REQUIRED when userId is empty", async () => {
    await expect(
      makeUseCase().execute({ userId: "", password: "pass" }),
    ).rejects.toMatchObject({ code: "USER_ID_REQUIRED" });
  });

  it("throws PASSWORD_REQUIRED when password is empty", async () => {
    await expect(
      makeUseCase().execute({ userId: "user-1", password: "" }),
    ).rejects.toMatchObject({ code: "PASSWORD_REQUIRED" });
  });

  it("throws USER_NOT_FOUND when user does not exist", async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(
      makeUseCase().execute({ userId: "ghost", password: "pw" }),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("throws TWO_FACTOR_NOT_ENABLED when 2FA is already off", async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser({ isTwoFactorEnabled: false }));

    await expect(
      makeUseCase().execute({ userId: "user-1", password: "pw" }),
    ).rejects.toMatchObject({ code: "TWO_FACTOR_NOT_ENABLED" });
  });

  it("throws INVALID_PASSWORD and logs audit FAILED when password is wrong", async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser());
    mockPasswordHasher.compare.mockResolvedValue(false);

    await expect(
      makeUseCase().execute({ userId: "user-1", password: "wrong" }),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD" });

    expect(mockAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DISABLE_2FA", status: "FAILED" }),
    );
  });

  it("disables 2FA, cleans cache, logs audit SUCCESS and publishes event on success", async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser());
    mockPasswordHasher.compare.mockResolvedValue(true);

    const result = await makeUseCase().execute({ userId: "user-1", password: "correct" });

    expect(mockUserRepo.disableTwoFactor).toHaveBeenCalledWith("user-1");
    expect(mockCache.deleteByPrefix).toHaveBeenCalledWith("auth:2fa:setup:user-1:");
    expect(mockAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DISABLE_2FA", status: "SUCCESS" }),
    );
    expect(mockEventBus.publish).toHaveBeenCalled();
    expect(result.isTwoFactorEnabled).toBe(false);
    expect(result.message).toBeTruthy();
  });
});
