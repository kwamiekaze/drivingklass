import { useEffect, useState } from 'react';

/**
 * Add-to-Home-Screen tutorial. Shown automatically once on iOS Safari (and
 * other mobile browsers) that aren't already running as a standalone PWA.
 * Installing removes the browser's bottom toolbar so the on-screen game
 * controls (BRAKE / GAS) are always fully tappable.
 */

const DISMISS_KEY = 'dk-game-install-tutorial-dismissed';

type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  if (isIOS) {
    // Chrome/Firefox/Edge on iOS report CriOS/FxiOS/EdgiOS. Only real Safari
    // supports Add-to-Home-Screen from the share sheet.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function shouldAutoShowInstallTutorial(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (isStandalone()) return false;
    if (localStorage.getItem(DISMISS_KEY)) return false;
    const p = detectPlatform();
    return p === 'ios-safari' || p === 'android';
  } catch {
    return false;
  }
}

interface Props {
  onClose: () => void;
}

export function InstallTutorial({ onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="dk-modal-backdrop" onClick={dismiss}>
      <div
        className="dk-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-label="Install DrivingKlass"
      >
        <h2 style={{ marginTop: 0 }}>Install for the best play</h2>
        <p style={{ opacity: 0.9, marginTop: 0 }}>
          Add DrivingKlass to your home screen so the game opens full-screen
          and the <strong>GAS</strong> / <strong>BRAKE</strong> buttons aren't
          hidden behind the browser bar.
        </p>

        {platform === 'ios-safari' && (
          <ol className="install-steps">
            <li>
              Tap the <strong>Share</strong> button
              <span className="install-icon" aria-hidden="true">⬆︎</span>
              at the bottom of Safari.
            </li>
            <li>
              Scroll and tap <strong>Add to Home Screen</strong>
              <span className="install-icon" aria-hidden="true">＋</span>.
            </li>
            <li>Tap <strong>Add</strong>, then open DrivingKlass from your home screen.</li>
          </ol>
        )}

        {platform === 'ios-other' && (
          <div className="install-note">
            <p>
              To install on iPhone/iPad you need to open this page in
              <strong> Safari</strong>. Then tap Share → <strong>Add to Home Screen</strong>.
            </p>
            <p style={{ opacity: 0.75, fontSize: 13 }}>
              In the meantime, scroll the game area up slightly so the
              browser bar hides — the controls will then be fully visible.
            </p>
          </div>
        )}

        {platform === 'android' && (
          <ol className="install-steps">
            <li>Tap the browser <strong>⋮ menu</strong> (top-right).</li>
            <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>Confirm, then open DrivingKlass from your home screen.</li>
          </ol>
        )}

        {platform === 'desktop' && (
          <div className="install-note">
            <p>
              On desktop, look for the <strong>Install</strong> icon in your
              browser's address bar to add DrivingKlass as an app.
            </p>
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="dk-btn dk-btn-ghost" onClick={dismiss}>
            Don't show again
          </button>
          <button className="dk-btn dk-btn-gold" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
