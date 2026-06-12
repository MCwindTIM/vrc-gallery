import type { Photo } from "../types";

export type PhotoDisplayOrientation = "auto" | "portrait" | "landscape";

export function getPhotoDisplayLayout(
  width: number,
  height: number,
  displayOrientation?: Photo["displayOrientation"]
): { width: number; height: number; rotate: number } {
  const w = width > 0 ? width : 16;
  const h = height > 0 ? height : 9;

  if (!displayOrientation) {
    return { width: w, height: h, rotate: 0 };
  }

  const isPortrait = h > w;
  const wantPortrait = displayOrientation === "portrait";

  if (wantPortrait === isPortrait || w === h) {
    return { width: w, height: h, rotate: 0 };
  }

  return { width: h, height: w, rotate: 90 };
}

export function photoDisplayOrientationLabel(
  width: number,
  height: number,
  displayOrientation?: Photo["displayOrientation"]
): string {
  if (displayOrientation === "portrait") return "直向";
  if (displayOrientation === "landscape") return "橫向";
  const { width: w, height: h } = getPhotoDisplayLayout(width, height);
  if (w === h) return "方形";
  return h > w ? "直向" : "橫向";
}
