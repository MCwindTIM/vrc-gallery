import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const THUMB_MAX = 640;

export async function ensureThumb(
  srcPath: string,
  thumbPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(thumbPath), { recursive: true });
  try {
    await fs.access(thumbPath);
    return;
  } catch {
    /* generate */
  }
  await sharp(srcPath)
    .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(thumbPath);
}
