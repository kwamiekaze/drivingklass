import Phaser from 'phaser';
import { getLevel } from './levels';
import { ScoreTracker, buildResult, POINTS, type PointKey } from './scoring';
import { touchControls } from './controls';
import { loadPlayerCarTexture, makeTextures } from './textures';
import { GAME_EVENTS, type LevelConfig, type ObstacleType } from './types';

export const GAME_W = 480;
export const GAME_H = 800;

const ROAD_X = 60;
const ROAD_W = 360;
const LANE_X = [120, 240, 360]; // lane centers
const DIVIDERS = [180, 300];
const PLAYER_Y = 620;
const MPH_TO_PX = 5.5; // world scroll speed per mph

type WASD = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

interface Obstacle {
  type: ObstacleType;
  d: number; // position along the course
  lane: number;
  sprite: Phaser.GameObjects.Image;
  line?: Phaser.GameObjects.Image; // stop line for signs/lights
  resolved?: boolean; // passed / scored already
  hit?: boolean;
  stopped?: boolean; // player came to a full stop in the zone
  mph?: number; // moving traffic speed
  phase?: number; // traffic light timer offset
  state?: 'red' | 'yellow' | 'green';
}

export class DrivingScene extends Phaser.Scene {
  private level!: LevelConfig;
  private tracker!: ScoreTracker;

  private road!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.GameObjects.Image;
  private obstacles: Obstacle[] = [];
  private finishSprite!: Phaser.GameObjects.Image;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASD;

