import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Router } from "express";
import type { NextFunction, Response } from "express";
import multer from "multer";
import {
  adminAccessStatus,
  clearAdminCookie,
  createAdminToken,
  setAdminCookie,
  verifyAdminPassword,
} from "../lib/adminAuth.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import { requirePrivateNetwork, parseClientIp, isPrivateNetworkRequest } from "../middleware/privateNetwork.js";
import { loadCatalog } from "../services/photoCatalog.js";
import {
  deletePhoto,
  ingestStagedUpload,
  updatePhoto,
} from "../services/photoAdmin.js";

export const adminRouter = Router();

adminRouter.use(requirePrivateNetwork);

// ---- M1 fix: lightweight per-IP login throttling (no external deps) ----
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_BLOCK_MS = 60_000;

interface LoginAttempt {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

function pruneLoginAttempts(now: number): void {
  for (const [ip, a] of loginAttempts) {
    if (a.blockedUntil > now || now - a.windowStart < LOGIN_WINDOW_MS) continue;
    loginAttempts.delete(ip);
  }
}

function recordLoginFailure(ip: string): boolean {
  const now = Date.now();
  pruneLoginAttempts(now);
  const attempt = loginAttempts.get(ip);
  if (!attempt || now - attempt.windowStart >= LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, {
      failures: 1,
      windowStart: now,
      blockedUntil: 0,
    });
    return false;
  }
  attempt.failures += 1;
  if (attempt.failures >= LOGIN_MAX_FAILURES) {
    attempt.blockedUntil = now + LOGIN_BLOCK_MS;
    return true;
  }
  return false;
}

function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

function isLoginBlocked(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;
  if (attempt.blockedUntil > now) return true;
  return false;
}

// ---- uploads staged in a per-request temp dir (H2 fix: never touch originals) ----
const uploadTmpRoot = path.join(os.tmpdir(), "vrc-gallery-uploads");

// Opportunistic startup cleanup of stale per-request staging dirs from crashes.
void fs
  .readdir(uploadTmpRoot)
  .then((entries) =>
    Promise.allSettled(
      entries
        .filter((e) => e.startsWith("up-"))
        .map((e) => fs.rm(path.join(uploadTmpRoot, e), { recursive: true, force: true }))
    )
  )
  .catch(() => {});

interface UploadRequest extends Express.Request {
  uploadDir?: string;
}

/** Creates a fresh private staging dir for this request and stashes it on req. */
async function makeUploadDir(
  req: UploadRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await fs.mkdir(uploadTmpRoot, { recursive: true });
    req.uploadDir = await fs.mkdtemp(path.join(uploadTmpRoot, "up-"));
    next();
  } catch (err) {
    next(err instanceof Error ? err : new Error(String(err)));
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const uploadDir = (req as UploadRequest).uploadDir ?? uploadTmpRoot;
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // keep a unique staged name; the real name is derived from originalname later
      const base = path.basename(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp)$/i.test(file.originalname));
  },
});

adminRouter.get("/access", (req, res) => {
  res.json({
    ...adminAccessStatus(req),
    privateNetwork: isPrivateNetworkRequest(req),
    clientIp: parseClientIp(req),
  });
});

adminRouter.post("/login", (req, res) => {
  const ip = parseClientIp(req);
  if (isLoginBlocked(ip)) {
    res.status(429).json({ error: "Too many login attempts. Try again later." });
    return;
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!verifyAdminPassword(password)) {
    recordLoginFailure(ip);
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  clearLoginFailures(ip);
  const token = createAdminToken();
  setAdminCookie(res, req, token);
  res.json({
    ok: true,
    admin: true,
    authRequired: true,
    authenticated: true,
  });
});

adminRouter.use(requireAdminAuth);

adminRouter.post("/logout", (req, res) => {
  clearAdminCookie(res, req);
  res.json({ ok: true });
});

adminRouter.get("/photos", async (_req, res, next) => {
  try {
    const { photos, updatedAt } = await loadCatalog();
    res.json({ photos, total: photos.length, updatedAt });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  "/photos",
  makeUploadDir,
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const uploadDir = (req as UploadRequest).uploadDir;
      const cleanup = async () => {
        if (uploadDir) {
          await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
        }
      };

      if (!files?.length) {
        await cleanup();
        res.status(201).json({ created: [], errors: [] });
        return;
      }

      const created = [];
      const errors: { filename: string; message: string }[] = [];

      for (const file of files) {
        try {
          const record = await ingestStagedUpload(file.path, file.originalname);
          created.push(record);
        } catch (err) {
          await fs.unlink(file.path).catch(() => {});
          errors.push({
            filename: file.originalname,
            message: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }

      await cleanup();
      res.status(created.length > 0 ? 201 : 400).json({ created, errors });
    } catch (err) {
      const uploadDir = (req as UploadRequest).uploadDir;
      if (uploadDir) {
        await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
      }
      next(err);
    }
  }
);

adminRouter.patch("/photos/:id", async (req, res, next) => {
  try {
    const { name, date, annotation, displayOrientation, hidden } = req.body ?? {};
    const photo = await updatePhoto(req.params.id, {
      name: typeof name === "string" ? name : undefined,
      date: typeof date === "string" ? date : undefined,
      annotation:
        annotation && typeof annotation === "object" ? annotation : undefined,
      displayOrientation:
        displayOrientation === "auto" ||
        displayOrientation === "portrait" ||
        displayOrientation === "landscape" ||
        displayOrientation === null
          ? displayOrientation
          : undefined,
      hidden: typeof hidden === "boolean" ? hidden : undefined,
    });
    res.json({ photo });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Photo not found") {
        res.status(404).json({ error: err.message });
        return;
      }
      if (
        err.message.includes("already exists") ||
        err.message.includes("empty") ||
        err.message.includes("Invalid") ||
        err.message.includes("orientation")
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    next(err);
  }
});

adminRouter.delete("/photos/:id", async (req, res, next) => {
  try {
    await deletePhoto(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Photo not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// Multer failures (file-count/size limits) bypass the handler above; make sure
// the per-request staging dir is still removed before the error propagates.
adminRouter.use(
  (err: unknown, req: UploadRequest, _res: Response, next: NextFunction) => {
    const dir = req.uploadDir;
    if (dir) {
      req.uploadDir = undefined;
      void fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    next(err);
  }
);
