import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolvePhotoCreateDate } from "../lib/photoDate.js";
import { parsePhotoAnnotation } from "../lib/photoMetadata.js";
import { isPhotoFilename } from "../lib/imageFile.js";
import { PHOTOS_DIR } from "../lib/paths.js";
import { ensureThumb, thumbFilename, thumbUrl } from "../lib/thumbnail.js";
import { parseDisplayOrientation } from "../lib/photoDisplay.js";
import type { PhotoAnnotation, PhotoRecord } from "../lib/types.js";
import { loadCatalog, saveCatalog } from "./photoCatalog.js";

function idFromFilename(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

function safeBasename(name: string): string {
  const base = path.basename(name);
  if (!base || base === "." || base === "..") {
    throw new Error("Invalid filename");
  }
  if (base.includes("/") || base.includes("\\") || base.includes("\0")) {
    throw new Error("Invalid filename");
  }
  return base;
}

/**
 * Display-name validation for admin rename (H1 fix).
 * Blocks path separators / traversal so a crafted `name` cannot move a
 * photo outside PHOTOS_DIR via path.join.
 */
function validateDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  if (
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    throw new Error("Invalid name");
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error("Invalid name");
  }
  return trimmed;
}

/** Like fs.rename but falls back to copy+unlink across devices (EXDEV). */
async function renameAcrossDevices(from: string, to: string): Promise<void> {
  try {
    await fs.rename(from, to);
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "EXDEV")) {
      throw err;
    }
    await fs.copyFile(from, to);
    await fs.unlink(from).catch(() => {});
  }
}

function isErrno(err: unknown, code: string): boolean {
  return err instanceof Error && "code" in err && err.code === code;
}

function photoPaths(photo: PhotoRecord) {
  const file = path.basename(photo.url);
  const thumb = path.basename(photo.thumb);
  return {
    src: path.join(PHOTOS_DIR, file),
    thumb: path.join(PHOTOS_DIR, "thumbs", thumb),
  };
}

async function buildRecordFromFile(filename: string): Promise<PhotoRecord> {
  const safe = safeBasename(filename);
  const srcPath = path.join(PHOTOS_DIR, safe);
  const id = idFromFilename(safe);
  const thumbName = thumbFilename(id);
  const thumbFs = path.join(PHOTOS_DIR, "thumbs", thumbName);

  await ensureThumb(srcPath, thumbFs);

  const meta = await sharp(srcPath).metadata();
  const stat = await fs.stat(srcPath);
  const created = resolvePhotoCreateDate(
    path.parse(safe).name,
    meta,
    stat.birthtime
  );
  const annotation = parsePhotoAnnotation(meta.xmp);

  return {
    id,
    name: path.parse(safe).name,
    url: `/photos/${safe}`,
    thumb: thumbUrl(id),
    date: created.toISOString(),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    year: created.getFullYear(),
    ...(annotation ? { annotation } : {}),
  };
}

/**
 * H2 fix: consume an already-staged upload (written by multer to a TEMP dir)
 * and move it into PHOTOS_DIR only after validation, so a same-name upload can
 * never overwrite or delete an existing original.
 * - duplicate id in catalog  -> error, staged file untouched
 * - file already on disk     -> error (never overwrite existing original)
 * - corrupt / non-image body -> error before any move
 * On any post-move failure the just-created final file is removed again.
 */
export async function ingestStagedUpload(
  stagedPath: string,
  originalFilename: string
): Promise<PhotoRecord> {
  const safe = safeBasename(originalFilename);
  if (!isPhotoFilename(safe)) {
    throw new Error("Skipped non-image file");
  }

  const id = idFromFilename(safe);
  const finalPath = path.join(PHOTOS_DIR, safe);

  const catalog = await loadCatalog();
  if (catalog.photos.some((p) => p.id === id)) {
    throw new Error("A photo with this filename already exists");
  }
  try {
    await fs.access(finalPath);
    // existing file that is NOT in the catalog — still refuse to overwrite
    throw new Error("A photo with this filename already exists");
  } catch (err) {
    if (!isErrno(err, "ENOENT")) {
      throw new Error("A photo with this filename already exists");
    }
  }

  // Validate content BEFORE touching the destination (rejects fake/corrupt files)
  await sharp(stagedPath).metadata();

  const thumbFs = path.join(PHOTOS_DIR, "thumbs", thumbFilename(id));
  await renameAcrossDevices(stagedPath, finalPath);
  try {
    const record = await buildRecordFromFile(safe);
    const photos = [record, ...catalog.photos];
    await saveCatalog(photos);
    return record;
  } catch (err) {
    // roll back only files we just placed (they did not exist before)
    await fs.unlink(finalPath).catch(() => {});
    await fs.unlink(thumbFs).catch(() => {});
    throw err;
  }
}

