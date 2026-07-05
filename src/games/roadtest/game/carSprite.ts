/**
 * Player-car sprite — top-down metallic gold sedan, drawn entirely in SVG so
 * the game ships with zero image assets. Nose points up (y=0). Rendered in
 * Phaser at ~44x94 on-screen.
 *
 * Style spec (MVP polish):
 *  - Metallic gold body with a horizontal light-to-dark-to-light gradient
 *  - Rounded front bumper, gently tapered trunk (sleek sports sedan)
 *  - Dark tinted windshield + rear window with a soft white reflection
 *  - Two small tinted side mirrors
 *  - Black band across the rear third with exactly five gold 5-point stars
 *  - Two small red tail lights at the bottom edge
 *  - No text, numbers, or logos anywhere on the car
 *  - Subtle top-edge shine for a premium metallic feel
 */

const STAR_POINTS =
  '0,-10 2.9,-3.1 10,-3.1 4.2,1.2 6.9,8.1 0,3.8 -6.9,8.1 -4.2,1.2 -10,-3.1 -2.9,-3.1';

function star(cx: number, cy: number, scale: number, fill: string): string {
  return `<polygon points="${STAR_POINTS}" fill="${fill}" transform="translate(${cx},${cy}) scale(${scale})"/>`;
}

function buildCarSVG(): string {
  // Five stars evenly spaced across the black band (x: 14 -> 82, band w=68).
  const bandLeft = 14;
  const bandWidth = 68;
  const starY = 143;
  const step = bandWidth / 5;
  const starXs = [0, 1, 2, 3, 4].map((i) => bandLeft + step * (i + 0.5));
  const stars = starXs.map((x) => star(x, starY, 0.45, '#f2c14e')).join('');

  // Sleek sports-sedan silhouette — rounded nose (top), gently tapered trunk (bottom).
  const bodyPath =
    'M 22 6 Q 48 -2 74 6 L 82 40 L 84 92 L 80 142 Q 74 164 48 166 Q 22 164 16 142 L 12 92 L 14 40 Z';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="172" viewBox="0 0 96 172">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#8a6812"/>
      <stop offset="0.18" stop-color="#d9a534"/>
      <stop offset="0.50" stop-color="#ffe08a"/>
      <stop offset="0.82" stop-color="#d9a534"/>
      <stop offset="1"    stop-color="#8a6812"/>
    </linearGradient>
    <linearGradient id="topShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#ffffff" stop-opacity="0.42"/>
      <stop offset="0.35" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.65" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1"    stop-color="#ffffff" stop-opacity="0.20"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#0d1220"/>
      <stop offset="0.5" stop-color="#243146"/>
      <stop offset="1"   stop-color="#0a0f1c"/>
    </linearGradient>
  </defs>

  <!-- ground shadow -->
  <ellipse cx="48" cy="167" rx="42" ry="6" fill="#000" opacity="0.30"/>

  <!-- side mirrors (behind body edge) -->
  <ellipse cx="10" cy="48" rx="6.5" ry="4" fill="#5a4610"/>
  <ellipse cx="86" cy="48" rx="6.5" ry="4" fill="#5a4610"/>

  <!-- body -->
  <path d="${bodyPath}" fill="url(#gold)" stroke="#5a4610" stroke-width="2"/>
  <!-- metallic top shine -->
  <path d="${bodyPath}" fill="url(#topShine)"/>

  <!-- windshield (front) -->
  <path d="M 24 34 Q 48 30 72 34 L 68 62 Q 48 60 28 62 Z" fill="url(#glass)" stroke="#3a2f10" stroke-width="1"/>
  <!-- windshield reflection -->
  <path d="M 28 36 Q 42 34 54 36 L 50 45 Q 38 46 30 47 Z" fill="#ffffff" opacity="0.18"/>

  <!-- roof panel -->
  <rect x="26" y="64" width="44" height="42" rx="6" fill="#b98a1a" opacity="0.55"/>
  <!-- roof edge highlight -->
  <rect x="26" y="64" width="44" height="4" rx="2" fill="#ffe08a" opacity="0.35"/>

  <!-- rear window -->
  <path d="M 28 108 Q 48 106 68 108 L 70 130 Q 48 132 26 130 Z" fill="url(#glass)" stroke="#3a2f10" stroke-width="1"/>
  <!-- rear reflection -->
  <path d="M 32 110 Q 44 109 56 110 L 54 117 Q 42 119 34 119 Z" fill="#ffffff" opacity="0.12"/>

  <!-- black band across the rear third with 5 gold stars -->
  <rect x="${bandLeft}" y="134" width="${bandWidth}" height="18" fill="#0a0a0e"/>
  <rect x="${bandLeft}" y="134" width="${bandWidth}" height="1.5" fill="#ffffff" opacity="0.12"/>
  ${stars}

  <!-- tail lights -->
  <rect x="18" y="158" width="20" height="5.5" rx="2" fill="#c8241a"/>
  <rect x="58" y="158" width="20" height="5.5" rx="2" fill="#c8241a"/>
  <!-- tail light glow -->
  <rect x="18" y="158" width="20" height="2" rx="1" fill="#ff6a5a" opacity="0.75"/>
  <rect x="58" y="158" width="20" height="2" rx="1" fill="#ff6a5a" opacity="0.75"/>

  <!-- wheel arch hints (dark strokes at side edges) -->
  <rect x="6"  y="30"  width="4" height="22" rx="2" fill="#141418"/>
  <rect x="86" y="30"  width="4" height="22" rx="2" fill="#141418"/>
  <rect x="6"  y="120" width="4" height="22" rx="2" fill="#141418"/>
  <rect x="86" y="120" width="4" height="22" rx="2" fill="#141418"/>
</svg>`;
}

export const CAR_SPRITE_URI =
  'data:image/svg+xml;utf8,' + encodeURIComponent(buildCarSVG());
