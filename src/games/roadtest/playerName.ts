/** Player name for public leaderboards (guest-friendly, 20-char cap, profanity-trim). */
const KEY = 'dk-player-name-v1';
const BLOCK = ['fuck','shit','bitch','cunt','asshole','nigger','faggot','dick','pussy','slut','whore'];

export function sanitizePlayerName(input: string): string {
  let s = (input || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const lower = s.toLowerCase();
  for (const w of BLOCK) {
    if (lower.includes(w)) s = s.replace(new RegExp(w, 'gi'), '*'.repeat(w.length));
  }
  return s || 'Driver';
}

export function getPlayerName(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setPlayerName(name: string): string {
  const clean = sanitizePlayerName(name);
  try { localStorage.setItem(KEY, clean); } catch { /* ignore */ }
  return clean;
}
