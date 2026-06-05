export interface PhotoAnnotation {
  world?: string;
  author?: string;
  description?: string;
  userComment?: string;
}

export interface PhotoRecord {
  id: string;
  name: string;
  url: string;
  thumb: string;
  date: string;
  width: number;
  height: number;
  year: number;
  annotation?: PhotoAnnotation;
}

export interface PhotoCatalog {
  updatedAt: string;
  photos: PhotoRecord[];
}

export interface PhotosQuery {
  page?: number;
  limit?: number;
  month?: string;
  /** @deprecated 舊版篩選，仍接受 year query */
  year?: number;
  q?: string;
}
