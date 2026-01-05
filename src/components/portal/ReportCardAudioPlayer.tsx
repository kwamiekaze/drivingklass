import { useEffect, useRef, useState } from "react";
import { Volume2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getReportCardAudioUrl, GetReportCardAudioUrlResponse } from "@/lib/reportCardAudio";

type Props = {
  reportCardId: string;
  /** Legacy public URL fallback (older report cards) */
  legacyUrl?: string | null;
  /** Audio path in storage (new report cards) */
  audioPath?: string | null;
  /** When true, will try to auto-play once after the URL is resolved */
  autoPlay?: boolean;
};

export function ReportCardAudioPlayer({ reportCardId, legacyUrl, audioPath, autoPlay }: Props) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Only show the player if there's actually audio
  const hasAudio = !!(audioPath || legacyUrl);

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);
  const attemptedAutoplay = useRef(false);

  // Reset state when report card changes
  useEffect(() => {
    setResolvedUrl(null);
    setStatus("idle");
    setRetryCount(0);
    setNeedsUserGesture(false);
    attemptedAutoplay.current = false;
  }, [reportCardId]);

  const resolveUrl = async (): Promise<string | null> => {
    // If we have a legacy URL and no storage path, use it directly
    if (legacyUrl && !audioPath) {
      setResolvedUrl(legacyUrl);
      setStatus("ready");
      return legacyUrl;
    }

    // Otherwise fetch signed URL from edge function
    setStatus("loading");
    
    try {
      const resp: GetReportCardAudioUrlResponse = await getReportCardAudioUrl(reportCardId);
      const url = resp.signedUrl || resp.legacyUrl || null;
      
      if (!url) {
        setStatus("error");
        return null;
      }

      setResolvedUrl(url);
      setStatus("ready");
      return url;
    } catch (err) {
      console.error("Failed to get audio URL:", err);
      setStatus("error");
      return null;
    }
  };

  const playWithUrl = async (url: string) => {
    if (!audioRef.current) return;

    // Set src if needed
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.load();
    }

    try {
      await audioRef.current.play();
      setNeedsUserGesture(false);
      setStatus("ready");
    } catch (err) {
      // Autoplay blocked
      console.log("Autoplay blocked, user gesture needed");
      setNeedsUserGesture(true);
    }
  };

  const handleUserPlay = async () => {
    try {
      let url = resolvedUrl;
      if (!url) {
        url = await resolveUrl();
      }
      if (url) {
        await playWithUrl(url);
      }
    } catch {
      setStatus("error");
      toast({
        title: "Audio unavailable",
        description: "Audio is temporarily unavailable. Tap to retry.",
        variant: "destructive",
      });
    }
  };

  const handleRetry = async () => {
    setRetryCount(0);
    setResolvedUrl(null);
    setStatus("idle");
    await handleUserPlay();
  };

  // Auto-play after splash (best-effort, only once)
  useEffect(() => {
    if (!autoPlay || !hasAudio || attemptedAutoplay.current) return;
    attemptedAutoplay.current = true;

    let cancelled = false;

    const run = async () => {
      try {
        const url = await resolveUrl();
        if (cancelled || !url) return;

        // Small delay to ensure audio element is ready
        setTimeout(() => {
          if (cancelled) return;
          playWithUrl(url);
        }, 300);
      } catch {
        // Silent fail for autoplay
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hasAudio, reportCardId]);

  const handleAudioError = async () => {
    // One automatic retry (signed URLs can expire)
    if (retryCount >= 1) {
      setStatus("error");
      return;
    }

    console.log("Audio playback error, attempting to refresh URL");
    setRetryCount(prev => prev + 1);
    setResolvedUrl(null);
    
    try {
      const url = await resolveUrl();
      if (url) {
        await playWithUrl(url);
      }
    } catch {
      setStatus("error");
    }
  };

  // Don't render if no audio exists
  if (!hasAudio) return null;

  const showPlayButton = !resolvedUrl || needsUserGesture || status === "error" || status === "idle";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        <span className="font-medium text-sm">Lesson Audio</span>
      </div>

      {/* Play/Retry button */}
      {showPlayButton && (
        <Button 
          onClick={status === "error" ? handleRetry : handleUserPlay} 
          className="w-full cta-button"
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading audio…
            </>
          ) : status === "error" ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tap to Retry
            </>
          ) : needsUserGesture ? (
            "Tap to Play Audio"
          ) : (
            "Tap to Play Audio"
          )}
        </Button>
      )}

      {/* Audio element - always rendered but only visible when URL is resolved */}
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className={`w-full ${resolvedUrl && !needsUserGesture ? 'block' : 'hidden'}`}
        onError={handleAudioError}
      />

      {status === "error" && (
        <p className="text-xs text-muted-foreground">Audio is temporarily unavailable. Tap to retry.</p>
      )}

      {needsUserGesture && status === "ready" && (
        <p className="text-xs text-muted-foreground">Tap the button to start playback.</p>
      )}
    </div>
  );
}
