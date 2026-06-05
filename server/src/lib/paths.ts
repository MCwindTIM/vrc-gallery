import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, "../../..");
export const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, "data");
export const CATALOG_PATH =
  process.env.CATALOG_PATH ?? path.join(DATA_DIR, "photos.json");
export const PHOTOS_DIR = process.env.PHOTOS_DIR ?? path.join(ROOT, "photos");
export const CLIENT_DIST = path.join(ROOT, "client", "dist");
