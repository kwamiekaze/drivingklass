import { supabase } from "@/integrations/supabase/client";

export const PERMITS_BUCKET = "permits" as const;

const legacyBuckets = ["permits", "permit_uploads", "documents", "uploads", "intake", "user_uploads"] as const;

export type SignedUrlResult =
  | { ok: true; signedUrl: string; bucketUsed: string }
  | { ok: false; errorMessage: string };

export async function createSignedPermitUrl(options: {
  bucket?: string | null;
  storagePath: string;
  expiresInSeconds?: number;
}): Promise<SignedUrlResult> {
  const bucket = options.bucket || PERMITS_BUCKET;
  const expiresInSeconds = options.expiresInSeconds ?? 600;

  const trySign = async (b: string): Promise<SignedUrlResult> => {
    const { data, error } = await supabase.storage.from(b).createSignedUrl(options.storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      return { ok: false, errorMessage: error?.message || "Failed to create signed URL" };
    }
    return { ok: true, signedUrl: data.signedUrl, bucketUsed: b };
  };

  // 1) try given bucket
  const first = await trySign(bucket);
  if (first.ok) return first;

  // 2) if bucket mismatch (or anything), try canonical bucket
  if (bucket !== PERMITS_BUCKET) {
    const canonical = await trySign(PERMITS_BUCKET);
    if (canonical.ok) return canonical;
  }

  // 3) legacy buckets (best-effort)
  for (const b of legacyBuckets) {
    if (b === bucket || b === PERMITS_BUCKET) continue;
    const res = await trySign(b);
    if (res.ok) return res;
  }

  return first;
}

export function inferMimeTypeFromFilename(filename?: string | null) {
  const ext = (filename || "").toLowerCase().split(".").pop() || "";
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

export function isImageMime(mime?: string | null) {
  return !!mime && mime.startsWith("image/");
}

export function isPdfMime(mime?: string | null) {
  return mime === "application/pdf";
}

export function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}
