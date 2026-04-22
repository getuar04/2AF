import { AuditLogFilters, AuthAuditRepository, PaginatedAuditLogs } from "../ports/authAuditRepository";

export class GetAuditLogs {
  constructor(private readonly authAuditRepository: AuthAuditRepository) {}

  async execute(
    filters: AuditLogFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedAuditLogs> {
    return this.authAuditRepository.findAll(filters, page, limit);
  }
}
