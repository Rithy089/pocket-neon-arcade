export type PowerUpType = 'multiball' | 'widePaddle' | 'slowMotion' | 'laser' | 'life' | 'shield';

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
  isPlasma?: boolean; // Piercing during Overdrive
}

export type ChassisId = 'vanguard' | 'phantom' | 'titan';

export interface ChassisConfig {
  id: ChassisId;
  name: string;
  tagline: string;
  description: string;
  width: number;
  speed: number;
  color: string;
  glowColor: string;
  overdriveChargeRate: number; // 1.0, 1.4, 0.85
  bonusLives: number;
  hasBarrierShield: boolean;
  unlocked: boolean;
  cost: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  baseWidth: number;
  speed: number;
  laserMode: boolean;
  color: string;
  chassis: ChassisId;
  shieldActive: boolean;
  trail: { x: number; y: number; width: number; alpha: number }[];
}

export type BrickType = 'normal' | 'armored' | 'explosive' | 'bonus' | 'speed' | 'phase' | 'goldCarrier';

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
  // Dynamic archetypes
  isPhased?: boolean; // When true, shielded/invulnerable
  phaseTimer?: number;
  vx?: number; // Moving brick / carrier
  shardsDrop?: number;
}

export interface NeonShard {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  color: string;
  size: number;
  pulseOffset: number;
}

export interface BossShieldNode {
  id: string;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  color: string;
}

export interface BossEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  vx: number;
  color: string;
  laserWarningTimer: number; // Count down to laser
  laserFiringTimer: number;  // Laser active
  laserX: number;
  laserWidth: number;
  attackCooldown: number;
  shieldNodes: BossShieldNode[];
}

export interface BossHazard {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
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
  bounceCount?: number;
  isSpark?: boolean;
}

export interface Shockwave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export interface GridRipple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
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
  isOverdrivePlasma?: boolean;
}

export interface GameSettings {
  crtEnabled: boolean;
  bloomMode: 'high' | 'performance';
  soundFxEnabled: boolean;
  synthBgmEnabled: boolean;
}

export interface CyberUpgrade {
  tier: number; // 0 to 5
  maxTier: number;
  costs: number[]; // e.g. [50, 120, 250, 500, 1000]
}

export interface ProgressionData {
  shards: number;
  highScore: number;
  selectedChassis: ChassisId;
  chassisUnlocked: Record<ChassisId, boolean>;
  upgrades: {
    magnetField: CyberUpgrade;
    comboCapacitor: CyberUpgrade;
    emergencyBarrier: CyberUpgrade;
    overdriveEfficiency: CyberUpgrade;
  };
  achievements: Record<string, boolean>;
  highScoreEntries: LeaderboardEntry[];
  settings: GameSettings;
}

export interface LeaderboardEntry {
  id: string;
  initials: string;
  score: number;
  wave: number;
  chassis: ChassisId;
  date: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardShards: number;
  iconName: string;
}

export type GameState = 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WAVE_TRANSITION' | 'VICTORY';
