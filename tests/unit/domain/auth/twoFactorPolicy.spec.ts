import { TwoFactorPolicy } from "../../../../src/domain/auth/twoFactorPolicy";
import { AppError } from "../../../../src/app/errors/appError";

describe("TwoFactorPolicy", () => {
  describe("validateCode", () => {
    it("should pass with valid 6-digit code", () => {
      expect(() => TwoFactorPolicy.validateCode("123456")).not.toThrow();
    });

    it("should pass with leading zeros", () => {
      expect(() => TwoFactorPolicy.validateCode("000001")).not.toThrow();
    });

    it("should throw when code has 5 digits", () => {
      expect(() => TwoFactorPolicy.validateCode("12345")).toThrow(AppError);
    });

    it("should throw when code has 7 digits", () => {
      expect(() => TwoFactorPolicy.validateCode("1234567")).toThrow(AppError);
    });

    it("should throw when code contains letters", () => {
      expect(() => TwoFactorPolicy.validateCode("12345a")).toThrow(AppError);
    });

    it("should throw when code is empty", () => {
      expect(() => TwoFactorPolicy.validateCode("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        TwoFactorPolicy.validateCode("abc");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_2FA_CODE");
        expect((e as AppError).statusCode).toBe(400);
      }
    });
  });

  describe("validateSetupToken", () => {
    it("should pass with valid token (8+ chars)", () => {
      expect(() =>
        TwoFactorPolicy.validateSetupToken("valid-setup-token-123"),
      ).not.toThrow();
    });

    it("should throw when token is too short", () => {
      expect(() => TwoFactorPolicy.validateSetupToken("short")).toThrow(
        AppError,
      );
    });

    it("should throw when token is empty", () => {
      expect(() => TwoFactorPolicy.validateSetupToken("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        TwoFactorPolicy.validateSetupToken("abc");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_SETUP_TOKEN");
      }
    });
  });

  describe("validateChallengeId", () => {
    it("should pass with valid challenge id (8+ chars)", () => {
      expect(() =>
        TwoFactorPolicy.validateChallengeId("valid-challenge-id-abc"),
      ).not.toThrow();
    });

    it("should throw when challenge id is too short", () => {
      expect(() => TwoFactorPolicy.validateChallengeId("tiny")).toThrow(
        AppError,
      );
    });

    it("should throw when challenge id is empty", () => {
      expect(() => TwoFactorPolicy.validateChallengeId("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        TwoFactorPolicy.validateChallengeId("abc");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_CHALLENGE_ID");
      }
    });
  });
});
