import { supabase } from "@/integrations/supabase/client";

export const REPORT_CARD_AUDIO_BUCKET = "report_card_audio" as const;
export const REPORT_CARD_AUDIO_MAX_BYTES = 25 * 1024 * 1024; // 25MB

export type GetReportCardAudioUrlResponse = {
  signedUrl?: string | null;
  legacyUrl?: string | null;
  mime?: string | null;
  error?: string | null;
};

/**
 * Fetch audio URL via edge function (always returns 200 with JSON).
 * Never throws - always returns a valid response object.
 */
export async function getReportCardAudioUrl(reportCardId: string): Promise<GetReportCardAudioUrlResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<GetReportCardAudioUrlResponse>(
      "get-report-card-audio-url",
      { body: { report_card_id: reportCardId } }
    );

    // Edge function network/invoke error (rare)
    if (error) {
      console.error("Edge function invoke error:", error);
      return { 
        signedUrl: null, 
        legacyUrl: null, 
        mime: null, 
        error: "Network error. Please check your connection and try again." 
      };
    }

    // Edge function returned valid JSON (even on logical errors)
    return data ?? { signedUrl: null, legacyUrl: null, mime: null, error: null };
  } catch (err) {
    // Unexpected client-side error
    console.error("Failed to fetch audio URL:", err);
    return { 
      signedUrl: null, 
      legacyUrl: null, 
      mime: null, 
      error: "Failed to load audio. Please try again." 
    };
  }
}

export function sanitizeFilename(filename: string) {
  return filename
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

export function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function inferAudioMime(file: File): string {
  // Prefer browser-provided type when it looks valid
  if (file.type && (file.type.startsWith("audio/") || file.type === "video/mp4")) {
    return file.type;
  }

  const ext = getFileExtension(file.name);
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "mp4":
      // iOS sometimes records audio in mp4 container
      return "video/mp4";
    case "wav":
      return "audio/wav";
    case "aac":
      return "audio/aac";
    case "webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

export function buildReportCardAudioPath(reportCardId: string, originalFilename: string) {
  const ext = getFileExtension(originalFilename) || "m4a";
  const fileId = crypto.randomUUID();
  return `report-cards/${reportCardId}/${fileId}.${ext}`;
}
