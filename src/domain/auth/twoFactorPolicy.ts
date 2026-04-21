import { AppError } from "../../app/errors/appError";

export class TwoFactorPolicy {
  static validateCode(code: string): void {
    if (!/^\d{6}$/.test(code.trim())) {
      throw new AppError("2FA code must be 6 digits", 400, "INVALID_2FA_CODE");
    }
  }

  static validateSetupToken(setupToken: string): void {
    if (!setupToken || setupToken.trim().length < 8) {
      throw new AppError("Invalid setup token", 400, "INVALID_SETUP_TOKEN");
    }
  }

  static validateChallengeId(challengeId: string): void {
    if (!challengeId || challengeId.trim().length < 8) {
      throw new AppError("Invalid challenge id", 400, "INVALID_CHALLENGE_ID");
    }
  }
}
