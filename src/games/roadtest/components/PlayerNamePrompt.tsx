import { useState } from 'react';
import { getPlayerName, setPlayerName, sanitizePlayerName } from '../playerName';

interface Props {
  onSave: (name: string) => void;
  onClose: () => void;
  title?: string;
}

export function PlayerNamePrompt({ onSave, onClose, title }: Props) {
  const [name, setName] = useState(getPlayerName() ?? '');
  const clean = sanitizePlayerName(name);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card name-prompt" onClick={(e) => e.stopPropagation()}>
        <h2>{title ?? 'Choose your driver name'}</h2>
        <p>Shown on the global leaderboard. Max 20 characters.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="e.g. GoldWheel99"
          maxLength={20}
          autoFocus
        />
        <div className="btn-row">
          <button className="dk-btn dk-btn-outline" onClick={onClose}>Skip</button>
          <button className="dk-btn dk-btn-gold" disabled={!clean} onClick={() => { const c = setPlayerName(name); onSave(c); }}>
            Save & Submit
          </button>
        </div>
      </div>
    </div>
  );
}
