import { AuthAuditRepository, AuditLogFilters, CreateAuditLogInput, PaginatedAuditLogs } from "../../../app/ports/authAuditRepository";
import { AuditLog } from "../../../app/types/auth";
import { env } from "../../config/env";
import { getMongoCollection } from "./mongoClient";

export class MongoAuthAuditRepository implements AuthAuditRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const collection = await getMongoCollection<CreateAuditLogInput>(env.mongodb.auditCollection);
    await collection.insertOne(input);
    return { ...input };
  }

  async findAll(filters: AuditLogFilters, page: number, limit: number): Promise<PaginatedAuditLogs> {
    const collection = await getMongoCollection<AuditLog>(env.mongodb.auditCollection);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (filters.email) query.email = filters.email;
    if (filters.action) query.action = filters.action;
    if (filters.status) query.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    const total = await collection.countDocuments(query);
    const data = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return { data, total, page, limit };
  }
}
