/**
 * MultiplayerScene — top-down shared city Phaser scene.
 * All physics are local; state is broadcast at 10 Hz over Realtime.
 */

import Phaser from 'phaser';
import { loadPlayerCarTexture, makeTextures } from '../game/textures';
import { touchControls } from '../game/controls';
import { sound } from '../sound';
import type { MatchNet } from './net';
import {
  CAR_TINTS,
  type CarColor,
  type NetMessage,
  type StateMsg,
  type RemotePlayer,
  type ScatterMsg,
  type StarTakenMsg,
} from './types';
import { BLOCK_SIZE, BLOCKS, ROAD_W, WORLD, buildCity, type CityWorld, type CityObstacle } from './worldGen';

export const MP_VIEW_W = 480;
export const MP_VIEW_H = 720;

const MPH_TO_PX = 3.2;
const MAX_MPH = 60;
const SPEEDING_MPH = 45;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MpSceneInit {
  net: MatchNet;
  uid: string;
  displayName: string;
  color: CarColor;
  seed: number;
  players: { uid: string; displayName: string; color: CarColor }[];
  durationS: number;
  startAt: number; // epoch ms after countdown
}

type WASD = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

interface StarSprite {
  id: number;
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  respawnAt?: number; // ms epoch
  respawnX?: number;
  respawnY?: number;
}

export class MultiplayerScene extends Phaser.Scene {
  private cfg!: MpSceneInit;
  private world!: CityWorld;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASD;

  // Local car
  private car!: Phaser.GameObjects.Image;
  private px = 0;
  private py = 0;
  private angle = 0;
  private mph = 0;
  private stars = 0;
  private invulnUntil = 0;
  private lastSpeedingAt = 0;
  private eliminated = false;

  // Pedestrians (deterministic from seed; walk fixed patrols)
  private peds: { sprite: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; ax: number; ay: number; bx: number; by: number }[] = [];

  // Remotes
  private remotes = new Map<string, {
    data: RemotePlayer;
    sprite: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    tx: number; ty: number; ta: number;
  }>();

  // World
  private obstacleSprites = new Map<number, { ob: CityObstacle; sprite: Phaser.GameObjects.Image }>();
  private stars_ = new Map<number, StarSprite>();
  private scatterStars: { sprite: Phaser.GameObjects.Image; x: number; y: number; expiresAt: number }[] = [];
  private takenStarIds = new Set<number>();
  private starRespawnCursor = 0;

  // HUD (managed by React overlay; this scene fires an event with state)
  private lastBroadcastAt = 0;
  private lastLabelText = new Map<string, string>();
  private violationTint = 0;

  constructor() { super('multiplayer'); }

  init(data: MpSceneInit) {
    this.cfg = data;
  }

  preload() {
    loadPlayerCarTexture(this);
  }

