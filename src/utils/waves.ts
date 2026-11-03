import {
  Brick,
  BrickType,
  PowerUpType,
  BossEntity
} from '../types/game';

const PALETTE = {
  cyan: { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.85)' },
  pink: { color: '#ff007f', glow: 'rgba(255, 0, 127, 0.85)' },
  green: { color: '#39ff14', glow: 'rgba(57, 255, 20, 0.85)' },
  yellow: { color: '#ffe600', glow: 'rgba(255, 230, 0, 0.85)' },
  purple: { color: '#bc13fe', glow: 'rgba(188, 19, 254, 0.85)' },
  orange: { color: '#ff5e00', glow: 'rgba(255, 94, 0, 0.85)' },
  red: { color: '#ff073a', glow: 'rgba(255, 7, 58, 0.85)' },
  gold: { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.95)' },
  armored: { color: '#e2e8f0', glow: 'rgba(255, 255, 255, 0.85)' },
  phase: { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.9)' },
};

export function isBossWave(wave: number): boolean {
  return wave % 5 === 0;
}

export function getWaveTitle(wave: number): { title: string; subtitle: string; isBoss: boolean } {
  if (isBossWave(wave)) {
    const bossNum = Math.floor(wave / 5);
    return {
      title: `WARNING // CYBER-BOSS MK-${bossNum}`,
      subtitle: 'HIGH-PRIORITY SYSTEM ANOMALY DETECTED',
      isBoss: true,
    };
  }

  const titles = [
    { title: 'WAVE 01 // NEON AWAKENING', subtitle: 'GRID PERIMETER BREACH' },
    { title: 'WAVE 02 // CHROMATIC VECTOR', subtitle: 'TITANIUM DEFENSE PROTOCOLS ACTIVE' },
    { title: 'WAVE 03 // VOLATILE CIRCUIT', subtitle: 'HIGH CONCENTRATION OF EXPLOSIVE CORES' },
    { title: 'WAVE 04 // PHASE OSCILLATION', subtitle: 'QUANTUM SHIELDED TARGETS DETECTED' },
    { title: 'WAVE 06 // CYBER RESURGENCE', subtitle: 'AGGRESSIVE FREQUENCY SCALING' },
    { title: 'WAVE 07 // MATRIX FORTRESS', subtitle: 'HEAVY TITANIUM & GOLD SQUADRONS' },
    { title: 'WAVE 08 // HYPER MATRIX', subtitle: 'OVERCHARGED RESONANCE SECTOR' },
    { title: 'WAVE 09 // ZERO GRAVITY DENSITY', subtitle: 'FINAL APPROACH TO CENTRAL CORE' },
  ];

  const index = (wave - 1) % titles.length;
  return {
    title: titles[index]?.title || `WAVE ${wave < 10 ? '0' + wave : wave} // OVERDRIVE SECTOR`,
    subtitle: titles[index]?.subtitle || 'SYSTEM PURGE IN PROGRESS',
    isBoss: false,
  };
}

