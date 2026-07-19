import Phaser from 'phaser';
import { CAR_SPRITE_URI } from './carSprite';

/** Queue the player-car sprite in the loader. Call from preload(). */
export function loadPlayerCarTexture(scene: Phaser.Scene) {
  if (!scene.textures.exists('player-car')) {
    scene.load.image('player-car', CAR_SPRITE_URI);
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
  //     Now with asphalt grain, curb strips, and periodic crosswalk stripes
  //     baked in for a denser, more polished MVP look.
  make('road', 360, 240, () => {
    // base asphalt
    g.fillStyle(0x2b2b30);
    g.fillRect(0, 0, 360, 240);
    // asphalt grain — dense speckle in two tones
    for (let i = 0; i < 340; i++) {
      const x = Math.random() * 360;
      const y = Math.random() * 240;
      g.fillStyle(Math.random() < 0.5 ? 0x353539 : 0x232327, 0.55);
      g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 360;
      const y = Math.random() * 240;
      g.fillStyle(0x3f3f45, 0.35);
      g.fillRect(x, y, 2, 1);
    }
    // curb strips inside road edges (dark then light concrete)
    g.fillStyle(0x1a1a1e);
    g.fillRect(0, 0, 8, 240);
    g.fillRect(352, 0, 8, 240);
    g.fillStyle(0xbfbfc4);
    g.fillRect(8, 0, 2, 240);
    g.fillRect(350, 0, 2, 240);
    // dashed lane dividers (repeat every 40px)
    g.fillStyle(0xf0f0f0, 0.9);
    for (let y = 0; y < 240; y += 40) {
      g.fillRect(118, y + 6, 5, 24);
      g.fillRect(238, y + 6, 5, 24);
    }
    // solid outer edge lines
    g.fillStyle(0xf2c14e); // gold left edge (on brand)
    g.fillRect(12, 0, 3, 240);
    g.fillStyle(0xffffff);
    g.fillRect(345, 0, 3, 240);
    // occasional crosswalk band (once per 240 tile)
    g.fillStyle(0xf5f5f5, 0.9);
    const cwY = 200;
    for (let x = 16; x < 344; x += 14) g.fillRect(x, cwY, 9, 14);
  });

  // --- Sidewalk / shoulder scenery (left side, 60x240 tileable) -----------
  make('shoulder-left', 60, 240, () => {
    // dirt/grass base near road
    g.fillStyle(0x2e3a2a);
    g.fillRect(0, 0, 60, 240);
    // sidewalk slab
    g.fillStyle(0x8a8a90);
    g.fillRect(6, 0, 30, 240);
    g.fillStyle(0x6c6c72);
    g.fillRect(6, 0, 2, 240);
    g.fillRect(34, 0, 2, 240);
    // slab lines
    g.fillStyle(0x5f5f66, 0.7);
    for (let y = 0; y < 240; y += 32) g.fillRect(8, y, 26, 1);

    // building facades (tall block against the outer edge)
    const drawBuilding = (y: number, h: number, color: number, winColor: number) => {
      g.fillStyle(color);
      g.fillRect(38, y, 22, h);
      // roof stripe
      g.fillStyle(0x101014);
      g.fillRect(38, y, 22, 3);
      // windows grid
      g.fillStyle(winColor);
      for (let wy = y + 8; wy < y + h - 6; wy += 12) {
        g.fillRect(42, wy, 5, 6);
        g.fillRect(52, wy, 5, 6);
      }
      // ground shadow
      g.fillStyle(0x000000, 0.25);
      g.fillRect(36, y + h - 2, 24, 2);
    };
    drawBuilding(6,   80, 0xa66a3d, 0xf4d97a);
    drawBuilding(94,  66, 0x6d7a8a, 0xffe89a);
    drawBuilding(168, 66, 0xb85a4c, 0xffe89a);

    // tree between buildings (top of tile) — canopy + trunk
    g.fillStyle(0x2f1a0a);
    g.fillRect(20, 84, 3, 8);
    g.fillStyle(0x3a6b32);
    g.fillCircle(21, 82, 8);
    g.fillStyle(0x4d8a42, 0.9);
    g.fillCircle(24, 80, 5);

    // streetlight (pole + head) around mid-tile
    g.fillStyle(0x1a1a1e);
    g.fillRect(15, 160, 2, 22);
    g.fillRect(11, 160, 10, 2);
    g.fillStyle(0xffe89a);
    g.fillRect(10, 158, 4, 3);
    // faint lamp glow
    g.fillStyle(0xffe89a, 0.15);
    g.fillCircle(12, 160, 7);
  });

  // --- Sidewalk / shoulder scenery (right side, 60x240 tileable, mirrored) --
  make('shoulder-right', 60, 240, () => {
    g.fillStyle(0x2e3a2a);
    g.fillRect(0, 0, 60, 240);
    g.fillStyle(0x8a8a90);
    g.fillRect(24, 0, 30, 240);
    g.fillStyle(0x6c6c72);
    g.fillRect(24, 0, 2, 240);
    g.fillRect(52, 0, 2, 240);
    g.fillStyle(0x5f5f66, 0.7);
    for (let y = 16; y < 240; y += 32) g.fillRect(26, y, 26, 1);

    const drawBuilding = (y: number, h: number, color: number, winColor: number) => {
      g.fillStyle(color);
      g.fillRect(0, y, 22, h);
      g.fillStyle(0x101014);
      g.fillRect(0, y, 22, 3);
      g.fillStyle(winColor);
      for (let wy = y + 8; wy < y + h - 6; wy += 12) {
        g.fillRect(4,  wy, 5, 6);
        g.fillRect(14, wy, 5, 6);
      }
      g.fillStyle(0x000000, 0.25);
      g.fillRect(0, y + h - 2, 24, 2);
    };
    drawBuilding(6,   70, 0x4d5f7a, 0xffe89a);
    drawBuilding(84,  80, 0x8c6a3d, 0xf4d97a);
    drawBuilding(172, 62, 0x5f8a5a, 0xffe89a);

    // parked car silhouette on the shoulder
    g.fillStyle(0x2a2a30);
    g.fillRoundedRect(38, 40, 14, 26, 4);
    g.fillStyle(0x14161c);
    g.fillRoundedRect(40, 46, 10, 8, 2);

    // tree lower
    g.fillStyle(0x2f1a0a);
    g.fillRect(40, 200, 3, 8);
    g.fillStyle(0x3a6b32);
    g.fillCircle(41, 198, 8);
    g.fillStyle(0x4d8a42, 0.9);
    g.fillCircle(38, 196, 5);

    // streetlight
    g.fillStyle(0x1a1a1e);
    g.fillRect(44, 118, 2, 22);
    g.fillRect(44, 118, 10, 2);
    g.fillStyle(0xffe89a);
    g.fillRect(50, 116, 4, 3);
    g.fillStyle(0xffe89a, 0.15);
    g.fillCircle(52, 118, 7);
  });

  // --- Distant parallax silhouette layer (very dark, low detail) ----------
  make('far-bg', 60, 200, () => {
    g.fillStyle(0x171a22);
    g.fillRect(0, 0, 60, 200);
    // rooftop silhouette
    g.fillStyle(0x0d0f16);
    g.fillRect(0, 40, 12, 160);
    g.fillRect(14, 60, 18, 140);
    g.fillRect(34, 30, 10, 170);
    g.fillRect(46, 70, 14, 130);
    // tiny warm windows
    g.fillStyle(0xf2c14e, 0.55);
    for (let y = 90; y < 190; y += 22) {
      g.fillRect(4, y, 2, 3);
      g.fillRect(18, y, 2, 3);
      g.fillRect(36, y, 2, 3);
      g.fillRect(50, y, 2, 3);
    }
  });

  // --- Tiny particle for collision flashes ---------------------------------
  make('spark', 8, 8, () => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 8, 8);
  });

  // --- Gold star pickup (radiant) ------------------------------------------
  make('gold-star', 36, 36, () => {
    const cx = 18, cy = 18, R = 15, r = 6;
    // glow ring
    g.fillStyle(0xf2c14e, 0.25);
    g.fillCircle(cx, cy, 17);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? R : r;
      pts.push(new Phaser.Math.Vector2(cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
    }
    g.fillStyle(0xf2c14e);
    g.fillPoints(pts, true);
    g.lineStyle(1.5, 0x8a6a10);
    g.strokePoints(pts, true, true);
    g.fillStyle(0xffe89a);
    g.fillCircle(cx - 3, cy - 3, 3);
  });

  // --- Shield icon for endless-mode strikes --------------------------------
  make('shield', 30, 34, () => {
    g.fillStyle(0xf2c14e);
    g.beginPath();
    g.moveTo(15, 2);
    g.lineTo(28, 6);
    g.lineTo(28, 18);
    g.lineTo(15, 32);
    g.lineTo(2, 18);
    g.lineTo(2, 6);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x8a6a10);
    g.strokePath();
  });

  // --- Star Magnet pickup (gold horseshoe magnet) -------------------------
  make('magnet', 40, 40, () => {
    // outer glow
    g.fillStyle(0xf2c14e, 0.28);
    g.fillCircle(20, 20, 19);
    // horseshoe body
    g.lineStyle(6, 0xf2c14e);
    g.beginPath();
    g.arc(20, 22, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    // straight legs
    g.fillStyle(0xf2c14e);
    g.fillRect(6, 12, 6, 12);
    g.fillRect(28, 12, 6, 12);
    // silver tips
    g.fillStyle(0xe8e8ef);
    g.fillRect(6, 8, 6, 5);
    g.fillRect(28, 8, 6, 5);
    // stroke pass
    g.lineStyle(1.5, 0x8a6a10);
    g.strokeRect(6, 8, 6, 16);
    g.strokeRect(28, 8, 6, 16);
  });

  // --- Shield aura (soft ring drawn behind the player) --------------------
  make('shield-aura', 80, 80, () => {
    for (let i = 0; i < 6; i++) {
      g.lineStyle(2, 0xf2c14e, 0.22 - i * 0.03);
      g.strokeCircle(40, 40, 34 - i * 3);
    }
    g.fillStyle(0xffe89a, 0.10);
    g.fillCircle(40, 40, 30);
  });


  // --- Headlight glow cone (radial gradient fake) -------------------------
  make('headlight-glow', 220, 320, () => {
    for (let i = 0; i < 10; i++) {
      const a = 0.08 - i * 0.007;
      g.fillStyle(0xfff5c8, a);
      g.beginPath();
      g.moveTo(110, 320);
      g.lineTo(110 - 60 - i * 6, 20 + i * 5);
      g.lineTo(110 + 60 + i * 6, 20 + i * 5);
      g.closePath();
      g.fillPath();
    }
  });

  // --- Pedestrian (stylized gold-and-black walker, top-down) --------------
  make('pedestrian', 20, 28, () => {
    // shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(10, 24, 14, 5);
    // body — gold jacket
    g.fillStyle(0xf2c14e);
    g.fillRoundedRect(4, 10, 12, 12, 4);
    // black pants
    g.fillStyle(0x101014);
    g.fillRect(5, 20, 4, 5);
    g.fillRect(11, 20, 4, 5);
    // head — dark skin base with warm rim
    g.fillStyle(0x1b1b22);
    g.fillCircle(10, 6, 5);
    g.fillStyle(0xc9971f, 0.75);
    g.fillCircle(10, 6, 3);
    // gold hair/hat highlight
    g.fillStyle(0xffe89a);
    g.fillRect(6, 2, 8, 2);
  });

  // --- Dogs (three small breed silhouettes) -------------------------------
  const dog = (key: string, body: number, ear: number) =>
    make(key, 20, 16, () => {
      // shadow
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(10, 14, 14, 4);
      // body
      g.fillStyle(body);
      g.fillRoundedRect(3, 5, 12, 7, 3);
      // head
      g.fillStyle(body);
      g.fillCircle(16, 7, 3);
      // ears
      g.fillStyle(ear);
      g.fillTriangle(15, 4, 17, 4, 16, 1);
      // legs
      g.fillStyle(0x101014);
      g.fillRect(4, 11, 2, 3);
      g.fillRect(12, 11, 2, 3);
      // tail
      g.fillStyle(body);
      g.fillRect(1, 6, 3, 2);
    });
  dog('dog-brown', 0x8a5a2f, 0x4a2f18);
  dog('dog-black', 0x2a2a2f, 0x101014);
  dog('dog-gold',  0xd9a24a, 0x8a6420);

  g.destroy();
}

/** Palette tints applied to the shared pedestrian sprite for outfit variety. */
export const PED_TINTS = [0xffffff, 0x9fd4ff, 0xffb0c8, 0xc8ffb0, 0xfff2a8, 0xd9b0ff] as const;
export const DOG_KEYS = ['dog-brown', 'dog-black', 'dog-gold'] as const;




