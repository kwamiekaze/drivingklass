import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LEVELS, levelsByChapter } from '../game/levels';
import { CHAPTERS, DIFFICULTIES, type Difficulty } from '../game/types';
import { sound } from '../sound';
import { InstallTutorial, shouldAutoShowInstallTutorial } from './InstallTutorial';
import { FeedbackModal } from './FeedbackModal';
import { chapterStars, getStars, isUnlocked, totalStars } from '../starProgress';

interface Props {
  bestScores: Record<string, number>;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onStart: (levelId: string) => void;
  onHowToPlay: () => void;
  onLeaderboard: () => void;
  onMultiplayer: () => void;
  onMyStats?: () => void;
  onSignInPrompt?: () => void;
  publicMode?: boolean; // when true, "back" goes to homepage not dashboard
}

const STREAK_KEY = 'dk-game-streak';
const STREAK_DAY_KEY = 'dk-game-streak-day';
const OPEN_CHAPTER_KEY = 'dk-game-open-chapter';

function guestStreak(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastDay = localStorage.getItem(STREAK_DAY_KEY);
    const raw = parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10) || 0;
    if (lastDay === today) return raw;
    let next = 1;
    if (lastDay) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = y.toISOString().slice(0, 10);
      if (lastDay === yesterday) next = raw + 1;
    }
    localStorage.setItem(STREAK_KEY, String(next));
    localStorage.setItem(STREAK_DAY_KEY, today);
    return next;
  } catch { return 0; }
}

function StarRow({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <span className="stage-stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? 'star on' : 'star off'}>★</span>
      ))}
    </span>
  );
}

