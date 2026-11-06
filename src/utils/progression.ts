import {
  ProgressionData,
  ChassisId,
  ChassisConfig,
  LeaderboardEntry,
  Achievement
} from '../types/game';
import { PALETTES, PaletteId } from './themes';

const SAVE_KEY = 'pocket_neon_save_v2';
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const savedInteger = (value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(maximum, Math.floor(value)) : fallback;
const isChassis = (value: unknown): value is ChassisId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHASSIS_CONFIGS, value);

export const CHASSIS_CONFIGS: Record<ChassisId, ChassisConfig> = {
  vanguard: {
    id: 'vanguard',
    name: 'VANGUARD',
    tagline: 'BALANCED ALL-ROUNDER',
    description: 'Standard military-grade chassis. Balanced maneuverability and laser recharge.',
    width: 110,
    speed: 9,
    color: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.8)',
    overdriveChargeRate: 1.0,
    bonusLives: 0,
    hasBarrierShield: false,
    unlocked: true,
    cost: 0,
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
    tagline: 'HIGH AGILITY & OVERDRIVE',
    description: '+25% speed with narrower frame. Charges Overdrive 40% faster.',
    width: 90,
    speed: 11.5,
    color: '#bc13fe',
    glowColor: 'rgba(188, 19, 254, 0.85)',
    overdriveChargeRate: 1.4,
    bonusLives: 0,
    hasBarrierShield: false,
    unlocked: false,
    cost: 250,
  },
  titan: {
    id: 'titan',
    name: 'TITAN',
    tagline: 'FORTIFIED DEFENSE',
    description: '+25% wider chassis. Starts every run with +1 Life and Emergency Energy Barrier.',
    width: 135,
    speed: 7.5,
    color: '#ffe600',
    glowColor: 'rgba(255, 230, 0, 0.85)',
    overdriveChargeRate: 0.85,
    bonusLives: 1,
    hasBarrierShield: true,
    unlocked: false,
    cost: 500,
  },
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'first_blood',
    title: 'FIRST BLOOD',
    description: 'Clear your first wave',
    rewardShards: 50,
    iconName: 'Zap',
  },
  {
    id: 'combo_10',
    title: 'COMBO APPRENTICE',
    description: 'Reach a 10x Combo multiplier',
    rewardShards: 75,
    iconName: 'Flame',
  },
  {
    id: 'combo_25',
    title: 'COMBO GOD',
    description: 'Reach a 25x Combo multiplier',
    rewardShards: 150,
    iconName: 'Crown',
  },
  {
    id: 'overdrive_unleashed',
    title: 'HYPER-STATE UNLEASHED',
    description: 'Trigger Overdrive mode for the first time',
    rewardShards: 100,
    iconName: 'Sparkles',
  },
  {
    id: 'cyber_hoarder',
    title: 'CYBER HOARDER',
    description: 'Collect 100 Neon Coins in a single run',
    rewardShards: 120,
    iconName: 'Disc3',
  },
  {
    id: 'untouchable',
    title: 'UNTOUCHABLE',
    description: 'Clear 3 waves without losing a life',
    rewardShards: 200,
    iconName: 'Shield',
  },
  {
    id: 'boss_slayer',
    title: 'CYBER SLAYER',
    description: 'Defeat the Wave 5 Cyber-Boss',
    rewardShards: 300,
    iconName: 'Trophy',
  },
  {
    id: 'titanium_breaker',
    title: 'TITANIUM BREAKER',
    description: 'Destroy 15 Armored Titanium bricks in one run',
    rewardShards: 100,
    iconName: 'Crosshair',
  },
  {
    id: 'gold_hunter',
    title: 'GOLDEN HUNTER',
    description: 'Intercept a rare Gold Coin Carrier',
    rewardShards: 150,
    iconName: 'CircleDot',
  },
  {
    id: 'arcade_legend',
    title: 'ARCADE LEGEND',
    description: 'Surpass 50,000 points in a single run',
    rewardShards: 500,
    iconName: 'Trophy',
  },
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', initials: 'NEO', score: 32000, wave: 5, chassis: 'vanguard', date: '2026-11-01' },
  { id: '2', initials: 'CYB', score: 24500, wave: 4, chassis: 'phantom', date: '2026-11-01' },
  { id: '3', initials: 'ACE', score: 18000, wave: 3, chassis: 'titan', date: '2026-10-31' },
  { id: '4', initials: 'TRX', score: 12400, wave: 2, chassis: 'vanguard', date: '2026-10-30' },
  { id: '5', initials: 'RED', score: 8500, wave: 1, chassis: 'vanguard', date: '2026-10-29' },
];

