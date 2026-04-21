import { AppError } from "../../app/errors/appError";

export class LoginPolicy {
  static validateEmail(email: string): void {
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      throw new AppError("Invalid email format", 400, "INVALID_EMAIL");
    }
  }

  static validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new AppError("Password is required", 400, "PASSWORD_REQUIRED");
    }
  }
}
