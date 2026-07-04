import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "./SoundManager";

export function MuteToggle() {
  const { muted, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Turn hero sound on" : "Turn hero sound off"}
      className="fixed bottom-5 right-5 z-30 grid place-items-center w-11 h-11 rounded-full backdrop-blur-md transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{
        background: "linear-gradient(135deg, hsl(30 12% 10% / 0.85), hsl(25 10% 6% / 0.9))",
        border: "1px solid hsl(43 65% 45% / 0.7)",
        boxShadow:
          "0 4px 14px hsl(0 0% 0% / 0.4), 0 0 18px hsl(43 80% 52% / 0.25)",
        color: "hsl(43 90% 62%)",
      }}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
