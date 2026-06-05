import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolvePhotoCreateDate } from "../lib/photoDate.js";
import { parsePhotoAnnotation } from "../lib/photoMetadata.js";
import { PHOTOS_DIR, CATALOG_PATH } from "../lib/paths.js";
import { ensureThumb } from "../lib/thumbnail.js";
import type { PhotoRecord } from "../lib/types.js";
import { saveCatalog } from "../services/photoCatalog.js";

function idFromFilename(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

async function scan(): Promise<PhotoRecord[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(PHOTOS_DIR);
  } catch {
    console.error(`Photos directory not found: ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const images = entries.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const photos: PhotoRecord[] = [];

  for (const file of images) {
    const id = idFromFilename(file);
    const srcPath = path.join(PHOTOS_DIR, file);
    const thumbName = `${id}_thumb.jpg`;
    const thumbFs = path.join(PHOTOS_DIR, "thumbs", thumbName);
    await ensureThumb(srcPath, thumbFs);

    const meta = await sharp(srcPath).metadata();
    const stat = await fs.stat(srcPath);
    const created = resolvePhotoCreateDate(path.parse(file).name, meta, stat.birthtime);

    const annotation = parsePhotoAnnotation(meta.xmp);

    photos.push({
      id,
      name: path.parse(file).name,
      url: `/photos/${file}`,
      thumb: `/photos/thumbs/${thumbName}`,
      date: created.toISOString(),
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      year: created.getFullYear(),
      ...(annotation ? { annotation } : {}),
    });
  }

  return photos.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

async function main() {
  const photos = await scan();
  await saveCatalog(photos);
  console.log(`Synced ${photos.length} photos → ${CATALOG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
