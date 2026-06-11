import crypto from "node:crypto";
import type { Request, Response } from "express";

export const ADMIN_COOKIE = "vrc_admin";

const DEFAULT_SESSION_HOURS = 24;

export interface AdminAccessStatus {
  ok: true;
  admin: true;
  authRequired: boolean;
  authenticated: boolean;
}

export function isAdminAuthEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sessionTtlMs(): number {
  const hours = Number(process.env.ADMIN_SESSION_HOURS) || DEFAULT_SESSION_HOURS;
  return Math.max(1, hours) * 60 * 60 * 1000;
}

function jwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (secret) return secret;
  if (!process.env.ADMIN_PASSWORD) return "";
  return crypto
    .createHash("sha256")
    .update(`vrc-gallery:${process.env.ADMIN_PASSWORD}`)
    .digest("hex");
}

function signPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", jwtSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string): boolean {
  if (!isAdminAuthEnabled()) return true;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", jwtSecret())
    .update(body)
    .digest("base64url");

  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as { exp?: number; sub?: string };
    if (payload.sub !== "admin") return false;
    if (!payload.exp || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function createAdminToken(): string {
  const now = Date.now();
  return signPayload({
    sub: "admin",
    iat: now,
    exp: now + sessionTtlMs(),
  });
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!isAdminAuthEnabled()) return true;
  if (!token) return false;
  return verifyToken(token);
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;

  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function readAdminToken(req: Request): string | undefined {
  return parseCookies(req)[ADMIN_COOKIE];
}

export function isAdminAuthenticated(req: Request): boolean {
  return verifyAdminToken(readAdminToken(req));
}

export function adminAccessStatus(req: Request): AdminAccessStatus {
  const authRequired = isAdminAuthEnabled();
  return {
    ok: true,
    admin: true,
    authRequired,
    authenticated: authRequired ? isAdminAuthenticated(req) : true,
  };
}

function cookieFlags(maxAgeSec: number): string {
  const secure =
    process.env.ADMIN_COOKIE_SECURE === "1" ||
    process.env.NODE_ENV === "production"
      ? "; Secure"
      : "";
  return `HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Strict${secure}`;
}

export function setAdminCookie(res: Response, token: string): void {
  const maxAgeSec = Math.floor(sessionTtlMs() / 1000);
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; ${cookieFlags(maxAgeSec)}`
  );
}

export function clearAdminCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; ${cookieFlags(0)}`
  );
}

export function warnIfAdminAuthMisconfigured(): void {
  if (!isAdminAuthEnabled()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "ADMIN_PASSWORD is not set — admin API relies on private-network IP checks only."
      );
    }
    return;
  }
  if (!process.env.ADMIN_JWT_SECRET) {
    console.warn(
      "ADMIN_JWT_SECRET is not set — deriving session secret from ADMIN_PASSWORD. Set a dedicated secret in production."
    );
  }
}
