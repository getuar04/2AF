import { NextFunction, Request, Response } from "express";
import { GetAuditLogs } from "../../../app/usecases/getAuditLogs";
import { AuditLogFilters } from "../../../app/ports/authAuditRepository";
import { CacheProvider } from "../../../app/ports/cacheProvider";
import { env } from "../../config/env";

export class AdminController {
  constructor(
    private readonly getAuditLogsUseCase: GetAuditLogs,
    private readonly cacheProvider: CacheProvider
  ) {}

  getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const filters: AuditLogFilters = {};
      if (req.query.email) filters.email = String(req.query.email);
      if (req.query.action) filters.action = String(req.query.action);
      if (req.query.status) filters.status = String(req.query.status) as "SUCCESS" | "FAILED" | "INFO";
      if (req.query.fromDate) filters.fromDate = new Date(String(req.query.fromDate));
      if (req.query.toDate) filters.toDate = new Date(String(req.query.toDate));
      const result = await this.getAuditLogsUseCase.execute(filters, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getLoginChallengeDebug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const key = `2fa:login:${id}`;
      const value = await this.cacheProvider.get(key);
      const exists = value !== null;
      let ttlSeconds: number | null = null;
      if (exists && "ttl" in this.cacheProvider) {
        ttlSeconds = await (this.cacheProvider as any).ttl(key);
      }
      res.status(200).json({ type: "LOGIN_CHALLENGE", key, exists, ttlSeconds });
    } catch (error) {
      next(error);
    }
  };

  getTwoFaSetupDebug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, token } = req.params;
      const key = `2fa:setup:${userId}:${token}`;
      const value = await this.cacheProvider.get(key);
      const exists = value !== null;
      let ttlSeconds: number | null = null;
      if (exists && "ttl" in this.cacheProvider) {
        ttlSeconds = await (this.cacheProvider as any).ttl(key);
      }
      res.status(200).json({ type: "TWO_FACTOR_SETUP", key, exists, ttlSeconds });
    } catch (error) {
      next(error);
    }
  };

  getRedisHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (env.app.runtimeMode === "memory") {
        const key = `admin:health:${Date.now()}`;
        await this.cacheProvider.set(key, "ok", { ttlSeconds: 5 });
        const value = await this.cacheProvider.get(key);
        await this.cacheProvider.delete(key);
        res.status(200).json({ status: value === "ok" ? "ok" : "error", connected: false });
        return;
      }
      const key = `admin:health:${Date.now()}`;
      await this.cacheProvider.set(key, "ok", { ttlSeconds: 5 });
      const value = await this.cacheProvider.get(key);
      await this.cacheProvider.delete(key);
      res.status(200).json({ status: value === "ok" ? "ok" : "error", connected: true });
    } catch (error) {
      next(error);
    }
  };
}