export const DEFAULT_PROGRESSION: ProgressionData = {
  schemaVersion: 3,
  selectedPalette: 'tokyo',
  palettesUnlocked: ['tokyo'],
  shards: 100, // Starting bonus for player experimentation
  highScore: 32000,
  selectedChassis: 'vanguard',
  chassisUnlocked: {
    vanguard: true,
    phantom: false,
    titan: false,
  },
  upgrades: {
    magnetField: { tier: 0, maxTier: 5, costs: [40, 100, 220, 450, 900] },
    comboCapacitor: { tier: 0, maxTier: 5, costs: [50, 120, 260, 500, 1000] },
    emergencyBarrier: { tier: 0, maxTier: 5, costs: [60, 150, 300, 600, 1200] },
    overdriveEfficiency: { tier: 0, maxTier: 5, costs: [50, 130, 280, 550, 1100] },
  },
  achievements: {},
  highScoreEntries: DEFAULT_LEADERBOARD,
  settings: {
    crtEnabled: true,
    bloomMode: 'high',
    soundFxEnabled: true,
    synthBgmEnabled: true,
    masterMuted: false,
    hapticsEnabled: true,
  },
};

export class ProgressionManager {
  private static instance: ProgressionManager;
  private data: ProgressionData;

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  private loadData(): ProgressionData {
    const defaults: ProgressionData = JSON.parse(JSON.stringify(DEFAULT_PROGRESSION));
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        // Check for old highscore
        const oldHighScore = parseInt(localStorage.getItem('neon_arcade_highscore') || '0', 10);
        const initial = defaults;
        if (oldHighScore > 0) {
          initial.highScore = Math.max(initial.highScore, oldHighScore);
        }
        this.saveData(initial);
        return initial;
      }
      const parsed = asRecord(JSON.parse(raw));
      // Recover valid fields independently; one partial upgrade must not erase a wallet.
      const migrated = defaults;
      migrated.shards = savedInteger(parsed.shards, defaults.shards);
      migrated.highScore = savedInteger(parsed.highScore, defaults.highScore);
      const savedUpgrades = asRecord(parsed.upgrades);
      for (const key of Object.keys(migrated.upgrades) as Array<keyof ProgressionData['upgrades']>) {
        const upgrade = migrated.upgrades[key];
        upgrade.tier = savedInteger(asRecord(savedUpgrades[key]).tier, 0, upgrade.maxTier);
        // Prices and tier limits always come from the current game, never the save.
      }
      const savedUnlocks = asRecord(parsed.chassisUnlocked);
      for (const id of ['phantom', 'titan'] as const) migrated.chassisUnlocked[id] = savedUnlocks[id] === true;
      migrated.selectedChassis = isChassis(parsed.selectedChassis) && migrated.chassisUnlocked[parsed.selectedChassis] ? parsed.selectedChassis : 'vanguard';
      const paletteIds = Array.isArray(parsed.palettesUnlocked) ? parsed.palettesUnlocked.filter((id): id is PaletteId => typeof id === 'string' && Object.prototype.hasOwnProperty.call(PALETTES, id)) : [];
      migrated.palettesUnlocked = [...new Set<PaletteId>(['tokyo', ...paletteIds])];
      migrated.selectedPalette = migrated.palettesUnlocked.includes(parsed.selectedPalette as PaletteId) ? parsed.selectedPalette as PaletteId : 'tokyo';
      const savedSettings = asRecord(parsed.settings);
      for (const key of ['crtEnabled', 'soundFxEnabled', 'synthBgmEnabled', 'masterMuted', 'hapticsEnabled'] as const) {
        if (typeof savedSettings[key] === 'boolean') migrated.settings[key] = savedSettings[key];
      }
      if (savedSettings.bloomMode === 'high' || savedSettings.bloomMode === 'performance' || savedSettings.bloomMode === 'off') migrated.settings.bloomMode = savedSettings.bloomMode;
      migrated.achievements = Object.fromEntries(Object.entries(asRecord(parsed.achievements)).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
      if (Array.isArray(parsed.highScoreEntries)) {
        migrated.highScoreEntries = parsed.highScoreEntries.flatMap((value, index): LeaderboardEntry[] => {
          const entry = asRecord(value);
          if (typeof entry.score !== 'number' || !Number.isFinite(entry.score) || entry.score < 0) return [];
          return [{
            id: typeof entry.id === 'string' ? entry.id : 'saved-' + index,
            initials: (typeof entry.initials === 'string' ? entry.initials : 'AAA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'A'),
            score: savedInteger(entry.score, 0),
            wave: Math.max(1, savedInteger(entry.wave, 1)),
            chassis: isChassis(entry.chassis) ? entry.chassis : 'vanguard',
            date: typeof entry.date === 'string' ? entry.date : '1970-01-01',
          }];
        }).sort((left, right) => right.score - left.score).slice(0, 5);
      }
      migrated.highScore = Math.max(migrated.highScore, ...migrated.highScoreEntries.map(entry => entry.score));
      this.saveData(migrated);
      return migrated;
    } catch {
      return defaults;
    }
  }

