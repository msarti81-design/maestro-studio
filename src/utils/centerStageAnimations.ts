import { CenterStageAnimationId } from '../types';

export interface CenterStageAnimationMeta {
  id: CenterStageAnimationId;
  icon: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  accentGradient: string;
  borderActive: string;
}

export const CENTER_STAGE_ANIMATIONS: CenterStageAnimationMeta[] = [
  {
    id: 'pixel_runner',
    icon: '🤖',
    name: '8-Bit Pixel Runner',
    badge: 'Arcade Hero',
    tagline: 'Chiptune cyber-bot & star blocks',
    description:
      'An original 8-bit pixel cyber-bot sprints across the center track, leaps on every note you play, bumps floating star-gem blocks, and pops +100 arcade bursts.',
    accentGradient: 'from-cyan-500/20 via-amber-500/15 to-slate-900',
    borderActive: 'border-cyan-400',
  },
  {
    id: 'retro_coins',
    icon: '🪙',
    name: 'Retro Coins & Gem Blocks',
    badge: 'Arcade Score',
    tagline: 'Bouncing pixel blocks & gold tokens',
    description:
      'Glowing 8-bit gem & brick blocks float at center stage, bouncing upward on every chord and showering spinning golden arcade tokens and +1UP sparkles.',
    accentGradient: 'from-amber-500/25 via-yellow-500/15 to-slate-900',
    borderActive: 'border-amber-400',
  },
  {
    id: 'pixel_rocket',
    icon: '🚀',
    name: '8-Bit Space Rocket',
    badge: 'Chiptune Space',
    tagline: 'Retro starfighter & rainbow thrusters',
    description:
      'A crisp pixel starfighter glides through scrolling retro starfields and surges forward with rainbow 8-bit exhaust flames and star explosions on every note.',
    accentGradient: 'from-fuchsia-500/20 via-indigo-500/20 to-slate-900',
    borderActive: 'border-fuchsia-400',
  },
  {
    id: 'arcade_grid',
    icon: '🕹️',
    name: 'Neon Arcade Grid & EQ',
    badge: 'Synthwave 80s',
    tagline: '80s horizon grid, pixel EQ & fireworks',
    description:
      'Perspective neon horizon grid scrolling toward center stage paired with chunky chiptune equalizer bars and retro pixel fireworks synced to the music.',
    accentGradient: 'from-emerald-500/20 via-cyan-500/15 to-slate-900',
    borderActive: 'border-emerald-400',
  },
  {
    id: 'none',
    icon: '🚫',
    name: 'None (Off)',
    badge: 'Classic Clean',
    tagline: 'No center animation overlay',
    description:
      'Keeps the center stage clean with only your selected falling-note particle effects and studio piano backdrop.',
    accentGradient: 'from-slate-800 to-slate-900',
    borderActive: 'border-slate-400',
  },
];

const STORAGE_KEY = 'virtukeys_center_animation';

export function loadCenterAnimation(): CenterStageAnimationId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (
      raw === 'none' ||
      raw === 'pixel_runner' ||
      raw === 'retro_coins' ||
      raw === 'pixel_rocket' ||
      raw === 'arcade_grid'
    ) {
      return raw;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'none';
}

export function saveCenterAnimation(id: CenterStageAnimationId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage write errors
  }
}

export function getCenterAnimationMeta(id: CenterStageAnimationId): CenterStageAnimationMeta {
  return CENTER_STAGE_ANIMATIONS.find((a) => a.id === id) || CENTER_STAGE_ANIMATIONS[4];
}

interface FloatingToken {
  xOffset: number;
  yOffset: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'coin' | 'star' | 'label';
  text?: string;
  color: string;
}

interface PixelSpark {
  xOffset: number;
  yOffset: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface DrawOptions {
  isCompact?: boolean;
  hitLineY?: number;
  isPlaying?: boolean;
  energy?: number;
  opacity?: number;
}

export class CenterStageAnimator {
  private lastNow = 0;
  private energy = 0;
  private runnerY = 0;
  private runnerVy = 0;
  private runPhase = 0;
  private blockBumps = [0, 0, 0, 0];
  private eqBars = [0.2, 0.35, 0.5, 0.65, 0.55, 0.4, 0.3, 0.25];
  private starOffsets: { x: number; y: number; speed: number; size: number; color: string }[];
  private tokens: FloatingToken[] = [];
  private sparks: PixelSpark[] = [];
  private rocketBob = 0;
  private rocketBoost = 0;
  private gridScroll = 0;
  private noteCounter = 0;

