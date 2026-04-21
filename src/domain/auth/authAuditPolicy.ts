import { AppError } from "../../app/errors/appError";

export class AuthAuditPolicy {
  static validateAction(action: string): void {
    if (!action || action.trim().length < 3) {
      throw new AppError("Invalid audit action", 400, "INVALID_AUDIT_ACTION");
    }
  }
}
