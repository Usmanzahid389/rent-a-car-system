import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

export type AuthedRequest = Request & { adminId?: string; adminEmail?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }
  try {
    const payload = verifyToken(token);
    req.adminId = payload.adminId;
    req.adminEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