  private mph = 0;
  private traveled = 0;
  private finished = false;
  private invulnUntil = 0;
  private speedingTimer = 0;
  private cleanTimer = 0;
  private laneCrossing = false;
  private laneCrossCooldown = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('driving');
  }

  init(data: { levelId?: string }) {
    this.level = getLevel(data.levelId ?? 'parking-lot');
    this.tracker = new ScoreTracker();
    this.obstacles = [];
    this.mph = 0;
    this.traveled = 0;
    this.finished = false;
    this.invulnUntil = 0;
    this.speedingTimer = 0;
    this.cleanTimer = 0;
    this.laneCrossing = false;
    this.laneCrossCooldown = 0;
  }

  preload() {
    loadPlayerCarTexture(this);
  }

  create() {
    makeTextures(this);
    const lvl = this.level;

    // Shoulders + road
    this.add.rectangle(0, 0, ROAD_X, GAME_H, lvl.shoulderColor).setOrigin(0);
    this.add
      .rectangle(ROAD_X + ROAD_W, 0, GAME_W - ROAD_X - ROAD_W, GAME_H, lvl.shoulderColor)
      .setOrigin(0);
    this.road = this.add
      .tileSprite(ROAD_X, 0, ROAD_W, GAME_H, 'road')
      .setOrigin(0);

    if (lvl.nightAlpha) {
      this.add
        .rectangle(0, 0, GAME_W, GAME_H, 0x0a0a18, lvl.nightAlpha)
        .setOrigin(0)
        .setDepth(15);
    }

    this.buildCourse(lvl);

    // Player car (the gold 5-star DrivingKlass trainer)
    this.player = this.add
      .image(LANE_X[1], PLAYER_Y, 'player-car')
      .setDisplaySize(44, 94)
      .setDepth(10);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WASD;

    this.buildHud(lvl);
    this.showBanner(lvl.name, lvl.subtitle);
  }

  // ------------------------------------------------------------- course ---
  private buildCourse(lvl: LevelConfig) {
    const has = (t: ObstacleType) => lvl.features.includes(t);
    const reserved: number[] = [];
    const reserve = (d: number) => reserved.push(d);
    const isFree = (d: number, pad = 220) =>
      reserved.every((r) => Math.abs(r - d) > pad);

    // Checkpoints at 1/4, 2/4, 3/4 of the course
    if (has('checkpoint')) {
      for (let i = 1; i <= 3; i++) {
        const d = (lvl.length * i) / 4;
        reserve(d);
        this.spawn('checkpoint', d, 1);
      }
    }

    // Stop signs and traffic lights on a rhythm
    if (has('stopSign')) {
      for (let d = 1400; d < lvl.length - 800; d += 2600) {
        if (!isFree(d)) continue;
        reserve(d);
        this.spawn('stopSign', d, 2);
      }
    }
    if (has('trafficLight')) {
      for (let d = 2600; d < lvl.length - 800; d += 3200) {
        if (!isFree(d)) continue;
        reserve(d);
        this.spawn('trafficLight', d, 0);
      }
    }

    // Random field of cones / parked cars / traffic
    const rnd = new Phaser.Math.RandomDataGenerator([lvl.id]);
    const pool: ObstacleType[] = [];
    if (has('cone')) pool.push('cone', 'cone');
    if (has('parkedCar')) pool.push('parkedCar');
    if (has('traffic')) pool.push('traffic');

    for (
      let d = 700;
      d < lvl.length - 600;
      d += lvl.obstacleGap + rnd.between(-80, 120)
    ) {
      if (!isFree(d, 180) || pool.length === 0) continue;
      const type = rnd.pick(pool);
      const lane =
        type === 'parkedCar' ? rnd.pick([0, 2]) : rnd.between(0, 2);
      this.spawn(type, d, lane, rnd);
    }

    this.finishSprite = this.add
      .image(ROAD_X, -2000, 'finish')
      .setOrigin(0, 0.5)
      .setDepth(2);
  }

  private spawn(
    type: ObstacleType,
    d: number,
    lane: number,
    rnd?: Phaser.Math.RandomDataGenerator
  ) {
    let sprite: Phaser.GameObjects.Image | undefined;
    let line: Phaser.GameObjects.Image | undefined;
    let mph: number | undefined;
    let phase: number | undefined;
    let state: Obstacle['state'];

    const stopLine = () =>
      this.add
        .image(ROAD_X, -200, 'stop-line')
        .setOrigin(0, 0.5)
        .setDisplaySize(ROAD_W, 8)
        .setDepth(3);

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
        mph = this.level.speedLimit * (rnd ? rnd.realInRange(0.45, 0.7) : 0.6);
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
    }
    if (!sprite) return;

    sprite.setVisible(false);
    line?.setVisible(false);
    this.obstacles.push({ type, d, lane, sprite, line, mph, phase, state });
  }

  // ---------------------------------------------------------------- HUD ---
  private buildHud(lvl: LevelConfig) {
    const hudStyle = {
      fontFamily: '"Bebas Neue", sans-serif',
      fontSize: '26px',
      color: '#ffffff'
    };
    this.add
      .rectangle(0, 0, GAME_W, 58, 0x101014, 0.85)
      .setOrigin(0)
      .setDepth(20);

    this.scoreText = this.add
      .text(14, 14, 'SCORE 0', { ...hudStyle, color: '#f2c14e' })
      .setDepth(21);

    this.speedText = this.add
      .text(GAME_W - 14, 14, `0 MPH · LIMIT ${lvl.speedLimit}`, hudStyle)
      .setOrigin(1, 0)
      .setDepth(21);

    // Progress bar
    this.add
      .rectangle(GAME_W / 2, 50, 220, 6, 0x3a3a40)
      .setDepth(21);
    this.progressFill = this.add
      .rectangle(GAME_W / 2 - 110, 50, 1, 6, 0xf2c14e)
      .setOrigin(0, 0.5)
      .setDepth(22);
  }

  private showBanner(title: string, sub: string) {
    const t = this.add
      .text(GAME_W / 2, 300, title.toUpperCase(), {
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: '52px',
        color: '#f2c14e',
        stroke: '#101014',
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(30);
    const s = this.add
      .text(GAME_W / 2, 348, sub, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#101014',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: [t, s],
      alpha: 0,
      delay: 2000,
      duration: 600,
      onComplete: () => {
        t.destroy();
        s.destroy();
      }
    });
  }

  private float(text: string, color: string, x = this.player.x, y = this.player.y - 60) {
    const f = this.add
      .text(x, y, text, {
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: '28px',
        color,
        stroke: '#101014',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: f,
      y: y - 70,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => f.destroy()
    });
  }

  private award(key: PointKey, label?: string) {
    const pts = this.tracker.add(key);
    const sign = pts >= 0 ? '+' : '';
    this.float(
      `${label ?? ''} ${sign}${pts}`.trim(),
      pts >= 0 ? '#f2c14e' : '#ff5a4e'
    );
    if (pts < 0) {
      this.cleanTimer = 0;
      this.cameras.main.shake(120, 0.004);
      this.player.setTint(0xff6b5e);
      this.time.delayedCall(200, () => this.player.clearTint());
    }
    this.scoreText.setText(`SCORE ${this.tracker.score}`);
  }

  private sparks(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(25).setScale(0.6);
      this.tweens.add({
        targets: s,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        scale: 0,
        duration: 350,
        onComplete: () => s.destroy()
      });
    }
  }

  // ------------------------------------------------------------- update ---
  update(time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.finished) return;

    this.handleDriving(dt);
    this.road.tilePositionY -= this.mph * MPH_TO_PX * dt;

    this.updateObstacles(time, dt);
    this.checkLaneDiscipline(dt);
    this.checkSpeeding(dt);
    this.checkSmoothDriving(dt);
    this.updateHud();

    if (this.traveled >= this.level.length) this.finish();
  }

  private handleDriving(dt: number) {
    const k = this.cursors;
    const w = this.wasd;
    const gas = k.up.isDown || w.W.isDown || touchControls.gas;
    const brake = k.down.isDown || w.S.isDown || touchControls.brake;
    const left = k.left.isDown || w.A.isDown || touchControls.left;
    const right = k.right.isDown || w.D.isDown || touchControls.right;

    if (gas) this.mph += 32 * dt;
    else if (brake) this.mph -= 70 * dt;
    else this.mph -= 9 * dt; // engine drag
    this.mph = Phaser.Math.Clamp(this.mph, 0, this.level.maxSpeed);

    this.traveled += this.mph * MPH_TO_PX * dt;

    const steer = 240 * Phaser.Math.Clamp(this.mph / 18, 0, 1);
    if (left) this.player.x -= steer * dt;
    if (right) this.player.x += steer * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x, ROAD_X + 26, ROAD_X + ROAD_W - 26);
    this.player.setAngle((Number(right) - Number(left)) * 4);
  }

  private screenY(d: number) {
    return PLAYER_Y - (d - this.traveled);
  }

  private updateObstacles(time: number, dt: number) {
    const playerRect = new Phaser.Geom.Rectangle(
      this.player.x - 18,
      this.player.y - 42,
      36,
      84
    );

    for (const ob of this.obstacles) {
      // Moving traffic advances along the course too
      if (ob.type === 'traffic' && ob.mph) ob.d += ob.mph * MPH_TO_PX * dt;

      const y = this.screenY(ob.d);
      const visible = y > -140 && y < GAME_H + 140;
      ob.sprite.setVisible(visible);
      ob.line?.setVisible(visible);
      if (!visible) continue;

      ob.sprite.y = y;
      if (ob.line) ob.line.y = y;

      switch (ob.type) {
        case 'trafficLight':
          this.updateTrafficLight(ob, time);
          this.handleStopZone(ob, /*isLight*/ true);
          break;
        case 'stopSign':
          this.handleStopZone(ob, false);
          break;
        case 'checkpoint':
          if (!ob.resolved && this.traveled >= ob.d) {
            ob.resolved = true;
            this.award('CHECKPOINT', 'CHECKPOINT');
          }
          break;
        case 'cone':
        case 'parkedCar':
        case 'traffic':
          this.handleCollision(ob, playerRect, time);
          break;
      }
    }
  }

  private updateTrafficLight(ob: Obstacle, time: number) {
    const t = (time / 1000 + (ob.phase ?? 0)) % 8.2; // 4s green, 1.2 yellow, 3 red
    const state: 'green' | 'yellow' | 'red' =
      t < 4 ? 'green' : t < 5.2 ? 'yellow' : 'red';
    if (state !== ob.state) {
      ob.state = state;
      ob.sprite.setTexture(`light-${state}`);
    }
  }

  private handleStopZone(ob: Obstacle, isLight: boolean) {
    if (ob.resolved) return;
    const dist = ob.d - this.traveled; // >0 means the line is ahead

    if (dist > 0 && dist < 150 && this.mph <= 2) ob.stopped = true;

    if (dist <= 0) {
      ob.resolved = true;
      if (isLight) {
        if (ob.state === 'red') this.award('RAN_RED_LIGHT', 'RED LIGHT!');
        else if (ob.state === 'green') this.award('GREEN_LIGHT', 'GREEN LIGHT');
      } else {
        if (ob.stopped) this.award('FULL_STOP', 'FULL STOP');
        else this.award('RAN_STOP_SIGN', 'STOP SIGN!');
      }
    }
  }

  private handleCollision(
    ob: Obstacle,
    playerRect: Phaser.Geom.Rectangle,
    time: number
  ) {
    if (ob.hit || time < this.invulnUntil) return;
    const s = ob.sprite;
    const w = ob.type === 'cone' ? 22 : 40;
    const h = ob.type === 'cone' ? 22 : 76;
    const rect = new Phaser.Geom.Rectangle(s.x - w / 2, s.y - h / 2, w, h);
    if (!Phaser.Geom.Rectangle.Overlaps(playerRect, rect)) return;

    ob.hit = true;
    this.sparks(s.x, s.y);

    if (ob.type === 'cone') {
      this.award('HIT_CONE', 'CONE');
      this.tweens.add({
        targets: s,
        x: s.x + Phaser.Math.Between(-90, 90),
        y: s.y + 160,
        angle: 240,
        alpha: 0.4,
        duration: 500
      });
    } else {
      this.award(
        ob.type === 'traffic' ? 'HIT_TRAFFIC' : 'HIT_PARKED_CAR',
        'CRASH'
      );
      this.mph *= 0.35;
      this.invulnUntil = time + 1200;
      this.tweens.add({
        targets: this.player,
        alpha: 0.35,
        yoyo: true,
        repeat: 4,
        duration: 120,
        onComplete: () => this.player.setAlpha(1)
      });
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
    if (this.mph > this.level.speedLimit + 1) {
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
    const over = this.mph > this.level.speedLimit + 1;
    this.speedText
      .setText(`${Math.round(this.mph)} MPH · LIMIT ${this.level.speedLimit}`)
      .setColor(over ? '#ff5a4e' : '#ffffff');
    const p = Phaser.Math.Clamp(this.traveled / this.level.length, 0, 1);
    this.progressFill.width = 220 * p;
    this.finishSprite.y = this.screenY(this.level.length);
    this.finishSprite.setVisible(
      this.finishSprite.y > -60 && this.finishSprite.y < GAME_H + 60
    );
  }

  private finish() {
    this.finished = true;
    this.tracker.add('FINISH_BONUS');
    this.scoreText.setText(`SCORE ${this.tracker.score}`);

    const banner = this.add
      .text(GAME_W / 2, 340, 'FINISH!', {
        fontFamily: '"Bebas Neue", sans-serif',
        fontSize: '72px',
        color: '#f2c14e',
        stroke: '#101014',
        strokeThickness: 10
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.2);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: 'Back.easeOut' });

    this.time.delayedCall(1500, () => {
      this.game.events.emit(
        GAME_EVENTS.LEVEL_COMPLETE,
        buildResult(this.level, this.tracker)
      );
    });
  }
}

// Re-export so UI code can show point values in "How to Play".
export { POINTS };
