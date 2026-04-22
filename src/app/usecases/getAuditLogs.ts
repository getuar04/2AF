import { AuditLogFilters, AuthAuditRepository } from "../ports/authAuditRepository";

export class GetAuditLogs {
  constructor(private readonly authAuditRepository: AuthAuditRepository) {}

  async execute(filters: AuditLogFilters, page = 1, limit = 20) {
    const result = await this.authAuditRepository.findAll(filters, page, limit);
    return {
      items: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit
    };
  }
}
