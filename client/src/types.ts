export interface PhotoAnnotation {
  world?: string;
  author?: string;
  description?: string;
  userComment?: string;
}

export interface Photo {
  id: string;
  name: string;
  url: string;
  thumb: string;
  date: string;
  width: number;
  height: number;
  year: number;
  /** Override gallery/lightbox layout: portrait or landscape. Omit for auto from pixels. */
  displayOrientation?: "portrait" | "landscape";
  annotation?: PhotoAnnotation;
}

export interface GalleryStats {
  total: number;
  months: { month: string; count: number }[];
  latestDate: string | null;
  updatedAt: string;
}

export interface PhotosPage {
  photos: Photo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PhotoDetail {
  photo: Photo;
  prev: Photo | null;
  next: Photo | null;
}