export function StartScreen({ bestScores, difficulty, setDifficulty, onStart, onHowToPlay, onLeaderboard, onMultiplayer, onMyStats, onSignInPrompt, publicMode }: Props) {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [openChapter, setOpenChapter] = useState<1 | 2 | 3 | 4 | 5>(() => {
    try {
      const v = parseInt(localStorage.getItem(OPEN_CHAPTER_KEY) ?? '1', 10);
      return (v >= 1 && v <= 5 ? v : 1) as 1 | 2 | 3 | 4 | 5;
    } catch { return 1; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldAutoShowInstallTutorial()) {
      const t = setTimeout(() => setShowInstall(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSignedIn(false);
        setStreak(guestStreak());
        return;
      }
      setSignedIn(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, best_streak, last_played_on')
        .eq('id', data.user.id)
        .maybeSingle();
      setStreak(profile?.current_streak ?? 0);
      setBestStreak(profile?.best_streak ?? 0);
    })();
  }, []);

  const clickTick = () => { sound.init(); sound.uiTick(); };
  const grouped = useMemo(() => levelsByChapter(), []);
  const daily = useMemo(() => LEVELS.find((l) => l.isDaily), []);
  const startLevel = (id: string) => { clickTick(); onStart(id); };
  const toggleChapter = (id: 1 | 2 | 3 | 4 | 5) => {
    setOpenChapter(id);
    try { localStorage.setItem(OPEN_CHAPTER_KEY, String(id)); } catch { /* ignore */ }
  };

  const goHome = async () => {
    clickTick();
    if (publicMode) { navigate('/'); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) { navigate('/'); return; }
    const { data: roleRow } = await supabase
      .from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle();
    const role = roleRow?.role;
    if (role === 'admin') navigate('/admin');
    else if (role === 'instructor') navigate('/instructor');
    else navigate('/student');
  };

  const totalEarned = totalStars();

  return (
    <div className="screen start-screen">
      <header className="brand-header">
        <button
          type="button"
          onClick={goHome}
          className="brand-mark brand-mark-link"
          aria-label={publicMode ? 'Back to homepage' : 'Go to dashboard'}
        >
          DRIVING<span>KLASS</span>
        </button>
        <div className="brand-stars">★★★★★</div>
      </header>

      <div className="hero-card">
        <img
          src="/assets/drivingklass-hero.webp"
          alt="The gold five-star DrivingKlass training car"
          className="hero-img"
          loading="eager"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
        <div className="hero-overlay">
          <h1>Road Test Academy</h1>
          <p>25 stages · 5 chapters · Learn the road, earn your stars</p>
          <div className="hero-badges">
            {streak > 0 && (
              <span className="streak-badge">🔥 {streak}-day streak{bestStreak > streak ? ` · best ${bestStreak}` : ''}</span>
            )}
            <span className="streak-badge total-stars-badge">★ {totalEarned} / 75</span>
          </div>
        </div>
      </div>

      {!signedIn && onSignInPrompt && (
        <button
          className="dk-btn dk-btn-gold"
          style={{ width: '100%', marginBottom: 8 }}
          onClick={() => { clickTick(); onSignInPrompt(); }}
        >
          Sign in with Google to save your scores & streak
        </button>
      )}

      <section className="difficulty-row" aria-label="Choose difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`diff-chip${difficulty === d.id ? ' active' : ''}`}
            onClick={() => { clickTick(); setDifficulty(d.id); }}
          >
            {d.label}
            <small>×{d.scoreMul}</small>
          </button>
        ))}
      </section>

      {daily && (
        <button
          className="level-card daily-card"
          onClick={() => startLevel(daily.id)}
        >
          <span className="level-num daily-num">☀</span>
          <span className="level-info">
            <strong>
              <span className="daily-tag">NEW TODAY</span> {daily.name}
            </strong>
            <small>{daily.subtitle}</small>
          </span>
          <span className="level-best">
            {bestScores[daily.id] ? `Best ${bestScores[daily.id]}` : 'Play →'}
          </span>
        </button>
      )}

      <section className="chapter-list" aria-label="Choose a chapter">
        {CHAPTERS.map((ch) => {
          const stages = grouped[ch.id] ?? [];
          const { earned, max } = chapterStars(ch.id);
          const open = openChapter === ch.id;
          return (
            <div key={ch.id} className={`chapter${open ? ' open' : ''}`}>
              <button
                className="chapter-head"
                onClick={() => { clickTick(); toggleChapter(ch.id); }}
                aria-expanded={open}
              >
                <span className="chapter-num">CH{ch.id}</span>
                <span className="chapter-title">
                  <strong>{ch.name}</strong>
                  <small>{ch.subtitle}</small>
                </span>
                <span className="chapter-progress">★ {earned}/{max}</span>
              </button>
              {open && (
                <div className="chapter-body">
                  {stages.map((lvl) => {
                    const unlocked = isUnlocked(lvl.id);
                    const stars = getStars(lvl.id);
                    return (
                      <button
                        key={lvl.id}
                        className={`level-card${unlocked ? '' : ' locked'}`}
                        onClick={() => unlocked && startLevel(lvl.id)}
                        disabled={!unlocked}
                        aria-disabled={!unlocked}
                      >
                        <span className="level-num">
                          {unlocked ? (lvl.stageNumber ?? '') : '🔒'}
                        </span>
                        <span className="level-info">
                          <strong>{lvl.name}</strong>
                          <small>{lvl.objective ?? lvl.subtitle}</small>
                          <StarRow count={stars} />
                        </span>
                        <span className="level-best">
                          {!unlocked
                            ? 'Locked'
                            : bestScores[lvl.id]
                              ? `Best ${bestScores[lvl.id]}`
                              : 'Start →'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="btn-row">
        <button className="dk-btn dk-btn-gold" onClick={() => startLevel('first-drive')}>Start Academy</button>
        <button className="dk-btn dk-btn-outline" onClick={() => { clickTick(); onHowToPlay(); }}>How to Play</button>
        <button className="dk-btn dk-btn-outline" onClick={() => { clickTick(); onLeaderboard(); }}>Leaderboard</button>
        {signedIn && onMyStats && (
          <button className="dk-btn dk-btn-outline" onClick={() => { clickTick(); onMyStats(); }}>My Stats</button>
        )}
      </div>

      <button
        className="dk-btn dk-btn-gold mp-cta"
        onClick={() => {
          clickTick();
          if (!signedIn && onSignInPrompt) { onSignInPrompt(); return; }
          onMultiplayer();
        }}
      >
        Multiplayer: Star Rush {!signedIn && '· Sign in required'}
      </button>

      <a className="dk-btn dk-btn-black book-cta" href="https://drivingklass.com" target="_blank" rel="noopener noreferrer">
        Book a Driving Lesson
      </a>

      <button
        className="dk-btn dk-btn-ghost"
        style={{ width: '100%', marginTop: 4 }}
        onClick={() => { clickTick(); setShowInstall(true); }}
      >
        📱 Install app / fix hidden buttons
      </button>

      <button
        className="dk-btn dk-btn-gold-outline dk-btn-feedback"
        style={{ width: '100%', marginTop: 4 }}
        onClick={() => { clickTick(); setShowFeedback(true); }}
      >
        ★ Send Feedback
      </button>

      <footer className="fine-print">
        A mini-game by DrivingKlass · Real lessons at drivingklass.com
      </footer>

      {showInstall && <InstallTutorial onClose={() => setShowInstall(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
