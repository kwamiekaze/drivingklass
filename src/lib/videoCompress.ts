// Client-side video compression via canvas.captureStream() + MediaRecorder.
// Applies the profile framing (object-fit: cover + object-position + scale) so the
// stored file already reflects the composition, and outputs a silent square clip.
//
// Falls back gracefully to the original file when MediaRecorder / the codec isn't
// supported, when the source can't be decoded, or when the compressed output ends
// up larger than the original.

import type { VideoFraming } from "@/components/portal/VideoFrameEditor";

const DEFAULT_SIZE = 720;
const DEFAULT_BITRATE = 1_500_000; // ~1.5 Mbps
const MAX_DURATION_MS = 60_000; // safety cap

export interface CompressedVideoResult {
  blob: Blob;
  ext: string;
  mime: string;
  compressed: boolean;
}

function pickMime(): { mime: string; ext: string } | null {
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "video/mp4;codecs=h264", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported?.(c.mime)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function drawCoverWithFraming(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  size: number,
  framing: VideoFraming
) {
  const vw = video.videoWidth || size;
  const vh = video.videoHeight || size;
  const scale = Math.max(size / vw, size / vh) * (framing.zoom || 1);
  const dw = vw * scale;
  const dh = vh * scale;
  // object-position: x/y are % of the (media - container) delta.
  const dx = (size - dw) * (framing.x / 100);
  const dy = (size - dh) * (framing.y / 100);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(video, dx, dy, dw, dh);
}

export async function compressVideoWithFraming(
  file: File,
  framing: VideoFraming,
  opts: { size?: number; bitrate?: number; onProgress?: (pct: number) => void } = {}
): Promise<CompressedVideoResult> {
  const originalResult: CompressedVideoResult = {
    blob: file,
    ext: (file.name.split(".").pop() || "mp4").toLowerCase(),
    mime: file.type || "video/mp4",
    compressed: false,
  };

  const picked = pickMime();
  if (!picked) return originalResult;

  const size = opts.size ?? DEFAULT_SIZE;
  const bitrate = opts.bitrate ?? DEFAULT_BITRATE;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  (video as any).crossOrigin = "anonymous";
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("video load timeout")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(to);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(to);
        reject(new Error("video load error"));
      };
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    // Some browsers require captureStream after the first draw.
    drawCoverWithFraming(ctx, video, size, framing);
    const stream = (canvas as any).captureStream?.(30) as MediaStream | undefined;
    if (!stream) throw new Error("captureStream unsupported");

    const recorder = new MediaRecorder(stream, {
      mimeType: picked.mime,
      videoBitsPerSecond: bitrate,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(250);
    await video.play().catch(() => {
      /* autoplay may still allow silent playback */
    });

    const durationMs = Math.min(
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 8000,
      MAX_DURATION_MS
    );
    const started = performance.now();
    let rafId = 0;
    const tick = () => {
      drawCoverWithFraming(ctx, video, size, framing);
      const elapsed = performance.now() - started;
      opts.onProgress?.(Math.min(99, (elapsed / durationMs) * 100));
      if (elapsed >= durationMs || video.ended) {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    await stopped;
    cancelAnimationFrame(rafId);
    try {
      video.pause();
    } catch {
      /* ignore */
    }

    const blob = new Blob(chunks, { type: picked.mime.split(";")[0] });
    if (!blob.size || blob.size >= file.size) return originalResult;
    return { blob, ext: picked.ext, mime: picked.mime.split(";")[0], compressed: true };
  } catch (err) {
    console.warn("[videoCompress] falling back to original:", err);
    return originalResult;
  } finally {
    URL.revokeObjectURL(url);
  }
}
