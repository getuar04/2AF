export class AuditService {
  static buildMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }

    return metadata;
  }
}
