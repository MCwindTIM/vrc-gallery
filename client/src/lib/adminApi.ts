import type { Photo, PhotoAnnotation } from "../types";

const BASE = "/api/admin";

export interface AdminAccessStatus {
  ok: boolean;
  admin: boolean;
  authRequired: boolean;
  authenticated: boolean;
  privateNetwork?: boolean;
  clientIp?: string;
}

export class AdminAccessError extends Error {
  constructor(message = "僅限內網 IP 存取") {
    super(message);
    this.name = "AdminAccessError";
  }
}

export class AdminAuthError extends Error {
  constructor(message = "請先登入管理後台") {
    super(message);
    this.name = "AdminAuthError";
  }
}

const baseInit: RequestInit = {
  credentials: "include",
  redirect: "manual",
};

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...baseInit, ...init });
  if (res.status >= 300 && res.status < 400) {
    window.location.replace("/");
    throw new AdminAccessError();
  }
  if (res.status === 403) {
    window.location.replace("/");
    throw new AdminAccessError();
  }
  if (res.status === 401) {
    throw new AdminAuthError();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }
  return res;
}

export async function checkAdminAccess(): Promise<AdminAccessStatus> {
  const res = await fetch(`${BASE}/access`, baseInit);
  if (res.status >= 300 && res.status < 400) {
    window.location.replace("/");
    throw new AdminAccessError();
  }
  if (res.status === 403) {
    window.location.replace("/");
    throw new AdminAccessError();
  }
  if (!res.ok) {
    throw new Error(`Admin access check failed (${res.status})`);
  }
  return res.json();
}

export async function loginAdmin(password: string): Promise<AdminAccessStatus> {
  const res = await fetch(`${BASE}/login`, {
    ...baseInit,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error === "Invalid password" ? "密碼錯誤" : "登入失敗");
  }
  return data;
}

export async function logoutAdmin(): Promise<void> {
  await fetch(`${BASE}/logout`, { ...baseInit, method: "POST" });
}

export async function fetchAdminPhotos(): Promise<{
  photos: Photo[];
  total: number;
  updatedAt: string;
}> {
  const res = await adminFetch("/photos");
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
  if (!data.created?.length && data.errors?.length) {
    throw new Error(data.errors[0]?.message ?? "Upload failed");
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
  return data.photo;
}

export async function deletePhoto(id: string): Promise<void> {
  await adminFetch(`/photos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
