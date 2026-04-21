import { AuthAuditRepository, CreateAuditLogInput } from "../../../app/ports/authAuditRepository";
import { AuditLog } from "../../../app/types/auth";
import { env } from "../../config/env";
import { getMongoCollection } from "./mongoClient";

export class MongoAuthAuditRepository implements AuthAuditRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const collection = await getMongoCollection<CreateAuditLogInput>(env.mongodb.auditCollection);
    await collection.insertOne(input);
    return { ...input };
  }
}
