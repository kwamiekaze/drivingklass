import Phaser from 'phaser';

/**
 * All game art is generated at runtime so the MVP ships with zero image files.
 *
 * REPLACING ASSETS LATER:
 * - The player car is the SVG below (gold, 5 stars, DRIVINGKLASS roof sign,
 *   matching the brand photo). To use a real top-down PNG of your car instead,
 *   delete makePlayerCarTexture() and load your image in DrivingScene.preload():
 *       this.load.image('player-car', 'assets/your-car-topdown.png')
 *   Keep roughly a 48x84 on-screen footprint (portrait, nose pointing up).
 */

const STAR =
  '0,-10 2.9,-3.1 10,-3.1 4.2,1.2 6.9,8.1 0,3.8 -6.9,8.1 -4.2,1.2 -10,-3.1 -2.9,-3.1';

function star(x: number, y: number, scale: number, fill: string): string {
  return `<polygon points="${STAR}" fill="${fill}" transform="translate(${x},${y}) scale(${scale})"/>`;
}

/** Top-down gold DrivingKlass training car with 5 stars + roof sign. */
function playerCarSVG(): string {
  const stars = [0, 1, 2, 3, 4]
    .map((i) => star(20 + i * 14, 128, 0.55, '#7a5c00'))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="168" viewBox="0 0 96 168">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9971f"/>
      <stop offset="0.5" stop-color="#f2c14e"/>
      <stop offset="1" stop-color="#c9971f"/>
    </linearGradient>
  </defs>
  <rect x="2" y="26" width="10" height="30" rx="4" fill="#15151a"/>
  <rect x="84" y="26" width="10" height="30" rx="4" fill="#15151a"/>
  <rect x="2" y="118" width="10" height="30" rx="4" fill="#15151a"/>
  <rect x="84" y="118" width="10" height="30" rx="4" fill="#15151a"/>
  <rect x="8" y="8" width="80" height="152" rx="26" fill="url(#gold)" stroke="#8a6a10" stroke-width="3"/>
  <rect x="16" y="34" width="64" height="24" rx="10" fill="#1b1b22"/>
  <rect x="16" y="112" width="64" height="20" rx="9" fill="#1b1b22"/>
  <rect x="14" y="62" width="68" height="46" rx="10" fill="#e2ae2e" stroke="#8a6a10" stroke-width="2"/>
  <rect x="20" y="70" width="56" height="16" rx="6" fill="#101014"/>
  <text x="48" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#f2c14e" letter-spacing="0.5">DRIVINGKLASS</text>
  ${stars}
  <rect x="16" y="12" width="14" height="6" rx="3" fill="#fff8dc"/>
  <rect x="66" y="12" width="14" height="6" rx="3" fill="#fff8dc"/>
  <rect x="16" y="150" width="14" height="6" rx="3" fill="#b03a2e"/>
  <rect x="66" y="150" width="14" height="6" rx="3" fill="#b03a2e"/>
</svg>`;
}

function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/** Queue the player-car SVG in the loader. Call from preload(). */
export function loadPlayerCarTexture(scene: Phaser.Scene) {
  if (!scene.textures.exists('player-car')) {
    scene.load.image('player-car', svgToDataUri(playerCarSVG()));
  }
}

/** Build every other sprite with Graphics. Call from create(). */
export function makeTextures(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const make = (key: string, w: number, h: number, draw: () => void) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  // --- Traffic cone -------------------------------------------------------
  make('cone', 30, 32, () => {
    g.fillStyle(0xe0620d);
    g.fillTriangle(15, 2, 4, 26, 26, 26);
    g.fillStyle(0xffffff);
    g.fillRect(9, 14, 12, 4);
    g.fillStyle(0xc4560c);
    g.fillRect(2, 26, 26, 5);
  });

  // --- NPC cars (parked + traffic variants) -------------------------------
  const npcCar = (key: string, body: number, glass: number) =>
    make(key, 52, 96, () => {
      g.fillStyle(0x111116);
      g.fillRoundedRect(0, 14, 6, 18, 3);
      g.fillRoundedRect(46, 14, 6, 18, 3);
      g.fillRoundedRect(0, 64, 6, 18, 3);
      g.fillRoundedRect(46, 64, 6, 18, 3);
      g.fillStyle(body);
      g.fillRoundedRect(4, 2, 44, 92, 14);
      g.fillStyle(glass);
      g.fillRoundedRect(9, 18, 34, 14, 6);
      g.fillRoundedRect(9, 62, 34, 12, 6);
      g.fillStyle(0xfff8dc);
      g.fillRect(9, 4, 9, 4);
      g.fillRect(34, 4, 9, 4);
    });
  npcCar('car-gray', 0x8b93a1, 0x1c222b);
  npcCar('car-blue', 0x3f6ea6, 0x14202e);
  npcCar('car-red', 0xa63f3f, 0x2b1414);
  npcCar('car-white', 0xd9dce1, 0x232830);

  // --- Stop sign (octagon on pole) ----------------------------------------
  make('stop-sign', 44, 78, () => {
    g.fillStyle(0x6b6b70);
    g.fillRect(20, 36, 5, 42);
    g.fillStyle(0xb01e28);
    const cx = 22,
      cy = 20,
      r = 19;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const a = Phaser.Math.DegToRad(22.5 + i * 45);
      pts.push(new Phaser.Math.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    g.fillPoints(pts, true);
    g.lineStyle(2.5, 0xffffff);
    g.strokePoints(pts, true, true);
  });

  // --- White stop line across a lane --------------------------------------
  make('stop-line', 120, 10, () => {
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(0, 0, 120, 10);
  });

  // --- Traffic light (3 states) -------------------------------------------
  const light = (key: string, on: 0 | 1 | 2) =>
    make(key, 34, 92, () => {
      g.fillStyle(0x55555c);
      g.fillRect(14, 60, 6, 32);
      g.fillStyle(0x1a1a1f);
      g.fillRoundedRect(3, 2, 28, 62, 8);
      const colors = [0xff3b30, 0xffcc00, 0x34c759];
      colors.forEach((c, i) => {
        g.fillStyle(i === on ? c : 0x3a3a40);
        g.fillCircle(17, 13 + i * 19, 7);
      });
    });
  light('light-red', 0);
  light('light-yellow', 1);
  light('light-green', 2);

  // --- Checkpoint gate ------------------------------------------------------
  make('checkpoint', 360, 14, () => {
    g.fillStyle(0xf2c14e, 0.55);
    for (let x = 0; x < 360; x += 30) g.fillRect(x, 0, 18, 14);
  });

  // --- Finish line -----------------------------------------------------------
  make('finish', 360, 24, () => {
    for (let x = 0; x < 360; x += 24) {
      g.fillStyle(0xffffff);
      g.fillRect(x, 0, 12, 12);
      g.fillRect(x + 12, 12, 12, 12);
      g.fillStyle(0x111114);
      g.fillRect(x + 12, 0, 12, 12);
      g.fillRect(x, 12, 12, 12);
    }
  });

  // --- One tileable road strip (3 lanes, dashed dividers, edge lines) -----
  make('road', 360, 80, () => {
    g.fillStyle(0x2e2e33);
    g.fillRect(0, 0, 360, 80);
    g.fillStyle(0xffffff, 0.8); // dashed lane dividers
    g.fillRect(118, 8, 5, 44);
    g.fillRect(238, 8, 5, 44);
    g.fillStyle(0xf2c14e); // solid gold edge lines (on brand)
    g.fillRect(2, 0, 4, 80);
    g.fillStyle(0xffffff);
    g.fillRect(354, 0, 4, 80);
  });

  // --- Tiny particle for collision flashes ---------------------------------
  make('spark', 8, 8, () => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 8, 8);
  });

  g.destroy();
}
