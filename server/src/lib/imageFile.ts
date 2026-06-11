import fs from "node:fs/promises";
import path from "node:path";

export const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export function isPhotoFilename(name: string): boolean {
  return IMAGE_EXT.test(path.basename(name));
}

export async function isReadablePhotoFile(filePath: string): Promise<boolean> {
  if (!isPhotoFilename(filePath)) return false;
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
