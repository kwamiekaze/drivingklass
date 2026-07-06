import Phaser from 'phaser';
import { getLevel } from './levels';
import { ScoreTracker, buildResult, POINTS, type PointKey } from './scoring';
import { touchControls } from './controls';
import { loadPlayerCarTexture, makeTextures } from './textures';
import { GAME_EVENTS, getDifficulty, type LevelConfig, type ObstacleType, type Difficulty, type DifficultyConfig } from './types';
import { sound } from '../sound';

export const GAME_W = 480;
export const GAME_H = 800;

const ROAD_X = 60;
const ROAD_W = 360;
const LANE_X = [120, 240, 360];
const DIVIDERS = [180, 300];
const PLAYER_Y = 620;
const MPH_TO_PX = 5.5;
const DIFF_INDEX: Record<string, number> = { learner: 0, licensed: 1, instructor: 2, legend: 3 };

type WASD = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

interface Obstacle {
  type: ObstacleType;
  d: number;
  lane: number;
  sprite: Phaser.GameObjects.Image;
  line?: Phaser.GameObjects.Image;
  resolved?: boolean;
  hit?: boolean;
  stopped?: boolean;
  nearMissed?: boolean;
  mph?: number;
  phase?: number;
  state?: 'red' | 'yellow' | 'green';
  _ramped?: boolean;
  // pedestrian fields
  pedX?: number;         // current world x
  pedVx?: number;        // px/sec across road
  pedTelegraph?: number; // seconds remaining pausing before crossing
  pedCrossed?: boolean;  // fully across road
  pedSafeAwarded?: boolean;
}


export class DrivingScene extends Phaser.Scene {
  private level!: LevelConfig;
  private difficulty!: DifficultyConfig;
  private effectiveLength = 0;
  private effectiveGap = 0;
  private tracker!: ScoreTracker;

  private road!: Phaser.GameObjects.TileSprite;
  private shoulderL!: Phaser.GameObjects.TileSprite;
  private shoulderR!: Phaser.GameObjects.TileSprite;
  private farBgL!: Phaser.GameObjects.TileSprite;
  private farBgR!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.GameObjects.Image;
  private headlightL?: Phaser.GameObjects.Image;
  private headlightR?: Phaser.GameObjects.Image;
  private obstacles: Obstacle[] = [];
  private finishSprite!: Phaser.GameObjects.Image;

  // Animated score readout (lerps toward tracker.score)
  private displayScore = 0;


  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASD;

  private mph = 0;
  private prevMph = 0;
  private traveled = 0;
  private finished = false;
  private invulnUntil = 0;
  private speedingTimer = 0;
  private cleanTimer = 0;
  private laneCrossing = false;
  private laneCrossCooldown = 0;

  // Endless
  private strikes = 0;
  private lastRampAt = 0;
  private endlessSpawnCursor = 500;
  private endlessTrafficMul = 1;
  private endlessGap = 260;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private starHudText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private shieldSprites: Phaser.GameObjects.Image[] = [];
  private muteBtn!: Phaser.GameObjects.Text;

  // Skid marks pool
  private skidPool: Phaser.GameObjects.Rectangle[] = [];
  private skidLastAt = 0;

  constructor() {
    super('driving');
  }

  init(data: { levelId?: string; difficulty?: Difficulty }) {
    this.level = getLevel(data.levelId ?? 'parking-lot');
    this.difficulty = getDifficulty(data.difficulty);
    this.effectiveLength = this.level.endless ? Infinity : this.level.length * this.difficulty.lengthMul;
    this.effectiveGap = this.level.obstacleGap * this.difficulty.gapMul;
    this.tracker = new ScoreTracker();
    this.obstacles = [];
    this.mph = 0;
    this.prevMph = 0;
    this.traveled = 0;
    this.finished = false;
    this.invulnUntil = 0;
    this.speedingTimer = 0;
    this.cleanTimer = 0;
    this.laneCrossing = false;
    this.laneCrossCooldown = 0;
    this.strikes = 0;
    this.lastRampAt = 0;
    this.endlessSpawnCursor = 500;
    this.endlessTrafficMul = 1;
    this.endlessGap = this.effectiveGap;
    this.shieldSprites = [];
    this.skidPool = [];
    this.skidLastAt = 0;
  }

