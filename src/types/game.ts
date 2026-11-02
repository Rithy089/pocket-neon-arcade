export type PowerUpType = 'multiball' | 'widePaddle' | 'slowMotion' | 'laser' | 'life';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speedY: number;
  type: PowerUpType;
  color: string;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  speed: number;
  attachedToPaddle: boolean;
  trail: { x: number; y: number; alpha: number }[];
  color: string;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  baseWidth: number;
  speed: number;
  laserMode: boolean;
  laserTimer: number;
  color: string;
}

export type BrickType = 'normal' | 'armored' | 'explosive' | 'bonus' | 'speed';

export interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: BrickType;
  hitsRequired: number;
  currentHits: number;
  color: string;
  glowColor: string;
  scoreValue: number;
  powerUpDrop?: PowerUpType;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  dy: number;
  scale: number;
}

export interface LaserBeam {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speedY: number;
  color: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  combo: number;
  maxCombo: number;
  bricksCleared: number;
}

export type GameState = 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_CLEAR' | 'VICTORY';
