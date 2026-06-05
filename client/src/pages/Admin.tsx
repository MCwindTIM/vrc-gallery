import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo, PhotoAnnotation } from "../types";
import {
  AdminAccessError,
  checkAdminAccess,
  deletePhoto,
  fetchAdminPhotos,
  updatePhoto,
  uploadPhotos,
} from "../lib/adminApi";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditForm {
  name: string;
  date: string;
  world: string;
  author: string;
  description: string;
  userComment: string;
}

function photoToForm(photo: Photo): EditForm {
  return {
    name: photo.name,
    date: toDatetimeLocal(photo.date),
    world: photo.annotation?.world ?? "",
    author: photo.annotation?.author ?? "",
    description: photo.annotation?.description ?? "",
    userComment: photo.annotation?.userComment ?? "",
  };
}

function formToPayload(form: EditForm) {
  const annotation: PhotoAnnotation = {};
  if (form.world.trim()) annotation.world = form.world.trim();
  if (form.author.trim()) annotation.author = form.author.trim();
  if (form.description.trim()) annotation.description = form.description.trim();
  if (form.userComment.trim()) annotation.userComment = form.userComment.trim();

  return {
    name: form.name.trim(),
    date: new Date(form.date).toISOString(),
    annotation,
  };
}

export default function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await checkAdminAccess();
      setAllowed(ok);
      if (!ok) return;
      const data = await fetchAdminPhotos();
      setPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;

    setUploading(true);
    setError(null);
    try {
      const { created, errors } = await uploadPhotos(list);
      if (created.length) {
        setPhotos((prev) => [...created, ...prev]);
        flash(`已上傳 ${created.length} 張圖片`);
      }
      if (errors.length) {
        setError(errors.map((e) => `${e.filename}: ${e.message}`).join("\n"));
      }
    } catch (err) {
      if (err instanceof AdminAccessError) {
        setAllowed(false);
      } else {
        setError(err instanceof Error ? err.message : "上傳失敗");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openEdit = (photo: Photo) => {
    setEditing(photo);
    setEditForm(photoToForm(photo));
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editing || !editForm) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePhoto(editing.id, formToPayload(editForm));
      setPhotos((prev) =>
        prev.map((p) => (p.id === editing.id ? updated : p))
      );
      flash("已儲存");
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`確定刪除「${photo.name}」？此操作無法復原。`)) return;

    setDeletingId(photo.id);
    setError(null);
    try {
      await deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      flash("已刪除");
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  if (allowed === false) {
    window.location.replace("/");
    return null;
  }

  return (
    <div className="mesh-bg min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-panel/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-ui font-semibold text-text">
              相簿管理
            </h1>
            <p className="text-xs font-ui text-muted mt-0.5">
              {loading ? "載入中…" : `共 ${photos.length} 張`}
            </p>
          </div>
          <a
            href="/"
            className="text-sm font-ui text-accent hover:underline shrink-0"
          >
            返回相簿
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {message && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-ui text-text">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-ui text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        <section
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors font-ui ${
            dragOver
              ? "border-accent bg-accent/10"
              : "border-border bg-panel/60"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) {
              handleUpload(e.dataTransfer.files);
            }
          }}
        >
          <p className="text-muted text-sm mb-4">
            拖放圖片到此，或點擊選擇檔案（支援 JPG / PNG / WebP，單檔最大 50MB）
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "上傳中…" : "選擇圖片"}
          </button>
        </section>

        {loading ? (
          <p className="text-center text-muted font-ui py-12">載入中…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className="rounded-2xl border border-border bg-panel overflow-hidden shadow-sm"
              >
                <div className="aspect-video bg-surface overflow-hidden">
                  <img
                    src={photo.thumb}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-ui font-medium text-text truncate" title={photo.name}>
                    {photo.name}
                  </h2>
                  <p className="text-xs font-ui text-muted">
                    {formatDate(photo.date)}
                    {photo.annotation?.world && (
                      <span className="block truncate mt-0.5" title={photo.annotation.world}>
                        {photo.annotation.world}
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(photo)}
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-ui text-text hover:bg-surface transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === photo.id}
                      onClick={() => handleDelete(photo)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-ui text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === photo.id ? "刪除中…" : "刪除"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {editing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-ui font-semibold text-text mb-4">
              編輯圖片資料
            </h2>
            <div className="space-y-4 font-ui text-sm">
              <label className="block">
                <span className="text-muted text-xs">名稱</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-muted text-xs">拍攝日期</span>
                <input
                  type="datetime-local"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-muted text-xs">世界 (World)</span>
                <input
                  type="text"
                  value={editForm.world}
                  onChange={(e) =>
                    setEditForm({ ...editForm, world: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-muted text-xs">作者 (Author)</span>
                <input
                  type="text"
                  value={editForm.author}
                  onChange={(e) =>
                    setEditForm({ ...editForm, author: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-muted text-xs">描述</span>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent resize-none"
                />
              </label>
              <label className="block">
                <span className="text-muted text-xs">備註 (UserComment)</span>
                <textarea
                  value={editForm.userComment}
                  onChange={(e) =>
                    setEditForm({ ...editForm, userComment: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-void px-3 py-2 text-text outline-none focus:border-accent resize-none"
                />
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-ui text-text hover:bg-surface"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-ui font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