  create() {
    makeTextures(this);
    this.world = buildCity(this.cfg.seed);

    // Camera + world bounds
    this.cameras.main.setBounds(-40, -40, WORLD + 80, WORLD + 80);
    this.physics?.world?.setBounds?.(0, 0, WORLD, WORLD);

    // Background grass
    this.add.rectangle(WORLD / 2, WORLD / 2, WORLD, WORLD, 0x2e3a2e).setDepth(-10);

    // Draw the road grid with Graphics (single pass, cheap)
    const g = this.add.graphics().setDepth(-9);
    g.fillStyle(0x2e2e33);
    for (let i = 0; i <= BLOCKS; i++) {
      // horizontal road
      g.fillRect(0, i * BLOCK_SIZE, WORLD, ROAD_W);
      // vertical road
      g.fillRect(i * BLOCK_SIZE, 0, ROAD_W, WORLD);
    }
    // Lane dashes
    g.fillStyle(0xffffff, 0.7);
    for (let i = 0; i <= BLOCKS; i++) {
      const y = i * BLOCK_SIZE + ROAD_W / 2 - 2;
      for (let x = 8; x < WORLD; x += 32) g.fillRect(x, y, 16, 4);
      const x = i * BLOCK_SIZE + ROAD_W / 2 - 2;
      for (let y2 = 8; y2 < WORLD; y2 += 32) g.fillRect(x, y2, 4, 16);
    }
    // Buildings (dark blocks inside each city block)
    g.fillStyle(0x1b1b22);
    for (let bx = 0; bx < BLOCKS; bx++) {
      for (let by = 0; by < BLOCKS; by++) {
        const x = bx * BLOCK_SIZE + ROAD_W + 12;
        const y = by * BLOCK_SIZE + ROAD_W + 12;
        const w = BLOCK_SIZE - ROAD_W - 24;
        const h = BLOCK_SIZE - ROAD_W - 24;
        g.fillRect(x, y, w, h);
      }
    }
    // Gold world boundary
    g.lineStyle(6, 0xf2c14e, 0.9);
    g.strokeRect(0, 0, WORLD, WORLD);

    // Obstacles
    for (const ob of this.world.obstacles) {
      let key = 'cone';
      if (ob.type === 'parkedCar') key = 'car-gray';
      else if (ob.type === 'stopSign') key = 'stop-sign';
      else if (ob.type === 'trafficLight') key = 'light-green';
      const s = this.add.image(ob.x, ob.y, key).setDepth(1);
      if (ob.type === 'parkedCar') s.setDisplaySize(28, 52);
      this.obstacleSprites.set(ob.id, { ob, sprite: s });
    }

    // Stars
    for (const sp of this.world.starSpawns) {
      const spr = this.add.image(sp.x, sp.y, 'gold-star').setDepth(3).setScale(1.1);
      this.stars_.set(sp.id, { id: sp.id, sprite: spr, active: true });
    }

    // Pedestrians — seeded deterministic positions at road intersections.
    // They patrol a short segment across the road, back and forth.
    const rng = mulberry32(this.cfg.seed ^ 0x9e3779b1);
    const pedCount = 24;
    for (let i = 0; i < pedCount; i++) {
      const bx = Math.floor(rng() * BLOCKS);
      const by = Math.floor(rng() * BLOCKS);
      const horizontal = rng() > 0.5;
      const cx = bx * BLOCK_SIZE + ROAD_W / 2;
      const cy = by * BLOCK_SIZE + ROAD_W / 2;
      const halfSpan = 40 + rng() * 30;
      const ax = horizontal ? cx - halfSpan : cx;
      const ay = horizontal ? cy : cy - halfSpan;
      const bx2 = horizontal ? cx + halfSpan : cx;
      const by2 = horizontal ? cy : cy + halfSpan;
      const speed = 22 + rng() * 22;
      const dirx = bx2 - ax, diry = by2 - ay;
      const dl = Math.hypot(dirx, diry) || 1;
      const spr = this.add.image(ax, ay, 'pedestrian').setDepth(4).setDisplaySize(16, 22);
      this.peds.push({
        sprite: spr, x: ax, y: ay, vx: (dirx / dl) * speed, vy: (diry / dl) * speed,
        ax, ay, bx: bx2, by: by2,
      });
    }

    // Local + remote cars
    const spawnList = this.world.spawnPoints;
    this.cfg.players.forEach((p, i) => {
      const spawn = spawnList[i % spawnList.length];
      if (p.uid === this.cfg.uid) {
        this.car = this.add.image(spawn.x, spawn.y, 'player-car')
          .setDisplaySize(28, 58).setDepth(6).setTint(CAR_TINTS[this.cfg.color]);
        this.px = spawn.x; this.py = spawn.y;
        this.add.text(spawn.x, spawn.y - 36, this.cfg.displayName, this.labelStyle('#ffffff'))
          .setOrigin(0.5).setDepth(7);
        this.cameras.main.startFollow(this.car, true, 0.15, 0.15);
      } else {
        const spr = this.add.image(spawn.x, spawn.y, 'player-car')
          .setDisplaySize(28, 58).setDepth(6).setTint(CAR_TINTS[p.color]).setAlpha(0.95);
        const label = this.add.text(spawn.x, spawn.y - 36, p.displayName, this.labelStyle('#ffe89a'))
          .setOrigin(0.5).setDepth(7);
        this.remotes.set(p.uid, {
          data: { uid: p.uid, displayName: p.displayName, color: p.color, stars: 0, x: spawn.x, y: spawn.y, a: 0, lastAt: Date.now() },
          sprite: spr, label, tx: spawn.x, ty: spawn.y, ta: 0,
        });
      }
    });

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WASD;

    // Sound: context was unlocked by the Start Match button; start immediately.
    sound.init();
    sound.startEngine();
    if (!sound.muted && !sound.musicMuted) sound.playTrack('starRush');
    const unlock = () => {
      sound.init();
      if (sound.isReady()) {
        sound.startEngine();
        if (!sound.muted && !sound.musicMuted) sound.playTrack('starRush');
      }
    };
    this.input.keyboard!.on('keydown', unlock);
    this.input.on('pointerdown', unlock);

    this.events.once('shutdown', () => { sound.stopEngine(); sound.stopMusic(); });

    // 3-2-1 countdown banner
    this.showCountdown();
  }