export function generateBricksForWave(wave: number, canvasWidth: number, topOffset = 85): Brick[] {
  const bricks: Brick[] = [];

  // Wave 5, 10, etc. are Boss waves: Boss has escort shield drones and fewer top bricks
  if (isBossWave(wave)) {
    // Generate a protective perimeter around the upper perimeter
    const bossPerimeterCols = 8;
    const padding = 8;
    const arenaMargin = 30;
    const usableWidth = canvasWidth - arenaMargin * 2;
    const brickWidth = (usableWidth - (bossPerimeterCols - 1) * padding) / bossPerimeterCols;
    const brickHeight = 18;

    for (let c = 0; c < bossPerimeterCols; c++) {
      if (c === 3 || c === 4) continue; // Gap in center for Boss entrance
      const x = arenaMargin + c * (brickWidth + padding);
      const y = topOffset;
      bricks.push({
        id: `boss-guard-${c}`,
        x,
        y,
        width: brickWidth,
        height: brickHeight,
        type: 'armored',
        hitsRequired: 2,
        currentHits: 0,
        color: PALETTE.armored.color,
        glowColor: PALETTE.armored.glow,
        scoreValue: 200,
      });
    }
    return bricks;
  }

  const patternIdx = (wave - 1) % 6;
  const padding = 6;
  const marginTop = topOffset;
  const brickHeight = 22;

  let cols = 10;
  let grid: string[] = [];

  switch (patternIdx) {
    case 0: // Wave 1: Intro wave (Normal + Explosive + Bonus)
      cols = 10;
      grid = [
        "CPCPCPCPCP",
        "GGGGGGGGGG",
        "YY  B B YY",
        " A  EE  A ",
        "CCCCCCCCCC",
        "PPPPPPPPPP"
      ];
      break;

    case 1: // Wave 2: Space Invader with Armored and Gold Carrier
      cols = 11;
      grid = [
        "  P     P  ",
        "   P   P   ",
        "  PPPPPPP  ",
        " AA A A AA ",
        " PEEEEEEEP ",
        " P P P P P ",
        " G       G ",
        "  S     S  " // S = Phase / Shielded
      ];
      break;

    case 2: // Wave 3: Diamond Core (Volatile + Armored)
      cols = 11;
      grid = [
        "     C     ",
        "    CGC    ",
        "   CGPGC   ",
        "  CA E AC  ",
        " CA EEE AC ",
        "  CA E AC  ",
        "   CGPGC   ",
        "    CGC    "
      ];
      break;

    case 3: // Wave 4: Quantum Lattice (Phase shielded + Explosives + Titanium)
      cols = 10;
      grid = [
        "SSSSSSSSSS",
        "EEEEEEEEEE",
        "AAAAAAAAAA",
        "CPCPCPCPCP",
        "GGGGGGGGGG",
        "YYYYYYYYYY"
      ];
      break;

    case 4: // Wave 6 (after Boss 1): Fortified Citadel
      cols = 11;
      grid = [
        " A   S   A ",
        " AAA S AAA ",
        "PEEE B EEEP",
        "CGGGGGGGGGC",
        "PPPPPPPPPPP",
        "  YY   YY  "
      ];
      break;

    default: // Wave 7+: High Density Cyber Lattice
      cols = 10;
      grid = [
        "ASASASASAS",
        "EEEEEEEEEE",
        "CGPGCGPGCP",
        "YYAABBAAYY",
        "PPPPPPPPPP",
        "CCCCCCCCCC"
      ];
      break;
  }

  const rows = grid.length;
  const arenaMargin = 22;
  const usableWidth = canvasWidth - arenaMargin * 2;
  const brickWidth = (usableWidth - (cols - 1) * padding) / cols;

  const powerUpTypes: PowerUpType[] = ['multiball', 'widePaddle', 'slowMotion', 'laser', 'life', 'shield'];

  for (let r = 0; r < rows; r++) {
    const rowStr = grid[r];
    for (let c = 0; c < rowStr.length; c++) {
      if (c >= cols) continue;
      const char = rowStr[c];
      if (char === ' ') continue;

      let type: BrickType = 'normal';
      let hits = 1;
      let color = PALETTE.cyan.color;
      let glow = PALETTE.cyan.glow;
      let score = 100;
      let powerUp: PowerUpType | undefined = undefined;
      let isPhased = false;
      let shardsDrop = 1;

      // Power-up chance
      if (Math.random() < 0.22) {
        powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      }

      switch (char) {
        case 'C':
          type = 'normal';
          color = PALETTE.cyan.color;
          glow = PALETTE.cyan.glow;
          score = 100;
          break;
        case 'P':
          type = 'normal';
          color = PALETTE.pink.color;
          glow = PALETTE.pink.glow;
          score = 120;
          break;
        case 'G':
          type = 'normal';
          color = PALETTE.green.color;
          glow = PALETTE.green.glow;
          score = 140;
          break;
        case 'Y':
          type = 'normal';
          color = PALETTE.yellow.color;
          glow = PALETTE.yellow.glow;
          score = 150;
          break;
        case 'A': // Armored (3 HP)
          type = 'armored';
          hits = 3;
          color = PALETTE.armored.color;
          glow = PALETTE.armored.glow;
          score = 300;
          shardsDrop = 3;
          break;
        case 'E': // Explosive Core
          type = 'explosive';
          color = PALETTE.red.color;
          glow = PALETTE.red.glow;
          score = 250;
          shardsDrop = 2;
          break;
        case 'B': // Bonus Brick
          type = 'bonus';
          color = PALETTE.purple.color;
          glow = PALETTE.purple.glow;
          score = 500;
          powerUp = 'multiball';
          shardsDrop = 4;
          break;
        case 'S': // Phase / Shielded Brick
          type = 'phase';
          color = PALETTE.phase.color;
          glow = PALETTE.phase.glow;
          score = 350;
          isPhased = true;
          shardsDrop = 3;
          break;
      }

      const x = arenaMargin + c * (brickWidth + padding);
      const y = marginTop + r * (brickHeight + padding);

      bricks.push({
        id: `brick-${wave}-${r}-${c}-${Math.random()}`,
        x,
        y,
        width: brickWidth,
        height: brickHeight,
        type,
        hitsRequired: hits,
        currentHits: 0,
        color,
        glowColor: glow,
        scoreValue: score,
        powerUpDrop: powerUp,
        isPhased,
        phaseTimer: Math.random() * 2, // Desynchronized phase breathing
        shardsDrop,
      });
    }
  }

  // 40% chance of spawning a patrolling Gold / Shard Carrier drone brick in wave >= 2
  if (wave >= 2 && Math.random() < 0.6) {
    const carrierWidth = 48;
    const carrierHeight = 20;
    bricks.push({
      id: `gold-carrier-${wave}-${Date.now()}`,
      x: arenaMargin + 20,
      y: marginTop - 28,
      width: carrierWidth,
      height: carrierHeight,
      type: 'goldCarrier',
      hitsRequired: 1,
      currentHits: 0,
      color: PALETTE.gold.color,
      glowColor: PALETTE.gold.glow,
      scoreValue: 1000,
      powerUpDrop: 'multiball',
      vx: 1.8,
      shardsDrop: 15,
    });
  }

  return bricks;
}

export function createBossForWave(wave: number, canvasWidth: number): BossEntity {
  const bossNum = Math.floor(wave / 5);
  const baseHp = 120 + bossNum * 40;

  const width = 160;
  const height = 65;
  const x = (canvasWidth - width) / 2;
  const y = 80;

  // 3 orbiting energy shield nodes
  const shieldNodes = [
    { id: 'shield-0', angle: 0, radius: 95, hp: 12, maxHp: 12, color: '#00f0ff' },
    { id: 'shield-1', angle: (Math.PI * 2) / 3, radius: 95, hp: 12, maxHp: 12, color: '#39ff14' },
    { id: 'shield-2', angle: (Math.PI * 4) / 3, radius: 95, hp: 12, maxHp: 12, color: '#bc13fe' },
  ];

  return {
    id: `boss-wave-${wave}`,
    name: `CYBER OVERLORD MK-${bossNum}`,
    x,
    y,
    width,
    height,
    hp: baseHp,
    maxHp: baseHp,
    phase: 1,
    vx: 1.8,
    color: '#ff007f',
    laserWarningTimer: 3.5,
    laserFiringTimer: 0,
    laserX: x + width / 2,
    laserWidth: 32,
    attackCooldown: 2.8,
    shieldNodes,
  };
}
