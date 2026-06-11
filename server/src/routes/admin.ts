import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { PHOTOS_DIR } from "../lib/paths.js";
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
  ingestUploadedFile,
  updatePhoto,
} from "../services/photoAdmin.js";

export const adminRouter = Router();

adminRouter.get("/access", (req, res) => {
  res.json({
    ...adminAccessStatus(req),
    privateNetwork: isPrivateNetworkRequest(req),
    clientIp: parseClientIp(req),
  });
});

adminRouter.post("/login", (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = createAdminToken();
  setAdminCookie(res, token);
  res.json({
    ok: true,
    admin: true,
    authRequired: true,
    authenticated: true,
  });
});

adminRouter.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

adminRouter.use(requirePrivateNetwork);

const upload = multer({
  storage: multer.diskStorage({
    destination: PHOTOS_DIR,
    filename: (_req, file, cb) => {
      const base = path.basename(file.originalname);
      cb(null, base);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp)$/i.test(file.originalname));
  },
});

adminRouter.use(requireAdminAuth);

adminRouter.get("/photos", async (_req, res, next) => {
  try {
    const { photos, updatedAt } = await loadCatalog();
    res.json({ photos, total: photos.length, updatedAt });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/photos", upload.array("files", 10), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      res.status(201).json({ created: [], errors: [] });
      return;
    }

    const created = [];
    const errors: { filename: string; message: string }[] = [];

    for (const file of files) {
      try {
        const record = await ingestUploadedFile(file.filename);
        created.push(record);
      } catch (err) {
        await fs.unlink(file.path).catch(() => {});
        errors.push({
          filename: file.originalname,
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }

    res.status(created.length > 0 ? 201 : 400).json({ created, errors });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/photos/:id", async (req, res, next) => {
  try {
    const { name, date, annotation } = req.body ?? {};
    const photo = await updatePhoto(req.params.id, {
      name: typeof name === "string" ? name : undefined,
      date: typeof date === "string" ? date : undefined,
      annotation:
        annotation && typeof annotation === "object" ? annotation : undefined,
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
        err.message.includes("Invalid")
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