  private labelStyle(color: string) {
    return {
      fontFamily: '"Bebas Neue", sans-serif',
      fontSize: '14px',
      color,
      stroke: '#101014',
      strokeThickness: 4,
    } as Phaser.Types.GameObjects.Text.TextStyle;
  }

  private showCountdown() {
    const banner = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '3', {
      fontFamily: '"Bebas Neue", sans-serif',
      fontSize: '120px',
      color: '#f2c14e',
      stroke: '#101014',
      strokeThickness: 12,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    const tick = () => {
      const remaining = Math.ceil((this.cfg.startAt - Date.now()) / 1000);
      if (remaining <= 0) {
        banner.setText('GO!');
        this.tweens.add({ targets: banner, alpha: 0, duration: 600, onComplete: () => banner.destroy() });
      } else {
        banner.setText(String(remaining));
        this.time.delayedCall(500, tick);
      }
    };
    tick();
  }

  // Called by React wrapper when a network message arrives.
  applyNetMessage(msg: NetMessage) {
    if (msg.t === 'state') this.applyRemoteState(msg);
    else if (msg.t === 'star_taken') this.applyStarTaken(msg);
    else if (msg.t === 'scatter') this.applyScatter(msg);
    else if (msg.t === 'elim') {
      const r = this.remotes.get(msg.uid);
      if (r) { r.sprite.setAlpha(0.35).setTint(0x666666); r.data.stars = 0; }
    }
  }

  private applyRemoteState(m: StateMsg) {
    if (m.uid === this.cfg.uid) return;
    const r = this.remotes.get(m.uid);
    if (!r) return;
    r.tx = m.x; r.ty = m.y; r.ta = m.a;
    r.data.stars = m.stars;
    r.data.lastAt = Date.now();
  }

  private applyStarTaken(m: StarTakenMsg) {
    if (this.takenStarIds.has(m.starId)) return;
    this.takenStarIds.add(m.starId);
    const s = this.stars_.get(m.starId);
    if (!s) return;
    s.active = false;
    s.sprite.setVisible(false);
    // Schedule respawn at next seeded spawn in round-robin order (deterministic per-client)
    const idx = (this.starRespawnCursor++) % this.world.starSpawns.length;
    const spawn = this.world.starSpawns[idx];
    s.respawnAt = Date.now() + 12000;
    s.respawnX = spawn.x;
    s.respawnY = spawn.y;
  }

  private applyScatter(m: ScatterMsg) {
    for (const id of m.starIds) {
      const spr = this.add.image(m.x + (Math.random() - 0.5) * 60, m.y + (Math.random() - 0.5) * 60, 'gold-star')
        .setDepth(4).setScale(0.9);
      this.scatterStars.push({ sprite: spr, x: spr.x, y: spr.y, expiresAt: Date.now() + 30000 });
    }
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (Date.now() < this.cfg.startAt) return; // frozen during countdown

    this.updatePedestrians(dt);
    if (!this.eliminated) {
      this.driveLocal(dt);
      this.checkStarPickup();
      this.checkScatterPickup();
      this.checkObstacleCollisions(time);
      this.checkRemoteCollisions(time);
      this.checkPedCollision(time);
      this.checkSpeeding(time);
    }
    this.interpolateRemotes(dt);
    this.updateStarRespawns();
    this.updateHudBroadcast(time);
    sound.updateEngine(Math.min(1, this.mph / MAX_MPH));
  }

  private updatePedestrians(dt: number) {
    for (const p of this.peds) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Bounce between endpoints
      const dx1 = p.x - p.ax, dy1 = p.y - p.ay;
      const dx2 = p.x - p.bx, dy2 = p.y - p.by;
      const past = (p.vx > 0 && (p.x > Math.max(p.ax, p.bx))) ||
                   (p.vx < 0 && (p.x < Math.min(p.ax, p.bx))) ||
                   (p.vy > 0 && (p.y > Math.max(p.ay, p.by))) ||
                   (p.vy < 0 && (p.y < Math.min(p.ay, p.by)));
      if (past) { p.vx = -p.vx; p.vy = -p.vy; }
      p.sprite.setPosition(p.x, p.y);
      // subtle waddle
      p.sprite.setAngle(Math.sin((dx1 + dy1) * 0.2) * 6);
      void dx2; void dy2;
    }
  }

