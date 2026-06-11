import type { Request, Response, NextFunction } from "express";
import {
  isAdminAuthEnabled,
  isAdminAuthenticated,
} from "../lib/adminAuth.js";

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isAdminAuthEnabled()) {
    next();
    return;
  }

  if (isAdminAuthenticated(req)) {
    next();
    return;
  }

  res.status(401).json({ error: "Admin authentication required" });
}
