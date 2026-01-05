import { useEffect, useRef, useState } from "react";
import { Volume2, RefreshCw, Bug, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getReportCardAudioUrl } from "@/lib/reportCardAudio";

type Props = {
  reportCardId: string;
  /** Legacy public URL fallback (older report cards) */
  legacyUrl?: string | null;
  /** Audio path in storage (new report cards) */
  audioPath?: string | null;
  /** When true, will try to auto-play once after the URL is resolved */
  autoPlay?: boolean;
  /** Show debug info (admin only) */
  showDebug?: boolean;
};

type AudioStatus = "idle" | "loading" | "playing" | "error" | "ready";

export function ReportCardAudioPlayer({ 
  reportCardId, 
  legacyUrl, 
  audioPath, 
  autoPlay,
  showDebug = false 
}: Props) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasAudio = !!(audioPath || legacyUrl);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const attemptedAutoplay = useRef(false);

  // Reset state when report card changes
  useEffect(() => {
    setAudioUrl(null);
    setStatus("idle");
    setLastError(null);
    attemptedAutoplay.current = false;
  }, [reportCardId]);

  /**
   * Always refresh the signed URL via edge function (service role) - never direct storage
   */
  const onTapPlay = async () => {
    try {
      setStatus("loading");
      setLastError(null);

      // Use edge function to get signed URL (bypasses storage RLS)
      const result = await getReportCardAudioUrl(reportCardId);

      if (result.error) {
        throw new Error(result.error);
      }

      // Prefer signed URL from edge function, fallback to legacy URL
      const url = result.signedUrl || result.legacyUrl || legacyUrl;

      if (!url) {
        throw new Error("No audio available for this report.");
      }

      console.log("Audio URL resolved:", { hasSignedUrl: !!result.signedUrl, hasLegacy: !!result.legacyUrl });
      
      setAudioUrl(url);
      await playAudioWithUrl(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to play audio.";
      console.error("Audio playback error:", e);
      setStatus("error");
      setLastError(message);
      toast({
        title: "Audio unavailable",
        description: message,
        variant: "destructive",
      });
    }
  };

  /**
   * Load and play audio with proper Safari/iOS handling
   */
  const playAudioWithUrl = async (url: string) => {
    const el = audioRef.current;
    if (!el) {
      throw new Error("Audio player not available.");
    }

    // Stop any current playback and set new source
    el.pause();
    el.src = url;
    el.load();

    // Wait until browser confirms it can play (Safari needs this)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Audio timed out loading."));
      }, 7000);

      const cleanup = () => {
        clearTimeout(timeout);
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("error", onError);
      };

      const onCanPlay = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error("Audio file can't be played."));
      };

      el.addEventListener("canplay", onCanPlay, { once: true });
      el.addEventListener("error", onError, { once: true });
    });

    // Now play inside the user gesture context
    await el.play();
    setStatus("playing");
  };

  // Auto-play after splash (best-effort, only once)
  useEffect(() => {
    if (!autoPlay || !hasAudio || attemptedAutoplay.current) return;
    attemptedAutoplay.current = true;

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      onTapPlay().catch(() => {
        // Silent fail for autoplay - user can tap manually
        setStatus("idle");
      });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hasAudio, reportCardId]);

  // Handle audio element events
  const handleAudioEnded = () => {
    setStatus("ready");
  };

  const handleAudioPlay = () => {
    setStatus("playing");
  };

  const handleAudioPause = () => {
    if (status === "playing") {
      setStatus("ready");
    }
  };

  const handleAudioError = () => {
    if (status === "loading" || status === "playing") {
      setStatus("error");
      setLastError("Playback failed. Tap to retry.");
    }
  };

  const copyAudioUrl = async () => {
    if (audioUrl) {
      await navigator.clipboard.writeText(audioUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Don't render if no audio exists
  if (!hasAudio) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm text-muted-foreground">No audio attached</span>
        </div>
      </div>
    );
  }

  const showPlayButton = status === "idle" || status === "error" || status === "loading";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        <span className="font-medium text-sm">Lesson Audio</span>
      </div>

      {/* Play/Retry button - shown when not actively playing */}
      {showPlayButton && (
        <Button 
          onClick={onTapPlay} 
          className="w-full cta-button"
          disabled={status === "loading"}
          type="button"
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
          ) : (
            "Tap to Play Audio"
          )}
        </Button>
      )}

      {/* Audio element - always rendered, visible when playing/ready */}
      <audio
        ref={audioRef}
        controls
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className={`w-full ${status === "playing" || status === "ready" ? "block" : "hidden"}`}
        onEnded={handleAudioEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onError={handleAudioError}
      />

      {status === "error" && lastError && (
        <p className="text-xs text-muted-foreground">{lastError}</p>
      )}

      {/* Debug section (admin only) */}
      {showDebug && (
        <div className="mt-2">
          <button 
            onClick={() => setDebugOpen(!debugOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            type="button"
          >
            <Bug className="h-3 w-3" />
            {debugOpen ? "Hide debug" : "Show debug"}
          </button>
          
          {debugOpen && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1 font-mono">
              <div>audio_path: {audioPath ? "✓" : "✗"}</div>
              <div>legacyUrl: {legacyUrl ? "✓" : "✗"}</div>
              <div>audioUrl: {audioUrl ? "✓" : "✗"}</div>
              <div>status: {status}</div>
              {lastError && <div className="text-destructive">error: {lastError}</div>}
              {audioUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyAudioUrl}
                  className="mt-1 h-6 text-xs"
                  type="button"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Copied" : "Copy audio URL"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