/** Legacy alias kept for compatibility; requires the file already in PHOTOS_DIR. */
export async function ingestUploadedFile(
  filename: string
): Promise<PhotoRecord> {
  const safe = safeBasename(filename);
  if (!isPhotoFilename(safe)) {
    throw new Error("Skipped non-image file");
  }

  const catalog = await loadCatalog();
  const record = await buildRecordFromFile(safe);

  if (catalog.photos.some((p) => p.id === record.id)) {
    throw new Error("A photo with this filename already exists");
  }

  const photos = [record, ...catalog.photos];
  await saveCatalog(photos);
  return record;
}

export interface PhotoUpdateInput {
  name?: string;
  date?: string;
  annotation?: PhotoAnnotation;
  displayOrientation?: PhotoRecord["displayOrientation"] | "auto" | null;
  hidden?: boolean;
}

export async function updatePhoto(
  id: string,
  input: PhotoUpdateInput
): Promise<PhotoRecord> {
  const catalog = await loadCatalog();
  const index = catalog.photos.findIndex((p) => p.id === id);
  if (index < 0) throw new Error("Photo not found");

  const current = catalog.photos[index];
  let updated = { ...current };

  if (input.name !== undefined) {
    const trimmed = validateDisplayName(input.name);

    if (trimmed !== current.name) {
      const ext = path.extname(path.basename(current.url));
      const newFilename = `${trimmed}${ext}`;
      const { src, thumb } = photoPaths(current);
      const newSrc = path.join(PHOTOS_DIR, newFilename);
      const newThumbName = thumbFilename(trimmed);
      const newThumb = path.join(PHOTOS_DIR, "thumbs", newThumbName);

      if (catalog.photos.some((p) => p.id === trimmed && p.id !== id)) {
        throw new Error("A photo with this name already exists");
      }
      // Refuse to clobber an on-disk file that isn't in the catalog.
      try {
        await fs.access(newSrc);
        throw new Error("A photo with this name already exists");
      } catch (err) {
        if (!isErrno(err, "ENOENT")) {
          throw new Error("A photo with this name already exists");
        }
      }

      // Move original first; if the thumb move fails we regenerate it.
      await renameAcrossDevices(src, newSrc);
      try {
        await renameAcrossDevices(thumb, newThumb);
      } catch {
        await ensureThumb(newSrc, newThumb);
      }

      updated = {
        ...updated,
        id: trimmed,
        name: trimmed,
        url: `/photos/${newFilename}`,
        thumb: thumbUrl(trimmed),
      };
    }
  }

  if (input.date !== undefined) {
    const parsed = new Date(input.date);
    if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");
    updated.date = parsed.toISOString();
    updated.year = parsed.getFullYear();
  }

  if (input.annotation !== undefined) {
    const ann = input.annotation;
    const cleaned: PhotoAnnotation = {};
    if (ann.world?.trim()) cleaned.world = ann.world.trim();
    if (ann.author?.trim()) cleaned.author = ann.author.trim();
    if (ann.description?.trim()) cleaned.description = ann.description.trim();
    if (ann.userComment?.trim()) cleaned.userComment = ann.userComment.trim();
    updated.annotation =
      Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  if (input.displayOrientation !== undefined) {
    const parsed = parseDisplayOrientation(input.displayOrientation);
    if (parsed) {
      updated.displayOrientation = parsed;
    } else {
      delete updated.displayOrientation;
    }
  }

  if (input.hidden !== undefined) {
    if (input.hidden) {
      updated.hidden = true;
    } else {
      delete updated.hidden;
    }
  }

  const photos = catalog.photos.map((p) => (p.id === id ? updated : p));
  await saveCatalog(photos);
  return updated;
}

export async function deletePhoto(id: string): Promise<void> {
  const catalog = await loadCatalog();
  const photo = catalog.photos.find((p) => p.id === id);
  if (!photo) throw new Error("Photo not found");

  const { src, thumb } = photoPaths(photo);

  await Promise.allSettled([
    fs.unlink(src),
    fs.unlink(thumb),
  ]);

  const photos = catalog.photos.filter((p) => p.id !== id);
  await saveCatalog(photos);
}
