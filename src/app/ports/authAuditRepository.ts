import { AuditLog } from "../types/auth";

export interface CreateAuditLogInput {
  id: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "INFO";
  userId?: string;
  email?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuthAuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
}
