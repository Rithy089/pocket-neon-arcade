import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, Paddle, Brick, PowerUp, Particle, FloatingText, LaserBeam, GameState, PowerUpType } from '../types/game';
import { generateBricksForLevel, TOTAL_CAMPAIGN_LEVELS, getLevelName } from '../utils/levels';
import { soundManager } from '../utils/audio';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Zap, Sparkles, Heart, Crosshair, Trophy, Crown } from 'lucide-react';

interface Props {
  onScoreUpdate: (score: number) => void;
  onHighScoreUpdate: (highScore: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isCRTEnabled: boolean;
  onToggleCRT: () => void;
  activeControlAction?: string | null;
  onClearControlAction?: () => void;
  joystickX: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 720;
const BASE_PADDLE_WIDTH = 110;
const PADDLE_HEIGHT = 16;
const BALL_RADIUS = 7;
const INITIAL_BALL_SPEED = 6.0;

export const NeonBrickBreaker: React.FC<Props> = ({
  onScoreUpdate,
  onHighScoreUpdate,
  soundEnabled,
  onToggleSound,
  isCRTEnabled,
  onToggleCRT,
  activeControlAction,
  onClearControlAction,
  joystickX
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for UI Overlays
  const [gameState, setGameState] = useState<GameState>('READY');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('neon_arcade_highscore') || '0', 10);
  });
  const [lives, setLives] = useState<number>(3);
  const [level, setLevel] = useState<number>(1);
  const [isEndlessMode, setIsEndlessMode] = useState<boolean>(false);
  const [activePowerUps, setActivePowerUps] = useState<{
    laser: number;
    widePaddle: number;
    slowMotion: number;
  }>({ laser: 0, widePaddle: 0, slowMotion: 0 });

  // Game Engine Mutable State Refs (for smooth 60fps loop without React re-render lag)
  const stateRef = useRef<{
    gameState: GameState;
    score: number;
    highScore: number;
    lives: number;
    level: number;
    isEndlessMode: boolean;
    combo: number;
    shake: number;
    balls: Ball[];
    paddle: Paddle;
    bricks: Brick[];
    powerUps: PowerUp[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    lasers: LaserBeam[];
    powerUpTimers: {
      laser: number;
      widePaddle: number;
      slowMotion: number;
    };
    keys: { left: boolean; right: boolean; space: boolean };
    mouseX: number;
    useMouse: boolean;
  }>({
    gameState: 'READY',
    score: 0,
    highScore: highScore,
    lives: 3,
    level: 1,
    isEndlessMode: false,
    combo: 0,
    shake: 0,
    balls: [],
    paddle: {
      x: (CANVAS_WIDTH - BASE_PADDLE_WIDTH) / 2,
      y: CANVAS_HEIGHT - 45,
      width: BASE_PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      baseWidth: BASE_PADDLE_WIDTH,
      speed: 9,
      laserMode: false,
      laserTimer: 0,
      color: '#00f0ff',
    },
    bricks: [],
    powerUps: [],
    particles: [],
    floatingTexts: [],
    lasers: [],
    powerUpTimers: { laser: 0, widePaddle: 0, slowMotion: 0 },
    keys: { left: false, right: false, space: false },
    mouseX: CANVAS_WIDTH / 2,
    useMouse: false,
  });

  // Sync sound effects
  useEffect(() => {
    soundManager.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Keep latest callbacks and joystickX in refs to prevent game loop restarts
  const callbacksRef = useRef({ onScoreUpdate, onHighScoreUpdate });
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onHighScoreUpdate };
  }, [onScoreUpdate, onHighScoreUpdate]);

  const joystickXRef = useRef(joystickX);
  useEffect(() => {
    joystickXRef.current = joystickX;
  }, [joystickX]);

  // Handle external on-screen arcade control clicks
  useEffect(() => {
    if (!activeControlAction) return;

    if (activeControlAction === 'fire') {
      fireLaserOrLaunch();
    } else if (activeControlAction === 'pause') {
      togglePause();
    } else if (activeControlAction === 'restart') {
      restartGame();
    }

    if (onClearControlAction) {
      onClearControlAction();
    }
  }, [activeControlAction]);

