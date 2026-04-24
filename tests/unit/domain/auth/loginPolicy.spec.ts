import { LoginPolicy } from "../../../../src/domain/auth/loginPolicy";
import { AppError } from "../../../../src/app/errors/appError";

describe("LoginPolicy", () => {
  describe("validateEmail", () => {
    it("should pass with valid email", () => {
      expect(() => LoginPolicy.validateEmail("user@test.com")).not.toThrow();
    });

    it("should pass with uppercase email (normalized)", () => {
      expect(() => LoginPolicy.validateEmail("USER@TEST.COM")).not.toThrow();
    });

    it("should throw when email has no @", () => {
      expect(() => LoginPolicy.validateEmail("invalidemail.com")).toThrow(
        AppError,
      );
    });

    it("should throw when email has no domain", () => {
      expect(() => LoginPolicy.validateEmail("user@")).toThrow(AppError);
    });

    it("should throw when email is empty", () => {
      expect(() => LoginPolicy.validateEmail("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        LoginPolicy.validateEmail("bademail");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_EMAIL");
        expect((e as AppError).statusCode).toBe(400);
      }
    });
  });

  describe("validatePassword", () => {
    it("should pass with valid password", () => {
      expect(() => LoginPolicy.validatePassword("anypassword")).not.toThrow();
    });

    it("should throw when password is empty string", () => {
      expect(() => LoginPolicy.validatePassword("")).toThrow(AppError);
    });

    it("should throw when password is only spaces", () => {
      expect(() => LoginPolicy.validatePassword("   ")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        LoginPolicy.validatePassword("");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("PASSWORD_REQUIRED");
      }
    });
  });
});
