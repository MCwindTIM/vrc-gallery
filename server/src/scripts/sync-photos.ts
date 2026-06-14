import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolvePhotoCreateDate } from "../lib/photoDate.js";
import { isPhotoFilename } from "../lib/imageFile.js";
import { parsePhotoAnnotation } from "../lib/photoMetadata.js";
import { PHOTOS_DIR, CATALOG_PATH } from "../lib/paths.js";
import { ensureThumb, thumbFilename, thumbUrl } from "../lib/thumbnail.js";
import type { PhotoRecord } from "../lib/types.js";
import { saveCatalog } from "../services/photoCatalog.js";

function idFromFilename(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

async function loadExistingById(): Promise<Map<string, PhotoRecord>> {
  const map = new Map<string, PhotoRecord>();
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    const list = JSON.parse(raw) as Array<
      Omit<PhotoRecord, "id" | "year"> & { id?: string }
    >;
    for (const entry of list) {
      const id = entry.id ?? idFromFilename(path.basename(entry.url));
      map.set(id, { ...entry, id, year: new Date(entry.date).getFullYear() });
    }
  } catch {
    /* first sync */
  }
  return map;
}

/** Keep admin-edited catalog fields when re-scanning files on disk. */
function mergeExistingRecord(
  fresh: PhotoRecord,
  existing?: PhotoRecord
): PhotoRecord {
  if (!existing) return fresh;

  const merged: PhotoRecord = {
    ...fresh,
    date: existing.date,
    year: new Date(existing.date).getFullYear(),
  };

  if (existing.displayOrientation) {
    merged.displayOrientation = existing.displayOrientation;
  }

  if (existing.annotation) {
    merged.annotation = existing.annotation;
  }

  if (existing.hidden) {
    merged.hidden = true;
  }

  return merged;
}

async function scan(existingById: Map<string, PhotoRecord>): Promise<PhotoRecord[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(PHOTOS_DIR);
  } catch {
    console.error(`Photos directory not found: ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const photos: PhotoRecord[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (!isPhotoFilename(entry)) continue;

    const srcPath = path.join(PHOTOS_DIR, entry);
    try {
      const stat = await fs.stat(srcPath);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }

    try {
      const id = idFromFilename(entry);
      const thumbName = thumbFilename(id);
      const thumbFs = path.join(PHOTOS_DIR, "thumbs", thumbName);
      await ensureThumb(srcPath, thumbFs);

      const meta = await sharp(srcPath).metadata();
      const stat = await fs.stat(srcPath);
      const created = resolvePhotoCreateDate(
        path.parse(entry).name,
        meta,
        stat.birthtime
      );

      const annotation = parsePhotoAnnotation(meta.xmp);

      photos.push(
        mergeExistingRecord(
          {
            id,
            name: path.parse(entry).name,
            url: `/photos/${entry}`,
            thumb: thumbUrl(id),
            date: created.toISOString(),
            width: meta.width ?? 0,
            height: meta.height ?? 0,
            year: created.getFullYear(),
            ...(annotation ? { annotation } : {}),
          },
          existingById.get(id)
        )
      );
    } catch (err) {
      skipped.push(entry);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipped ${entry}: ${msg}`);
    }
  }

  if (skipped.length) {
    console.warn(`Skipped ${skipped.length} non-photo or unreadable file(s)`);
  }

  return photos.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

async function main() {
  const existingById = await loadExistingById();
  const photos = await scan(existingById);
  await saveCatalog(photos);
  console.log(`Synced ${photos.length} photos → ${CATALOG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