  // Spawn particle explosion
  const spawnParticles = (x: number, y: number, color: string, count = 16, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedMult;
      stateRef.current.particles.push({
        id: `p-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
      });
    }
  };

  // Add floating combo score
  const addFloatingText = (text: string, x: number, y: number, color = '#ffe600') => {
    stateRef.current.floatingTexts.push({
      id: `ft-${Math.random()}`,
      text,
      x,
      y,
      color,
      alpha: 1.2,
      dy: -1.2,
      scale: 1,
    });
  };

  // Initialize level
  const initLevel = useCallback((lvl: number, keepStats = false) => {
    const s = stateRef.current;
    s.level = lvl;
    setLevel(lvl);

    if (!keepStats) {
      s.score = 0;
      s.lives = 3;
      s.isEndlessMode = false;
      setIsEndlessMode(false);
      setScore(0);
      setLives(3);
    }

    s.combo = 0;
    s.powerUps = [];
    s.particles = [];
    s.floatingTexts = [];
    s.lasers = [];
    s.powerUpTimers = { laser: 0, widePaddle: 0, slowMotion: 0 };
    setActivePowerUps({ laser: 0, widePaddle: 0, slowMotion: 0 });

    s.paddle.width = BASE_PADDLE_WIDTH;
    s.paddle.x = (CANVAS_WIDTH - BASE_PADDLE_WIDTH) / 2;
    s.paddle.laserMode = false;

    // Generate bricks
    s.bricks = generateBricksForLevel(lvl, CANVAS_WIDTH);

    // Initial ball attached to paddle
    s.balls = [
      {
        id: `ball-${Date.now()}`,
        x: s.paddle.x + s.paddle.width / 2,
        y: s.paddle.y - BALL_RADIUS - 2,
        radius: BALL_RADIUS,
        dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.7 : -0.7),
        dy: -INITIAL_BALL_SPEED,
        speed: INITIAL_BALL_SPEED,
        attachedToPaddle: true,
        trail: [],
        color: '#00f0ff',
      },
    ];

    s.gameState = 'READY';
    setGameState('READY');
  }, []);

  // Restart game
  const restartGame = useCallback(() => {
    soundManager.playCoin();
    initLevel(1, false);
  }, [initLevel]);

  // Launch ball
  const launchBall = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'READY') {
      s.gameState = 'PLAYING';
      setGameState('PLAYING');
      s.balls.forEach((b) => {
        if (b.attachedToPaddle) {
          b.attachedToPaddle = false;
          // Random slight launch angle
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          b.dx = Math.cos(angle) * b.speed;
          b.dy = Math.sin(angle) * b.speed;
        }
      });
      soundManager.playPaddleBounce();
    }
  }, []);

  // Fire laser bolts from paddle
  const fireLaserOrLaunch = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'READY') {
      launchBall();
      return;
    }
    if (s.gameState === 'PLAYING' && s.paddle.laserMode) {
      soundManager.playLaser();
      const leftGunX = s.paddle.x + 8;
      const rightGunX = s.paddle.x + s.paddle.width - 8;
      const gunY = s.paddle.y - 4;

      s.lasers.push(
        { id: `l-${Math.random()}`, x: leftGunX, y: gunY, width: 4, height: 14, speedY: -11, color: '#ff007f' },
        { id: `l-${Math.random()}`, x: rightGunX, y: gunY, width: 4, height: 14, speedY: -11, color: '#ff007f' }
      );
    }
  }, [launchBall]);

  // Toggle pause
  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'PLAYING') {
      s.gameState = 'PAUSED';
      setGameState('PAUSED');
    } else if (s.gameState === 'PAUSED') {
      s.gameState = 'PLAYING';
      setGameState('PLAYING');
    }
  }, []);

  // Initial load once on mount
  useEffect(() => {
    initLevel(1, false);
  }, []); // Run only once on mount

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.keys.left = true;
        s.useMouse = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.keys.right = true;
        s.useMouse = false;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        fireLaserOrLaunch();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (s.gameState === 'GAMEOVER' || s.gameState === 'LEVEL_CLEAR' || s.gameState === 'VICTORY') {
          restartGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.keys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse & Touch Tracking on Canvas
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    stateRef.current.mouseX = clientX * scaleX;
    stateRef.current.useMouse = true;
  };

  const handlePointerDown = () => {
    fireLaserOrLaunch();
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const s = stateRef.current;

      // Update Game State
      if (s.gameState === 'PLAYING') {
        // --- 1. Paddle Movement ---
        const jX = joystickXRef.current;
        if (jX !== 0) {
          s.paddle.x += jX * s.paddle.speed * 1.2;
        } else if (s.useMouse) {
          s.paddle.x = s.mouseX - s.paddle.width / 2;
        } else {
          if (s.keys.left) s.paddle.x -= s.paddle.speed;
          if (s.keys.right) s.paddle.x += s.paddle.speed;
        }
        // Boundaries
        if (s.paddle.x < 10) s.paddle.x = 10;
        if (s.paddle.x + s.paddle.width > CANVAS_WIDTH - 10) {
          s.paddle.x = CANVAS_WIDTH - 10 - s.paddle.width;
        }

        // --- 2. Power-up timers ---
        if (s.powerUpTimers.widePaddle > 0) {
          s.powerUpTimers.widePaddle -= dt;
          s.paddle.width = BASE_PADDLE_WIDTH * 1.5;
        } else {
          s.paddle.width = BASE_PADDLE_WIDTH;
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
        });

        // --- 3. Lasers Update & Collision ---
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const laser = s.lasers[i];
          laser.y += laser.speedY;

          // Out of screen
          if (laser.y < 0) {
            s.lasers.splice(i, 1);
            continue;
          }

          // Hit brick test
          let laserHit = false;
          for (let j = s.bricks.length - 1; j >= 0; j--) {
            const brick = s.bricks[j];
            if (
              laser.x > brick.x &&
              laser.x < brick.x + brick.width &&
              laser.y > brick.y &&
              laser.y < brick.y + brick.height
            ) {
              laserHit = true;
              brick.currentHits++;
              spawnParticles(laser.x, laser.y, '#ff007f', 6);
              soundManager.playBrickHit(brick.type === 'armored');

              if (brick.currentHits >= brick.hitsRequired) {
                // Destroy brick
                destroyBrick(brick);
              }
              break;
            }
          }

          if (laserHit) {
            s.lasers.splice(i, 1);
          }
        }

        // Helper: Destroy Brick
        function destroyBrick(brick: Brick) {
          s.combo++;
          const comboMult = Math.min(s.combo, 10);
          const pointsEarned = brick.scoreValue * comboMult;
          s.score += pointsEarned;
          setScore(s.score);
          callbacksRef.current.onScoreUpdate(s.score);

          if (s.score > s.highScore) {
            s.highScore = s.score;
            setHighScore(s.score);
            callbacksRef.current.onHighScoreUpdate(s.score);
            localStorage.setItem('neon_arcade_highscore', s.score.toString());
          }

          // Floating score text
          const comboLabel = comboMult > 1 ? `+${pointsEarned} x${comboMult}!` : `+${pointsEarned}`;
          addFloatingText(comboLabel, brick.x + brick.width / 2, brick.y, brick.color);
          soundManager.playCombo(comboMult);

          const destroyedIds = new Set<string>();
          destroyedIds.add(brick.id);

          // Explosive Brick Effect
          if (brick.type === 'explosive') {
            s.shake = 12;
            soundManager.playExplosion();
            spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ff073a', 35, 1.8);

            // Damage neighboring bricks
            const radius = 95;
            for (let k = 0; k < s.bricks.length; k++) {
              const nb = s.bricks[k];
              if (nb.id === brick.id) continue;
              const dist = Math.hypot(
                (nb.x + nb.width / 2) - (brick.x + brick.width / 2),
                (nb.y + nb.height / 2) - (brick.y + brick.height / 2)
              );
              if (dist <= radius) {
                nb.currentHits += 2;
                if (nb.currentHits >= nb.hitsRequired) {
                  s.score += nb.scoreValue;
                  spawnParticles(nb.x + nb.width / 2, nb.y + nb.height / 2, nb.color, 14);
                  destroyedIds.add(nb.id);
                  if (nb.powerUpDrop) {
                    spawnPowerUp(nb.x + nb.width / 2, nb.y + nb.height / 2, nb.powerUpDrop);
                  }
                }
              }
            }
          } else {
            spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 18);
          }

          // Drop power-up
          if (brick.powerUpDrop) {
            spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.powerUpDrop);
          }

          // Safely remove all destroyed bricks by ID with zero index corruption
          s.bricks = s.bricks.filter((b) => !destroyedIds.has(b.id));

          // Check Level Clear or Campaign Victory
          if (s.bricks.length === 0) {
            if (s.level >= TOTAL_CAMPAIGN_LEVELS && !s.isEndlessMode) {
              s.gameState = 'VICTORY';
              setGameState('VICTORY');

              const lifeBonus = s.lives * 1000;
              const victoryBonus = 5000 + lifeBonus;
              s.score += victoryBonus;
              setScore(s.score);
              callbacksRef.current.onScoreUpdate(s.score);

              if (s.score > s.highScore) {
                s.highScore = s.score;
                setHighScore(s.score);
                callbacksRef.current.onHighScoreUpdate(s.score);
                localStorage.setItem('neon_arcade_highscore', s.score.toString());
              }

              soundManager.playGameWin();

              // Multi-burst victory fireworks across the canvas
              for (let c = 0; c < 8; c++) {
                setTimeout(() => {
                  if (stateRef.current.gameState === 'VICTORY') {
                    const colors = ['#ffe600', '#ff007f', '#00f0ff', '#39ff14', '#bc13fe'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    spawnParticles(
                      Math.random() * (CANVAS_WIDTH - 120) + 60,
                      Math.random() * (CANVAS_HEIGHT * 0.45) + 60,
                      randomColor,
                      35,
                      2.2
                    );
                  }
                }, c * 320);
              }
            } else {
              s.gameState = 'LEVEL_CLEAR';
              setGameState('LEVEL_CLEAR');
              soundManager.playLevelClear();
              spawnParticles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#39ff14', 60, 2);
            }
          }
        }

        // Spawn power-up item
        function spawnPowerUp(x: number, y: number, type: PowerUpType) {
          const colors: Record<PowerUpType, string> = {
            multiball: '#00f0ff',
            widePaddle: '#39ff14',
            slowMotion: '#bc13fe',
            laser: '#ff007f',
            life: '#ffe600',
          };
          s.powerUps.push({
            id: `pw-${Math.random()}`,
            x,
            y,
            width: 28,
            height: 18,
            speedY: 2.5,
            type,
            color: colors[type],
          });
        }

        // --- 4. Power-ups Falling & Collision with Paddle ---
        for (let i = s.powerUps.length - 1; i >= 0; i--) {
          const pw = s.powerUps[i];
          pw.y += pw.speedY;

          // Check paddle catch
          if (
            pw.y + pw.height >= s.paddle.y &&
            pw.y <= s.paddle.y + s.paddle.height &&
            pw.x + pw.width >= s.paddle.x &&
            pw.x <= s.paddle.x + s.paddle.width
          ) {
            // Apply powerup
            soundManager.playPowerup();
            spawnParticles(pw.x, pw.y, pw.color, 20);

            if (pw.type === 'multiball') {
              // Spawn 2 new balls from paddle or existing ball
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
                  color: '#39ff14',
                }
              );
              addFloatingText('MULTI-BALL!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 20, pw.color);
            } else if (pw.type === 'widePaddle') {
              s.powerUpTimers.widePaddle = 14;
              addFloatingText('WIDE PADDLE!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 20, pw.color);
            } else if (pw.type === 'laser') {
              s.powerUpTimers.laser = 12;
              addFloatingText('LASER CANNONS!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 20, pw.color);
            } else if (pw.type === 'slowMotion') {
              s.powerUpTimers.slowMotion = 10;
              addFloatingText('SLOW MOTION!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 20, pw.color);
            } else if (pw.type === 'life') {
              s.lives = Math.min(s.lives + 1, 5);
              setLives(s.lives);
              addFloatingText('+1 EXTRA LIFE!', s.paddle.x + s.paddle.width / 2, s.paddle.y - 20, pw.color);
            }

            s.powerUps.splice(i, 1);
            continue;
          }

          // Off bottom of screen
          if (pw.y > CANVAS_HEIGHT) {
            s.powerUps.splice(i, 1);
          }
        }

        // --- 5. Balls Physics & Collision ---
        const speedScale = s.powerUpTimers.slowMotion > 0 ? 0.6 : 1.0;

        for (let i = s.balls.length - 1; i >= 0; i--) {
          const ball = s.balls[i];

          if (ball.attachedToPaddle) {
            ball.x = s.paddle.x + s.paddle.width / 2;
            ball.y = s.paddle.y - ball.radius - 2;
            continue;
          }

          // Store trail position
          ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.6 });
          if (ball.trail.length > 7) {
            ball.trail.shift();
          }

          // Move ball
          ball.x += ball.dx * speedScale;
          ball.y += ball.dy * speedScale;

          // Wall bounces (Left & Right)
          if (ball.x - ball.radius <= 10) {
            ball.x = 10 + ball.radius;
            ball.dx = Math.abs(ball.dx);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 4);
          } else if (ball.x + ball.radius >= CANVAS_WIDTH - 10) {
            ball.x = CANVAS_WIDTH - 10 - ball.radius;
            ball.dx = -Math.abs(ball.dx);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 4);
          }

          // Ceiling bounce
          if (ball.y - ball.radius <= 10) {
            ball.y = 10 + ball.radius;
            ball.dy = Math.abs(ball.dy);
            soundManager.playWallBounce();
            spawnParticles(ball.x, ball.y, ball.color, 4);
          }

          // Paddle bounce
          if (
            ball.y + ball.radius >= s.paddle.y &&
            ball.y - ball.radius <= s.paddle.y + s.paddle.height &&
            ball.x >= s.paddle.x - ball.radius &&
            ball.x <= s.paddle.x + s.paddle.width + ball.radius &&
            ball.dy > 0
          ) {
            // Hit offset (-1 to 1) for directional deflection
            const hitOffset = (ball.x - (s.paddle.x + s.paddle.width / 2)) / (s.paddle.width / 2);
            const clampedOffset = Math.max(-0.9, Math.min(0.9, hitOffset));

            const maxAngle = Math.PI * 0.42; // ~75 degrees
            const bounceAngle = clampedOffset * maxAngle - Math.PI / 2;

            // Speed up slightly as score rises
            const currentSpeed = Math.min(10, ball.speed + 0.05);
            ball.speed = currentSpeed;
            ball.dx = Math.cos(bounceAngle) * currentSpeed;
            ball.dy = Math.sin(bounceAngle) * currentSpeed;

            // Reset combo on paddle bounce
            s.combo = 0;

            soundManager.playPaddleBounce();
            spawnParticles(ball.x, s.paddle.y, s.paddle.color, 8);
          }

          // Bricks collision detection
          for (let bIdx = s.bricks.length - 1; bIdx >= 0; bIdx--) {
            const brick = s.bricks[bIdx];

            // AABB vs Circle
            const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
            const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const distance = Math.hypot(distX, distY);

            if (distance < ball.radius) {
              // Determine collision side
              const overlapLeft = (ball.x + ball.radius) - brick.x;
              const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
              const overlapTop = (ball.y + ball.radius) - brick.y;
              const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);

              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

              if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.dx = -ball.dx;
              } else {
                ball.dy = -ball.dy;
              }

              brick.currentHits++;
              soundManager.playBrickHit(brick.type === 'armored');

              if (brick.currentHits >= brick.hitsRequired) {
                destroyBrick(brick);
              } else {
                spawnParticles(ball.x, ball.y, brick.color, 6);
              }
              break;
            }
          }

          // Ball fell out of bounds (Bottom)
          if (ball.y - ball.radius > CANVAS_HEIGHT) {
            s.balls.splice(i, 1);
          }
        }

        // If all balls are lost: decrement life
        if (s.balls.length === 0) {
          s.lives--;
          setLives(s.lives);
          s.combo = 0;
          soundManager.playLifeLost();

          if (s.lives <= 0) {
            s.gameState = 'GAMEOVER';
            setGameState('GAMEOVER');
            soundManager.playGameOver();
          } else {
            // Respawn single ball attached to paddle
            s.balls = [
              {
                id: `b-respawn-${Date.now()}`,
                x: s.paddle.x + s.paddle.width / 2,
                y: s.paddle.y - BALL_RADIUS - 2,
                radius: BALL_RADIUS,
                dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.7 : -0.7),
                dy: -INITIAL_BALL_SPEED,
                speed: INITIAL_BALL_SPEED,
                attachedToPaddle: true,
                trail: [],
                color: '#00f0ff',
              },
            ];
            s.gameState = 'READY';
            setGameState('READY');
          }
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // Update Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y += ft.dy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          s.floatingTexts.splice(i, 1);
        }
      }

      // Screen shake decay
      if (s.shake > 0) {
        s.shake *= 0.88;
        if (s.shake < 0.2) s.shake = 0;
      }

      // --- RENDERING ---
      ctx.save();
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Screen shake translation
      if (s.shake > 0) {
        const shakeX = (Math.random() - 0.5) * s.shake * 2;
        const shakeY = (Math.random() - 0.5) * s.shake * 2;
        ctx.translate(shakeX, shakeY);
      }

      // Draw Retro Grid Background
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Glowing Boundary Border
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 12);
      ctx.shadowBlur = 0;

      // Draw Bricks with neon glow
      s.bricks.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 8;

        // Brick body
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 4);
        ctx.fill();

        // Inner bevel / shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(b.x + 2, b.y + 2, b.width - 4, b.height / 2 - 2, 2);
        ctx.fill();

        // If armored brick: draw armor tick lines
        if (b.type === 'armored') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.x + 6, b.y + b.height / 2);
          ctx.lineTo(b.x + b.width - 6, b.y + b.height / 2);
          ctx.stroke();
        }

        // If explosive brick: draw pulsating icon
        if (b.type === 'explosive') {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('💣', b.x + b.width / 2, b.y + b.height / 2 + 3);
        }

        ctx.restore();
      });

      // Draw Power-ups
      s.powerUps.forEach((pw) => {
        ctx.save();
        ctx.fillStyle = pw.color;
        ctx.shadowColor = pw.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.roundRect(pw.x - pw.width / 2, pw.y, pw.width, pw.height, 6);
        ctx.fill();

        // Label icon inside pill
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
        ctx.fillText(label, pw.x, pw.y + pw.height / 2);
        ctx.restore();
      });

      // Draw Lasers
      s.lasers.forEach((laser) => {
        ctx.save();
        ctx.fillStyle = laser.color;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(laser.x - laser.width / 2, laser.y, laser.width, laser.height);
        ctx.restore();
      });

      // Draw Paddle
      ctx.save();
      ctx.fillStyle = s.paddle.color;
      ctx.shadowColor = s.paddle.color;
      ctx.shadowBlur = s.paddle.laserMode ? 18 : 12;

      // Rounded neon paddle
      ctx.beginPath();
      ctx.roundRect(s.paddle.x, s.paddle.y, s.paddle.width, s.paddle.height, 8);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(s.paddle.x + 4, s.paddle.y + 2, s.paddle.width - 8, 3, 2);
      ctx.fill();

      // Laser cannons visual if laserMode active
      if (s.paddle.laserMode) {
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 10;
        ctx.fillRect(s.paddle.x + 6, s.paddle.y - 6, 4, 6);
        ctx.fillRect(s.paddle.x + s.paddle.width - 10, s.paddle.y - 6, 4, 6);
      }
      ctx.restore();

      // Draw Balls & Neon Trails
      s.balls.forEach((ball) => {
        // Draw Trail
        ball.trail.forEach((t, idx) => {
          ctx.save();
          const trAlpha = (idx / ball.trail.length) * 0.4;
          ctx.fillStyle = `rgba(0, 240, 255, ${trAlpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * (0.6 + 0.4 * (idx / ball.trail.length)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Ball Body
        ctx.save();
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // White hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Particles
      s.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Floating Texts
      s.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Run game loop continuously without re-binding

  return (
    <div className="relative w-full max-w-[640px] mx-auto select-none">
      {/* Game Canvas Container with CRT Effects */}
      <div
        className={`relative aspect-[640/720] w-full rounded-2xl overflow-hidden bg-arcade-dark border-4 border-arcade-bezel shadow-[0_0_30px_rgba(0,240,255,0.25)] ${
          isCRTEnabled ? 'crt-screen' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* HUD In-Game Bar (Lives, Active PowerUps, Multipliers) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 px-2 font-pixel text-xs">
          {/* Lives Display */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neon-pink/40 shadow-neon-pink">
            <span className="text-neon-pink mr-1">LIVES</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-3.5 h-3.5 transition-all ${
                  i < lives ? 'fill-neon-pink text-neon-pink' : 'text-slate-700 opacity-30'
                }`}
              />
            ))}
          </div>

          {/* Active Power-Up Badges */}
          <div className="flex items-center gap-2">
            {activePowerUps.laser > 0 && (
              <div className="flex items-center gap-1 bg-neon-pink/20 border border-neon-pink text-neon-pink px-2 py-1 rounded text-[10px] animate-pulse">
                <Crosshair className="w-3 h-3" />
                <span>LASER {activePowerUps.laser}s</span>
              </div>
            )}
            {activePowerUps.widePaddle > 0 && (
              <div className="flex items-center gap-1 bg-neon-green/20 border border-neon-green text-neon-green px-2 py-1 rounded text-[10px]">
                <Shield className="w-3 h-3" />
                <span>WIDE {activePowerUps.widePaddle}s</span>
              </div>
            )}
            {activePowerUps.slowMotion > 0 && (
              <div className="flex items-center gap-1 bg-neon-purple/20 border border-neon-purple text-neon-purple px-2 py-1 rounded text-[10px]">
                <Sparkles className="w-3 h-3" />
                <span>SLOW {activePowerUps.slowMotion}s</span>
              </div>
            )}
          </div>

          {/* Current Level */}
          <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neon-cyan/40 shadow-neon-cyan text-neon-cyan text-[10px] sm:text-xs">
            {isEndlessMode ? `OVERDRIVE ${level}` : `SECTOR ${level}/${TOTAL_CAMPAIGN_LEVELS}`}
          </div>
        </div>

        {/* READY / LAUNCH PROMPT */}
        {gameState === 'READY' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-30">
            <div className="bg-arcade-panel/95 border-2 border-neon-cyan p-6 rounded-2xl shadow-neon-cyan text-center max-w-sm mx-4 animate-bounce">
              <h2 className="font-pixel text-neon-cyan text-xs sm:text-sm mb-2">{getLevelName(level)}</h2>
              <p className="text-xs text-slate-300 font-mono mb-4 leading-relaxed">
                Click canvas, tap FIRE, or press <span className="text-neon-pink font-bold">SPACE</span> to launch the neon ball!
              </p>
              <div className="text-[11px] font-pixel text-neon-green animate-pulse">
                ► READY PLAYER ONE ◄
              </div>
            </div>
          </div>
        )}

        {/* PAUSE OVERLAY */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-40">
            <div className="bg-arcade-panel border-2 border-neon-yellow p-8 rounded-2xl shadow-neon-yellow text-center max-w-sm mx-4">
              <Pause className="w-12 h-12 text-neon-yellow mx-auto mb-3 animate-pulse" />
              <h2 className="font-pixel text-xl text-neon-yellow mb-4">GAME PAUSED</h2>
              <p className="text-xs text-slate-300 mb-6 font-mono">Take a breath, champion. The neon grid awaits your return.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-neon-yellow/20 hover:bg-neon-yellow/30 border border-neon-yellow text-neon-yellow font-pixel text-xs rounded-xl shadow-neon-yellow transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> RESUME GAME
                </button>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> RESTART
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40">
            <div className="bg-arcade-panel border-2 border-neon-red p-8 rounded-2xl shadow-[0_0_30px_rgba(255,7,58,0.4)] text-center max-w-md mx-4 animate-flicker">
              <h2 className="font-pixel text-2xl text-neon-red mb-2 tracking-wider">GAME OVER</h2>
              <div className="h-0.5 bg-neon-red/50 w-full my-4" />
              <div className="flex justify-around my-6 text-center font-pixel">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">FINAL SCORE</span>
                  <span className="text-lg text-neon-yellow">{score}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">HIGH SCORE</span>
                  <span className="text-lg text-neon-cyan">{highScore}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-mono mb-6">
                {score >= highScore && score > 0 ? '🏆 NEW RECORD SET! YOU DOMINATED!' : 'The grid reclaimed your energy. Insert coin to try again!'}
              </p>
              <button
                onClick={restartGame}
                className="w-full py-3.5 bg-neon-pink hover:bg-neon-pink/90 text-white font-pixel text-xs rounded-xl shadow-neon-pink transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
              </button>
            </div>
          </div>
        )}

        {/* LEVEL CLEAR OVERLAY */}
        {gameState === 'LEVEL_CLEAR' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-40">
            <div className="bg-arcade-panel border-2 border-neon-green p-8 rounded-2xl shadow-neon-green text-center max-w-sm mx-4">
              <Sparkles className="w-12 h-12 text-neon-green mx-auto mb-2 animate-bounce" />
              <h2 className="font-pixel text-xl text-neon-green mb-2">SECTOR CLEARED!</h2>
              <p className="text-xs text-slate-300 font-mono mb-6">Quantum frequency stabilized. Prepare for Sector {level + 1}!</p>
              <button
                onClick={() => initLevel(level + 1, true)}
                className="w-full py-3.5 bg-neon-green hover:bg-neon-green/90 text-arcade-dark font-pixel text-xs rounded-xl shadow-neon-green transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-bold"
              >
                <Zap className="w-4 h-4" /> NEXT SECTOR ►
              </button>
            </div>
          </div>
        )}

        {/* VICTORY / CAMPAIGN COMPLETE OVERLAY */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4">
            <div className="bg-arcade-panel border-2 border-neon-yellow p-6 sm:p-8 rounded-2xl shadow-[0_0_40px_rgba(255,230,0,0.4)] text-center max-w-md w-full animate-pulse-glow">
              <div className="relative inline-block mb-3">
                <Trophy className="w-16 h-16 text-neon-yellow mx-auto animate-bounce drop-shadow-[0_0_15px_#ffe600]" />
                <Crown className="w-6 h-6 text-neon-pink absolute -top-2 -right-1 animate-pulse" />
              </div>

              <div className="text-[10px] font-pixel text-neon-pink tracking-widest uppercase mb-1">
                ★ CAMPAIGN COMPLETED ★
              </div>
              <h2 className="font-pixel text-2xl text-transparent bg-clip-text bg-gradient-to-r from-neon-yellow via-neon-green to-neon-cyan mb-1">
                YOU WIN!
              </h2>
              <div className="text-xs font-mono text-neon-cyan mb-4">
                ARCADE CHAMPION — GRID CONQUERED!
              </div>

              <div className="h-0.5 bg-gradient-to-r from-neon-pink via-neon-yellow to-neon-cyan w-full my-3 opacity-70" />

              {/* Victory Stats Grid */}
              <div className="grid grid-cols-2 gap-3 my-4 text-center font-pixel text-xs bg-black/50 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5 font-mono">FINAL SCORE</span>
                  <span className="text-base text-neon-yellow">{score}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5 font-mono">HIGH SCORE</span>
                  <span className="text-base text-neon-cyan">{highScore}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5 font-mono">LIVES BONUS</span>
                  <span className="text-sm text-neon-pink">+{lives * 1000}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5 font-mono">RANK</span>
                  <span className="text-sm text-neon-green font-bold">
                    {lives >= 3 ? 'S+ LEGEND' : lives === 2 ? 'A+ MASTER' : 'B CYBER KNIGHT'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-5">
                <button
                  onClick={restartGame}
                  className="w-full py-3 bg-gradient-to-r from-neon-yellow to-neon-orange hover:opacity-95 text-arcade-dark font-pixel text-xs rounded-xl shadow-neon-yellow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
                </button>

                <button
                  onClick={() => {
                    stateRef.current.isEndlessMode = true;
                    setIsEndlessMode(true);
                    initLevel(level + 1, true);
                  }}
                  className="w-full py-2.5 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple text-neon-purple font-pixel text-xs rounded-xl shadow-neon-purple transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4" /> ENTER INFINITE OVERDRIVE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Quick Controls Bar */}
      <div className="flex items-center justify-between mt-3 px-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan shadow-neon-cyan'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleCRT}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-pixel transition-all ${
              isCRTEnabled
                ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-neon-purple'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title="Toggle CRT Scanlines"
          >
            CRT {isCRTEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="text-[11px] hidden sm:block text-slate-400 font-mono">
          [MOUSE / ARROWS] Move • [SPACE] Launch/Laser • [P] Pause
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-300 text-[11px] font-pixel flex items-center gap-1.5"
          >
            {gameState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {gameState === 'PAUSED' ? 'PLAY' : 'PAUSE'}
          </button>
          <button
            onClick={restartGame}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-300 text-[11px] font-pixel flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>
      </div>
    </div>
  );
};
