import type { Photo, PhotoAnnotation } from "../types";

const BASE = "/api/admin";

export class AdminAccessError extends Error {
  constructor(message = "僅限內網 IP 存取") {
    super(message);
    this.name = "AdminAccessError";
  }
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...init, redirect: "manual" });
  if (isRedirect(res.status)) {
    window.location.replace("/");
    throw new AdminAccessError();
  }
  return res;
}

export async function checkAdminAccess(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/access`, { redirect: "manual" });
    if (isRedirect(res.status)) {
      window.location.replace("/");
      return false;
    }
    return res.ok;
  } catch (err) {
    if (err instanceof AdminAccessError) return false;
    throw err;
  }
}

export async function fetchAdminPhotos(): Promise<{
  photos: Photo[];
  total: number;
  updatedAt: string;
}> {
  const res = await adminFetch("/photos");
  if (!res.ok) throw new Error("Failed to load photos");
  return res.json();
}

export async function uploadPhotos(
  files: File[]
): Promise<{
  created: Photo[];
  errors: { filename: string; message: string }[];
}> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const res = await adminFetch("/photos", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok && !data.created?.length) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data;
}

export async function updatePhoto(
  id: string,
  payload: {
    name?: string;
    date?: string;
    annotation?: PhotoAnnotation;
  }
): Promise<Photo> {
  const res = await adminFetch(`/photos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Update failed");
  return data.photo;
}

export async function deletePhoto(id: string): Promise<void> {
  const res = await adminFetch(`/photos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Delete failed");
  }
}
