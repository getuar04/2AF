import { AuditLog } from "../types/auth";

export interface CreateAuditLogInput {
  id: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "INFO";
  userId?: string;
  email?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditLogFilters {
  email?: string;
  action?: string;
  status?: "SUCCESS" | "FAILED" | "INFO";
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthAuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  findAll(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedAuditLogs>;
}