  preload() {
    loadPlayerCarTexture(this);
  }

  create() {
    makeTextures(this);
    const lvl = this.level;

    // Far background silhouettes (parallax — scroll at 45% road speed)
    this.farBgL = this.add.tileSprite(0, 0, ROAD_X, GAME_H, 'far-bg').setOrigin(0);
    this.farBgR = this.add.tileSprite(ROAD_X + ROAD_W, 0, GAME_W - ROAD_X - ROAD_W, GAME_H, 'far-bg')
      .setOrigin(0).setFlipX(true);
    // Sidewalk + buildings + trees (scroll matched to road)
    this.shoulderL = this.add.tileSprite(0, 0, ROAD_X, GAME_H, 'shoulder-left').setOrigin(0);
    this.shoulderR = this.add.tileSprite(ROAD_X + ROAD_W, 0, GAME_W - ROAD_X - ROAD_W, GAME_H, 'shoulder-right').setOrigin(0);
    this.road = this.add.tileSprite(ROAD_X, 0, ROAD_W, GAME_H, 'road').setOrigin(0);

    if (lvl.nightAlpha) {
      this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0a18, lvl.nightAlpha).setOrigin(0).setDepth(15);
    }

    if (lvl.endless) this.buildEndlessSeed();
    else this.buildCourse();

    this.displayScore = 0;


    this.player = this.add.image(LANE_X[1], PLAYER_Y, 'player-car').setDisplaySize(44, 92).setDepth(10);

    // Night headlight glow (rendered BELOW player)
    if (lvl.nightAlpha) {
      this.headlightL = this.add.image(LANE_X[1] - 12, PLAYER_Y - 40, 'headlight-glow')
        .setOrigin(0.5, 1).setScale(0.7, 0.9).setDepth(9).setAlpha(0.85);
      this.headlightR = this.add.image(LANE_X[1] + 12, PLAYER_Y - 40, 'headlight-glow')
        .setOrigin(0.5, 1).setScale(0.7, 0.9).setDepth(9).setAlpha(0.85);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WASD;

    this.buildHud();
    this.showBanner(lvl.name, `${this.difficulty.label} · ${lvl.subtitle}`);

    // Sound: initialize on first input, start engine and background music.
    const unlockAudio = () => {
      sound.init();
      if (sound.isReady()) {
        sound.startEngine();
        if (!sound.muted) sound.startMusic();
      }
    };
    this.input.keyboard!.on('keydown', unlockAudio);
    this.input.on('pointerdown', unlockAudio);

    this.events.once('shutdown', () => {
      sound.stopEngine();
      sound.stopMusic();
    });
  }


  // ------------------------------------------------------------- course ---
  private buildCourse() {
    const lvl = this.level;
    const has = (t: ObstacleType) => lvl.features.includes(t);
    const reserved: number[] = [];
    const reserve = (d: number) => reserved.push(d);
    const isFree = (d: number, pad = 220) => reserved.every((r) => Math.abs(r - d) > pad);
    const totalLen = this.effectiveLength;

    if (has('checkpoint')) {
      for (let i = 1; i <= 3; i++) {
        const d = (totalLen * i) / 4;
        reserve(d);
        this.spawn('checkpoint', d, 1);
      }
    }
    if (has('stopSign')) {
      for (let d = 1400; d < totalLen - 800; d += 2600) {
        if (!isFree(d)) continue;
        reserve(d);
        this.spawn('stopSign', d, 2);
      }
    }
    if (has('trafficLight')) {
      for (let d = 2600; d < totalLen - 800; d += 3200) {
        if (!isFree(d)) continue;
        reserve(d);
        this.spawn('trafficLight', d, 0);
      }
    }

    const rnd = new Phaser.Math.RandomDataGenerator([lvl.id, this.difficulty.id]);
    const pool: ObstacleType[] = [];
    if (has('cone')) pool.push('cone', 'cone');
    if (has('parkedCar')) pool.push('parkedCar');
    if (has('traffic')) pool.push('traffic');

    for (let d = 700; d < totalLen - 600; d += this.effectiveGap + rnd.between(-80, 120)) {
      if (!isFree(d, 180) || pool.length === 0) continue;
      const type = rnd.pick(pool);
      const lane = type === 'parkedCar' ? rnd.pick([0, 2]) : rnd.between(0, 2);
      this.spawn(type, d, lane, rnd);
    }

    // Sprinkle gold stars
    if (has('star')) {
      for (let d = 500; d < totalLen - 300; d += 380 + rnd.between(-60, 120)) {
        if (!isFree(d, 90)) continue;
        const lane = rnd.between(0, 2);
        this.spawn('star', d, lane);
      }
    }

    this.finishSprite = this.add.image(ROAD_X, -2000, 'finish').setOrigin(0, 0.5).setDepth(2);
  }

