import { AuthAuditRepository, CreateAuditLogInput } from "../../../app/ports/authAuditRepository";
import { AuditLog } from "../../../app/types/auth";

export class MemoryAuthAuditRepository implements AuthAuditRepository {
  public readonly logs: AuditLog[] = [];

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const log: AuditLog = { ...input };
    this.logs.push(log);
    return log;
  }
}
