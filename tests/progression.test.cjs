const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

// Load isolated copies of the real TypeScript store with a disposable localStorage.
function loadStore(saved, storageBlocked = false) {
  const storage = new Map(saved ? [['pocket_neon_save_v2', JSON.stringify(saved)]] : []);
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(output, {
      exports, require: name => load(path.resolve(path.dirname(filename), `${name}.ts`)),
      localStorage: {
        getItem: key => { if (storageBlocked) throw Error('Blocked'); return storage.get(key) ?? null; },
        setItem: (key, value) => { if (storageBlocked) throw Error('Blocked'); storage.set(key, value); },
      },
    }, { filename });
    return exports;
  }
  return { ...load(path.resolve('src/utils/progression.ts')), storage };
}

test('migrates an existing wallet, upgrades and leaderboard without resetting them', () => {
  const { progression } = loadStore({ shards: 321, highScore: 54000, highScoreEntries: [{ score: 54000, initials: 'ACE' }], settings: { crtEnabled: false } });
  const data = progression.getData();
  assert.equal(data.shards, 321);
  assert.equal(data.highScore, 54000);
  assert.equal(data.highScoreEntries[0].initials, 'ACE');
  assert.equal(data.settings.crtEnabled, false);
  assert.equal(data.settings.masterMuted, false);
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.selectedPalette, 'tokyo');
});

test('palette purchases charge once and selection survives a reload', () => {
  const { progression, storage } = loadStore({ shards: 400 });
  assert.equal(progression.selectPalette('sunset'), true);
  assert.equal(progression.getData().shards, 250);
  assert.equal(progression.selectPalette('tokyo'), true);
  assert.equal(progression.selectPalette('sunset'), true);
  assert.equal(progression.getData().shards, 250);
  const reloaded = loadStore(JSON.parse(storage.get('pocket_neon_save_v2'))).progression.getData();
  assert.equal(reloaded.selectedPalette, 'sunset');
  assert.equal(reloaded.palettesUnlocked.includes('sunset'), true);
  assert.equal(reloaded.shards, 250);
});

test('insufficient currency cannot unlock a palette or debit the wallet', () => {
  const { progression } = loadStore({ shards: 10 });
  assert.equal(progression.selectPalette('matrix'), false);
  assert.equal(progression.getData().shards, 10);
  assert.equal(progression.getData().selectedPalette, 'tokyo');
});

test('new upgrades and leaderboard entries retain existing progression behavior', () => {
  const { progression } = loadStore({ shards: 400 });
  assert.equal(progression.upgradeTier('magnetField'), true);
  assert.equal(progression.getData().shards, 360);
  assert.equal(progression.getData().upgrades.magnetField.tier, 1);
  const board = progression.addLeaderboardEntry('b0b!?', 100000, 6, 'phantom');
  assert.equal(board.length, 5);
  assert.equal(board[0].initials, 'BBA');
  assert.equal(board[0].wave, 6);
  assert.equal(progression.getData().highScore, 100000);
});

test('blocked storage remains playable and defaults are not mutated by purchases', () => {
  const { progression, DEFAULT_PROGRESSION } = loadStore(null, true);
  progression.upgradeTier('magnetField');
  assert.equal(progression.getData().upgrades.magnetField.tier, 1);
  assert.equal(DEFAULT_PROGRESSION.upgrades.magnetField.tier, 0);
});
