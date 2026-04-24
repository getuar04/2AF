import { RegisterPolicy } from "../../../../src/domain/auth/registerPolicy";
import { AppError } from "../../../../src/app/errors/appError";

describe("RegisterPolicy", () => {
  describe("validateFullName", () => {
    it("should pass with valid full name", () => {
      expect(() =>
        RegisterPolicy.validateFullName("Getuar Jakupi"),
      ).not.toThrow();
    });

    it("should pass with exactly 2 characters", () => {
      expect(() => RegisterPolicy.validateFullName("AB")).not.toThrow();
    });

    it("should throw when full name is 1 character", () => {
      expect(() => RegisterPolicy.validateFullName("A")).toThrow(AppError);
    });

    it("should throw when full name is empty", () => {
      expect(() => RegisterPolicy.validateFullName("")).toThrow(AppError);
    });

    it("should throw when full name is only spaces", () => {
      expect(() => RegisterPolicy.validateFullName("  ")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        RegisterPolicy.validateFullName("A");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_FULL_NAME");
        expect((e as AppError).statusCode).toBe(400);
      }
    });
  });

  describe("validateEmail", () => {
    it("should pass with valid email", () => {
      expect(() =>
        RegisterPolicy.validateEmail("user@example.com"),
      ).not.toThrow();
    });

    it("should throw with email missing @", () => {
      expect(() => RegisterPolicy.validateEmail("userexample.com")).toThrow(
        AppError,
      );
    });

    it("should throw with email missing TLD", () => {
      expect(() => RegisterPolicy.validateEmail("user@example")).toThrow(
        AppError,
      );
    });

    it("should throw when email is empty", () => {
      expect(() => RegisterPolicy.validateEmail("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        RegisterPolicy.validateEmail("bademail");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("INVALID_EMAIL");
      }
    });
  });

  describe("validatePassword", () => {
    it("should pass with 8+ character password", () => {
      expect(() => RegisterPolicy.validatePassword("Password1")).not.toThrow();
    });

    it("should pass with exactly 8 characters", () => {
      expect(() => RegisterPolicy.validatePassword("12345678")).not.toThrow();
    });

    it("should throw when password is 7 characters", () => {
      expect(() => RegisterPolicy.validatePassword("1234567")).toThrow(
        AppError,
      );
    });

    it("should throw when password is empty", () => {
      expect(() => RegisterPolicy.validatePassword("")).toThrow(AppError);
    });

    it("should throw with correct error code", () => {
      try {
        RegisterPolicy.validatePassword("short");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe("WEAK_PASSWORD");
        expect((e as AppError).statusCode).toBe(400);
      }
    });
  });
});
