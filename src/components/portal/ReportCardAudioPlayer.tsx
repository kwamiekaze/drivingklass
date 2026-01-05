import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getReportCardAudioUrl } from "@/lib/reportCardAudio";

type Props = {
  reportCardId: string;
  /** Legacy public URL fallback (older report cards) */
  legacyUrl?: string | null;
  /** When true, will try to auto-play once after the URL is resolved */
  autoPlay?: boolean;
};

export function ReportCardAudioPlayer({ reportCardId, legacyUrl, autoPlay }: Props) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(legacyUrl ?? null);
  const [mime, setMime] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(legacyUrl ? "ready" : "idle");
  const [retryCount, setRetryCount] = useState(0);

  const hasAnyAudio = useMemo(() => true, []);

  const resolveUrl = async () => {
    if (resolvedUrl) return resolvedUrl;

    setStatus("loading");
    const resp = await getReportCardAudioUrl(reportCardId);

    const url = resp.signedUrl || resp.legacyUrl || null;
    setResolvedUrl(url);
    setMime(resp.mime ?? null);

    if (!url) {
      setStatus("error");
      throw new Error("No audio available");
    }

    setStatus("ready");
    return url;
  };

  const playWithResolvedUrl = async (url: string) => {
    if (!audioRef.current) return;

    // Assign src directly so the play() call is tied to the same user gesture handler.
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }

    try {
      await audioRef.current.play();
      setNeedsUserGesture(false);
      setStatus("ready");
    } catch {
      // Autoplay / playback blocked
      setNeedsUserGesture(true);
    }
  };

  const handleUserPlay = async () => {
    try {
      const url = await resolveUrl();
      await playWithResolvedUrl(url);
    } catch {
      setStatus("error");
      toast({
        title: "Audio unavailable",
        description: "Audio is temporarily unavailable. Tap to retry.",
        variant: "destructive",
      });
    }
  };

  // Auto-play after splash (best-effort)
  useEffect(() => {
    if (!autoPlay) return;

    let cancelled = false;

    const run = async () => {
      try {
        const url = await resolveUrl();
        if (cancelled) return;

        // Delay to ensure the page has rendered and the <audio> element is mounted.
        setTimeout(() => {
          if (cancelled) return;
          playWithResolvedUrl(url);
        }, 250);
      } catch {
        // swallow
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, reportCardId]);

  const handleAudioError = async () => {
    // One automatic refresh attempt (signed URLs can expire)
    if (retryCount >= 1) {
      setStatus("error");
      return;
    }

    try {
      setRetryCount(1);
      setResolvedUrl(null);
      const url = await resolveUrl();
      await playWithResolvedUrl(url);
    } catch {
      setStatus("error");
    }
  };

  if (!hasAnyAudio) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        <span className="font-medium text-sm">Lesson Audio</span>
      </div>

      {/* Primary action when we don't yet have a URL (private audio) */}
      {(!resolvedUrl || needsUserGesture || status === "error") && (
        <Button onClick={handleUserPlay} className="w-full cta-button">
          {status === "loading" ? "Loading audio…" : needsUserGesture ? "Tap to Play Audio" : "Tap to Play Audio"}
        </Button>
      )}

      {/* Audio element (controls visible once URL is resolved; legacy URLs render immediately) */}
      <audio
        ref={audioRef}
        controls
        preload="none"
        className="w-full"
        onError={handleAudioError}
      />

      {status === "error" && (
        <p className="text-xs text-muted-foreground">Audio is temporarily unavailable. Tap to retry.</p>
      )}

      {/* Hint for iOS / autoplay restrictions */}
      {needsUserGesture && (
        <p className="text-xs text-muted-foreground">If playback doesn’t start automatically, tap the button again.</p>
      )}

      {/* Apply MIME when we have it (helps some browsers) */}
      {mime ? (
        <style>{``}</style>
      ) : null}
    </div>
  );
}
