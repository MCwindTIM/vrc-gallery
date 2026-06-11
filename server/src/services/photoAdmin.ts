import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolvePhotoCreateDate } from "../lib/photoDate.js";
import { parsePhotoAnnotation } from "../lib/photoMetadata.js";
import { isPhotoFilename } from "../lib/imageFile.js";
import { PHOTOS_DIR } from "../lib/paths.js";
import { ensureThumb } from "../lib/thumbnail.js";
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
  const thumbName = `${id}_thumb.jpg`;
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
    thumb: `/photos/thumbs/${thumbName}`,
    date: created.toISOString(),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    year: created.getFullYear(),
    ...(annotation ? { annotation } : {}),
  };
}

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
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error("Name cannot be empty");

    if (trimmed !== current.name) {
      const ext = path.extname(path.basename(current.url));
      const newFilename = `${trimmed}${ext}`;
      const { src, thumb } = photoPaths(current);
      const newSrc = path.join(PHOTOS_DIR, newFilename);
      const newThumbName = `${trimmed}_thumb.jpg`;
      const newThumb = path.join(PHOTOS_DIR, "thumbs", newThumbName);

      if (catalog.photos.some((p) => p.id === trimmed && p.id !== id)) {
        throw new Error("A photo with this name already exists");
      }

      await fs.rename(src, newSrc);
      try {
        await fs.rename(thumb, newThumb);
      } catch {
        await ensureThumb(newSrc, newThumb);
      }

      updated = {
        ...updated,
        id: trimmed,
        name: trimmed,
        url: `/photos/${newFilename}`,
        thumb: `/photos/thumbs/${newThumbName}`,
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

  const photos = [...catalog.photos];
  photos[index] = updated;
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
