import { AuthAuditRepository, AuditLogFilters, CreateAuditLogInput, PaginatedAuditLogs } from "../../../app/ports/authAuditRepository";
import { AuditLog } from "../../../app/types/auth";

export class MemoryAuthAuditRepository implements AuthAuditRepository {
  private readonly logs: AuditLog[] = [];

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const log: AuditLog = { ...input };
    this.logs.push(log);
    return log;
  }

  async findAll(filters: AuditLogFilters, page: number, limit: number): Promise<PaginatedAuditLogs> {
    let filtered = [...this.logs];

    if (filters.email) filtered = filtered.filter((l) => l.email === filters.email);
    if (filters.action) filtered = filtered.filter((l) => l.action === filters.action);
    if (filters.status) filtered = filtered.filter((l) => l.status === filters.status);
    if (filters.fromDate) filtered = filtered.filter((l) => l.createdAt >= filters.fromDate!);
    if (filters.toDate) filtered = filtered.filter((l) => l.createdAt <= filters.toDate!);

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return { data, total, page, limit };
  }
}
