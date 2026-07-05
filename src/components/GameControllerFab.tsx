import { useLocation, useNavigate } from "react-router-dom";
import { Gamepad2 } from "lucide-react";

/**
 * Small gold controller pinned to bottom-right of report card pages.
 * Only renders on /report-cards/:id and /report/public/:slug.
 */
export function GameControllerFab() {
  const location = useLocation();
  const navigate = useNavigate();

  const show =
    location.pathname.startsWith("/report-cards/") ||
    location.pathname.startsWith("/report/public/");

  if (!show) return null;

  return (
    <button
      onClick={() => navigate("/simulator")}
      title="Play the DrivingKlass mini-game"
      aria-label="Open mini-game"
      className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full bg-black/70 border border-gold/60 backdrop-blur-sm flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.5)] hover:shadow-[0_0_20px_rgba(212,175,55,0.8)] hover:scale-110 transition-all"
    >
      <Gamepad2 className="h-5 w-5 text-gold" />
    </button>
  );
}
