/** Human-facing fields extracted from image XMP / EXIF at sync time. */
export interface PhotoAnnotation {
  /** VRChat world display name, or dc:title / ImageDescription when present. */
  world?: string;
  /** xmp:Author — display name of who took the screenshot. */
  author?: string;
  /** dc:description or other free-text caption. */
  description?: string;
  /** exif:UserComment — VRChat in-game screenshot note. */
  userComment?: string;
}

function xmpTag(text: string, tag: string): string | undefined {
  const re = new RegExp(`<(?:[\\w]+:)?${tag}>([\\s\\S]*?)<\\/(?:[\\w]+:)?${tag}>`, "i");
  const v = text.match(re)?.[1]?.trim();
  return v || undefined;
}

function xmpRdfLiInBlock(text: string, blockRe: RegExp): string | undefined {
  const block = text.match(blockRe)?.[0];
  if (!block) return undefined;
  const fromLi = block.match(/<rdf:li[^>]*>([^<]*)<\/rdf:li>/i)?.[1]?.trim();
  return fromLi || undefined;
}

function xmpExifUserComment(text: string): string | undefined {
  return xmpRdfLiInBlock(text, /<exif:UserComment>[\s\S]*?<\/exif:UserComment>/i);
}

function xmpDcText(text: string, element: "description" | "title"): string | undefined {
  const block = text.match(
    new RegExp(`<dc:${element}>[\\s\\S]*?<\\/dc:${element}>`, "i")
  )?.[0];
  if (!block) return undefined;
  const fromLi = block.match(/<rdf:li[^>]*>([^<]*)<\/rdf:li>/i)?.[1]?.trim();
  if (fromLi) return fromLi;
  const direct = block.match(new RegExp(`<dc:${element}>([^<]+)<`, "i"))?.[1]?.trim();
  return direct || undefined;
}

/** Parse annotation fields from embedded XMP (VRChat PNG, etc.). */
export function parsePhotoAnnotation(xmp?: Buffer): PhotoAnnotation | undefined {
  if (!xmp?.length) return undefined;
  const text = xmp.toString("utf8");

  const world = xmpTag(text, "WorldDisplayName");
  const author = text.match(/<xmp:Author>([^<]+)<\/xmp:Author>/i)?.[1]?.trim();
  const description =
    xmpDcText(text, "description") ?? xmpDcText(text, "title");
  const userComment = xmpExifUserComment(text);

  const annotation: PhotoAnnotation = {};
  if (world) annotation.world = world;
  if (author) annotation.author = author;
  if (userComment) annotation.userComment = userComment;
  if (description) annotation.description = description;

  return Object.keys(annotation).length > 0 ? annotation : undefined;
}
