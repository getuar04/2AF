import { AppError } from "../../app/errors/appError";

export class RegisterPolicy {
  static validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length < 2) {
      throw new AppError("Full name must be at least 2 characters long", 400, "INVALID_FULL_NAME");
    }
  }

  static validateEmail(email: string): void {
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      throw new AppError("Invalid email format", 400, "INVALID_EMAIL");
    }
  }

  static validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400, "WEAK_PASSWORD");
    }
  }
}
