import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onDone: (username: string) => void;
  onSkip?: () => void;
}

/** Gold-styled "Pick your driver name" modal for public/game users. */
export function UsernameModal({ onDone, onSkip }: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const v = name.trim();
    if (!v) { setStatus('idle'); return; }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) { setStatus('invalid'); return; }
    setStatus('checking');
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('check_game_username_available', { _username: v });
        if (error) { setStatus('idle'); return; }
        setStatus(data ? 'available' : 'taken');
      } catch { setStatus('idle'); }
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(v)) { setStatus('invalid'); return; }
    setSaving(true);
    setError(null);
    const { data, error } = await supabase.rpc('set_game_username', { _username: v });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onDone(data as string);
  };

  return (
    <div className="dk-modal-backdrop">
      <div className="dk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0, color: '#f2c14e' }}>Pick your driver name</h2>
        <p style={{ opacity: 0.85, marginTop: 4 }}>
          This is your handle on leaderboards and in multiplayer lobbies. 3–20 letters, numbers, or underscores.
        </p>
        <form onSubmit={submit} className="dk-guest-form">
          <label className="dk-field">
            <span>Driver name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="e.g. GoldDriver22"
            />
          </label>
          <div style={{ minHeight: 20, fontSize: 13 }}>
            {status === 'checking' && <span style={{ opacity: 0.7 }}>Checking…</span>}
            {status === 'available' && <span style={{ color: '#8de08d' }}>✓ Available</span>}
            {status === 'taken' && <span style={{ color: '#ff6b6b' }}>Already taken</span>}
            {status === 'invalid' && <span style={{ color: '#ff6b6b' }}>3–20 letters, numbers, or _ only</span>}
          </div>
          {error && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</p>}
          <div className="btn-row" style={{ marginTop: 12 }}>
            {onSkip && (
              <button type="button" className="dk-btn dk-btn-outline" onClick={onSkip} disabled={saving}>
                Later
              </button>
            )}
            <button type="submit" className="dk-btn dk-btn-gold" disabled={saving || status !== 'available'}>
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
