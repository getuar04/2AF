export class AuditService {
  static buildMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }
    return metadata;
  }

  static extractRequestInfo(req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }): { ip: string | undefined; userAgent: string | undefined } {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : undefined) ?? req.ip;
    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : undefined;
    return { ip, userAgent };
  }
}