  /** Seed the endless course; more chunks appended in update(). */
  private buildEndlessSeed() {
    this.finishSprite = this.add.image(ROAD_X, -20000, 'finish').setOrigin(0, 0.5).setDepth(2).setVisible(false);
    this.appendEndlessChunk(500, 4500);
  }

  private endlessRnd = new Phaser.Math.RandomDataGenerator(['endless-' + Date.now()]);

  private appendEndlessChunk(from: number, to: number) {
    const lvl = this.level;
    const has = (t: ObstacleType) => lvl.features.includes(t);
    const rnd = this.endlessRnd;
    const gap = this.endlessGap;

    // Stop signs / lights on rhythm
    for (let d = from + 800; d < to; d += 2200 + rnd.between(-200, 300)) {
      const type: ObstacleType = rnd.pick(['stopSign', 'trafficLight']);
      const lane = type === 'stopSign' ? 2 : 0;
      this.spawn(type, d, lane);
    }
    const pool: ObstacleType[] = ['cone', 'cone', 'parkedCar', 'traffic', 'traffic'];
    for (let d = from; d < to; d += gap + rnd.between(-40, 60)) {
      const type = rnd.pick(pool);
      const lane = type === 'parkedCar' ? rnd.pick([0, 2]) : rnd.between(0, 2);
      this.spawn(type, d, lane, rnd);
    }
    if (has('star')) {
      for (let d = from + 200; d < to; d += 320 + rnd.between(-40, 80)) {
        this.spawn('star', d, rnd.between(0, 2));
      }
    }
    this.endlessSpawnCursor = to;
  }

  private spawn(type: ObstacleType, d: number, lane: number, rnd?: Phaser.Math.RandomDataGenerator) {
    let sprite: Phaser.GameObjects.Image | undefined;
    let line: Phaser.GameObjects.Image | undefined;
    let mph: number | undefined;
    let phase: number | undefined;
    let state: Obstacle['state'];

    const stopLine = () =>
      this.add.image(ROAD_X, -200, 'stop-line').setOrigin(0, 0.5).setDisplaySize(ROAD_W, 8).setDepth(3);

    switch (type) {
      case 'cone':
        sprite = this.add.image(LANE_X[lane], -200, 'cone').setDepth(4);
        break;
      case 'parkedCar': {
        const key = rnd ? rnd.pick(['car-gray', 'car-blue', 'car-white']) : 'car-gray';
        const x = lane === 0 ? ROAD_X + 30 : ROAD_X + ROAD_W - 30;
        sprite = this.add.image(x, -200, key).setDepth(4).setDisplaySize(44, 82);
        break;
      }
      case 'traffic': {
        const key = rnd ? rnd.pick(['car-red', 'car-blue', 'car-gray']) : 'car-red';
        sprite = this.add.image(LANE_X[lane], -200, key).setDepth(5).setDisplaySize(44, 82);
        const baseTrafficMul = this.difficulty.trafficMul * (this.level.endless ? this.endlessTrafficMul : 1);
        mph = this.level.speedLimit * (rnd ? rnd.realInRange(0.45, 0.7) : 0.6) * baseTrafficMul * this.difficulty.speedMul;
        break;
      }
      case 'stopSign':
        sprite = this.add.image(GAME_W - 26, -200, 'stop-sign').setDepth(6);
        line = stopLine();
        break;
      case 'trafficLight':
        sprite = this.add.image(26, -200, 'light-green').setDepth(6);
        line = stopLine();
        phase = Math.random() * 8;
        state = 'green';
        break;
      case 'checkpoint':
        sprite = this.add.image(ROAD_X, -200, 'checkpoint').setOrigin(0, 0.5).setDepth(3);
        break;
      case 'star':
        sprite = this.add.image(LANE_X[lane], -200, 'gold-star').setDepth(6);
        break;
      case 'pedestrian': {
        // Spawn on left or right sidewalk; walk across when telegraph elapses.
        const fromLeft = (rnd ? rnd.frac() : Math.random()) > 0.5;
        const startX = fromLeft ? ROAD_X - 4 : ROAD_X + ROAD_W + 4;
        sprite = this.add.image(startX, -200, 'pedestrian').setDepth(7).setDisplaySize(22, 32);
        // Speed scales lightly with difficulty
        const baseVx = 55 * this.difficulty.speedMul;
        mph = fromLeft ? baseVx : -baseVx; // reuse mph field for horizontal velocity
        break;
      }
    }
    if (!sprite) return;
    sprite.setVisible(false);
    line?.setVisible(false);
    const ob: Obstacle = { type, d, lane, sprite, line, mph, phase, state };
    if (type === 'pedestrian') {
      ob.pedX = sprite.x;
      ob.pedVx = mph;
      // Telegraph shrinks at higher difficulty (fair but riskier).
      ob.pedTelegraph = Math.max(0.35, 1.4 - 0.3 * DIFF_INDEX[this.difficulty.id]);
    }
    this.obstacles.push(ob);
  }

