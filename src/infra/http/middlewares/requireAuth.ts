import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { TokenPayload } from "../../../app/ports/tokenProvider";
import { cacheProvider } from "../../../di";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing or invalid authorization header", code: "UNAUTHORIZED" } });
    return;
  }

  const token = authHeader.split(" ")[1]!;

  // Kontrollo blacklist (token i logout-uar)
  const isBlacklisted = await cacheProvider.get(`auth:blacklist:${token}`);
  if (isBlacklisted) {
    res.status(401).json({ error: { message: "Token has been invalidated", code: "TOKEN_INVALIDATED" } });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as TokenPayload;
    (req as Request & { user?: TokenPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token", code: "UNAUTHORIZED" } });
  }
}
