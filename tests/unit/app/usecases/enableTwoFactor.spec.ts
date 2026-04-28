import { EnableTwoFactor } from "../../../../src/app/usecases/enableTwoFactor";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { TwoFactorProvider } from "../../../../src/app/ports/twoFactorProvider";
import { QRCodeProvider } from "../../../../src/app/ports/qrCodeProvider";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";
import { User } from "../../../../src/app/types/auth";

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  fullName: "Test",
  email: "test@test.com",
  passwordHash: "hash",
  role: "user",
  isTwoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("EnableTwoFactor", () => {
  const mockUserRepo: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn().mockResolvedValue(undefined),
    disableTwoFactor: jest.fn(),
  };

  const mock2FA: jest.Mocked<TwoFactorProvider> = {
    generateSecret: jest.fn().mockReturnValue({
      base32: "GENERATED_SECRET",
      otpauthUrl: "otpauth://totp/test",
    }),
    verifyCode: jest.fn(),
  };

  const mockQrCode: jest.Mocked<QRCodeProvider> = {
    generateDataUrl: jest.fn().mockResolvedValue("data:image/png;base64,QR"),
  };

  const mockCache: jest.Mocked<CacheProvider> = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
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
    new EnableTwoFactor(
      mockUserRepo,
      mock2FA,
      mockQrCode,
      mockCache,
      mockAudit,
      mockEventBus,
      mockIdGen,
      300,
    );

  beforeEach(() => jest.clearAllMocks());

  // ── INIT ──────────────────────────────────────────────────────────────
  describe("init (enableTwoFactorInit)", () => {
    it("throws USER_NOT_FOUND when user does not exist", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        makeUseCase().init({ userId: "ghost" }),
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });

    it("throws TWO_FACTOR_ALREADY_ENABLED when 2FA is already on", async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser({ isTwoFactorEnabled: true }));

      await expect(
        makeUseCase().init({ userId: "user-1" }),
      ).rejects.toMatchObject({ code: "TWO_FACTOR_ALREADY_ENABLED" });
    });

    it("returns qrCode, manualEntryKey and setupToken on success", async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());

      const result = await makeUseCase().init({ userId: "user-1" });

      expect(result.qrCodeDataUrl).toContain("data:image");
      expect(result.manualEntryKey).toBe("GENERATED_SECRET");
      expect(result.setupToken).toBeTruthy();
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ENABLE_2FA_INIT", status: "INFO" }),
      );
    });
  });

  // ── CONFIRM ───────────────────────────────────────────────────────────
  describe("confirm (enableTwoFactorConfirm)", () => {
    const validInput = {
      userId: "user-1",
      code: "123456",
      setupToken: "setup-token-abc",
    };

    it("throws USER_NOT_FOUND when user does not exist", async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      mockCache.get.mockResolvedValue(null);

      await expect(makeUseCase().confirm(validInput)).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("throws SETUP_SESSION_EXPIRED when cache returns null", async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCache.get.mockResolvedValue(null);

      await expect(makeUseCase().confirm(validInput)).rejects.toMatchObject({
        code: "SETUP_SESSION_EXPIRED",
      });
    });

    it("throws INVALID_2FA_CODE when TOTP code is wrong", async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCache.get.mockResolvedValue(JSON.stringify({ secret: "SECRET", createdAt: Date.now() }));
      mock2FA.verifyCode.mockReturnValue(false);

      await expect(makeUseCase().confirm(validInput)).rejects.toMatchObject({
        code: "INVALID_2FA_CODE",
      });
    });

    it("enables 2FA, clears cache and publishes event on success", async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      const cachedValue = JSON.stringify({ secret: "SECRET", createdAt: Date.now() });
      mockCache.get.mockResolvedValue(cachedValue);
      mock2FA.verifyCode.mockReturnValue(true);

      const result = await makeUseCase().confirm(validInput);

      expect(mockUserRepo.enableTwoFactor).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", secret: cachedValue }),
      );
      expect(mockCache.delete).toHaveBeenCalled();
      expect(mockAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ENABLE_2FA_CONFIRM", status: "SUCCESS" }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "user.two_factor_enabled" }),
      );
      expect(result.isTwoFactorEnabled).toBe(true);
    });
  });
});
