import type { Request, Response, NextFunction } from "express";

function normalizeIp(raw: string): string {
  let ip = raw.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  return ip;
}

function headerIp(value: string | string[] | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return normalizeIp(value.split(",")[0]);
}

function shouldTrustForwardedHeaders(directIp: string): boolean {
  if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
    return true;
  }
  // Direct connection from a private IP usually means a reverse proxy in front.
  return isPrivateIp(directIp);
}

function parseClientIp(req: Request): string {
  const direct = normalizeIp(req.ip ?? req.socket.remoteAddress ?? "");

  if (shouldTrustForwardedHeaders(direct)) {
    const forwarded = headerIp(req.headers["x-forwarded-for"]);
    if (forwarded) return forwarded;

    const realIp = headerIp(req.headers["x-real-ip"]);
    if (realIp) return realIp;
  }

  return direct;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80:")) return true;
  return false;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  if (ip.includes(":")) return isPrivateIpv6(ip);
  return isPrivateIpv4(ip);
}

function denyPrivateNetworkAccess(_req: Request, res: Response): void {
  res.redirect(302, "/");
}

export function isPrivateNetworkRequest(req: Request): boolean {
  return isPrivateIp(parseClientIp(req));
}

export function requirePrivateNetwork(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isPrivateNetworkRequest(req)) {
    denyPrivateNetworkAccess(req, res);
    return;
  }
  next();
}

export function getClientIp(req: Request): string {
  return parseClientIp(req);
}
