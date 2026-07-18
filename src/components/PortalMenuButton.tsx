import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Gamepad2, UserCircle, LogIn, Download } from "lucide-react";
import portalCarIcon from "@/assets/portal-car-icon.png";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { InstallAppModal } from "./InstallAppModal";

export function PortalMenuButton() {
  const [open, setOpen] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, role, isApproved } = usePortalAuth();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const dashboardPath =
    role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/student";

  const goDashboard = () => {
    setOpen(false);
    if (!user) return navigate("/login");
    if (!isApproved && role !== "admin" && role !== "instructor") {
      return navigate("/pending-approval");
    }
    navigate(dashboardPath);
  };

  const goProfile = () => {
    setOpen(false);
    if (!user) return navigate("/login");
    if (!isApproved && role !== "admin" && role !== "instructor") {
      return navigate("/pending-approval");
    }
    navigate("/profile");
  };

  const goPlay = () => {
    setOpen(false);
    navigate("/simulator");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-full bg-card/40 border border-gold/30 hover:border-gold/60 hover:bg-gold/10 transition-all duration-300 backdrop-blur-sm group"
        title="Menu"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <img
          src={portalCarIcon}
          alt="Menu"
          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-gold/40 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
        >
          {/* 1) Portal */}
          <button
            role="menuitem"
            onClick={goDashboard}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 border-b border-border/50 text-left"
          >
            <LayoutDashboard className="h-4 w-4 text-gold" />
            <span>Portal</span>
          </button>
          {/* 2) Sign In (only when logged out) */}
          {!user && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate("/login"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 border-b border-border/50 text-left"
            >
              <LogIn className="h-4 w-4 text-gold" />
              <span>Sign In</span>
            </button>
          )}
          {/* 3) Profile (only when logged in) */}
          {user && (
            <button
              role="menuitem"
              onClick={goProfile}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 border-b border-border/50 text-left"
            >
              <UserCircle className="h-4 w-4 text-gold" />
              <span>Profile</span>
            </button>
          )}
          {/* 4) Play Mini-Game */}
          <button
            role="menuitem"
            onClick={goPlay}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 border-b border-border/50 text-left"
          >
            <Gamepad2 className="h-4 w-4 text-gold" />
            <span>Play Mini-Game</span>
          </button>
          {/* 5) Install as App */}
          <button
            role="menuitem"
            onClick={() => { setOpen(false); setShowInstall(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 text-left"
          >
            <Download className="h-4 w-4 text-gold" />
            <span>Install as App</span>
          </button>
        </div>
      )}

      {showInstall && <InstallAppModal onClose={() => setShowInstall(false)} />}
    </div>
  );
}
