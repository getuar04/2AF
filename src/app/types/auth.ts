export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "INFO";
  userId?: string;
  email?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface LoginChallenge {
  challengeId: string;
  userId: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}
