import { NextFunction, Request, Response } from "express";
import { GetAuditLogs } from "../../../app/usecases/getAuditLogs";
import { AuditLogFilters } from "../../../app/ports/authAuditRepository";
import { getRedisClient } from "../../cache/redisClient";
import { env } from "../../config/env";

export class AdminController {
  constructor(private readonly getAuditLogsUseCase: GetAuditLogs) {}

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
      const key = `auth:login:challenge:${id}`;
      const client = getRedisClient();
      const exists = await client.exists(key);
      const ttl = exists ? await client.ttl(key) : -2;
      res.status(200).json({ key, exists: exists === 1, ttl });
    } catch (error) {
      next(error);
    }
  };

  getTwoFaSetupDebug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, token } = req.params;
      const key = `auth:2fa:setup:${userId}:${token}`;
      const client = getRedisClient();
      const exists = await client.exists(key);
      const ttl = exists ? await client.ttl(key) : -2;
      res.status(200).json({ key, exists: exists === 1, ttl });
    } catch (error) {
      next(error);
    }
  };

  getRedisHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (env.app.runtimeMode === "memory") {
        res.status(200).json({ status: "memory-mode", connected: false });
        return;
      }
      const client = getRedisClient();
      const ping = await client.ping();
      res.status(200).json({ status: "ok", connected: ping === "PONG" });
    } catch (error) {
      next(error);
    }
  };
}