  // ---------------------------------------------------------------- HUD ---
  private buildHud() {
    const lvl = this.level;
    const hudStyle = { fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', color: '#ffffff' };
    this.add.rectangle(0, 0, GAME_W, 68, 0x101014, 0.85).setOrigin(0).setDepth(20);

    this.scoreText = this.add.text(10, 8, 'SCORE 0', { ...hudStyle, color: '#f2c14e' }).setDepth(21);
    this.speedText = this.add.text(GAME_W - 10, 8, `0 MPH · LIMIT ${lvl.speedLimit}`, hudStyle)
      .setOrigin(1, 0).setDepth(21);

    this.starHudText = this.add.text(10, 34, '★ 0', { ...hudStyle, fontSize: '18px', color: '#f2c14e' }).setDepth(21);
    this.comboText = this.add.text(GAME_W / 2, 34, '×1', { ...hudStyle, fontSize: '20px', color: '#ffe89a' })
      .setOrigin(0.5, 0).setDepth(21);

    // Progress bar (or strikes for endless)
    if (this.level.endless) {
      for (let i = 0; i < 3; i++) {
        const s = this.add.image(GAME_W - 20 - i * 26, 46, 'shield').setDepth(22).setScale(0.7);
        this.shieldSprites.push(s);
      }
    } else {
      this.add.rectangle(GAME_W / 2, 58, 220, 6, 0x3a3a40).setDepth(21);
      this.progressFill = this.add.rectangle(GAME_W / 2 - 110, 58, 1, 6, 0xf2c14e)
        .setOrigin(0, 0.5).setDepth(22);
    }

    // Mute toggle
    this.muteBtn = this.add.text(GAME_W - 8, 40, sound.muted ? '🔇' : '🔊', {
      fontFamily: 'Inter, sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      sound.init();
      const nowMuted = sound.toggleMute();
      this.muteBtn.setText(nowMuted ? '🔇' : '🔊');
    });
  }

  private showBanner(title: string, sub: string) {
    const t = this.add.text(GAME_W / 2, 300, title.toUpperCase(), {
      fontFamily: '"Bebas Neue", sans-serif', fontSize: '48px', color: '#f2c14e',
      stroke: '#101014', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30);
    const s = this.add.text(GAME_W / 2, 348, sub, {
      fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#ffffff',
      stroke: '#101014', strokeThickness: 5, align: 'center', wordWrap: { width: GAME_W - 40 },
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: [t, s], alpha: 0, delay: 2000, duration: 600,
      onComplete: () => { t.destroy(); s.destroy(); },
    });
  }

  private float(text: string, color: string, x = this.player.x, y = this.player.y - 60) {
    const f = this.add.text(x, y, text, {
      fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color,
      stroke: '#101014', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: f, y: y - 70, alpha: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => f.destroy(),
    });
  }

  private award(key: PointKey, label?: string): number {
    const pts = this.tracker.add(key);
    const sign = pts >= 0 ? '+' : '';
    const comboTag = pts > 0 && this.tracker.combo > 1 ? ` ×${this.tracker.combo}` : '';
    this.float(`${label ?? ''} ${sign}${pts}${comboTag}`.trim(), pts >= 0 ? '#f2c14e' : '#ff5a4e');
    if (pts < 0) {
      this.cleanTimer = 0;
      this.cameras.main.shake(120, 0.004);
      this.player.setTint(0xff6b5e);
      this.time.delayedCall(200, () => this.player.clearTint());
    }
    // score display is lerped by animateScore()

    this.updateComboHud();
    return pts;
  }

  private updateComboHud() {
    const c = this.tracker.combo;
    this.comboText.setText(`×${c}`);
    const scale = 1 + (c - 1) * 0.12;
    this.comboText.setScale(scale);
    this.comboText.setColor(c >= 5 ? '#ffe89a' : c >= 3 ? '#f2c14e' : '#ffffff');
    this.starHudText.setText(`★ ${this.tracker.starsCollected}`);
  }

  private sparks(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(25).setScale(0.6);
      this.tweens.add({
        targets: s, x: x + Phaser.Math.Between(-40, 40), y: y + Phaser.Math.Between(-40, 40),
        alpha: 0, scale: 0, duration: 350, onComplete: () => s.destroy(),
      });
    }
  }

  // ------------------------------------------------------------- update ---
  update(time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.finished) return;

    this.prevMph = this.mph;
    this.handleDriving(dt);
    const scroll = this.mph * MPH_TO_PX * dt;
    this.road.tilePositionY -= scroll;
    this.shoulderL.tilePositionY -= scroll;
    this.shoulderR.tilePositionY -= scroll;
    // Parallax: distant silhouettes scroll slower
    this.farBgL.tilePositionY -= scroll * 0.45;
    this.farBgR.tilePositionY -= scroll * 0.45;

    // Update engine sound
    sound.updateEngine(Math.min(1, this.mph / this.level.maxSpeed));

    if (this.headlightL && this.headlightR) {
      this.headlightL.x = this.player.x - 12;
      this.headlightR.x = this.player.x + 12;
    }

    // Skid marks on hard braking
    this.trySkidMark(time);

    if (this.level.endless) this.updateEndless();
    else this.updateProgressiveRamp();
    this.updateObstacles(time, dt);
    this.checkLaneDiscipline(dt);
    this.checkSpeeding(dt);
    this.checkSmoothDriving(dt);
    this.updateHud();
    this.animateScore(dt);

    if (!this.level.endless && this.traveled >= this.effectiveLength) this.finish();
  }

