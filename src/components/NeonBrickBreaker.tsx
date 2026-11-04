import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useArcadeInput } from '../hooks/useArcadeInput';
import { ArcadeControls } from './ArcadeControls';
import { arcadeHaptic } from '../utils/haptics';
import {
  Ball,
  Paddle,
  Brick,
  PowerUp,
  Particle,
  FloatingText,
  LaserBeam,
  GameState,
  PowerUpType,
  NeonShard,
  BossEntity,
  BossHazard,
  Shockwave,
  GridRipple,
  ChassisId,
  GameSettings,
} from '../types/game';
import { generateBricksForWave, createBossForWave, isBossWave, getWaveTitle } from '../utils/waves';
import { soundManager } from '../utils/audio';
import { progression, CHASSIS_CONFIGS } from '../utils/progression';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sparkles,
  Heart,
  Crosshair,
  Trophy,
  Shield,
  Disc3,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  onScoreUpdate: (score: number) => void;
  onHighScoreUpdate: (highScore: number) => void;
  onShardsUpdate: (shards: number) => void;
  settings: GameSettings;
  onOpenShop: () => void;
  onOpenLeaderboard: (pending?: { score: number; wave: number; chassis: ChassisId }) => void;
  onTriggerAchievementToast: (achievementId: string) => void;
  isObscured: boolean;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 720;
const PADDLE_HEIGHT = 16;
const BALL_RADIUS = 7;
const INITIAL_BALL_SPEED = 6.2;

