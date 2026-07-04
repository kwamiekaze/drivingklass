import { LEVELS } from '../game/levels';

interface Props {
  bestScores: Record<string, number>;
  onStart: (levelId: string) => void;
  onHowToPlay: () => void;
  onLeaderboard: () => void;
}

export function StartScreen({ bestScores, onStart, onHowToPlay, onLeaderboard }: Props) {
  return (
    <div className="screen start-screen">
      <header className="brand-header">
        <div className="brand-mark">
          DRIVING<span>KLASS</span>
        </div>
        <div className="brand-stars">★★★★★</div>
      </header>

      {/*
        Hero image: the gold DrivingKlass 5-star car.
        Replace public/assets/drivingklass-hero.webp with any brand photo/logo.
      */}
      <div className="hero-card">
        <img
          src="/assets/drivingklass-hero.webp"
          alt="The gold five-star DrivingKlass training car"
          className="hero-img"
          loading="eager"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
        <div className="hero-overlay">
          <h1>Road Test Challenge</h1>
          <p>Hold your lane. Stop at the signs. Earn a 5-star report card.</p>
        </div>
      </div>

      <section className="level-list" aria-label="Choose a lesson">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.id}
            className="level-card"
            onClick={() => onStart(lvl.id)}
          >
            <span className="level-num">{i + 1}</span>
            <span className="level-info">
              <strong>{lvl.name}</strong>
              <small>{lvl.subtitle}</small>
            </span>
            <span className="level-best">
              {bestScores[lvl.id] ? `Best ${bestScores[lvl.id]}` : 'Start →'}
            </span>
          </button>
        ))}
      </section>

      <div className="btn-row">
        <button className="dk-btn dk-btn-gold" onClick={() => onStart(LEVELS[0].id)}>
          Start Lesson
        </button>
        <button className="dk-btn dk-btn-outline" onClick={onHowToPlay}>
          How to Play
        </button>
        <button className="dk-btn dk-btn-outline" onClick={onLeaderboard}>
          Leaderboard
        </button>
      </div>

      <a
        className="dk-btn dk-btn-black book-cta"
        href="https://drivingklass.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Book a Driving Lesson
      </a>

      <footer className="fine-print">
        A mini-game by DrivingKlass · Real lessons at drivingklass.com
      </footer>
    </div>
  );
}
