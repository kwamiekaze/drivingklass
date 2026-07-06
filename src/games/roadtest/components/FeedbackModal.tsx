import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onClose: () => void;
}

type Category = 'feature' | 'bug' | 'general';

const CATS: { id: Category; label: string; emoji: string }[] = [
  { id: 'feature', label: 'Feature request', emoji: '✨' },
  { id: 'bug', label: 'Bug report', emoji: '🐛' },
  { id: 'general', label: 'General', emoji: '💬' },
];

export function FeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState<Category>('feature');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (message.trim().length < 3) { setError('Please write a few words'); return; }
    setBusy(true); setError(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('game_feedback' as never).insert({
        category,
        message: message.trim().slice(0, 2000),
        rating: rating > 0 ? rating : null,
        email: email.trim() || null,
        user_id: userRes.user?.id ?? null,
      } as never);
      if (insErr) throw insErr;
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send feedback');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dk-modal-backdrop" onClick={onClose}>
      <div className="dk-modal dk-feedback-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="dk-feedback-thanks">
            <div className="dk-feedback-badge">★</div>
            <h2>Thanks!</h2>
            <p>Your feedback helps us make the game better. Drive safe.</p>
            <button className="dk-btn dk-btn-gold" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Send feedback</h2>
            <div className="dk-fb-cats">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`dk-fb-cat${category === c.id ? ' active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
            <label className="dk-fb-label">Message</label>
            <textarea
              className="dk-fb-textarea"
              rows={4}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={category === 'bug' ? 'What went wrong? What should have happened?' : 'What would you like to see?'}
            />
            <label className="dk-fb-label">Rating (optional)</label>
            <div className="dk-fb-stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`dk-fb-star${rating >= n ? ' on' : ''}`}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                >★</button>
              ))}
            </div>
            <label className="dk-fb-label">Email (optional — for follow-up)</label>
            <input
              className="dk-fb-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 255))}
              placeholder="you@example.com"
            />
            {error && <p className="mp-error">{error}</p>}
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="dk-btn dk-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="dk-btn dk-btn-gold" onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