export const NeonBrickBreaker: React.FC<Props> = ({
  onScoreUpdate,
  onHighScoreUpdate,
  onShardsUpdate,
  settings,
  onOpenShop,
  onOpenLeaderboard,
  onTriggerAchievementToast,
  isObscured,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for UI Overlays
  const [gameState, setGameState] = useState<GameState>('READY');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => progression.getData().highScore);
  const [runShards, setRunShards] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [combo, setCombo] = useState<number>(0);
  const [overdriveMeter, setOverdriveMeter] = useState<number>(0);
  const [isOverdriveActive, setIsOverdriveActive] = useState<boolean>(false);
  const [barrierActive, setBarrierActive] = useState<boolean>(false);
  const [waveBanner, setWaveBanner] = useState<{ title: string; subtitle: string; isBoss: boolean } | null>(null);
  const [waveGraceSeconds, setWaveGraceSeconds] = useState<number>(0);
  const [bossHp, setBossHp] = useState<{ current: number; max: number; name: string } | null>(null);

  const [activePowerUps, setActivePowerUps] = useState<{
    laser: number;
    widePaddle: number;
    slowMotion: number;
    overdrive: number;
  }>({ laser: 0, widePaddle: 0, slowMotion: 0, overdrive: 0 });

  // Game Engine Mutable State Ref
  const stateRef = useRef<{
    gameState: GameState;
    score: number;
    highScore: number;
    lives: number;
    wave: number;
    combo: number;
    maxCombo: number;
    comboTimer: number;
    runShards: number;
    totalBricksCleared: number;
    armoredDestroyed: number;
    livesLostThisRun: number;

    // Juice & Camera
    shake: number;
    shakeAngle: number;
    hitStopTimer: number;
    gridRipples: GridRipple[];
    shockwaves: Shockwave[];

    // Overdrive
    overdriveMeter: number;
    isOverdriveActive: boolean;
    overdriveTimer: number;

    // Entities
    balls: Ball[];
    paddle: Paddle;
    bricks: Brick[];
    powerUps: PowerUp[];
    shards: NeonShard[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    lasers: LaserBeam[];
    boss: BossEntity | null;
    bossHazards: BossHazard[];

    // Barrier Floor
    barrierFloorActive: boolean;
    hasEmergencyBarrierUpgrade: boolean;

    // Timers
    powerUpTimers: {
      laser: number;
      widePaddle: number;
      slowMotion: number;
    };

  }>({
    gameState: 'READY',
    score: 0,
    highScore,
    lives: 3,
    wave: 1,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    runShards: 0,
    totalBricksCleared: 0,
    armoredDestroyed: 0,
    livesLostThisRun: 0,

    shake: 0,
    shakeAngle: 0,
    hitStopTimer: 0,
    gridRipples: [],
    shockwaves: [],

    overdriveMeter: 0,
    isOverdriveActive: false,
    overdriveTimer: 0,

    balls: [],
    paddle: {
      x: (CANVAS_WIDTH - 110) / 2,
      y: CANVAS_HEIGHT - 50,
      width: 110,
      height: PADDLE_HEIGHT,
      baseWidth: 110,
      speed: 9,
      laserMode: false,
      color: '#00f0ff',
      chassis: 'vanguard',
      shieldActive: false,
      trail: [],
    },
    bricks: [],
    powerUps: [],
    shards: [],
    particles: [],
    floatingTexts: [],
    lasers: [],
    boss: null,
    bossHazards: [],

    barrierFloorActive: false,
    hasEmergencyBarrierUpgrade: false,

    powerUpTimers: { laser: 0, widePaddle: 0, slowMotion: 0 },
  });

  // Callbacks ref
  const callbacksRef = useRef({
    onScoreUpdate,
    onHighScoreUpdate,
    onShardsUpdate,
    onOpenLeaderboard,
    onTriggerAchievementToast,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreUpdate,
      onHighScoreUpdate,
      onShardsUpdate,
      onOpenLeaderboard,
      onTriggerAchievementToast,
    };
  }, [onScoreUpdate, onHighScoreUpdate, onShardsUpdate, onOpenLeaderboard, onTriggerAchievementToast]);

  // Screen shake & hit stop triggers
  const triggerShake = (intensity: number, angle = Math.random() * Math.PI * 2) => {
    arcadeHaptic();
    stateRef.current.shake = Math.min(22, stateRef.current.shake + intensity);
    stateRef.current.shakeAngle = angle;
  };

  const triggerHitStop = (durationMs: number) => {
    stateRef.current.hitStopTimer = Math.max(stateRef.current.hitStopTimer, durationMs / 1000);
  };

  const addGridRipple = (x: number, y: number, strength = 18, maxRadius = 180) => {
    stateRef.current.gridRipples.push({
      id: `rip-${Math.random()}`,
      x,
      y,
      radius: 5,
      maxRadius,
      strength,
    });
  };

  const addShockwave = (x: number, y: number, color = '#00f0ff', maxRadius = 110) => {
    stateRef.current.shockwaves.push({
      id: `sw-${Math.random()}`,
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      alpha: 1,
      lineWidth: 3.5,
    });
  };

  // Advanced particle physics spawn
  const spawnParticles = (x: number, y: number, color: string, count = 16, speedMult = 1, isSpark = false) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4.5 + 1.2) * speedMult;
      stateRef.current.particles.push({
        id: `p-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isSpark ? Math.random() * 2 + 1 : Math.random() * 3 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.015,
        bounceCount: 0,
        isSpark,
      });
    }
  };

  // Add floating text
  const addFloatingText = (text: string, x: number, y: number, color = '#ffe600') => {
    stateRef.current.floatingTexts.push({
      id: `ft-${Math.random()}`,
      text,
      x,
      y,
      color,
      alpha: 1.3,
      dy: -1.4,
      scale: 1,
    });
  };

  // Drop Neon Coins
  const spawnShards = (x: number, y: number, count = 2) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      stateRef.current.shards.push({
        id: `shard-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0, // Initial pop upwards
        value: 1,
        color: '#ffd700',
        size: 7,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
  };

  // Overdrive Charge Helper
  const addOverdriveCharge = (amount: number) => {
    const s = stateRef.current;
    if (s.isOverdriveActive) return;

    const progData = progression.getData();
    const effTier = progData.upgrades.overdriveEfficiency.tier;
    const chassisCfg = CHASSIS_CONFIGS[s.paddle.chassis];
    const efficiencyMult = (1 + effTier * 0.15) * chassisCfg.overdriveChargeRate;

    s.overdriveMeter = Math.min(100, s.overdriveMeter + amount * efficiencyMult);
    setOverdriveMeter(Math.round(s.overdriveMeter));
  };

  // Activate Overdrive Hyper-State
  const triggerOverdrive = useCallback(() => {
    const s = stateRef.current;
    if (s.overdriveMeter < 100 || s.isOverdriveActive) return;

    s.overdriveMeter = 0;
    setOverdriveMeter(0);
    s.isOverdriveActive = true;
    s.overdriveTimer = 5.5; // 5.5 seconds hyper-state
    setIsOverdriveActive(true);

    triggerShake(14);
    addShockwave(s.paddle.x + s.paddle.width / 2, s.paddle.y, '#ffe600', 160);
    soundManager.playOverdriveTrigger();
    soundManager.setBgmIntensity('overdrive');

    // Make all current balls plasma piercing
    s.balls.forEach((b) => {
      b.isPlasma = true;
      b.color = '#ffe600';
    });

    callbacksRef.current.onTriggerAchievementToast('overdrive_unleashed');
    addFloatingText('HYPER-STATE OVERDRIVE!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 30, '#ffe600');
  }, []);

  // Initialize Wave
  const initWave = useCallback((targetWave: number, keepStats = false) => {
    const s = stateRef.current;
    const progData = progression.getData();
    const selectedChassisId = progData.selectedChassis;
    const chassisCfg = CHASSIS_CONFIGS[selectedChassisId];

    s.wave = targetWave;
    setWave(targetWave);

    const bannerInfo = getWaveTitle(targetWave);
    setWaveBanner(bannerInfo);

    if (bannerInfo.isBoss) {
      soundManager.setBgmIntensity('boss');
    } else {
      soundManager.setBgmIntensity('normal');
    }

    if (!keepStats) {
      s.score = 0;
      s.lives = 3 + chassisCfg.bonusLives;
      s.runShards = 0;
      s.totalBricksCleared = 0;
      s.armoredDestroyed = 0;
      s.livesLostThisRun = 0;
      s.overdriveMeter = 0;
      s.isOverdriveActive = false;
      setScore(0);
      setLives(s.lives);
      setRunShards(0);
      setOverdriveMeter(0);
      setIsOverdriveActive(false);
    }

    s.combo = 0;
    s.comboTimer = 0;
    setCombo(0);

    s.powerUps = [];
    s.shards = [];
    s.particles = [];
    s.floatingTexts = [];
    s.lasers = [];
    s.bossHazards = [];
    s.powerUpTimers = { laser: 0, widePaddle: 0, slowMotion: 0 };
    setActivePowerUps({ laser: 0, widePaddle: 0, slowMotion: 0, overdrive: 0 });

    // Paddle setup with selected chassis
    s.paddle.chassis = selectedChassisId;
    s.paddle.baseWidth = chassisCfg.width;
    s.paddle.width = chassisCfg.width;
    s.paddle.speed = chassisCfg.speed;
    s.paddle.color = chassisCfg.color;
    s.paddle.x = (CANVAS_WIDTH - chassisCfg.width) / 2;
    s.paddle.laserMode = false;
    s.paddle.shieldActive = chassisCfg.hasBarrierShield;

    // Check emergency barrier upgrade (recharged each wave)
    const barrierTier = progData.upgrades.emergencyBarrier.tier;
    s.hasEmergencyBarrierUpgrade = barrierTier > 0 || chassisCfg.hasBarrierShield;
    s.barrierFloorActive = s.hasEmergencyBarrierUpgrade;
    setBarrierActive(s.barrierFloorActive);

    // Generate Bricks & Boss
    s.bricks = generateBricksForWave(targetWave, CANVAS_WIDTH);

    if (isBossWave(targetWave)) {
      const boss = createBossForWave(targetWave, CANVAS_WIDTH);
      s.boss = boss;
      setBossHp({ current: boss.hp, max: boss.maxHp, name: boss.name });
    } else {
      s.boss = null;
      setBossHp(null);
    }

    // Single ball attached to paddle
    s.balls = [
      {
        id: `ball-init-${Date.now()}`,
        x: s.paddle.x + s.paddle.width / 2,
        y: s.paddle.y - BALL_RADIUS - 2,
        radius: BALL_RADIUS,
        dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.75 : -0.75),
        dy: -INITIAL_BALL_SPEED,
        speed: INITIAL_BALL_SPEED,
        attachedToPaddle: true,
        trail: [],
        color: '#00f0ff',
        isPlasma: false,
      },
    ];

    s.gameState = 'READY';
    setGameState('READY');
  }, []);

  // Launch Ball
  const launchBall = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'READY') {
      s.gameState = 'PLAYING';
      setGameState('PLAYING');
      s.balls.forEach((b) => {
        if (b.attachedToPaddle) {
          b.attachedToPaddle = false;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
          b.dx = Math.cos(angle) * b.speed;
          b.dy = Math.sin(angle) * b.speed;
        }
      });
      soundManager.playPaddleBounce();
      soundManager.startBgm();
    }
  }, []);

  const lastShot = useRef(-1000);

  // Fire Laser
  const fireLaserOrLaunch = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'READY') {
      launchBall();
      return;
    }
    if (s.gameState === 'PLAYING') {
      const now = performance.now();
      if (now - lastShot.current < 140) return;
      lastShot.current = now;
      if (s.paddle.laserMode || s.isOverdriveActive) {
        soundManager.playLaser(s.isOverdriveActive);
        const leftGunX = s.paddle.x + 8;
        const rightGunX = s.paddle.x + s.paddle.width - 8;
        const gunY = s.paddle.y - 4;
        const beamColor = s.isOverdriveActive ? '#ffe600' : '#ff007f';

        s.lasers.push(
          { id: `l-${Math.random()}`, x: leftGunX, y: gunY, width: 5, height: 16, speedY: -12, color: beamColor, isOverdrivePlasma: s.isOverdriveActive },
          { id: `l-${Math.random()}`, x: rightGunX, y: gunY, width: 5, height: 16, speedY: -12, color: beamColor, isOverdrivePlasma: s.isOverdriveActive }
        );
      }
    }
  }, [launchBall]);

  // Restart Game
  const restartGame = useCallback(() => {
    soundManager.playCoin();
    initWave(1, false);
  }, [initWave]);

  // Toggle Pause
  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'PLAYING') {
      s.gameState = 'PAUSED';
      setGameState('PAUSED');
      soundManager.stopBgm();
    } else if (s.gameState === 'PAUSED') {
      s.gameState = 'PLAYING';
      setGameState('PLAYING');
      soundManager.startBgm();
    }
  }, []);

  // Initial load
  useEffect(() => {
    initWave(1, false);
  }, [initWave]);

  const pauseForInterruption = useCallback(() => {
    soundManager.stopBgm();
    if (stateRef.current.gameState === 'PLAYING') togglePause();
  }, [togglePause]);

  const input = useArcadeInput({
    enabled: !isObscured,
    onAction: (action) => {
      if (action === 'fire') fireLaserOrLaunch();
      else if (action === 'overdrive') triggerOverdrive();
      else if (action === 'pause') togglePause();
      else if (action === 'restart') restartGame();
    },
    onInterrupt: pauseForInterruption,
  });
  const inputState = input.state;
  const obscuredRef = useRef(isObscured);
  obscuredRef.current = isObscured;
  useEffect(() => {
    if (isObscured) pauseForInterruption();
  }, [isObscured, pauseForInterruption]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    document.body.classList.add('arcade-playing');
    return () => document.body.classList.remove('arcade-playing');
  }, [gameState]);

  // MAIN 60FPS GAME LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const glow = (amount: number) => settings.bloomMode === 'off' ? 0 : settings.bloomMode === 'performance' ? Math.min(4, amount) : amount;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const s = stateRef.current;
      const progData = progression.getData();

      // Check Hit Stop (Physics pause during critical impacts)
      if (s.hitStopTimer > 0) {
        s.hitStopTimer -= dt;
      } else if (s.gameState === 'PLAYING' && !obscuredRef.current) {
        // --- 1. Paddle Movement ---
        const controls = inputState.current;
        const frame = dt * 60;
        if (controls.x !== 0) {
          s.paddle.x += controls.x * s.paddle.speed * frame;
        } else if (controls.pointerX !== null) {
          const targetX = controls.pointerX * CANVAS_WIDTH - s.paddle.width / 2;
          s.paddle.x += (targetX - s.paddle.x) * (1 - Math.pow(0.55, frame));
        }
        if (controls.firing) fireLaserOrLaunch();

        // Clamp inside arena walls
        if (s.paddle.x < 12) s.paddle.x = 12;
        if (s.paddle.x + s.paddle.width > CANVAS_WIDTH - 12) {
          s.paddle.x = CANVAS_WIDTH - 12 - s.paddle.width;
        }

        // Paddle motion trail
        s.paddle.trail.push({ x: s.paddle.x, y: s.paddle.y, width: s.paddle.width, alpha: 0.4 });
        if (s.paddle.trail.length > 5) s.paddle.trail.shift();

        // --- 2. Combo Timer Decay ---
        if (s.combo > 0) {
          const capacitorBonus = progData.upgrades.comboCapacitor.tier * 0.6;
          const maxComboWindow = 2.4 + capacitorBonus;
          s.comboTimer += dt;
          if (s.comboTimer >= maxComboWindow) {
            s.combo = 0;
            s.comboTimer = 0;
            setCombo(0);
          }
        }

        // --- 3. Overdrive Duration & Auto-fire ---
        if (s.isOverdriveActive) {
          s.overdriveTimer -= dt;
          if (Math.random() < 0.25) {
            // Rapid plasma laser barrage during Overdrive
            fireLaserOrLaunch();
          }
          if (s.overdriveTimer <= 0) {
            s.isOverdriveActive = false;
            setIsOverdriveActive(false);
            soundManager.setBgmIntensity(s.boss ? 'boss' : 'normal');
            s.balls.forEach((b) => {
              b.isPlasma = false;
              b.color = '#00f0ff';
            });
          }
        }

        // --- 4. Power-Up Buff Timers ---
        const baseWidth = s.paddle.baseWidth;
        if (s.powerUpTimers.widePaddle > 0) {
          s.powerUpTimers.widePaddle -= dt;
          s.paddle.width = baseWidth * 1.45;
        } else {
          s.paddle.width = baseWidth;
        }

        if (s.powerUpTimers.laser > 0) {
          s.powerUpTimers.laser -= dt;
          s.paddle.laserMode = true;
        } else {
          s.paddle.laserMode = false;
        }

        if (s.powerUpTimers.slowMotion > 0) {
          s.powerUpTimers.slowMotion -= dt;
        }

        setActivePowerUps({
          laser: Math.max(0, Math.ceil(s.powerUpTimers.laser)),
          widePaddle: Math.max(0, Math.ceil(s.powerUpTimers.widePaddle)),
          slowMotion: Math.max(0, Math.ceil(s.powerUpTimers.slowMotion)),
          overdrive: Math.max(0, Math.ceil(s.overdriveTimer)),
        });

        // --- 5. Laser Projectiles ---
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const laser = s.lasers[i];
          laser.y += laser.speedY;

          if (laser.y < 0) {
            s.lasers.splice(i, 1);
            continue;
          }

          // Check hit vs Boss
          if (s.boss) {
            const b = s.boss;
            if (
              laser.x >= b.x &&
              laser.x <= b.x + b.width &&
              laser.y >= b.y &&
              laser.y <= b.y + b.height
            ) {
              const dmg = laser.isOverdrivePlasma ? 5 : 2;
              b.hp = Math.max(0, b.hp - dmg);
              setBossHp({ current: b.hp, max: b.maxHp, name: b.name });
              triggerShake(2);
              spawnParticles(laser.x, laser.y, '#ff007f', 6, 1, true);
              soundManager.playBrickHit(true, s.combo);
              s.lasers.splice(i, 1);
              continue;
            }
          }

          // Check hit vs Bricks
          let laserHit = false;
          for (let j = s.bricks.length - 1; j >= 0; j--) {
            const brick = s.bricks[j];
            if (
              laser.x > brick.x &&
              laser.x < brick.x + brick.width &&
              laser.y > brick.y &&
              laser.y < brick.y + brick.height
            ) {
              if (brick.isPhased) {
                // Shield deflected laser
                soundManager.playShieldDeflect();
                spawnParticles(laser.x, laser.y, '#38bdf8', 6);
                laserHit = true;
                break;
              }

              laserHit = true;
              brick.currentHits++;
              spawnParticles(laser.x, laser.y, '#ff007f', 8, 1, true);
              soundManager.playBrickHit(brick.type === 'armored', s.combo);

              if (brick.currentHits >= brick.hitsRequired) {
                destroyBrick(brick);
              }
              break;
            }
          }

          if (laserHit) {
            s.lasers.splice(i, 1);
          }
        }

        // --- 6. Falling Power-ups & Shards with Magnet Field ---
        const magnetTier = progData.upgrades.magnetField.tier;
        const magnetRadius = 60 + magnetTier * 38;
        const paddleCenterX = s.paddle.x + s.paddle.width / 2;
        const paddleCenterY = s.paddle.y + s.paddle.height / 2;

        // Power-ups
        for (let i = s.powerUps.length - 1; i >= 0; i--) {
          const pw = s.powerUps[i];
          pw.y += pw.speedY;

          // Magnet attraction
          const distToPaddle = Math.hypot(paddleCenterX - pw.x, paddleCenterY - pw.y);
          if (distToPaddle < magnetRadius) {
            const pullAngle = Math.atan2(paddleCenterY - pw.y, paddleCenterX - pw.x);
            pw.x += Math.cos(pullAngle) * 3.5;
            pw.y += Math.sin(pullAngle) * 3.5;
          }

          // Paddle catch
          if (
            pw.y + pw.height >= s.paddle.y &&
            pw.y <= s.paddle.y + s.paddle.height &&
            pw.x + pw.width >= s.paddle.x &&
            pw.x <= s.paddle.x + s.paddle.width
          ) {
            soundManager.playPowerup();
            arcadeHaptic();
            spawnParticles(pw.x, pw.y, pw.color, 22);
            addOverdriveCharge(12);

            if (pw.type === 'multiball') {
              const refBall = s.balls[0] || {
                x: s.paddle.x + s.paddle.width / 2,
                y: s.paddle.y - BALL_RADIUS,
                speed: INITIAL_BALL_SPEED,
              };
              s.balls.push(
                {
                  id: `b-${Math.random()}`,
                  x: refBall.x,
                  y: refBall.y,
                  radius: BALL_RADIUS,
                  dx: -INITIAL_BALL_SPEED * 0.8,
                  dy: -INITIAL_BALL_SPEED,
                  speed: INITIAL_BALL_SPEED,
                  attachedToPaddle: false,
                  trail: [],
                  color: '#bc13fe',
                },
                {
                  id: `b-${Math.random()}`,
                  x: refBall.x,
                  y: refBall.y,
                  radius: BALL_RADIUS,
                  dx: INITIAL_BALL_SPEED * 0.8,
                  dy: -INITIAL_BALL_SPEED,
                  speed: INITIAL_BALL_SPEED,
                  attachedToPaddle: false,
                  trail: [],
                  color: '#bc13fe',
                }
              );
            } else if (pw.type === 'widePaddle') {
              s.powerUpTimers.widePaddle = 16;
            } else if (pw.type === 'laser') {
              s.powerUpTimers.laser = 14;
            } else if (pw.type === 'slowMotion') {
              s.powerUpTimers.slowMotion = 12;
            } else if (pw.type === 'life') {
              s.lives = Math.min(5, s.lives + 1);
              setLives(s.lives);
              soundManager.playCoin();
            } else if (pw.type === 'shield') {
              s.barrierFloorActive = true;
              setBarrierActive(true);
              soundManager.playShieldDeflect();
            }

            s.powerUps.splice(i, 1);
            continue;
          }

          if (pw.y > CANVAS_HEIGHT) {
            s.powerUps.splice(i, 1);
          }
        }

        // Neon Coins with Magnet Field Pull
        for (let i = s.shards.length - 1; i >= 0; i--) {
          const sh = s.shards[i];
          sh.x += sh.vx;
          sh.y += sh.vy;
          sh.vx *= 0.96;
          sh.vy = Math.min(6, sh.vy + 0.16); // Gravity

          const distToPaddle = Math.hypot(paddleCenterX - sh.x, paddleCenterY - sh.y);
          if (distToPaddle < magnetRadius * 1.35) {
            const pullAngle = Math.atan2(paddleCenterY - sh.y, paddleCenterX - sh.x);
            sh.vx += Math.cos(pullAngle) * 0.85;
            sh.vy += Math.sin(pullAngle) * 0.85;
          }

          // Shard catch by paddle
          if (
            sh.y >= s.paddle.y - 12 &&
            sh.y <= s.paddle.y + s.paddle.height + 10 &&
            sh.x >= s.paddle.x - 8 &&
            sh.x <= s.paddle.x + s.paddle.width + 8
          ) {
            soundManager.playShardCollect();
            arcadeHaptic();
            spawnParticles(sh.x, sh.y, '#ffd700', 8, 0.8, true);
            const totalShards = progression.addShards(sh.value);
            s.runShards += sh.value;
            setRunShards(s.runShards);

            callbacksRef.current.onShardsUpdate(totalShards);

            addOverdriveCharge(3);
            if (s.runShards >= 100) {
              callbacksRef.current.onTriggerAchievementToast('cyber_hoarder');
            }

            s.shards.splice(i, 1);
            continue;
          }

          if (sh.y > CANVAS_HEIGHT) {
            s.shards.splice(i, 1);
          }
        }

        // --- 7. Brick Archetype Logic (Phase Toggling & Moving Carriers) ---
        s.bricks.forEach((brick) => {
          // Moving Gold / Shard Carrier
          if (brick.type === 'goldCarrier' && brick.vx) {
            brick.x += brick.vx;
            if (brick.x <= 20) {
              brick.x = 20;
              brick.vx = Math.abs(brick.vx);
            } else if (brick.x + brick.width >= CANVAS_WIDTH - 20) {
              brick.x = CANVAS_WIDTH - 20 - brick.width;
              brick.vx = -Math.abs(brick.vx);
            }
          }

          // Phase / Shielded Brick breathing cycle
          if (brick.type === 'phase') {
            brick.phaseTimer = (brick.phaseTimer || 0) + dt;
            if (brick.phaseTimer > 3.0) {
              brick.isPhased = !brick.isPhased;
              brick.phaseTimer = 0;
            }
          }
        });

        // --- 8. Cyber-Boss Director (Every 5th Wave) ---
        if (s.boss) {
          const b = s.boss;
          b.x += b.vx;
          if (b.x <= 25) {
            b.x = 25;
            b.vx = Math.abs(b.vx);
          } else if (b.x + b.width >= CANVAS_WIDTH - 25) {
            b.x = CANVAS_WIDTH - 25 - b.width;
            b.vx = -Math.abs(b.vx);
          }

          // Update orbiting shield nodes
          b.shieldNodes.forEach((node) => {
            node.angle += dt * 1.5;
          });

          // Telegraph Laser Attack
          b.laserWarningTimer -= dt;
          if (b.laserWarningTimer <= 0) {
            b.laserFiringTimer = 1.2; // Fire laser for 1.2s
            b.laserWarningTimer = 4.5;
            b.laserX = b.x + b.width / 2;
            soundManager.playLaser(true);
            triggerShake(8);
          }

          if (b.laserFiringTimer > 0) {
            b.laserFiringTimer -= dt;
            // Check if player paddle intersects the boss laser beam
            const beamLeft = b.laserX - b.laserWidth / 2;
            const beamRight = b.laserX + b.laserWidth / 2;
            if (s.paddle.x + s.paddle.width >= beamLeft && s.paddle.x <= beamRight) {
              // Paddle hit by boss laser!
              handleLoseLife();
            }
          }

          // Periodic homing hazard orbs
          b.attackCooldown -= dt;
          if (b.attackCooldown <= 0) {
            b.attackCooldown = 3.2;
            s.bossHazards.push({
              id: `hz-${Math.random()}`,
              x: b.x + b.width / 2,
              y: b.y + b.height,
              vx: (s.paddle.x + s.paddle.width / 2 - (b.x + b.width / 2)) * 0.005,
              vy: 2.8,
              radius: 9,
              color: '#ff007f',
            });
          }

          // Check Boss Defeat
          if (b.hp <= 0) {
            // Boss Defeated!
            triggerShake(20);
            triggerHitStop(60);
            addShockwave(b.x + b.width / 2, b.y + b.height / 2, '#ffe600', 250);
            addGridRipple(b.x + b.width / 2, b.y + b.height / 2, 35, 260);
            soundManager.playExplosion(true);
            spawnParticles(b.x + b.width / 2, b.y + b.height / 2, '#ffe600', 60, 2);
            spawnShards(b.x + b.width / 2, b.y + b.height / 2, 25);
            s.score += 8000;
            setScore(s.score);
            callbacksRef.current.onScoreUpdate(s.score);
            callbacksRef.current.onTriggerAchievementToast('boss_slayer');
            s.boss = null;
            setBossHp(null);
          }
        }

        // Boss Hazards update
        for (let i = s.bossHazards.length - 1; i >= 0; i--) {
          const hz = s.bossHazards[i];
          hz.x += hz.vx;
          hz.y += hz.vy;

          // Paddle collision
          if (
            hz.y + hz.radius >= s.paddle.y &&
            hz.y - hz.radius <= s.paddle.y + s.paddle.height &&
            hz.x + hz.radius >= s.paddle.x &&
            hz.x - hz.radius <= s.paddle.x + s.paddle.width
          ) {
            spawnParticles(hz.x, hz.y, hz.color, 16);
            s.bossHazards.splice(i, 1);
            handleLoseLife();
            continue;
          }

          if (hz.y > CANVAS_HEIGHT) {
            s.bossHazards.splice(i, 1);
          }
        }

        // --- 9. Balls Physics, Brick Collisions & Wall Rebounds ---
        const speedScale = s.powerUpTimers.slowMotion > 0 ? 0.6 : 1.0;

        for (let i = s.balls.length - 1; i >= 0; i--) {
          const ball = s.balls[i];

          if (ball.attachedToPaddle) {
            ball.x = s.paddle.x + s.paddle.width / 2;
            ball.y = s.paddle.y - ball.radius - 2;
            continue;
          }

          // Motion trail buffer
          ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.65 });
          if (ball.trail.length > 8) ball.trail.shift();

          ball.x += ball.dx * speedScale;
          ball.y += ball.dy * speedScale;

          // Wall bounces
          if (ball.x - ball.radius <= 12) {
            ball.x = 12 + ball.radius;
            ball.dx = Math.abs(ball.dx);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 5, 0.8, true);
          } else if (ball.x + ball.radius >= CANVAS_WIDTH - 12) {
            ball.x = CANVAS_WIDTH - 12 - ball.radius;
            ball.dx = -Math.abs(ball.dx);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 5, 0.8, true);
          }

          // Ceiling bounce
          if (ball.y - ball.radius <= 12) {
            ball.y = 12 + ball.radius;
            ball.dy = Math.abs(ball.dy);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 5, 0.8, true);
          }

          // Paddle bounce
          if (
            ball.y + ball.radius >= s.paddle.y &&
            ball.y - ball.radius <= s.paddle.y + s.paddle.height &&
            ball.x >= s.paddle.x - ball.radius &&
            ball.x <= s.paddle.x + s.paddle.width + ball.radius &&
            ball.dy > 0
          ) {
            const hitOffset = (ball.x - (s.paddle.x + s.paddle.width / 2)) / (s.paddle.width / 2);
            const clamped = Math.max(-0.92, Math.min(0.92, hitOffset));
            const maxAngle = Math.PI * 0.43;
            const bounceAngle = clamped * maxAngle - Math.PI / 2;

            const nextSpeed = Math.min(10.5, ball.speed + 0.06);
            ball.speed = nextSpeed;
            ball.dx = Math.cos(bounceAngle) * nextSpeed;
            ball.dy = Math.sin(bounceAngle) * nextSpeed;

            soundManager.playPaddleBounce();
            spawnParticles(ball.x, s.paddle.y, s.paddle.color, 9, 1, true);
          }

          // Check collisions with Boss & Shield Nodes
          if (s.boss) {
            const b = s.boss;
            // Shield nodes test
            b.shieldNodes.forEach((node) => {
              const nodeX = b.x + b.width / 2 + Math.cos(node.angle) * node.radius;
              const nodeY = b.y + b.height / 2 + Math.sin(node.angle) * (node.radius * 0.5);
              const dist = Math.hypot(ball.x - nodeX, ball.y - nodeY);
              if (dist <= ball.radius + 14 && node.hp > 0) {
                node.hp -= ball.isPlasma ? 4 : 2;
                ball.dy = -ball.dy;
                soundManager.playBrickHit(true, s.combo);
                spawnParticles(nodeX, nodeY, node.color, 10);
                triggerHitStop(25);
              }
            });

            // Boss body test
            if (
              ball.x + ball.radius >= b.x &&
              ball.x - ball.radius <= b.x + b.width &&
              ball.y + ball.radius >= b.y &&
              ball.y - ball.radius <= b.y + b.height
            ) {
              const dmg = ball.isPlasma ? 8 : 4;
              b.hp = Math.max(0, b.hp - dmg);
              setBossHp({ current: b.hp, max: b.maxHp, name: b.name });

              ball.dy = -ball.dy;
              triggerShake(5);
              triggerHitStop(35);
              soundManager.playBrickHit(true, s.combo);
              spawnParticles(ball.x, ball.y, '#ff007f', 14, 1.2);
            }
          }

          // Brick collision detection
          for (let bIdx = s.bricks.length - 1; bIdx >= 0; bIdx--) {
            const brick = s.bricks[bIdx];

            const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
            const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const distance = Math.hypot(distX, distY);

            if (distance < ball.radius) {
              // Check Phase / Shield state
              if (brick.isPhased && !ball.isPlasma) {
                // Deflects without taking damage
                ball.dy = -ball.dy;
                soundManager.playShieldDeflect();
                spawnParticles(ball.x, ball.y, '#38bdf8', 8);
                break;
              }

              // Normal or plasma penetration
              if (!ball.isPlasma) {
                const overlapLeft = ball.x + ball.radius - brick.x;
                const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
                const overlapTop = ball.y + ball.radius - brick.y;
                const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                  ball.dx = -ball.dx;
                } else {
                  ball.dy = -ball.dy;
                }
              }

              brick.currentHits++;
              soundManager.playBrickHit(brick.type === 'armored', s.combo);

              if (brick.currentHits >= brick.hitsRequired) {
                destroyBrick(brick);
              } else {
                spawnParticles(ball.x, ball.y, brick.color, 8, 0.9, true);
              }
              break;
            }
          }

          // Ball fell out of bounds (Bottom)
          if (ball.y - ball.radius > CANVAS_HEIGHT) {
            // Check Emergency Barrier Floor
            if (s.barrierFloorActive) {
              s.barrierFloorActive = false;
              setBarrierActive(false);
              ball.y = CANVAS_HEIGHT - 35;
              ball.dy = -Math.abs(ball.dy);
              soundManager.playShieldDeflect();
              triggerShake(7);
              addShockwave(ball.x, CANVAS_HEIGHT - 10, '#39ff14', 120);
              addFloatingText('EMERGENCY BARRIER TRIGGERED!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60, '#39ff14');
            } else {
              s.balls.splice(i, 1);
            }
          }
        }

        // All balls lost
        if (s.balls.length === 0) {
          handleLoseLife();
        }
      }

      // Helper: Destroy Brick
      function destroyBrick(brick: Brick) {
        s.combo++;
        s.comboTimer = 0;
        setCombo(s.combo);

        if (s.combo > s.maxCombo) {
          s.maxCombo = s.combo;
          if (s.maxCombo >= 10) callbacksRef.current.onTriggerAchievementToast('combo_10');
          if (s.maxCombo >= 25) callbacksRef.current.onTriggerAchievementToast('combo_25');
        }

        const comboMult = Math.min(s.combo, 12);
        const overdriveBonus = s.isOverdriveActive ? 2 : 1;
        const pointsEarned = brick.scoreValue * comboMult * overdriveBonus;
        s.score += pointsEarned;
        setScore(s.score);
        callbacksRef.current.onScoreUpdate(s.score);

        if (s.score > s.highScore) {
          s.highScore = s.score;
          setHighScore(s.score);
          callbacksRef.current.onHighScoreUpdate(s.score);
        }

        if (s.score >= 50000) {
          callbacksRef.current.onTriggerAchievementToast('arcade_legend');
        }

        addOverdriveCharge(4 * overdriveBonus);

        // Floating score text
        const comboLabel = comboMult > 1 ? `+${pointsEarned} x${comboMult}!` : `+${pointsEarned}`;
        addFloatingText(comboLabel, brick.x + brick.width / 2, brick.y, brick.color);

        const destroyedIds = new Set<string>();
        destroyedIds.add(brick.id);

        s.totalBricksCleared++;
        if (brick.type === 'armored') {
          s.armoredDestroyed++;
          if (s.armoredDestroyed >= 15) {
            callbacksRef.current.onTriggerAchievementToast('titanium_breaker');
          }
        }
        if (brick.type === 'goldCarrier') {
          callbacksRef.current.onTriggerAchievementToast('gold_hunter');
        }

        // Explosive Brick Detonation
        if (brick.type === 'explosive') {
          triggerShake(12);
          triggerHitStop(40);
          soundManager.playExplosion(false);
          addShockwave(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ff073a', 140);
          addGridRipple(brick.x + brick.width / 2, brick.y + brick.height / 2, 22, 160);
          spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ff073a', 35, 1.8);

          // Radius damage
          const radius = 95;
          for (let k = 0; k < s.bricks.length; k++) {
            const nb = s.bricks[k];
            if (nb.id === brick.id) continue;
            const dist = Math.hypot(
              nb.x + nb.width / 2 - (brick.x + brick.width / 2),
              nb.y + nb.height / 2 - (brick.y + brick.height / 2)
            );
            if (dist <= radius) {
              nb.currentHits += 2;
              if (nb.currentHits >= nb.hitsRequired) {
                s.score += nb.scoreValue * overdriveBonus;
                spawnParticles(nb.x + nb.width / 2, nb.y + nb.height / 2, nb.color, 14);
                destroyedIds.add(nb.id);
                if (nb.powerUpDrop) spawnPowerUp(nb.x + nb.width / 2, nb.y + nb.height / 2, nb.powerUpDrop);
                spawnShards(nb.x + nb.width / 2, nb.y + nb.height / 2, nb.shardsDrop || 1);
              }
            }
          }
        } else {
          spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 18);
        }

        // Drops
        if (brick.powerUpDrop) {
          spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.powerUpDrop);
        }
        spawnShards(brick.x + brick.width / 2, brick.y + brick.height / 2, (brick.shardsDrop || 1) * overdriveBonus);

        // Remove destroyed bricks cleanly by ID
        s.bricks = s.bricks.filter((b) => !destroyedIds.has(b.id));

        // Check Wave Clear (All bricks gone AND no active boss)
        if (s.bricks.length === 0 && !s.boss) {
          handleWaveClear();
        }
      }

      function spawnPowerUp(x: number, y: number, type: PowerUpType) {
        const colors: Record<PowerUpType, string> = {
          multiball: '#00f0ff',
          widePaddle: '#39ff14',
          slowMotion: '#bc13fe',
          laser: '#ff007f',
          life: '#ffe600',
          shield: '#38bdf8',
        };
        s.powerUps.push({
          id: `pw-${Math.random()}`,
          x,
          y,
          width: 30,
          height: 18,
          speedY: 2.4,
          type,
          color: colors[type],
        });
      }

      function handleLoseLife() {
        s.lives--;
        s.livesLostThisRun++;
        setLives(s.lives);
        s.combo = 0;
        setCombo(0);
        soundManager.playLifeLost();
        triggerShake(10);

        if (s.lives <= 0) {
          s.gameState = 'GAMEOVER';
          setGameState('GAMEOVER');
          soundManager.playGameOver();
          soundManager.stopBgm();

          // Check if eligible for top 5 local leaderboard
          if (progression.isTopScore(s.score)) {
            callbacksRef.current.onOpenLeaderboard({
              score: s.score,
              wave: s.wave,
              chassis: s.paddle.chassis,
            });
          }
        } else {
          // Respawn single ball attached to paddle
          s.balls = [
            {
              id: `b-respawn-${Date.now()}`,
              x: s.paddle.x + s.paddle.width / 2,
              y: s.paddle.y - BALL_RADIUS - 2,
              radius: BALL_RADIUS,
              dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.75 : -0.75),
              dy: -INITIAL_BALL_SPEED,
              speed: INITIAL_BALL_SPEED,
              attachedToPaddle: true,
              trail: [],
              color: '#00f0ff',
              isPlasma: false,
            },
          ];
          s.gameState = 'READY';
          setGameState('READY');
        }
      }

      function handleWaveClear() {
        soundManager.playLevelClear();
        triggerShake(10);
        addShockwave(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#39ff14', 220);

        callbacksRef.current.onTriggerAchievementToast('first_blood');
        if (s.wave >= 3 && s.livesLostThisRun === 0) {
          callbacksRef.current.onTriggerAchievementToast('untouchable');
        }

        // Speed clear bonus
        const waveClearBonus = 1500 + s.lives * 500;
        s.score += waveClearBonus;
        setScore(s.score);
        callbacksRef.current.onScoreUpdate(s.score);

        // Auto transition with 2-second grace banner
        s.gameState = 'WAVE_TRANSITION';
        setGameState('WAVE_TRANSITION');
        setWaveGraceSeconds(2);

        setTimeout(() => {
          if (stateRef.current.gameState === 'WAVE_TRANSITION') {
            initWave(s.wave + 1, true);
          }
        }, 2200);
      }

      // Update Kinetic VFX Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.alpha -= p.decay;

        // Spark wall bounce
        if (p.isSpark && (p.x <= 12 || p.x >= CANVAS_WIDTH - 12)) {
          p.vx = -p.vx * 0.8;
        }
        if (p.isSpark && p.y <= 12) {
          p.vy = -p.vy * 0.8;
        }

        if (p.alpha <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // Update Shockwaves
      for (let i = s.shockwaves.length - 1; i >= 0; i--) {
        const sw = s.shockwaves[i];
        sw.radius += 8;
        sw.alpha = 1 - sw.radius / sw.maxRadius;
        if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
          s.shockwaves.splice(i, 1);
        }
      }

      // Update Grid Ripples
      for (let i = s.gridRipples.length - 1; i >= 0; i--) {
        const rip = s.gridRipples[i];
        rip.radius += 6;
        rip.strength *= 0.94;
        if (rip.radius >= rip.maxRadius || rip.strength < 0.5) {
          s.gridRipples.splice(i, 1);
        }
      }

      // Update Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y += ft.dy;
        ft.alpha -= 0.022;
        if (ft.alpha <= 0) {
          s.floatingTexts.splice(i, 1);
        }
      }

      // Screen shake decay
      if (s.shake > 0) {
        s.shake *= 0.86;
        if (s.shake < 0.2) s.shake = 0;
      }

      // --- RENDERING PIPELINE ---
      ctx.save();
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Camera Shake
      if (s.shake > 0) {
        const sx = (Math.random() - 0.5) * s.shake * 2;
        const sy = (Math.random() - 0.5) * s.shake * 2;
        ctx.translate(sx, sy);
      }

      const isHighBloom = settings.bloomMode === 'high';

      // 1. Reactive Cyber-Grid with Dynamic Ripple Distortion
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = 32;

      for (let gx = 0; gx <= CANVAS_WIDTH; gx += step) {
        ctx.beginPath();
        for (let gy = 0; gy <= CANVAS_HEIGHT; gy += step) {
          let px = gx;
          let py = gy;

          // Apply grid ripple displacement
          s.gridRipples.forEach((rip) => {
            const dist = Math.hypot(gx - rip.x, gy - rip.y);
            const delta = dist - rip.radius;
            if (Math.abs(delta) < 40) {
              const factor = Math.sin((delta / 40) * Math.PI) * rip.strength;
              const angle = Math.atan2(gy - rip.y, gx - rip.x);
              px += Math.cos(angle) * factor;
              py += Math.sin(angle) * factor;
            }
          });

          if (gy === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // 2. Glowing Boundary Border
      ctx.strokeStyle = s.isOverdriveActive ? '#ffe600' : '#00f0ff';
      ctx.shadowColor = s.isOverdriveActive ? '#ffe600' : '#00f0ff';
      ctx.shadowBlur = glow(isHighBloom ? 14 : 4);
      ctx.lineWidth = 2.5;
      ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 12);
      ctx.shadowBlur = glow(0);

      // 3. Emergency Barrier Laser Floor
      if (s.barrierFloorActive) {
        ctx.save();
        ctx.strokeStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = glow(isHighBloom ? 16 : 4);
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(12, CANVAS_HEIGHT - 18);
        ctx.lineTo(CANVAS_WIDTH - 12, CANVAS_HEIGHT - 18);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Render Bricks & Dynamic Archetypes
      s.bricks.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = glow(isHighBloom ? 9 : 2);

        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 4);
        ctx.fill();

        // Inner bevel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.roundRect(b.x + 2, b.y + 2, b.width - 4, b.height / 2 - 2, 2);
        ctx.fill();

        // Armored Brick Procedural Cracks
        if (b.type === 'armored' && b.currentHits > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          if (b.currentHits === 1) {
            ctx.moveTo(b.x + b.width * 0.3, b.y + 2);
            ctx.lineTo(b.x + b.width * 0.5, b.y + b.height * 0.6);
            ctx.lineTo(b.x + b.width * 0.7, b.y + b.height - 2);
          } else {
            ctx.moveTo(b.x + 4, b.y + 4);
            ctx.lineTo(b.x + b.width * 0.5, b.y + b.height * 0.5);
            ctx.lineTo(b.x + b.width - 4, b.y + 4);
            ctx.moveTo(b.x + b.width * 0.5, b.y + b.height * 0.5);
            ctx.lineTo(b.x + b.width * 0.5, b.y + b.height - 2);
          }
          ctx.stroke();
        }

        // Phase / Shielded Brick Energy Shimmer
        if (b.type === 'phase') {
          if (b.isPhased) {
            ctx.strokeStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = glow(10);
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
          }
        }

        // Explosive Brick Icon
        if (b.type === 'explosive') {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('💣', b.x + b.width / 2, b.y + b.height / 2 + 3);
        }

        // Gold Carrier Icon
        if (b.type === 'goldCarrier') {
          ctx.fillStyle = '#070814';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('◆GOLD◆', b.x + b.width / 2, b.y + b.height / 2 + 3);
        }

        ctx.restore();
      });

      // 5. Render Cyber-Boss
      if (s.boss) {
        const b = s.boss;
        ctx.save();

        // Telegraph Laser Beam Line
        if (b.laserFiringTimer > 0) {
          ctx.fillStyle = 'rgba(255, 7, 58, 0.75)';
          ctx.shadowColor = '#ff073a';
          ctx.shadowBlur = glow(isHighBloom ? 20 : 6);
          ctx.fillRect(b.laserX - b.laserWidth / 2, b.y + b.height, b.laserWidth, CANVAS_HEIGHT);
        } else if (b.laserWarningTimer < 1.5) {
          // Warning dotted laser line
          ctx.strokeStyle = 'rgba(255, 7, 58, 0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(b.laserX, b.y + b.height);
          ctx.lineTo(b.laserX, CANVAS_HEIGHT);
          ctx.stroke();
        }

        // Orbiting Shield Nodes
        b.shieldNodes.forEach((node) => {
          if (node.hp <= 0) return;
          const nx = b.x + b.width / 2 + Math.cos(node.angle) * node.radius;
          const ny = b.y + b.height / 2 + Math.sin(node.angle) * (node.radius * 0.5);

          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = glow(12);
          ctx.beginPath();
          ctx.arc(nx, ny, 10, 0, Math.PI * 2);
          ctx.fill();
        });

        // Boss Main Body
        ctx.fillStyle = b.hp < b.maxHp * 0.4 ? '#ff073a' : '#ff007f';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = glow(isHighBloom ? 20 : 6);

        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 10);
        ctx.fill();

        // Boss Core Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#070814';
        ctx.beginPath();
        ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 6. Boss Hazards
      s.bossHazards.forEach((hz) => {
        ctx.save();
        ctx.fillStyle = hz.color;
        ctx.shadowColor = hz.color;
        ctx.shadowBlur = glow(12);
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Power-ups Falling
      s.powerUps.forEach((pw) => {
        ctx.save();
        ctx.fillStyle = pw.color;
        ctx.shadowColor = pw.color;
        ctx.shadowBlur = glow(isHighBloom ? 14 : 3);

        ctx.beginPath();
        ctx.roundRect(pw.x - pw.width / 2, pw.y, pw.width, pw.height, 6);
        ctx.fill();

        ctx.fillStyle = '#070814';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = 'P';
        if (pw.type === 'multiball') label = '3x';
        if (pw.type === 'widePaddle') label = 'W';
        if (pw.type === 'laser') label = '⚡';
        if (pw.type === 'slowMotion') label = 'S';
        if (pw.type === 'life') label = '♥';
        if (pw.type === 'shield') label = '⛨';
        ctx.fillText(label, pw.x, pw.y + pw.height / 2);
        ctx.restore();
      });

      // 8. Neon Coins (Spinning Glowing Diamonds)
      s.shards.forEach((sh) => {
        ctx.save();
        ctx.fillStyle = sh.color;
        ctx.shadowColor = sh.color;
        ctx.shadowBlur = glow(isHighBloom ? 12 : 3);

        ctx.translate(sh.x, sh.y);
        ctx.beginPath();
        ctx.moveTo(0, -sh.size);
        ctx.lineTo(sh.size * 0.7, 0);
        ctx.lineTo(0, sh.size);
        ctx.lineTo(-sh.size * 0.7, 0);
        ctx.closePath();
        ctx.fill();

        // White core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 9. Lasers
      s.lasers.forEach((laser) => {
        ctx.save();
        ctx.fillStyle = laser.color;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = glow(isHighBloom ? 14 : 4);
        ctx.fillRect(laser.x - laser.width / 2, laser.y, laser.width, laser.height);
        ctx.restore();
      });

      // 10. Paddle & Motion Afterimages
      s.paddle.trail.forEach((tr, idx) => {
        ctx.save();
        const trAlpha = (idx / s.paddle.trail.length) * 0.25;
        ctx.fillStyle = s.paddle.color;
        ctx.globalAlpha = trAlpha;
        ctx.fillRect(tr.x, tr.y, tr.width, s.paddle.height);
        ctx.restore();
      });

      ctx.save();
      ctx.fillStyle = s.isOverdriveActive ? '#ffe600' : s.paddle.color;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = glow(isHighBloom ? (s.isOverdriveActive ? 24 : 15) : 4);

      ctx.beginPath();
      ctx.roundRect(s.paddle.x, s.paddle.y, s.paddle.width, s.paddle.height, 8);
      ctx.fill();

      // Top bevel
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(s.paddle.x + 4, s.paddle.y + 2, s.paddle.width - 8, 3, 2);
      ctx.fill();

      // Laser cannons
      if (s.paddle.laserMode || s.isOverdriveActive) {
        ctx.fillStyle = s.isOverdriveActive ? '#ffe600' : '#ff007f';
        ctx.fillRect(s.paddle.x + 6, s.paddle.y - 6, 4, 6);
        ctx.fillRect(s.paddle.x + s.paddle.width - 10, s.paddle.y - 6, 4, 6);
      }
      ctx.restore();

      // 11. Balls & Ribbon Motion Trails
      s.balls.forEach((ball) => {
        ball.trail.forEach((t, idx) => {
          ctx.save();
          const trAlpha = (idx / ball.trail.length) * 0.45;
          ctx.fillStyle = ball.isPlasma ? `rgba(255, 230, 0, ${trAlpha})` : `rgba(0, 240, 255, ${trAlpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * (0.6 + 0.4 * (idx / ball.trail.length)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Ball Body
        ctx.save();
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = glow(isHighBloom ? (ball.isPlasma ? 20 : 14) : 4);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // White core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 12. Kinetic Particles with Additive Blending
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        if (p.isSpark) {
          // Elongated spark aligned with velocity
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();
        } else {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // 13. Shockwaves
      s.shockwaves.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 14. Floating Score & Combo Texts
      s.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = glow(8);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // Restore camera shake

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [settings.bloomMode, inputState, fireLaserOrLaunch]);

  return (
    <div className="game-module relative w-full max-w-[640px] mx-auto select-none">
      {/* Game Canvas Container */}
      <div
        className={`game-screen relative aspect-[640/720] w-full rounded-2xl overflow-hidden bg-arcade-dark border-4 border-arcade-bezel shadow-[0_0_30px_rgba(0,240,255,0.25)] ${
          settings.crtEnabled ? 'crt-screen' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          {...input.canvasProps}
          aria-label="Neon Brick Breaker playfield. Move with A/D or arrows, Space to launch, Shift for Overdrive."
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* --- IN-GAME HUD OVERLAYS --- */}

        {/* 1. Boss HP Bar (If Boss Active) */}
        {bossHp && (
          <div className="absolute top-2 left-6 right-6 z-20 pointer-events-none font-pixel">
            <div className="flex items-center justify-between text-[10px] text-neon-pink mb-1">
              <span className="flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> {bossHp.name}
              </span>
              <span>
                {bossHp.current} / {bossHp.max} HP
              </span>
            </div>
            <div className="h-3 w-full bg-black/80 rounded-full border border-neon-pink/60 p-0.5 overflow-hidden shadow-neon-pink">
              <div
                style={{ width: `${(bossHp.current / bossHp.max) * 100}%` }}
                className="h-full bg-gradient-to-r from-neon-pink via-neon-orange to-neon-yellow rounded-full transition-all duration-150 shadow-[0_0_8px_#ff007f]"
              />
            </div>
          </div>
        )}

        {/* 2. Top Status Bar: Lives, Overdrive Meter, Shards, Wave */}
        <div style={bossHp ? { top: 52 } : undefined} className="game-hud absolute top-8 left-3 right-3 flex items-center justify-between pointer-events-none z-10 px-1 font-pixel text-xs">
          {/* Lives */}
          <div className="hud-lives flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neon-pink/40 shadow-neon-pink">
            <span className="text-neon-pink text-[9px] mr-0.5">LIVES</span>
            <Heart className="w-3 h-3 fill-neon-pink text-neon-pink" /><span>{lives}</span>
          </div>

          {/* Overdrive Meter */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              triggerOverdrive();
            }}
            className={`hud-overdrive pointer-events-auto cursor-pointer flex items-center gap-2 bg-black/75 px-3 py-1.5 rounded-lg border transition-all ${
              overdriveMeter >= 100
                ? 'border-neon-yellow shadow-[0_0_15px_#ffe600] animate-pulse bg-neon-yellow/10'
                : 'border-slate-800'
            }`}
            title="Press [Shift] or tap to activate Hyper-State Overdrive"
          >
            <Zap
              className={`w-4 h-4 ${
                overdriveMeter >= 100 ? 'text-neon-yellow animate-bounce' : 'text-slate-500'
              }`}
            />
            <div className="flex flex-col">
              <div className="flex justify-between text-[8px] text-slate-300 font-mono">
                <span>OVERDRIVE</span>
                <span className={overdriveMeter >= 100 ? 'text-neon-yellow font-bold' : ''}>
                  {overdriveMeter >= 100 ? 'READY!' : `${overdriveMeter}%`}
                </span>
              </div>
              <div className="w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5 border border-slate-700">
                <div
                  style={{ width: `${overdriveMeter}%` }}
                  className="h-full bg-gradient-to-r from-neon-cyan via-neon-green to-neon-yellow transition-all"
                />
              </div>
            </div>
          </div>

          {/* Shards Currency & Wave */}
          <div className="flex items-center gap-2">
            <div className="hud-wallet flex items-center gap-1 bg-black/60 px-2.5 py-1.5 rounded-lg border border-neon-yellow/40 text-neon-yellow text-[10px]">
              <Disc3 className="w-3.5 h-3.5 animate-spin" />
              <span>+{runShards} COINS</span>
            </div>

            <div className="hud-wave bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neon-cyan/40 shadow-neon-cyan text-neon-cyan text-[10px]">
              WAVE {wave}
            </div>
          </div>
        </div>

        {/* Hyper-State Banner */}
        {isOverdriveActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-yellow/20 border-2 border-neon-yellow rounded-full text-neon-yellow font-pixel text-[9px] shadow-[0_0_15px_#ffe600] animate-pulse pointer-events-none z-20">
            ⚡ HYPER-STATE 2X MULTIPLIER ⚡
          </div>
        )}

        {/* 3. Active Buff Countdown Badges */}
        <div style={bossHp ? { top: 96 } : undefined} className="buff-badges absolute top-20 left-4 flex items-center gap-2 pointer-events-none z-10 font-mono">
          {activePowerUps.overdrive > 0 && (
            <div className="flex items-center gap-1 bg-neon-yellow/20 border border-neon-yellow text-neon-yellow px-2 py-0.5 rounded text-[10px] font-pixel animate-pulse">
              <Zap className="w-3 h-3" />
              <span>OVERDRIVE {activePowerUps.overdrive}s</span>
            </div>
          )}
          {activePowerUps.laser > 0 && (
            <div className="flex items-center gap-1 bg-neon-pink/20 border border-neon-pink text-neon-pink px-2 py-0.5 rounded text-[10px] font-pixel animate-pulse">
              <Crosshair className="w-3 h-3" />
              <span>LASER {activePowerUps.laser}s</span>
            </div>
          )}
          {activePowerUps.widePaddle > 0 && (
            <div className="flex items-center gap-1 bg-neon-green/20 border border-neon-green text-neon-green px-2 py-0.5 rounded text-[10px] font-pixel">
              <Shield className="w-3 h-3" />
              <span>WIDE {activePowerUps.widePaddle}s</span>
            </div>
          )}
          {activePowerUps.slowMotion > 0 && (
            <div className="flex items-center gap-1 bg-neon-purple/20 border border-neon-purple text-neon-purple px-2 py-0.5 rounded text-[10px] font-pixel">
              <Sparkles className="w-3 h-3" />
              <span>SLOW {activePowerUps.slowMotion}s</span>
            </div>
          )}
          {barrierActive && (
            <div className="flex items-center gap-1 bg-neon-green/20 border border-neon-green text-neon-green px-2 py-0.5 rounded text-[10px] font-pixel">
              <Shield className="w-3 h-3" />
              <span>BARRIER ACTIVE</span>
            </div>
          )}
        </div>

        {/* 4. Combo Multiplier Indicator */}
        {combo > 1 && (
          <div className="absolute top-28 right-4 pointer-events-none z-10 text-right font-pixel animate-bounce">
            <div className="text-sm sm:text-base text-neon-pink drop-shadow-[0_0_10px_#ff007f]">
              {combo}x COMBO!
            </div>
            <div className="text-[9px] text-neon-yellow font-mono mt-0.5">
              +{Math.min(combo, 12) * 100}% SCORE
            </div>
          </div>
        )}

        {/* --- READY / LAUNCH PROMPT --- */}
        {gameState === 'READY' && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-30">
            <div className="bg-arcade-panel/95 border-2 border-neon-cyan p-6 rounded-2xl shadow-neon-cyan text-center max-w-sm mx-4 animate-bounce">
              <h2 className="font-pixel text-neon-cyan text-xs sm:text-sm mb-1">
                {waveBanner?.title || `WAVE ${wave}`}
              </h2>
              <p className="text-[10px] text-neon-pink font-mono mb-3">{waveBanner?.subtitle}</p>
              <p className="text-xs text-slate-300 font-mono mb-4 leading-relaxed">
                Tap the field, press A / <span className="text-neon-pink font-bold">FIRE</span>, or press{' '}
                <span className="text-neon-pink font-bold">SPACE</span> to launch!
              </p>
              <div className="text-[11px] font-pixel text-neon-green animate-pulse">
                ► READY PLAYER ONE ◄
              </div>
            </div>
          </div>
        )}

        {/* --- WAVE TRANSITION BANNER --- */}
        {gameState === 'WAVE_TRANSITION' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-30 animate-fadeIn">
            <div className="text-center p-6 bg-black/85 border-2 border-neon-green rounded-2xl shadow-neon-green max-w-sm mx-4">
              <Sparkles className="w-10 h-10 text-neon-green mx-auto mb-2 animate-bounce" />
              <div className="font-pixel text-base text-neon-green mb-1">WAVE CLEARED!</div>
              <p className="font-mono text-xs text-slate-300 mb-3">Next frequency inbound in {waveGraceSeconds}s...</p>
              <div className="text-[10px] font-pixel text-neon-yellow animate-pulse">
                +1,500 SPEED CLEAR BONUS
              </div>
            </div>
          </div>
        )}

        {/* --- PAUSE OVERLAY --- */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-40">
            <div className="bg-arcade-panel border-2 border-neon-yellow p-8 rounded-2xl shadow-neon-yellow text-center max-w-sm mx-4">
              <Pause className="w-12 h-12 text-neon-yellow mx-auto mb-3 animate-pulse" />
              <h2 className="font-pixel text-xl text-neon-yellow mb-2">SYSTEM PAUSED</h2>
              <p className="text-xs text-slate-300 mb-6 font-mono">The neon matrix is held in stasis.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-neon-yellow/20 hover:bg-neon-yellow/30 border border-neon-yellow text-neon-yellow font-pixel text-xs rounded-xl shadow-neon-yellow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4" /> RESUME GAME
                </button>
                <button
                  onClick={onOpenShop}
                  className="px-6 py-2.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan text-neon-cyan font-pixel text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Disc3 className="w-4 h-4" /> CYBER SHOP
                </button>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> RESTART [R]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- GAME OVER OVERLAY --- */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4">
            <div className="bg-arcade-panel border-2 border-neon-red p-6 sm:p-8 rounded-2xl shadow-[0_0_35px_rgba(255,7,58,0.5)] text-center max-w-md w-full animate-flicker">
              <h2 className="font-pixel text-2xl text-neon-red mb-2 tracking-wider">GAME OVER</h2>
              <div className="h-0.5 bg-neon-red/50 w-full my-3" />

              <div className="grid grid-cols-3 gap-2 my-4 text-center font-pixel text-xs bg-black/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 block mb-1 font-mono">FINAL SCORE</span>
                  <span className="text-base text-neon-yellow">{score}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-1 font-mono">WAVE</span>
                  <span className="text-base text-neon-cyan">{wave}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-1 font-mono">SHARDS</span>
                  <span className="text-base text-neon-green">+{runShards}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-5">
                <button
                  onClick={restartGame}
                  className="w-full py-3.5 bg-neon-pink hover:bg-neon-pink/90 text-white font-pixel text-xs rounded-xl shadow-neon-pink transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onOpenShop}
                    className="flex-1 py-2.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan text-neon-cyan font-pixel text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Disc3 className="w-3.5 h-3.5" /> SHOP
                  </button>
                  <button
                    onClick={() => onOpenLeaderboard()}
                    className="flex-1 py-2.5 bg-neon-yellow/20 hover:bg-neon-yellow/30 border border-neon-yellow text-neon-yellow font-pixel text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Trophy className="w-3.5 h-3.5" /> SCORES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ArcadeControls input={input} disabled={isObscured} overdrive={overdriveMeter} active={isOverdriveActive} />
    </div>
  );
};
