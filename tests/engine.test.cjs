const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

/** Execute the real frame/collision loop; only React, Canvas drawing and audio are mocked. */
function createGame() {
  const refs = [], effects = [], uiUpdates = [];
  const frames = new Map(), cleanups = [], storage = new Map(), cache = new Map();
  let now = 0, nextFrame = 0, inputOptions;
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
  const canvas = { getContext: () => context };
  const react = {
    useRef: value => { const ref = { current: refs.length === 0 ? canvas : value }; refs.push(ref); return ref; },
    useState: initial => [typeof initial === 'function' ? initial() : initial, value => uiUpdates.push(value)],
    useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
  };
  const input = { state: { current: { x: 0, y: 0, pointerX: null, firing: false } }, reset: () => {} };
  const document = { hidden: false, body: { classList: { add() {}, remove() {} } } };
  const modules = {
    react: { __esModule: true, default: react, ...react },
    'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, document, performance: { now: () => now },
      requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
      cancelAnimationFrame: id => frames.delete(id),
      localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
      require: name => {
        if (name in modules) return modules[name];
        if (name.endsWith('/audio')) return { soundManager: new Proxy({}, { get: () => () => {} }) };
        if (name.endsWith('/haptics')) return { arcadeHaptic() {} };
        if (name.endsWith('/useArcadeInput')) return { useArcadeInput: options => { inputOptions = options; return input; } };
        const base = path.resolve(path.dirname(filename), name);
        return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      },
    }, { filename });
    return exports;
  }
  const { NeonBrickBreaker } = load(path.resolve('src/components/NeonBrickBreaker.tsx'));
  const { progression } = load(path.resolve('src/utils/progression.ts'));
  const { createBossForWave } = load(path.resolve('src/utils/waves.ts'));
  const scores = [];
  NeonBrickBreaker({
    settings: progression.getData().settings, isObscured: false,
    onScoreUpdate: score => scores.push(score), onHighScoreUpdate() {}, onShardsUpdate() {},
    onOpenShop() {}, onOpenLeaderboard() {}, onTriggerAchievementToast() {},
  });
  effects.forEach(effect => { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup); });
  const state = refs.find(ref => ref.current?.paddle)?.current;
  const obscured = refs.find(ref => typeof ref.current === 'boolean');
  return {
    state, storage, progression, document, obscured, scores, uiUpdates,
    boss: () => createBossForWave(5, 640),
    action: action => inputOptions.onAction(action),
    step(ms = 1000 / 60) {
      now += ms;
      const scheduled = [...frames.values()]; frames.clear();
      assert.equal(scheduled.length, 1, 'exactly one frame must be scheduled');
      scheduled[0](now);
    },
    unmount: () => cleanups.forEach(cleanup => cleanup()),
    frameCount: () => frames.size,
  };
}

test('boss defeat advances an empty escort arena and includes the full bonus in the saved high score', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING'; s.wave = 5; s.score = 40000; s.bricks = [];
  s.boss = game.boss(); s.boss.hp = 0;
  game.step();
  assert.equal(s.boss, null);
  assert.equal(s.gameState, 'WAVE_TRANSITION');
  assert.equal(s.score, 51000);
  assert.equal(game.progression.getData().highScore, 51000);
  assert.equal(JSON.parse(game.storage.get('pocket_neon_save_v2')).highScore, 51000);
  const awarded = s.score;
  game.step();
  assert.equal(s.score, awarded, 'completion awards only once');
});

test('boss laser and overlapping hazards cannot consume multiple lives or persist into respawn', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING'; s.wave = 5; s.boss = game.boss();
  s.boss.laserX = s.paddle.x + s.paddle.width / 2;
  s.boss.laserFiringTimer = 1.2; s.boss.laserWarningTimer = 3; s.boss.attackCooldown = 0;
  s.bossHazards = [1, 2, 3].map(id => ({ id, x: s.paddle.x, y: s.paddle.y, radius: 9, vx: 0, vy: 0, color: '#fff' }));
  game.step();
  assert.equal(s.lives, 2); assert.equal(s.gameState, 'READY');
  assert.equal(s.boss.laserFiringTimer, 0); assert.equal(s.bossHazards.length, 0);
  game.action('fire');
  for (let i = 0; i < 15; i++) game.step();
  assert.equal(s.lives, 2);
});

test('multiple hazard orb overlaps do not crash or cause repeated same-frame deaths', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING';
  s.bossHazards = [1, 2, 3].map(id => ({ id, x: s.paddle.x + 5, y: s.paddle.y, radius: 9, vx: 0, vy: 0, color: '#fff' }));
  game.step();
  assert.equal(s.lives, 2); assert.equal(s.gameState, 'READY');
  assert.equal(s.bossHazards.length, 0);
});

