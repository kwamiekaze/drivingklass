import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Gamepad2, UserCircle, LogIn, Download, Menu, Music, X } from "lucide-react";
import portalCarIcon from "@/assets/portal-car-icon.png";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { InstallAppModal } from "./InstallAppModal";

export function PortalMenuButton({ size = "md", variant = "car", triggerClassName }: { size?: "md" | "lg"; variant?: "car" | "hamburger"; triggerClassName?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, role, isApproved } = usePortalAuth();
  const isLg = size === "lg";


  useEffect(() => {
    // the centred hamburger menu lives in a portal with its own backdrop; an outside-click listener here would close it on mouse-down,
    // before the button under the finger gets its click, which is why the buttons seemed dead
    if (!open || variant === "hamburger") return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, variant]);

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
      {variant === "hamburger" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={triggerClassName}
          title="Menu"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className={`${isLg ? "p-2.5" : "p-1.5"} rounded-full bg-card/40 border border-gold/30 hover:border-gold/60 hover:bg-gold/10 transition-all duration-300 backdrop-blur-sm group shadow-[0_0_18px_rgba(0,0,0,0.35)]`}
          title="Menu"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <img
            src={portalCarIcon}
            alt="Menu"
            className={`${isLg ? "w-11 h-11" : "w-8 h-8"} object-contain group-hover:scale-110 transition-transform drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]`}
          />
        </button>
      )}

      {open && variant !== "hamburger" && (
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
      {open && variant === "hamburger" && createPortal(
        <div className="n2-menu-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="menu" className="n2-menu-pop" aria-label="Menu">
            <button type="button" className="n2-x n2-menu-x" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>
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
          {/* 6) Music settings: admin only, home page menu only */}
          {role === "admin" && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); window.dispatchEvent(new Event("dk:music-settings")); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gold/10 text-left"
            >
              <Music className="h-4 w-4 text-gold" />
              <span>Music settings</span>
            </button>
          )}
          </div>
        </div>,
        document.body
      )}

      {showInstall && <InstallAppModal onClose={() => setShowInstall(false)} />}
    </div>
  );
}
