import { Brick, BrickType, PowerUpType } from '../types/game';


const PALETTE = {
  cyan: { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.8)' },
  pink: { color: '#ff007f', glow: 'rgba(255, 0, 127, 0.8)' },
  green: { color: '#39ff14', glow: 'rgba(57, 255, 20, 0.8)' },
  yellow: { color: '#ffe600', glow: 'rgba(255, 230, 0, 0.8)' },
  purple: { color: '#bc13fe', glow: 'rgba(188, 19, 254, 0.8)' },
  orange: { color: '#ff5e00', glow: 'rgba(255, 94, 0, 0.8)' },
  red: { color: '#ff073a', glow: 'rgba(255, 7, 58, 0.8)' },
};

export const TOTAL_CAMPAIGN_LEVELS = 5;

export function getLevelName(levelNumber: number): string {
  switch (levelNumber) {
    case 1:
      return "SECTOR 1: CYBER WAVE";
    case 2:
      return "SECTOR 2: SPACE INVADER";
    case 3:
      return "SECTOR 3: DIAMOND FORTRESS";
    case 4:
      return "SECTOR 4: QUANTUM CORE";
    case 5:
      return "FINAL SECTOR: NEON OVERLORD";
    default:
      return `OVERDRIVE SECTOR ${levelNumber}`;
  }
}

export function generateBricksForLevel(levelNumber: number, canvasWidth: number, topOffset = 70): Brick[] {
  const bricks: Brick[] = [];
  const levelIdx = levelNumber <= TOTAL_CAMPAIGN_LEVELS ? levelNumber - 1 : (levelNumber - 1) % TOTAL_CAMPAIGN_LEVELS;

  const padding = 6;
  const marginTop = topOffset;
  const brickHeight = 22;

  let cols = 10;
  let rows = 6;
  let grid: string[] = [];

  if (levelIdx === 0) {
    // Level 1: CYBER WAVE
    cols = 10;
    grid = [
      "CPCPCPCPCP",
      "GGGGGGGGGG",
      " YY B  B YY",
      " A  EE  A ",
      "CCCCCCCCCC",
      "PPPPPPPPPP"
    ];
  } else if (levelIdx === 1) {
    // Level 2: SPACE INVADER
    cols = 11;
    grid = [
      "  P     P  ",
      "   P   P   ",
      "  PPPPPPP  ",
      " PP P P PP ",
      " PEEEEEEEP ",
      " P P P P P ",
      " P       P ",
      "  P     P  "
    ];
  } else if (levelIdx === 2) {
    // Level 3: DIAMOND FORTRESS
    cols = 11;
    grid = [
      "     C     ",
      "    CGC    ",
      "   CGPGC   ",
      "  CG P GC  ",
      " CG AEA GC ",
      "  CG P GC  ",
      "   CGPGC   ",
      "    CGC    "
    ];
  } else if (levelIdx === 3) {
    // Level 4: QUANTUM CORE
    cols = 10;
    grid = [
      "EEEEEEEEEE",
      "AAAAAAAAAA",
      "CCCCCCCCCC",
      "GGGGGGGGGG",
      "PPPPPPPPPP",
      "YYYYYYYYYY"
    ];
  } else {
    // Level 5: NEON OVERLORD (FINAL BOSS MATRIX)
    cols = 11;
    grid = [
      "   A   A   ",
      "  A EAE A  ",
      " P AAAAA P ",
      "PEE B B EEP",
      " GPPPPPPPG ",
      "  GGGGGGG  ",
      "   CCCCC   ",
      "    YYY    "
    ];
  }

  rows = grid.length;
  const totalHorizPadding = (cols + 1) * padding;
  const brickWidth = (canvasWidth - totalHorizPadding) / cols;

  const powerUpTypes: PowerUpType[] = ['multiball', 'widePaddle', 'slowMotion', 'laser', 'life'];

  for (let r = 0; r < rows; r++) {
    const rowStr = grid[r];
    for (let c = 0; c < rowStr.length; c++) {
      const char = rowStr[c];
      if (char === ' ') continue;

      let type: BrickType = 'normal';
      let hits = 1;
      let color = PALETTE.cyan.color;
      let glow = PALETTE.cyan.glow;
      let score = 100;
      let powerUp: PowerUpType | undefined = undefined;

      // 25% chance of powerup drop if not assigned
      if (Math.random() < 0.28) {
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
        case 'A': // Armored brick (takes 2 or 3 hits)
          type = 'armored';
          hits = Math.min(3, 2 + Math.floor(levelNumber / 2));
          color = '#e2e8f0';
          glow = 'rgba(255, 255, 255, 0.9)';
          score = 250;
          break;
        case 'E': // Explosive brick
          type = 'explosive';
          color = PALETTE.red.color;
          glow = PALETTE.red.glow;
          score = 300;
          break;
        case 'B': // Bonus brick
          type = 'bonus';
          color = PALETTE.purple.color;
          glow = PALETTE.purple.glow;
          score = 500;
          powerUp = 'multiball';
          break;
      }

      const x = padding + c * (brickWidth + padding);
      const y = marginTop + r * (brickHeight + padding);

      bricks.push({
        id: `brick-${r}-${c}-${Math.random()}`,
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
      });
    }
  }

  return bricks;
}
