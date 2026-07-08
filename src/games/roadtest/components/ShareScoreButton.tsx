import { useState } from 'react';
import type { LevelResult } from '../game/types';

interface Props { result: LevelResult }

export function ShareScoreButton({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const text = `I scored ${result.score.toLocaleString()} in DrivingKlass Road Test Challenge — think you can beat me? drivingklass.com/simulator`;

  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'DrivingKlass Road Test', text, url: 'https://drivingklass.com/simulator' });
        return;
      }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button className="dk-btn dk-btn-gold-outline" style={{ width: '100%', marginTop: 6 }} onClick={share}>
      {copied ? '✅ Copied brag to clipboard' : '📣 Share Score'}
    </button>
  );
}