  private saveData(data: ProgressionData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      localStorage.setItem('neon_arcade_highscore', data.highScore.toString());
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  public getData(): ProgressionData {
    return { ...this.data };
  }

  public addShards(amount: number): number {
    this.data.shards += savedInteger(amount, 0);
    this.saveData(this.data);
    return this.data.shards;
  }

  public spendShards(amount: number): boolean {
    if (Number.isSafeInteger(amount) && amount >= 0 && this.data.shards >= amount) {
      this.data.shards -= amount;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public upgradeTier(upgradeKey: keyof ProgressionData['upgrades']): boolean {
    const upgrade = this.data.upgrades[upgradeKey];
    if (upgrade.tier >= upgrade.maxTier) return false;

    const cost = upgrade.costs[upgrade.tier];
    if (this.spendShards(cost)) {
      upgrade.tier += 1;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public unlockChassis(id: ChassisId): boolean {
    const config = CHASSIS_CONFIGS[id];
    if (this.data.chassisUnlocked[id]) return true;

    if (this.spendShards(config.cost)) {
      this.data.chassisUnlocked[id] = true;
      this.data.selectedChassis = id;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public selectChassis(id: ChassisId): boolean {
    if (this.data.chassisUnlocked[id]) {
      this.data.selectedChassis = id;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public updateSettings(settings: Partial<ProgressionData['settings']>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveData(this.data);
  }

  public selectPalette(id: PaletteId): boolean {
    if (!this.data.palettesUnlocked.includes(id)) {
      if (!this.spendShards(PALETTES[id].cost)) return false;
      this.data.palettesUnlocked.push(id);
    }
    this.data.selectedPalette = id;
    this.saveData(this.data);
    return true;
  }

  public checkAchievement(id: string): { unlocked: boolean; achievement?: Achievement } {
    if (this.data.achievements[id]) {
      return { unlocked: false };
    }
    const ach = ACHIEVEMENTS_LIST.find((a) => a.id === id);
    if (!ach) return { unlocked: false };

    this.data.achievements[id] = true;
    this.data.shards += ach.rewardShards;
    this.saveData(this.data);
    return { unlocked: true, achievement: ach };
  }

  public recordHighScore(score: number): number {
    const best = savedInteger(score, this.data.highScore);
    if (best > this.data.highScore) {
      this.data.highScore = best;
      this.saveData(this.data);
    }
    return this.data.highScore;
  }

  public isTopScore(score: number): boolean {
    if (score <= 0) return false;
    const entries = this.data.highScoreEntries;
    if (entries.length < 5) return true;
    return score > entries[entries.length - 1].score;
  }

  public addLeaderboardEntry(initials: string, score: number, wave: number, chassis: ChassisId): LeaderboardEntry[] {
    const cleanInitials = (initials || 'AAA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'A');
    const newEntry: LeaderboardEntry = {
      id: `score-${Date.now()}`,
      initials: cleanInitials,
      score,
      wave,
      chassis,
      date: new Date().toISOString().split('T')[0],
    };

    const combined = [...this.data.highScoreEntries, newEntry].sort((a, b) => b.score - a.score);
    this.data.highScoreEntries = combined.slice(0, 5);

    if (score > this.data.highScore) {
      this.data.highScore = score;
    }
    this.saveData(this.data);
    return this.data.highScoreEntries;
  }
}

export const progression = ProgressionManager.getInstance();