test('wave countdown freezes under menus and hidden tabs, resumes, and cannot outlive restart or unmount', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING'; s.bricks = []; game.step();
  assert.equal(s.waveTransitionRemaining, 2);
  for (let i = 0; i < 65; i++) game.step();
  assert.equal(game.uiUpdates.includes(1), true, 'countdown text updates to one second');
  const remaining = s.waveTransitionRemaining;
  game.obscured.current = true;
  for (let i = 0; i < 150; i++) game.step();
  assert.equal(s.waveTransitionRemaining, remaining); assert.equal(s.wave, 1);
  game.obscured.current = false; game.document.hidden = true; game.step(5000);
  assert.equal(s.waveTransitionRemaining, remaining);
  game.document.hidden = false;
  for (let i = 0; i < 60; i++) game.step();
  assert.equal(s.wave, 2); assert.equal(s.gameState, 'READY');
  s.gameState = 'WAVE_TRANSITION'; s.waveTransitionRemaining = .02;
  game.action('restart'); game.step(50);
  assert.equal(s.wave, 1); assert.equal(s.waveTransitionRemaining, 0);
  game.unmount(); assert.equal(game.frameCount(), 0);
});

test('mid-run chassis selection stays queued until a new run', () => {
  const game = createGame(), s = game.state;
  game.progression.addShards(1000); game.progression.unlockChassis('titan');
  s.gameState = 'WAVE_TRANSITION'; s.waveTransitionRemaining = .01;
  game.step();
  assert.equal(s.paddle.chassis, 'vanguard'); assert.equal(s.paddle.baseWidth, 110);
  game.action('restart');
  assert.equal(s.paddle.chassis, 'titan'); assert.equal(s.paddle.baseWidth, 135); assert.equal(s.lives, 4);
  assert.equal(game.scores.at(-1), 0, 'new run clears cabinet score immediately');
});

test('boss-first clears still require escort bricks, then transition when the final brick is shot', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING'; s.wave = 5; s.boss = game.boss(); s.boss.hp = 0;
  s.bricks = [{ id: 'escort', x: 200, y: 200, width: 60, height: 20, type: 'normal', hitsRequired: 1, currentHits: 0, color: '#fff', glowColor: '#fff', scoreValue: 100 }];
  game.step();
  assert.equal(s.boss, null); assert.equal(s.gameState, 'PLAYING');
  s.lasers = [{ id: 'last-shot', x: 210, y: 210, width: 5, height: 16, speedY: 0, color: '#fff' }];
  for (let i = 0; i < 10; i++) game.step();
  assert.equal(s.bricks.length, 0); assert.equal(s.gameState, 'WAVE_TRANSITION');
  assert.equal(s.score, 11100);
});

test('pause and resume preserve an in-progress wave countdown', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING'; s.bricks = []; game.step();
  game.action('pause'); assert.equal(s.gameState, 'PAUSED');
  for (let i = 0; i < 130; i++) game.step();
  assert.equal(s.waveTransitionRemaining, 2);
  game.action('pause'); assert.equal(s.gameState, 'WAVE_TRANSITION');
  for (let i = 0; i < 125; i++) game.step();
  assert.equal(s.wave, 2); assert.equal(s.gameState, 'READY');
});

test('ball movement and buff timers stay consistent at 30, 60 and 120 Hz', () => {
  const results = [30, 60, 120].map(rate => {
    const game = createGame(), s = game.state;
    s.gameState = 'PLAYING'; s.powerUpTimers.laser = 4;
    s.balls = [{ id: 'probe', x: 200, y: 400, dx: 1, dy: 0, speed: 1, radius: 7, color: '#fff', attachedToPaddle: false, trail: [] }];
    for (let i = 0; i < rate; i++) game.step(1000 / rate);
    return { x: s.balls[0].x, timer: s.powerUpTimers.laser };
  });
  for (const result of results) {
    assert.equal(result.x, 260);
    assert.ok(Math.abs(result.timer - 3) < .0001);
  }
});

test('buff countdown publication does not trigger a React state change every simulation tick', () => {
  const game = createGame(), s = game.state;
  s.gameState = 'PLAYING';
  for (let i = 0; i < 60; i++) game.step();
  const buffUpdates = game.uiUpdates.filter(value => value && typeof value === 'object' && 'laser' in value && 'overdrive' in value);
  assert.equal(buffUpdates.length, 2, 'initialization and first publication only; unchanged timers do not publish');
});