  constructor() {
    this.starOffsets = Array.from({ length: 34 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41) % 100) / 100,
      speed: 0.14 + (i % 4) * 0.09,
      size: i % 5 === 0 ? 3 : 2,
      color: i % 3 === 0 ? '#fde047' : i % 3 === 1 ? '#38bdf8' : '#e879f9',
    }));
  }

  public triggerNote(midiPitch = 60): void {
    this.noteCounter += 1;
    this.energy = Math.min(1.0, this.energy + 0.48);

    // Trigger runner jump when near track
    if (this.runnerY <= 4) {
      this.runnerVy = 185 + ((midiPitch % 7) * 8);
    } else {
      // Mid-air note hop accent
      this.runnerVy = Math.max(this.runnerVy, 90);
    }

    // Bump one of the 4 center blocks based on pitch
    const blockIdx = Math.abs(midiPitch) % 4;
    this.blockBumps[blockIdx] = 1.0;

    // Equalizer bar spike
    const eqIdx = Math.abs(midiPitch) % this.eqBars.length;
    this.eqBars[eqIdx] = 1.0;
    this.eqBars[(eqIdx + 1) % this.eqBars.length] = Math.max(
      this.eqBars[(eqIdx + 1) % this.eqBars.length],
      0.72
    );
    this.eqBars[(eqIdx + this.eqBars.length - 1) % this.eqBars.length] = Math.max(
      this.eqBars[(eqIdx + this.eqBars.length - 1) % this.eqBars.length],
      0.72
    );

    // Rocket thrust surge
    this.rocketBoost = Math.min(1.0, this.rocketBoost + 0.65);

    // Spawn floating arcade coin / star / +100 popup
    if (this.tokens.length > 26) {
      this.tokens.splice(0, 4);
    }
    const spreadX = (blockIdx - 1.5) * 34 + (Math.random() - 0.5) * 16;
    const isMilestone = this.noteCounter % 5 === 0;
    this.tokens.push({
      xOffset: spreadX,
      yOffset: -10,
      vx: (Math.random() - 0.5) * 28,
      vy: -(75 + Math.random() * 45),
      life: 0,
      maxLife: 0.78,
      kind: isMilestone ? 'label' : this.noteCounter % 2 === 0 ? 'coin' : 'star',
      text: isMilestone ? (this.noteCounter % 10 === 0 ? '+1UP' : '+100') : '★',
      color: isMilestone ? '#4ade80' : this.noteCounter % 2 === 0 ? '#facc15' : '#38bdf8',
    });

    // Spawn crisp 8-bit pixel sparks
    if (this.sparks.length > 60) {
      this.sparks.splice(0, 12);
    }
    const sparkPalette = ['#fde047', '#22d3ee', '#f472b6', '#4ade80', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * (0.1 + Math.random() * 0.8);
      const spd = 45 + Math.random() * 95;
      this.sparks.push({
        xOffset: spreadX,
        yOffset: 0,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25,
        size: 3 + (i % 2) * 2,
        color: sparkPalette[(this.noteCounter + i) % sparkPalette.length],
      });
    }
  }

  private stepPhysics(deltaSec: number, isPlaying: boolean): void {
    this.energy = Math.max(0, this.energy - deltaSec * 1.35);
    this.rocketBoost = Math.max(0, this.rocketBoost - deltaSec * 1.9);
    const speedFactor = isPlaying ? 1.0 : 0.65;
    this.runPhase += deltaSec * (9.5 + this.energy * 6) * speedFactor;
    this.rocketBob += deltaSec * 4.2;
    this.gridScroll = (this.gridScroll + deltaSec * (0.85 + this.energy * 1.4)) % 1.0;

    // Jump gravity for Pixel Runner
    if (this.runnerY > 0 || this.runnerVy !== 0) {
      this.runnerY += this.runnerVy * deltaSec;
      this.runnerVy -= 560 * deltaSec;
      if (this.runnerY <= 0) {
        this.runnerY = 0;
        this.runnerVy = 0;
      }
    }

    // Decay block bumps
    for (let i = 0; i < this.blockBumps.length; i++) {
      this.blockBumps[i] = Math.max(0, this.blockBumps[i] - deltaSec * 4.2);
    }

    // Decay & animate EQ bars
    for (let i = 0; i < this.eqBars.length; i++) {
      const idleFloor = 0.14 + 0.08 * Math.sin(this.rocketBob * 1.2 + i * 0.7);
      this.eqBars[i] = Math.max(idleFloor, this.eqBars[i] - deltaSec * 1.75);
    }

    // Scroll background pixel stars
    const starSpeedBoost = 1 + this.rocketBoost * 3.2 + this.energy * 1.4;
    for (let i = 0; i < this.starOffsets.length; i++) {
      const st = this.starOffsets[i];
      st.x -= st.speed * deltaSec * starSpeedBoost;
      if (st.x < 0) st.x += 1;
    }

    // Update floating tokens
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tk = this.tokens[i];
      tk.life += deltaSec;
      if (tk.life >= tk.maxLife) {
        this.tokens.splice(i, 1);
        continue;
      }
      tk.xOffset += tk.vx * deltaSec;
      tk.yOffset += tk.vy * deltaSec;
      tk.vy += 120 * deltaSec;
    }

    // Update pixel sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life += deltaSec;
      if (sp.life >= sp.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }
      sp.xOffset += sp.vx * deltaSec;
      sp.yOffset += sp.vy * deltaSec;
      sp.vy += 210 * deltaSec;
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    nowMs: number,
    mode: CenterStageAnimationId,
    options?: DrawOptions
  ): void {
    if (mode === 'none' || width <= 20 || height <= 20) return;

    const deltaSec =
      this.lastNow === 0 ? 0.016 : Math.max(0.001, Math.min(0.08, (nowMs - this.lastNow) / 1000));
    this.lastNow = nowMs;

    const isPlaying = options?.isPlaying ?? true;
    const hitLineY = options?.hitLineY ?? height;
    const isCompact = options?.isCompact ?? height < 150;
    const baseOpacity = options?.opacity ?? 0.92;
    const externalEnergy = options?.energy ?? 0;
    this.energy = Math.max(this.energy, externalEnergy * 0.65);

    this.stepPhysics(deltaSec, isPlaying);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = baseOpacity;

    if (mode === 'pixel_runner') {
      this.drawPixelRunner(ctx, width, hitLineY, isCompact, nowMs);
    } else if (mode === 'retro_coins') {
      this.drawRetroCoins(ctx, width, hitLineY, isCompact, nowMs);
    } else if (mode === 'pixel_rocket') {
      this.drawPixelRocket(ctx, width, hitLineY, isCompact, nowMs);
    } else if (mode === 'arcade_grid') {
      this.drawArcadeGrid(ctx, width, hitLineY, isCompact, nowMs);
    }

    ctx.restore();
  }

  private drawPixelSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    px: number,
    rows: string[],
    palette: Record<string, string>
  ): void {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x + c * px), Math.round(y + r * px), Math.ceil(px), Math.ceil(px));
      }
    }
  }

  private drawStarBlock(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    variant: 'star' | 'brick' | 'gem',
    bumpProgress: number,
    nowMs: number
  ): void {
    const bounceY = -Math.sin(bumpProgress * Math.PI) * size * 0.45;
    const bx = Math.round(cx - size / 2);
    const by = Math.round(cy - size / 2 + bounceY);
    const p = Math.max(2, Math.round(size / 8));

    if (variant === 'brick') {
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(bx, by, size, size);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx + p, by + p, size - p * 2, size - p * 2);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(bx, by + Math.floor(size * 0.48), size, p);
      ctx.fillRect(bx + Math.floor(size * 0.48), by, p, Math.floor(size * 0.48));
      ctx.fillRect(bx + Math.floor(size * 0.22), by + Math.floor(size * 0.48), p, Math.floor(size * 0.52));
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(bx + p, by + p, size - p * 2, p);
    } else if (variant === 'gem') {
      const pulse = 0.75 + 0.25 * Math.sin(nowMs * 0.008);
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(bx, by, size, size);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(bx + p, by + p, size - p * 2, size - p * 2);
      ctx.fillStyle = `rgba(165, 243, 252, ${pulse})`;
      // Diamond motif inside block (100% original geometric icon)
      const midX = bx + size / 2;
      const midY = by + size / 2;
      ctx.fillRect(midX - p, midY - p * 2, p * 2, p * 4);
      ctx.fillRect(midX - p * 2, midY - p, p * 4, p * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(midX - p * 0.5, midY - p * 0.5, p, p);
    } else {
      // Glowing Gold Star-Crest Pixel Block (no trademarked '?' character)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx, by, size, size);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx + p, by + p, size - p * 2, size - p * 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(bx + p, by + p, size - p * 2, p);
      ctx.fillRect(bx + p, by + p, p, size - p * 2);
      // 4 corner rivets
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx + p * 1.4, by + p * 1.4, p * 0.8, p * 0.8);
      ctx.fillRect(bx + size - p * 2.2, by + p * 1.4, p * 0.8, p * 0.8);
      ctx.fillRect(bx + p * 1.4, by + size - p * 2.2, p * 0.8, p * 0.8);
      ctx.fillRect(bx + size - p * 2.2, by + size - p * 2.2, p * 0.8, p * 0.8);
      // Center 8-bit four-point star emblem
      ctx.fillStyle = '#ffffff';
      const midX = bx + size / 2;
      const midY = by + size / 2;
      ctx.fillRect(midX - p * 0.6, midY - p * 2.1, p * 1.2, p * 4.2);
      ctx.fillRect(midX - p * 2.1, midY - p * 0.6, p * 4.2, p * 1.2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(midX - p * 1.1, midY - p * 1.1, p * 2.2, p * 2.2);
    }
  }

  private drawFloatingTokensAndSparks(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    anchorY: number,
    scale: number,
    nowMs: number
  ): void {
    // Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = sp.color;
      const sz = Math.max(2, Math.round(sp.size * scale));
      ctx.fillRect(
        Math.round(centerX + sp.xOffset * scale),
        Math.round(anchorY + sp.yOffset * scale),
        sz,
        sz
      );
      ctx.restore();
    }

    // Tokens (+100, coins, stars)
    for (let i = 0; i < this.tokens.length; i++) {
      const tk = this.tokens[i];
      const alpha = Math.max(0, 1 - tk.life / tk.maxLife);
      const tx = Math.round(centerX + tk.xOffset * scale);
      const ty = Math.round(anchorY + tk.yOffset * scale);
      ctx.save();
      ctx.globalAlpha *= alpha;
      if (tk.kind === 'coin') {
        const spinW = Math.max(2, Math.round(Math.abs(Math.cos(nowMs * 0.015 + i)) * 8 * scale));
        const h = Math.round(11 * scale);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(tx - spinW / 2 - 1, ty - h / 2 - 1, spinW + 2, h + 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(tx - spinW / 2, ty - h / 2, spinW, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx - Math.max(1, spinW / 4), ty - h / 3, Math.max(1, spinW / 2), h * 0.5);
      } else if (tk.kind === 'label') {
        ctx.font = `900 ${Math.max(10, Math.round(12 * scale))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#020617';
        ctx.fillText(tk.text || '+100', tx + 1, ty + 1);
        ctx.fillStyle = tk.color;
        ctx.fillText(tk.text || '+100', tx, ty);
      } else {
        ctx.fillStyle = tk.color;
        const s = Math.max(3, Math.round(4 * scale));
        ctx.fillRect(tx - s, ty - s * 0.35, s * 2, s * 0.7);
        ctx.fillRect(tx - s * 0.35, ty - s, s * 0.7, s * 2);
      }
      ctx.restore();
    }
  }

  private drawPixelRunner(
    ctx: CanvasRenderingContext2D,
    width: number,
    hitLineY: number,
    isCompact: boolean,
    nowMs: number
  ): void {
    const cx = Math.round(width / 2);
    const scale = isCompact ? 0.78 : Math.min(1.35, Math.max(0.88, hitLineY / 210));
    const groundY = Math.round(hitLineY - (isCompact ? 16 : 24) * scale);
    const trackWidth = Math.min(width - 24, Math.round(320 * scale));
    const trackLeft = cx - Math.round(trackWidth / 2);

    // Pixel horizon clouds / stars
    for (let i = 0; i < 16; i++) {
      const st = this.starOffsets[i];
      const sx = trackLeft + st.x * trackWidth;
      const sy = Math.max(8, groundY - (30 + st.y * (isCompact ? 55 : 115) * scale));
      ctx.fillStyle = st.color;
      ctx.fillRect(Math.round(sx), Math.round(sy), st.size, st.size);
    }

    // Center Pixel Ground Track (checkerboard neon 8-bit tiles)
    const tileW = Math.max(10, Math.round(14 * scale));
    const scrollPx = Math.round((nowMs * 0.09) % (tileW * 2));
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(trackLeft, groundY, trackWidth, Math.round(10 * scale));
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(trackLeft, groundY, trackWidth, Math.max(2, Math.round(2 * scale)));
    for (let x = -tileW * 2; x < trackWidth + tileW; x += tileW) {
      const tx = trackLeft + x - scrollPx;
      if (tx + tileW < trackLeft || tx > trackLeft + trackWidth) continue;
      const drawX = Math.max(trackLeft, tx);
      const drawW = Math.min(trackLeft + trackWidth, tx + tileW) - drawX;
      const isAlt = Math.floor((x + tileW * 2) / tileW) % 2 === 0;
      ctx.fillStyle = isAlt ? '#0f172a' : '#334155';
      ctx.fillRect(drawX, groundY + Math.round(3 * scale), drawW, Math.round(6 * scale));
    }

    // Overhead Pixel Star & Brick Blocks row centered above runner
    const blockSize = Math.round(22 * scale);
    const blockY = Math.round(groundY - (isCompact ? 58 : 78) * scale);
    const blockVariants: ('brick' | 'star' | 'gem' | 'brick')[] = ['brick', 'star', 'gem', 'brick'];
    const spacing = Math.round(34 * scale);
    for (let b = 0; b < 4; b++) {
      const bx = cx + (b - 1.5) * spacing;
      this.drawStarBlock(ctx, bx, blockY, blockSize, blockVariants[b], this.blockBumps[b], nowMs);
    }

    // Original 8-bit Cyber-Bot Runner Sprite (10x11 pixel art — zero copyrighted likeness)
    const px = Math.max(2, Math.round(2.8 * scale));
    const isJumping = this.runnerY > 4;
    const stride = Math.sin(this.runPhase) > 0;
    const runnerSprite = isJumping
      ? [
          '....CC....',
          '...CCCC...',
          '..CCCCCC..',
          '..CCWWWC..',
          '..CCCCCC..',
          '.GGGGGGGG.',
          'GG.CCCC.GG',
          '...CCCC...',
          '..CC..CC..',
          '.AA....AA.',
          '..........',
        ]
      : stride
      ? [
          '....CC....',
          '...CCCC...',
          '..CCCCCC..',
          '..CCWWWC..',
          '..CCCCCC..',
          '.GGGGGGGG.',
          'G..CCCC..G',
          '...CCCC...',
          '..CC..CC..',
          '.AA....AA.',
          '..........',
        ]
      : [
          '..........',
          '....CC....',
          '...CCCC...',
          '..CCCCCC..',
          '..CCWWWC..',
          '..CCCCCC..',
          '.GGGGGGGG.',
          '...CCCC...',
          '...CC.CC..',
          '...AA.AA..',
          '..........',
        ];

    const bob = isJumping ? 0 : Math.abs(Math.sin(this.runPhase)) * 2 * scale;
    const runnerX = cx - Math.round(5 * px);
    const runnerTopY = groundY - Math.round(10.5 * px) - Math.round(this.runnerY * 0.42 * scale + bob);

    // Shadow on track beneath runner
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
    const shadowW = Math.max(8, Math.round((24 - Math.min(14, this.runnerY * 0.12)) * scale));
    ctx.fillRect(cx - shadowW / 2, groundY - 1, shadowW, 3);

    this.drawPixelSprite(ctx, runnerX, runnerTopY, px, runnerSprite, {
      C: '#06b6d4',
      W: '#ffffff',
      G: '#f59e0b',
      A: '#38bdf8',
    });

    this.drawFloatingTokensAndSparks(ctx, cx, blockY - blockSize * 0.45, scale, nowMs);
  }

  private drawRetroCoins(
    ctx: CanvasRenderingContext2D,
    width: number,
    hitLineY: number,
    isCompact: boolean,
    nowMs: number
  ): void {
    const cx = Math.round(width / 2);
    const scale = isCompact ? 0.78 : Math.min(1.4, Math.max(0.9, hitLineY / 205));
    const centerY = Math.round(hitLineY * (isCompact ? 0.56 : 0.48));
    const blockSize = Math.round(28 * scale);
    const spacing = Math.round(44 * scale);

    // Ambient spinning golden arcade ring glow at center stage
    const glowR = Math.round((95 + this.energy * 32) * scale);
    const rad = ctx.createRadialGradient(cx, centerY, 6, cx, centerY, glowR);
    rad.addColorStop(0, `rgba(250, 204, 21, ${0.18 + this.energy * 0.2})`);
    rad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(cx, centerY, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Row of 4 Pixel Blocks ('brick', 'star', 'gem', 'star')
    const layout: ('brick' | 'star' | 'gem' | 'star')[] = ['brick', 'star', 'gem', 'star'];
    for (let i = 0; i < 4; i++) {
      const bx = cx + (i - 1.5) * spacing;
      const idleFloat = Math.sin(nowMs * 0.004 + i * 1.1) * 3 * scale;
      this.drawStarBlock(ctx, bx, centerY + idleFloat, blockSize, layout[i], this.blockBumps[i], nowMs);

      // Hovering spinning mini coin above each block
      const coinPhase = nowMs * 0.007 + i * 0.9;
      const coinW = Math.max(3, Math.round(Math.abs(Math.cos(coinPhase)) * 10 * scale));
      const coinH = Math.round(13 * scale);
      const coinY = Math.round(centerY - blockSize * 0.95 + idleFloat - Math.abs(Math.sin(coinPhase)) * 4 * scale);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(Math.round(bx - coinW / 2 - 1), coinY - 1, coinW + 2, coinH + 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(bx - coinW / 2), coinY, coinW, coinH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(bx - Math.max(1, coinW / 4)), coinY + 2, Math.max(1, coinW / 2), Math.max(2, coinH - 5));
    }

    this.drawFloatingTokensAndSparks(ctx, cx, centerY - blockSize * 0.65, scale, nowMs);
  }

  private drawPixelRocket(
    ctx: CanvasRenderingContext2D,
    width: number,
    hitLineY: number,
    isCompact: boolean,
    nowMs: number
  ): void {
    const cx = Math.round(width / 2);
    const scale = isCompact ? 0.78 : Math.min(1.38, Math.max(0.88, hitLineY / 205));
    const centerY = Math.round(hitLineY * (isCompact ? 0.54 : 0.46));

    // Scrolling pixel starfield streaks centered in stage
    const fieldW = Math.min(width - 20, Math.round(360 * scale));
    const fieldH = Math.round((isCompact ? 90 : 145) * scale);
    const fieldLeft = cx - fieldW / 2;
    const fieldTop = centerY - fieldH / 2;

    for (let i = 0; i < this.starOffsets.length; i++) {
      const st = this.starOffsets[i];
      const sx = Math.round(fieldLeft + st.x * fieldW);
      const sy = Math.round(fieldTop + st.y * fieldH);
      const trailLen = Math.round((2 + this.rocketBoost * 16 + this.energy * 8) * scale);
      ctx.fillStyle = st.color;
      ctx.fillRect(sx, sy, trailLen, st.size);
    }

    // Rocket vertical hover + thrust forward offset
    const hoverY = Math.sin(this.rocketBob) * 6 * scale - this.rocketBoost * 8 * scale;
    const thrustX = this.rocketBoost * 18 * scale;
    const px = Math.max(2, Math.round(2.9 * scale));

    // Rainbow 8-bit pixel exhaust flames
    const flameColors = ['#ef4444', '#f97316', '#fde047', '#38bdf8'];
    const baseFlameLen = Math.round((6 + this.rocketBoost * 14 + Math.sin(nowMs * 0.04) * 3) * px * 0.55);
    const rx = Math.round(cx - 7 * px + thrustX);
    const ry = Math.round(centerY - 5 * px + hoverY);

    for (let f = 0; f < 4; f++) {
      const fy = ry + (3 + f) * px;
      const len = Math.max(px, baseFlameLen - Math.abs(f - 1.5) * px * 2);
      ctx.fillStyle = flameColors[f];
      ctx.fillRect(rx - len, fy, len, px);
    }

    // Original 8-bit Pixel Starfighter Sprite (13x10)
    const rocketSprite = [
      '...RRR.......',
      '....RRR......',
      '..WWWWWWW....',
      '.WWWWCCWWWW..',
      'WWWWCCCCWWWW.',
      'WWWWCCCCWWWWW',
      '.WWWWCCWWWW..',
      '..WWWWWWW....',
      '....RRR......',
      '...RRR.......',
    ];

    this.drawPixelSprite(ctx, rx, ry, px, rocketSprite, {
      W: '#e2e8f0',
      C: '#38bdf8',
      R: '#f43f5e',
    });

    this.drawFloatingTokensAndSparks(ctx, cx + thrustX, ry - 4 * scale, scale, nowMs);
  }

  private drawArcadeGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    hitLineY: number,
    isCompact: boolean,
    nowMs: number
  ): void {
    const cx = Math.round(width / 2);
    const scale = isCompact ? 0.78 : Math.min(1.38, Math.max(0.88, hitLineY / 205));
    const horizonY = Math.round(hitLineY * (isCompact ? 0.36 : 0.38));
    const gridW = Math.min(width - 16, Math.round(420 * scale));

    // Retro Neon Synth Sun Circle at center horizon
    const sunR = Math.round((isCompact ? 24 : 36) * scale * (1 + this.energy * 0.14));
    const sunGrad = ctx.createLinearGradient(cx, horizonY - sunR, cx, horizonY + sunR * 0.3);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.55, '#f97316');
    sunGrad.addColorStop(1, '#ec4899');
    ctx.save();
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, horizonY, sunR, Math.PI, Math.PI * 2);
    ctx.fill();
    // Horizontal scanlines over sun
    ctx.fillStyle = '#080d1a';
    for (let sy = horizonY - sunR + 6; sy < horizonY; sy += Math.max(4, Math.round(5 * scale))) {
      ctx.fillRect(cx - sunR - 2, sy, sunR * 2 + 4, Math.max(1, Math.round(1.6 * scale)));
    }
    ctx.restore();

    // 80s Neon Perspective Floor Grid
    ctx.save();
    ctx.strokeStyle = `rgba(34, 211, 238, ${0.28 + this.energy * 0.35})`;
    ctx.lineWidth = 1.4;
    const rays = 9;
    for (let r = 0; r < rays; r++) {
      const ratio = (r / (rays - 1)) * 2 - 1; // -1 to +1
      ctx.beginPath();
      ctx.moveTo(cx + ratio * 24 * scale, horizonY);
      ctx.lineTo(cx + ratio * (gridW * 0.55), hitLineY - 2);
      ctx.stroke();
    }

    // Horizontal scrolling grid lines
    const rows = 5;
    for (let h = 0; h < rows; h++) {
      const t = ((h / rows) + this.gridScroll / rows) % 1;
      const y = horizonY + Math.pow(t, 1.7) * (hitLineY - horizonY - 2);
      const halfSpan = (24 + Math.pow(t, 1.35) * (gridW * 0.52 - 24));
      ctx.beginPath();
      ctx.moveTo(cx - halfSpan, y);
      ctx.lineTo(cx + halfSpan, y);
      ctx.stroke();
    }
    ctx.restore();

    // Chunky 8-bit Pixel Equalizer Bars centered on top of grid
    const barCount = this.eqBars.length;
    const barW = Math.round(14 * scale);
    const gap = Math.round(5 * scale);
    const totalW = barCount * barW + (barCount - 1) * gap;
    const startX = cx - totalW / 2;
    const maxBarH = Math.round((isCompact ? 54 : 88) * scale);
    const segH = Math.max(3, Math.round(5 * scale));
    const segGap = Math.max(1, Math.round(2 * scale));

    for (let i = 0; i < barCount; i++) {
      const val = this.eqBars[i];
      const segs = Math.max(1, Math.round((val * maxBarH) / (segH + segGap)));
      const bx = Math.round(startX + i * (barW + gap));
      for (let s = 0; s < segs; s++) {
        const sy = Math.round(hitLineY - 4 - (s + 1) * (segH + segGap));
        if (s > segs - 2) {
          ctx.fillStyle = '#fef08a';
        } else if (i % 2 === 0) {
          ctx.fillStyle = s > 5 ? '#f472b6' : '#22d3ee';
        } else {
          ctx.fillStyle = s > 5 ? '#fb923c' : '#4ade80';
        }
        ctx.fillRect(bx, sy, barW, segH);
      }
    }

    this.drawFloatingTokensAndSparks(ctx, cx, horizonY - 6 * scale, scale, nowMs);
  }
}