  private checkPedCollision(time: number) {
    if (time < this.invulnUntil) return;
    for (const p of this.peds) {
      const dx = this.px - p.x, dy = this.py - p.y;
      if (dx * dx + dy * dy < 18 * 18 && this.mph > 3) {
        this.eliminatedByPedestrian();
        return;
      }
    }
  }

  private eliminatedByPedestrian() {
    if (this.eliminated) return;
    this.eliminated = true;
    this.stars = 0;
    this.mph = 0;
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(400, 255, 40, 40);
    sound.collision();
    try { navigator.vibrate?.([80, 40, 120]); } catch { /* ignore */ }
    const t = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'ELIMINATED\nHIT A PEDESTRIAN', {
      fontFamily: '"Bebas Neue", sans-serif', fontSize: '44px', color: '#ff5a4e',
      stroke: '#101014', strokeThickness: 10, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: t, alpha: 0.7, yoyo: true, repeat: -1, duration: 700 });
    this.car.setAlpha(0.35).setTint(0x666666);
    this.game.events.emit('mp-elim', { uid: this.cfg.uid });
    this.cfg.net.send({ t: 'elim', uid: this.cfg.uid });
    // Persist zero stars immediately
    this.cfg.net.send({
      t: 'state', uid: this.cfg.uid, x: Math.round(this.px), y: Math.round(this.py),
      a: Math.round(this.angle), s: 0, stars: 0, ts: Date.now(),
    });
  }

  private driveLocal(dt: number) {
    const gas = this.cursors.up.isDown || this.wasd.W.isDown || touchControls.gas;
    const brake = this.cursors.down.isDown || this.wasd.S.isDown || touchControls.brake;
    const left = this.cursors.left.isDown || this.wasd.A.isDown || touchControls.left;
    const right = this.cursors.right.isDown || this.wasd.D.isDown || touchControls.right;

    if (gas) this.mph += 42 * dt;
    else if (brake) this.mph -= 80 * dt;
    else this.mph -= 12 * dt;
    this.mph = Phaser.Math.Clamp(this.mph, 0, MAX_MPH);

    const turn = 90 * dt * Phaser.Math.Clamp(this.mph / 15, 0, 1);
    if (left) this.angle -= turn;
    if (right) this.angle += turn;

    const rad = Phaser.Math.DegToRad(this.angle - 90);
    this.px += Math.cos(rad) * this.mph * MPH_TO_PX * dt;
    this.py += Math.sin(rad) * this.mph * MPH_TO_PX * dt;
    this.px = Phaser.Math.Clamp(this.px, 8, WORLD - 8);
    this.py = Phaser.Math.Clamp(this.py, 8, WORLD - 8);
    this.car.setPosition(this.px, this.py);
    this.car.setAngle(this.angle);
  }

  private checkStarPickup() {
    for (const s of this.stars_.values()) {
      if (!s.active) continue;
      const dx = this.px - s.sprite.x, dy = this.py - s.sprite.y;
      if (dx * dx + dy * dy < 24 * 24) {
        s.active = false;
        s.sprite.setVisible(false);
        this.takenStarIds.add(s.id);
        this.stars += 1;
        sound.starPickup();
        this.cfg.net.send({ t: 'star_taken', uid: this.cfg.uid, starId: s.id, ts: Date.now() });
        // Schedule respawn locally too
        const idx = (this.starRespawnCursor++) % this.world.starSpawns.length;
        const spawn = this.world.starSpawns[idx];
        s.respawnAt = Date.now() + 12000;
        s.respawnX = spawn.x;
        s.respawnY = spawn.y;
      }
    }
  }

  private checkScatterPickup() {
    for (let i = this.scatterStars.length - 1; i >= 0; i--) {
      const s = this.scatterStars[i];
      const dx = this.px - s.x, dy = this.py - s.y;
      if (dx * dx + dy * dy < 22 * 22) {
        this.stars += 1;
        sound.starPickup();
        s.sprite.destroy();
        this.scatterStars.splice(i, 1);
      } else if (Date.now() > s.expiresAt) {
        s.sprite.destroy();
        this.scatterStars.splice(i, 1);
      }
    }
  }

  private checkObstacleCollisions(time: number) {
    if (time < this.invulnUntil) return;
    for (const { ob, sprite } of this.obstacleSprites.values()) {
      const dx = this.px - sprite.x, dy = this.py - sprite.y;
      const d2 = dx * dx + dy * dy;
      if (ob.type === 'cone') {
        if (d2 < 18 * 18) {
          this.penalize(1, 'CONE -1');
          sound.collision();
          sprite.setVisible(false);
          this.invulnUntil = time + 500;
        }
      } else if (ob.type === 'parkedCar') {
        if (d2 < 30 * 30) {
          this.penalize(3, 'CRASH -3', true);
          this.mph *= 0.3;
          this.invulnUntil = time + 1200;
        }
      } else if (ob.type === 'trafficLight' || ob.type === 'stopSign') {
        // Simple "ran the intersection" check: if we're within 20px of center at >20mph
        if (d2 < 24 * 24 && this.mph > 20) {
          if (ob.type === 'stopSign') this.penalize(2, 'STOP SIGN -2');
          else this.penalize(2, 'RED LIGHT -2');
          this.invulnUntil = time + 1500;
        }
      }
    }
  }

  private checkRemoteCollisions(time: number) {
    if (time < this.invulnUntil) return;
    for (const r of this.remotes.values()) {
      const dx = this.px - r.sprite.x, dy = this.py - r.sprite.y;
      if (dx * dx + dy * dy < 28 * 28) {
        this.penalize(3, 'CRASH -3', true);
        this.mph *= 0.3;
        this.invulnUntil = time + 1200;
      }
    }
  }

  private checkSpeeding(time: number) {
    if (this.mph > SPEEDING_MPH && time - this.lastSpeedingAt > 5000) {
      this.lastSpeedingAt = time;
      this.penalize(1, 'SPEEDING -1');
    }
  }

  private penalize(cost: number, label: string, scatter = false) {
    const actualCost = Math.min(cost, this.stars);
    this.stars = Math.max(0, this.stars - cost);
    this.flashViolation(label);
    if (cost >= 3) sound.collision();
    this.cameras.main.shake(120, 0.006);
    if (scatter && actualCost > 0) {
      const ids: number[] = [];
      for (let i = 0; i < actualCost; i++) ids.push(-Date.now() - i); // scatter ids never collide with world ids
      this.cfg.net.send({ t: 'scatter', starIds: ids, x: this.px, y: this.py, ts: Date.now() });
      this.applyScatter({ t: 'scatter', starIds: ids, x: this.px, y: this.py, ts: Date.now() });
    }
  }

  private flashViolation(text: string) {
    const t = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 80, text, {
      fontFamily: '"Bebas Neue", sans-serif',
      fontSize: '40px',
      color: '#ff5a4e',
      stroke: '#101014',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 900, onComplete: () => t.destroy() });
  }

  private interpolateRemotes(dt: number) {
    const lerp = Math.min(1, dt * 8);
    for (const r of this.remotes.values()) {
      r.sprite.x = Phaser.Math.Linear(r.sprite.x, r.tx, lerp);
      r.sprite.y = Phaser.Math.Linear(r.sprite.y, r.ty, lerp);
      r.sprite.setAngle(Phaser.Math.Angle.RotateTo(
        Phaser.Math.DegToRad(r.sprite.angle),
        Phaser.Math.DegToRad(r.ta),
        dt * 6
      ) * (180 / Math.PI));
      r.label.setPosition(r.sprite.x, r.sprite.y - 36);
      const txt = `${r.data.displayName} · ${r.data.stars}`;
      if (this.lastLabelText.get(r.data.uid) !== txt) {
        r.label.setText(txt);
        this.lastLabelText.set(r.data.uid, txt);
      }
    }
  }

  private updateStarRespawns() {
    const now = Date.now();
    for (const s of this.stars_.values()) {
      if (!s.active && s.respawnAt && now >= s.respawnAt && s.respawnX != null && s.respawnY != null) {
        s.sprite.setPosition(s.respawnX, s.respawnY).setVisible(true);
        s.active = true;
        s.respawnAt = undefined;
        this.takenStarIds.delete(s.id);
      }
    }
  }

  private updateHudBroadcast(time: number) {
    if (time - this.lastBroadcastAt < 100) return;
    this.lastBroadcastAt = time;
    const msg: StateMsg = {
      t: 'state', uid: this.cfg.uid,
      x: Math.round(this.px), y: Math.round(this.py),
      a: Math.round(this.angle), s: Math.round(this.mph),
      stars: this.stars, ts: Date.now(),
    };
    this.cfg.net.send(msg);
    // Emit local HUD update for React
    this.game.events.emit('mp-hud', {
      stars: this.stars,
      remotes: [...this.remotes.values()].map((r) => ({ ...r.data })),
    });
  }

  getFinalStars() { return this.stars; }
}
