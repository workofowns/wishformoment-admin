export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const API_BASE_URL = `${API_BASE}/admin`;
export const MEDIA_BASE_URL = API_BASE; // /media is not under /admin

// ── S3 Folder constants (must match backend S3_FOLDERS) ──────────────────────
export const MEDIA_FOLDERS = {
  CATEGORIES: "categories",
  SUB_CATEGORIES: "sub-categories",
  TEMPLATES: "templates",
  WISHES: "wishes",
  USER_PROFILES: "users/profiles",
  USER_COVERS: "users/covers",
  MUSIC_THUMBNAILS: "music-thumbnails",
} as const;

export type MediaFolder = typeof MEDIA_FOLDERS[keyof typeof MEDIA_FOLDERS] | (string & {});

// ── General JSON API utility ──────────────────────────────────────────────────
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("adminToken");

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.message || `API Error: ${res.statusText}`);
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  if (!text || text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const resolveMimeType = (file: File): string => {
  if (file.type && file.type.trim() && file.type !== "application/octet-stream") {
    return file.type;
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };
  return mimeMap[ext] || file.type || "image/png";
};

// ── Media Upload utility (S3 + CloudFront) ───────────────────────────────────
/**
 * Uploads a file to S3 via the presign flow:
 *   Step 1 → POST /media/presign  (get a short-lived S3 PUT URL from the server)
 *   Step 2 → PUT {uploadUrl}      (send file bytes directly from browser to S3)
 * Returns the CloudFront CDN URL. Signature is identical to the old uploadMedia.
 *
 * @param file    The File object from an <input type="file">
 * @param folder  The S3 destination folder. Use MEDIA_FOLDERS constants.
 * @returns       The public CloudFront URL of the uploaded asset.
 */
export const uploadMedia = async (file: File, folder: MediaFolder): Promise<string> => {
  const token = localStorage.getItem("adminToken");
  const contentType = resolveMimeType(file);

  // ── Step 1: Ask backend for a presigned S3 PUT URL ──────────────────────────
  const presignRes = await fetch(`${MEDIA_BASE_URL}/media/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      folder,
      filename: file.name,
      contentType,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || "Failed to get upload URL");
  }

  const { uploadUrl, publicUrl } = await presignRes.json();

  // ── Step 2: PUT file bytes directly to S3 (no server in the middle) ─────────
  const s3Res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status} ${s3Res.statusText}`);

  return publicUrl; // CloudFront CDN URL
};
