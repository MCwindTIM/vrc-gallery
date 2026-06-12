export type PhotoDisplayOrientation = "portrait" | "landscape";

export function parseDisplayOrientation(
  value: unknown
): PhotoDisplayOrientation | undefined {
  if (value === "portrait" || value === "landscape") return value;
  if (value === "auto" || value === null || value === "") return undefined;
  if (value === undefined) return undefined;
  throw new Error("Invalid display orientation");
}

export function getPhotoDisplayLayout(
  width: number,
  height: number,
  displayOrientation?: PhotoDisplayOrientation
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
