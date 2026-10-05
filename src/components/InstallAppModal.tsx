import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Smartphone, Share, MoreVertical, PlusSquare } from "lucide-react";

interface Props {
  onClose: () => void;
}

const isApple = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

/**
 * Install as an app: a compact card. It shows the steps for the visitor's own device first, with one tap to see the other,
 * and it is drawn on the page body so nothing in the header can ever sit on top of it.
 */
export function InstallAppModal({ onClose }: Props) {
  const [tab, setTab] = useState<"ios" | "android">(() => (isApple() ? "ios" : "android"));
  return createPortal(
    <div
      className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-card text-card-foreground rounded-2xl border border-gold/40 w-full max-w-sm max-h-[78vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Install DrivingKlass as an app"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-gold" />
            <h2 className="text-base font-bold">Install the app</h2>
          </div>
          <button className="p-1 rounded-full hover:bg-muted" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Add DrivingKlass to your home screen: faster launch, its own icon, no browser bar.
          </p>

          <div className="grid grid-cols-2 gap-1 rounded-full border border-gold/30 p-1 text-xs font-semibold" role="tablist">
            <button role="tab" aria-selected={tab === "ios"} onClick={() => setTab("ios")}
              className={`rounded-full py-1.5 ${tab === "ios" ? "bg-gold text-black" : "text-muted-foreground"}`}>iPhone / iPad</button>
            <button role="tab" aria-selected={tab === "android"} onClick={() => setTab("android")}
              className={`rounded-full py-1.5 ${tab === "android" ? "bg-gold text-black" : "text-muted-foreground"}`}>Android</button>
          </div>

          {tab === "ios" ? (
            <ol className="list-decimal ml-5 space-y-1.5 text-[13px] leading-snug">
              <li>Open <strong>drivingklass.com</strong> in <strong>Safari</strong>.</li>
              <li>Tap <Share className="inline h-3.5 w-3.5 mx-0.5" /> <strong>Share</strong> at the bottom.</li>
              <li>Tap <PlusSquare className="inline h-3.5 w-3.5 mx-0.5" /> <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. Look for the gold icon.</li>
            </ol>
          ) : (
            <ol className="list-decimal ml-5 space-y-1.5 text-[13px] leading-snug">
              <li>Open <strong>drivingklass.com</strong> in <strong>Chrome</strong>.</li>
              <li>Tap <MoreVertical className="inline h-3.5 w-3.5 mx-0.5" /> <strong>the three dot menu</strong> at the top right.</li>
              <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Confirm <strong>Install</strong>. The icon appears on your home screen.</li>
            </ol>
          )}

          <p className="text-[11px] text-muted-foreground italic">
            No Install app option? Refresh the page and try again.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
