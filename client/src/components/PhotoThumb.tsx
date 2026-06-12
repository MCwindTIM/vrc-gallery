import type { Photo } from "../types";
import { getPhotoDisplayLayout } from "../lib/photoDisplay";

interface PhotoThumbProps {
  photo: Photo;
  sizes?: string;
  className?: string;
}

/** Thumbnail that respects admin displayOrientation override. */
export function PhotoThumb({ photo, sizes, className = "" }: PhotoThumbProps) {
  const layout = getPhotoDisplayLayout(
    photo.width,
    photo.height,
    photo.displayOrientation
  );
  const ratio = layout.width / layout.height;

  if (!layout.rotate) {
    return (
      <img
        src={photo.thumb}
        alt={photo.name}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        width={layout.width}
        height={layout.height}
        className={`w-full object-cover ${className}`}
        style={{ aspectRatio: String(ratio) }}
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: String(ratio) }}
    >
      <img
        src={photo.thumb}
        alt={photo.name}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className={`absolute left-1/2 top-1/2 max-w-none object-cover ${className}`}
        style={{
          height: "100%",
          width: "auto",
          transform: `translate(-50%, -50%) rotate(${layout.rotate}deg) scale(1.01)`,
        }}
      />
    </div>
  );
}
