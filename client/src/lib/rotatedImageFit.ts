export interface RotatedImageLayout {
  boxW: number;
  boxH: number;
  imgW: number;
  imgH: number;
}

/** Fit image so its rotated bounding box stays within maxW × maxH. */
export function computeRotatedImageLayout(
  naturalW: number,
  naturalH: number,
  rotationDeg: number,
  maxW: number,
  maxH: number
): RotatedImageLayout {
  const w = naturalW > 0 ? naturalW : 16;
  const h = naturalH > 0 ? naturalH : 9;
  const safeMaxW = Math.max(maxW, 1);
  const safeMaxH = Math.max(maxH, 1);
  const swap = rotationDeg % 180 !== 0;

  const scale = Math.min(
    safeMaxW / (swap ? h : w),
    safeMaxH / (swap ? w : h)
  );
  const imgW = w * scale;
  const imgH = h * scale;

  return {
    boxW: swap ? imgH : imgW,
    boxH: swap ? imgW : imgH,
    imgW,
    imgH,
  };
}
