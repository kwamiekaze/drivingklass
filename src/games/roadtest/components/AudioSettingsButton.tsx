import { useEffect, useRef, useState } from 'react';
import { sound } from '../sound';

/**
 * Speaker icon that opens a small popover with independent
 * Music / Sound effects toggles. Both settings persist to localStorage.
 */
export function AudioSettingsButton() {
  const [open, setOpen] = useState(false);
  const [music, setMusic] = useState(!sound.musicMuted);
  const [sfx, setSfx] = useState(!sound.sfxMuted);
  const [master, setMaster] = useState(!sound.muted);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const icon = master && (music || sfx) ? '🔊' : '🔇';

  return (
    <div className="dk-audio-wrap" ref={ref}>
      <button
        type="button"
        className="dk-btn dk-btn-gold-outline dk-btn-small dk-audio-btn"
        aria-label="Audio settings"
        aria-expanded={open}
        onClick={() => {
          sound.init();
          setOpen((v) => !v);
        }}
      >
        {icon}
      </button>
      {open && (
        <div className="dk-audio-popover" role="dialog" aria-label="Audio settings">
          <div className="dk-audio-title">Audio</div>
          <label className="dk-audio-row">
            <span>Music</span>
            <input
              type="checkbox"
              checked={music}
              onChange={(e) => { sound.setMusicMuted(!e.target.checked); setMusic(e.target.checked); }}
            />
          </label>
          <label className="dk-audio-row">
            <span>Sound effects</span>
            <input
              type="checkbox"
              checked={sfx}
              onChange={(e) => { sound.setSfxMuted(!e.target.checked); setSfx(e.target.checked); }}
            />
          </label>
          <label className="dk-audio-row">
            <span>All audio</span>
            <input
              type="checkbox"
              checked={master}
              onChange={(e) => { sound.setMuted(!e.target.checked); setMaster(e.target.checked); }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
