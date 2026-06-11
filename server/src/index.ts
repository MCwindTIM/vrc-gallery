import fs from "node:fs";
import path from "node:path";
import express from "express";
import compression from "compression";
import cors from "cors";
import { photosRouter } from "./routes/photos.js";
import { adminRouter } from "./routes/admin.js";
import { requirePrivateNetwork } from "./middleware/privateNetwork.js";
import { loadCatalog } from "./services/photoCatalog.js";
import { CLIENT_DIST, PHOTOS_DIR, CATALOG_PATH } from "./lib/paths.js";
import { warnIfAdminAuthMisconfigured } from "./lib/adminAuth.js";

const PORT = Number(process.env.PORT) || 8787;
const app = express();

if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", true);
}

await fs.promises.mkdir(PHOTOS_DIR, { recursive: true });
await fs.promises.mkdir(path.join(PHOTOS_DIR, "thumbs"), { recursive: true });

app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "vrc-gallery" });
});

app.use("/api/photos", photosRouter);
app.use("/api/admin", adminRouter);

app.get("/photos.json", async (_req, res, next) => {
  try {
    const { photos } = await loadCatalog();
    const legacy = photos.map(({ id, year, ...p }) => p);
    res.json(legacy);
  } catch (err) {
    next(err);
  }
});

if (fs.existsSync(PHOTOS_DIR)) {
  app.use("/photos", express.static(PHOTOS_DIR, { maxAge: "7d" }));
}

const clientIndex = path.join(CLIENT_DIST, "index.html");
if (fs.existsSync(clientIndex)) {
  app.use(express.static(CLIENT_DIST, { maxAge: "1h" }));
  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
    res.sendFile(clientIndex);
  });
  app.get(/^(?!\/api|\/photos).*/, (_req, res) => {
    res.sendFile(clientIndex);
  });
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

app.listen(PORT, () => {
  warnIfAdminAuthMisconfigured();
  console.log(`vrc-gallery server http://localhost:${PORT}`);
  console.log(`  catalog: ${CATALOG_PATH}`);
  console.log(`  photos:  ${fs.existsSync(PHOTOS_DIR) ? PHOTOS_DIR : "(not mounted)"}`);
});
