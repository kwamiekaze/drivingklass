import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LevelResult } from './game/types';

interface Props {
  result: LevelResult;
  onDone: () => void;
  onSkip: () => void;
  title?: string;
}

export function GuestScoreModal({ result, onDone, onSkip, title = 'Save your score' }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Username is required'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('guest_scores').insert({
      display_name: trimmed.slice(0, 40),
      email: email.trim() ? email.trim().slice(0, 200) : null,
      level_id: result.levelId,
      difficulty: result.difficulty,
      score: result.score,
      grade: result.grade,
      distance: result.distance ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  };

  return (
    <div className="dk-modal-backdrop" onClick={onSkip}>
      <div className="dk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p style={{ opacity: 0.8, marginTop: 4 }}>
          Score: <strong>{result.score.toLocaleString()}</strong> · Grade {result.grade}
        </p>
        <form onSubmit={submit} className="dk-guest-form">
          <label className="dk-field">
            <span>Username *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
              placeholder="e.g. GoldDriver22"
            />
          </label>
          <label className="dk-field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              placeholder="you@example.com"
            />
          </label>
          {error && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</p>}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="dk-btn dk-btn-outline" onClick={onSkip} disabled={saving}>
              Skip
            </button>
            <button type="submit" className="dk-btn dk-btn-gold" disabled={saving}>
              {saving ? 'Saving…' : 'Save to Leaderboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