  /** Smoothly counts the displayed score toward the tracked score. */
  private animateScore(dt: number) {
    const target = this.tracker.score;
    if (this.displayScore === target) return;
    const diff = target - this.displayScore;
    const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 6)));
    if (Math.abs(step) >= Math.abs(diff)) this.displayScore = target;
    else this.displayScore += step;
    this.scoreText.setText(`SCORE ${this.displayScore}`);
  }

  /** Non-endless levels also ramp subtly the longer a run goes. */
  private updateProgressiveRamp() {
    // Squeeze gap by up to 25% over full course; traffic speeds by up to 20%.
    const p = Phaser.Math.Clamp(this.traveled / Math.max(1, this.effectiveLength), 0, 1);
    const gapFactor = 1 - 0.25 * p;
    const trafficFactor = 1 + 0.20 * p;
    // Apply to still-unseen obstacles (cheap: nudge their d spacing lazily via mph).
    for (const ob of this.obstacles) {
      if (ob.type === 'traffic' && ob.mph && !ob._ramped) {
        ob.mph *= trafficFactor;
        ob._ramped = true;
      }
    }
    // Store for future spawns (used only in endless path); keep effectiveGap fresh for UI feel.
    this.effectiveGap = this.level.obstacleGap * this.difficulty.gapMul * gapFactor;
  }


  private trySkidMark(time: number) {
    const braking = (this.cursors.down.isDown || this.wasd.S.isDown || touchControls.brake);
    if (braking && this.prevMph > 20 && time - this.skidLastAt > 40) {
      this.skidLastAt = time;
      const mk = (dx: number) => {
        const r = this.add.rectangle(this.player.x + dx, this.player.y + 30, 4, 12, 0x151517, 0.55).setDepth(6);
        this.skidPool.push(r);
        this.tweens.add({ targets: r, alpha: 0, duration: 1400, onComplete: () => r.destroy() });
      };
      mk(-14); mk(14);
      if (this.skidPool.length > 60) {
        const old = this.skidPool.shift();
        old?.destroy();
      }
    }
  }

  private updateEndless() {
    // Ramp difficulty every 500 units
    const step = Math.floor(this.traveled / 500);
    if (step > this.lastRampAt) {
      this.lastRampAt = step;
      this.endlessGap = Math.max(120, this.endlessGap * 0.96);
      this.endlessTrafficMul *= 1.02;
    }
    // Extend the world
    if (this.traveled + 4000 > this.endlessSpawnCursor) {
      this.appendEndlessChunk(this.endlessSpawnCursor, this.endlessSpawnCursor + 4000);
    }
    // Distance bonus: 1pt per 10 units. Accrue in 100-unit chunks.
    const chunk = Math.floor(this.traveled / 100);
    if (chunk > this._lastDistChunk) {
      const gain = (chunk - this._lastDistChunk) * 10;
      this._lastDistChunk = chunk;
      this.tracker.addDistanceBonus(gain);
      this.scoreText.setText(`SCORE ${this.tracker.score}`);
    }
  }
  private _lastDistChunk = 0;

  private handleDriving(dt: number) {
    const k = this.cursors;
    const w = this.wasd;
    const gas = k.up.isDown || w.W.isDown || touchControls.gas;
    const brake = k.down.isDown || w.S.isDown || touchControls.brake;
    const left = k.left.isDown || w.A.isDown || touchControls.left;
    const right = k.right.isDown || w.D.isDown || touchControls.right;

    if (gas) this.mph += 32 * dt;
    else if (brake) this.mph -= 70 * dt;
    else this.mph -= 9 * dt;
    this.mph = Phaser.Math.Clamp(this.mph, 0, this.level.maxSpeed * this.difficulty.speedMul);

    this.traveled += this.mph * MPH_TO_PX * dt;

    const steer = 240 * Phaser.Math.Clamp(this.mph / 18, 0, 1);
    if (left) this.player.x -= steer * dt;
    if (right) this.player.x += steer * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x, ROAD_X + 26, ROAD_X + ROAD_W - 26);
    this.player.setAngle((Number(right) - Number(left)) * 4);

    // Tire screech when steering hard at speed OR braking hard
    if (this.mph > 35 && ((left || right) && this.mph > this.level.speedLimit - 5)) {
      sound.tireScreech(Math.min(1, this.mph / this.level.maxSpeed));
    } else if (brake && this.prevMph > 40 && this.mph < this.prevMph - 2) {
      sound.tireScreech(0.6);
    }
  }




  private screenY(d: number) {
    return PLAYER_Y - (d - this.traveled);
  }

  // Reused per-frame rectangles to avoid allocation in the hot path.
  private _pRect = new Phaser.Geom.Rectangle(0, 0, 36, 84);
  private _oRect = new Phaser.Geom.Rectangle(0, 0, 22, 22);

  private updateObstacles(time: number, dt: number) {
    this._pRect.x = this.player.x - 18;
    this._pRect.y = this.player.y - 42;

    // Cleanup obstacles far behind (endless)
    if (this.level.endless) {
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        if (this.obstacles[i].d < this.traveled - 400) {
          this.obstacles[i].sprite.destroy();
          this.obstacles[i].line?.destroy();
          this.obstacles.splice(i, 1);
        }
      }
    }

    for (const ob of this.obstacles) {
      if (ob.type === 'traffic' && ob.mph) ob.d += ob.mph * MPH_TO_PX * dt;

      const y = this.screenY(ob.d);
      // Collected stars stay hidden even when back on screen.
      const collectedStar = ob.type === 'star' && ob.resolved;
      const visible = !collectedStar && y > -140 && y < GAME_H + 140;
      ob.sprite.setVisible(visible);
      ob.line?.setVisible(visible);
      if (!visible) continue;

      ob.sprite.y = y;
      if (ob.line) ob.line.y = y;

      switch (ob.type) {
        case 'trafficLight':
          this.updateTrafficLight(ob, time);
          this.handleStopZone(ob, true);
          break;
        case 'stopSign':
          this.handleStopZone(ob, false);
          break;
        case 'checkpoint':
          if (!ob.resolved && this.traveled >= ob.d) {
            ob.resolved = true;
            this.award('CHECKPOINT', 'CHECKPOINT');
            sound.checkpoint();
          }
          break;
        case 'star':
          this.handleStar(ob);
          break;
        case 'cone':
        case 'parkedCar':
        case 'traffic':
          this.handleCollision(ob, time);
          break;
      }
    }
  }

  private handleStar(ob: Obstacle) {
    if (ob.resolved) return;
    const dx = Math.abs(this.player.x - ob.sprite.x);
    const dy = Math.abs(this.player.y - ob.sprite.y);
    if (dx < 22 && dy < 26) {
      ob.resolved = true;
      ob.sprite.setVisible(false);
      this.award('STAR', 'STAR');
      sound.starPickup();
      // sparkle
      for (let i = 0; i < 4; i++) {
        const s = this.add.image(ob.sprite.x, ob.sprite.y, 'spark').setDepth(25).setTint(0xf2c14e);
        this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-30, 30), y: s.y - 40,
          alpha: 0, scale: 0, duration: 500, onComplete: () => s.destroy() });
      }
    }
  }

  private updateTrafficLight(ob: Obstacle, time: number) {
    const t = (time / 1000 + (ob.phase ?? 0)) % 8.2;
    const state: 'green' | 'yellow' | 'red' = t < 4 ? 'green' : t < 5.2 ? 'yellow' : 'red';
    if (state !== ob.state) {
      ob.state = state;
      ob.sprite.setTexture(`light-${state}`);
    }
  }

  private handleStopZone(ob: Obstacle, isLight: boolean) {
    if (ob.resolved) return;
    const dist = ob.d - this.traveled;
    if (dist > 0 && dist < 150 && this.mph <= 2) ob.stopped = true;
    if (dist <= 0) {
      ob.resolved = true;
      if (isLight) {
        if (ob.state === 'red') this.award('RAN_RED_LIGHT', 'RED LIGHT!');
        else if (ob.state === 'green') { this.award('GREEN_LIGHT', 'GREEN LIGHT'); sound.checkpoint(); }
      } else {
        if (ob.stopped) { this.award('FULL_STOP', 'FULL STOP'); sound.stopDing(); }
        else this.award('RAN_STOP_SIGN', 'STOP SIGN!');
      }
    }
  }

  private handleCollision(ob: Obstacle, time: number) {
    // Near-miss detection first
    if (!ob.hit && !ob.nearMissed && !ob.resolved) {
      const dy = ob.sprite.y - this.player.y;
      if (dy > -30 && dy < 60) {
        const dx = Math.abs(this.player.x - ob.sprite.x);
        if (dx > 22 && dx < 40 && this.mph > 10) {
          ob.nearMissed = true;
          this.award('NEAR_MISS', 'CLOSE!');
          sound.nearMissHorn();
        }
      }
    }

    if (ob.hit || time < this.invulnUntil) return;
    const s = ob.sprite;
    const w = ob.type === 'cone' ? 22 : 40;
    const h = ob.type === 'cone' ? 22 : 76;
    this._oRect.x = s.x - w / 2;
    this._oRect.y = s.y - h / 2;
    this._oRect.width = w;
    this._oRect.height = h;
    if (!Phaser.Geom.Rectangle.Overlaps(this._pRect, this._oRect)) return;

    ob.hit = true;
    this.sparks(s.x, s.y);

    if (ob.type === 'cone') {
      this.award('HIT_CONE', 'CONE');
      sound.collision();
      this.tweens.add({
        targets: s, x: s.x + Phaser.Math.Between(-90, 90), y: s.y + 160,
        angle: 240, alpha: 0.4, duration: 500,
      });
    } else {
      this.award(ob.type === 'traffic' ? 'HIT_TRAFFIC' : 'HIT_PARKED_CAR', 'CRASH');
      sound.collision();
      this.mph *= 0.35;
      this.invulnUntil = time + 1200;
      this.tweens.add({
        targets: this.player, alpha: 0.35, yoyo: true, repeat: 4, duration: 120,
        onComplete: () => this.player.setAlpha(1),
      });

      // Endless strikes
      if (this.level.endless) {
        this.strikes++;
        const idx = 3 - this.strikes;
        if (idx >= 0 && this.shieldSprites[3 - this.strikes]) {
          const sh = this.shieldSprites[3 - this.strikes];
          this.tweens.add({ targets: sh, alpha: 0.15, scale: 0.4, duration: 300 });
        }
        if (this.strikes >= 3) {
          this.time.delayedCall(600, () => this.finish());
        }
      }
    }
  }

  private checkLaneDiscipline(dt: number) {
    this.laneCrossCooldown = Math.max(0, this.laneCrossCooldown - dt);
    const onDivider = DIVIDERS.some((d) => Math.abs(this.player.x - d) < 18);
    if (onDivider && this.mph > 6) {
      if (!this.laneCrossing && this.laneCrossCooldown === 0) {
        this.laneCrossing = true;
        this.laneCrossCooldown = 1.2;
        this.award('LANE_CROSS', 'LANE LINE');
      }
    } else if (!onDivider) {
      this.laneCrossing = false;
    }
  }

  private checkSpeeding(dt: number) {
    if (this.mph > this.level.speedLimit + this.difficulty.speedTolerance) {
      this.speedingTimer += dt;
      if (this.speedingTimer >= 2) {
        this.speedingTimer = 0;
        this.award('SPEEDING', 'SPEEDING');
      }
    } else {
      this.speedingTimer = 0;
    }
  }

  private checkSmoothDriving(dt: number) {
    if (this.mph > 8) this.cleanTimer += dt;
    if (this.cleanTimer >= 6) {
      this.cleanTimer = 0;
      this.award('SMOOTH_DRIVING', 'SMOOTH');
    }
  }

  private updateHud() {
    const over = this.mph > this.level.speedLimit + this.difficulty.speedTolerance;
    this.speedText.setText(`${Math.round(this.mph)} MPH · LIMIT ${this.level.speedLimit}`)
      .setColor(over ? '#ff5a4e' : '#ffffff');

    if (!this.level.endless && this.progressFill) {
      const p = Phaser.Math.Clamp(this.traveled / this.effectiveLength, 0, 1);
      this.progressFill.width = 220 * p;
      this.finishSprite.y = this.screenY(this.effectiveLength);
      this.finishSprite.setVisible(this.finishSprite.y > -60 && this.finishSprite.y < GAME_H + 60);
    }
  }

  public endEarly() { this.finish(); }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    if (!this.level.endless) this.tracker.add('FINISH_BONUS');
    this.scoreText.setText(`SCORE ${this.tracker.score}`);
    sound.fanfare();

    const label = this.level.endless ? 'RUN OVER' : 'FINISH!';
    const banner = this.add.text(GAME_W / 2, 340, label, {
      fontFamily: '"Bebas Neue", sans-serif', fontSize: '68px', color: '#f2c14e',
      stroke: '#101014', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(40).setScale(0.2);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: 'Back.easeOut' });

    this.time.delayedCall(1500, () => {
      this.game.events.emit(
        GAME_EVENTS.LEVEL_COMPLETE,
        buildResult(this.level, this.tracker, this.difficulty, { distance: Math.round(this.traveled) })
      );
    });
  }
}

export { POINTS };
