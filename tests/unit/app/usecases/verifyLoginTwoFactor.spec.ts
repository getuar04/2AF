import { VerifyLoginTwoFactor } from "../../../../src/app/usecases/verifyLoginTwoFactor";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { TwoFactorProvider } from "../../../../src/app/ports/twoFactorProvider";
import { TokenProvider } from "../../../../src/app/ports/tokenProvider";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";
import { User } from "../../../../src/app/types/auth";

const CHALLENGE_KEY = "auth:login:challenge:challenge-abc";

const serializedChallenge = JSON.stringify({
  userId: "user-1",
  email: "test@test.com",
  role: "user",
});

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  fullName: "Test",
  email: "test@test.com",
  passwordHash: "hash",
  role: "user",
  isTwoFactorEnabled: true,
  twoFactorSecret: "SECRET",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("VerifyLoginTwoFactor", () => {
  const mockUserRepo: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
  };

  const mock2FA: jest.Mocked<TwoFactorProvider> = {
    generateSecret: jest.fn(),
    verifyCode: jest.fn(),
  };

  const mockTokenProvider: jest.Mocked<TokenProvider> = {
    generateAccessToken: jest.fn().mockResolvedValue("access-token"),
    generateRefreshToken: jest.fn().mockResolvedValue("refresh-token"),
    verifyRefreshToken: jest.fn(),
  };

  const mockCache: jest.Mocked<CacheProvider> = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByPrefix: jest.fn(),
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
    new VerifyLoginTwoFactor(
      mockUserRepo,
      mock2FA,
      mockTokenProvider,
      mockCache,
      mockAudit,
      mockEventBus,
      mockIdGen,
    );

  const validInput = {
    email: "test@test.com",
    code: "123456",
    challengeId: "challenge-abc",
  };

  beforeEach(() => jest.clearAllMocks());

  it("throws LOGIN_CHALLENGE_EXPIRED when challenge not in cache", async () => {
    mockCache.get.mockResolvedValue(null);

    await expect(makeUseCase().execute(validInput)).rejects.toMatchObject({
      code: "LOGIN_CHALLENGE_EXPIRED",
    });
  });

  it("throws CHALLENGE_EMAIL_MISMATCH when email does not match challenge", async () => {
    mockCache.get.mockResolvedValue(
      JSON.stringify({ userId: "u1", email: "other@test.com", role: "user" }),
    );

    await expect(makeUseCase().execute(validInput)).rejects.toMatchObject({
      code: "CHALLENGE_EMAIL_MISMATCH",
    });
  });

  it("throws USER_NOT_FOUND when user does not exist in DB", async () => {
    mockCache.get.mockResolvedValue(serializedChallenge);
    mockUserRepo.findByEmail.mockResolvedValue(null);

    await expect(makeUseCase().execute(validInput)).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("throws TWO_FACTOR_NOT_ENABLED when user has no secret", async () => {
    mockCache.get.mockResolvedValue(serializedChallenge);
    mockUserRepo.findByEmail.mockResolvedValue(
      makeUser({ isTwoFactorEnabled: false, twoFactorSecret: undefined }),
    );

    await expect(makeUseCase().execute(validInput)).rejects.toMatchObject({
      code: "TWO_FACTOR_NOT_ENABLED",
    });
  });

  it("throws INVALID_2FA_CODE when code is wrong", async () => {
    mockCache.get.mockResolvedValue(serializedChallenge);
    mockUserRepo.findByEmail.mockResolvedValue(makeUser());
    mock2FA.verifyCode.mockReturnValue(false);

    await expect(makeUseCase().execute(validInput)).rejects.toMatchObject({
      code: "INVALID_2FA_CODE",
    });
  });

  it("returns tokens, deletes challenge and publishes event on success", async () => {
    mockCache.get.mockResolvedValue(serializedChallenge);
    mockUserRepo.findByEmail.mockResolvedValue(makeUser());
    mock2FA.verifyCode.mockReturnValue(true);

    const result = await makeUseCase().execute(validInput);

    expect(result.output.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(mockCache.delete).toHaveBeenCalled();
    expect(mockAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VERIFY_LOGIN_2FA", status: "SUCCESS" }),
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "user.logged_in" }),
    );
  });
});
