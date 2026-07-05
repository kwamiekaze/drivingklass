import { X, Smartphone, Share, MoreVertical, PlusSquare } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function InstallAppModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground rounded-2xl border border-gold/40 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-bold">Install DrivingKlass as an App</h2>
          </div>
          <button
            className="p-1 rounded-full hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <p className="text-sm text-muted-foreground">
            Add DrivingKlass to your phone's home screen for a full-app experience —
            faster launch, its own icon, no browser bar.
          </p>

          {/* iPhone */}
          <section>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <span className="text-gold"></span> iPhone / iPad (Safari)
            </h3>
            <ol className="list-decimal ml-5 space-y-2 text-sm">
              <li>Open <strong>drivingklass.com</strong> in <strong>Safari</strong> (not Chrome).</li>
              <li>
                Tap the <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> icon
                at the bottom of the screen.
              </li>
              <li>
                Scroll down and tap <PlusSquare className="inline h-4 w-4 mx-1" />
                <strong>Add to Home Screen</strong>.
              </li>
              <li>Tap <strong>Add</strong> in the top-right. Done — look for the gold DrivingKlass icon.</li>
            </ol>
          </section>

          {/* Android */}
          <section>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <span className="text-gold">🤖</span> Android (Chrome)
            </h3>
            <ol className="list-decimal ml-5 space-y-2 text-sm">
              <li>Open <strong>drivingklass.com</strong> in <strong>Chrome</strong>.</li>
              <li>
                Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> <strong>three-dot menu</strong>
                at the top-right.
              </li>
              <li>
                Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
              </li>
              <li>Confirm <strong>Install</strong>. The app icon appears on your home screen.</li>
            </ol>
          </section>

          <p className="text-xs text-muted-foreground italic">
            Tip: If you don't see "Install app," refresh the page and try again — Chrome sometimes
            needs a moment to recognize installable sites.
          </p>
        </div>
      </div>
    </div>
  );
}
