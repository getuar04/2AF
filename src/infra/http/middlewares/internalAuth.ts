import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-internal-api-key");
  if (!key || key !== env.app.internalApiKey) {
    res.status(401).json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    return;
  }
  next();
}
