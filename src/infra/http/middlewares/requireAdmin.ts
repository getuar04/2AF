import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { TokenPayload } from "../../../app/ports/tokenProvider";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token!, env.jwt.accessSecret) as TokenPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: { message: "Forbidden: admin access required", code: "FORBIDDEN" } });
      return;
    }
    (req as Request & { user?: TokenPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token", code: "INVALID_TOKEN" } });
  }
}
