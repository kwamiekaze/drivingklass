import { supabase } from "@/integrations/supabase/client";

export const PROFILE_MEDIA_BUCKET = "profile-media";

export const PROFILE_MEDIA_IMAGE_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
];

export const PROFILE_MEDIA_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export const PROFILE_MEDIA_ACCEPT = [
  ...PROFILE_MEDIA_IMAGE_MIME,
  ...PROFILE_MEDIA_VIDEO_MIME,
].join(",");

export function detectMediaType(file: File): "image" | "video" | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export function maxSizeForRole(role: string | null | undefined): number {
  // instructors/admins/staff: 50MB; students & others: 10MB
  return role === "instructor" || role === "admin" || role === "staff"
    ? 50 * 1024 * 1024
    : 10 * 1024 * 1024;
}

export function humanSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// Cache signed URLs to avoid re-signing every render
const signedCache = new Map<string, { url: string; expires: number }>();
const SIGN_TTL_MS = 55 * 60 * 1000; // 55 min (signed url valid 60m)

export async function resolveProfileMediaUrl(
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored) return null;
  // Legacy: full URL already
  if (/^https?:\/\//i.test(stored)) return stored;
  // Otherwise treat as path in profile-media bucket
  const now = Date.now();
  const cached = signedCache.get(stored);
  if (cached && cached.expires > now) return cached.url;
  const { data, error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(stored, 60 * 60);
  if (error || !data?.signedUrl) return null;
  signedCache.set(stored, { url: data.signedUrl, expires: now + SIGN_TTL_MS });
  return data.signedUrl;
}

export function invalidateProfileMediaCache(stored?: string | null) {
  if (stored) signedCache.delete(stored);
  else signedCache.clear();
}
