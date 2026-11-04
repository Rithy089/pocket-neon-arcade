# Pocket Neon Arcade

A responsive React + TypeScript arcade built with Vite, Tailwind CSS, HTML5 Canvas and procedural Web Audio. The current collection contains **Neon Brick Breaker**.

## Play

- PC: A/D or Left/Right move the paddle; mouse tracking also works. Space launches and fires, Shift/E activates Overdrive, P/Esc pauses, and R restarts.
- Touch: drag anywhere on the playfield or use the thumbstick. A launches/fires; B activates a charged Overdrive. Swipe up or double tap the playfield for Overdrive.
- Hold A or Space to keep firing while laser power is active. Independent touch pointers support moving and shooting together.
- Menus and focus loss pause active gameplay. Closing a menu leaves the run paused until you resume.

## Features

- Structured waves, five brick archetypes, fifth-wave bosses and tactical Overdrive.
- Procedural particles, afterimages, shockwaves, combo text and camera shake.
- Toggleable CRT, three bloom settings (Ultra / Performance / Off), master mute, independent SFX/music settings and optional touch haptics.
- Persistent Neon Coins, permanent upgrades, unlockable chassis and three cosmetic palettes: Tokyo Midnight, Synthwave Sunset and Cyber Matrix.
- Top-five local scores with three-letter initials and achievement rewards. Saves remain local to this browser.
- No external audio or image assets. All game visuals and sounds are generated at runtime.

## Development

Requires Node.js 18+.

    npm install
    npm run dev
    npm run build
    npm test

On Windows with PowerShell script execution disabled, use npm.cmd in place of npm.

The build runs strict TypeScript checking and Vite production bundling. This repository has no separate lint configuration.

## Architecture and preservation

The original collision, wave and Canvas rendering systems remain in src/components/NeonBrickBreaker.tsx. Shared control handling is isolated in src/hooks/useArcadeInput.ts; the responsive cabinet and control deck are wrapper components. Gameplay reads the adapter's mutable input state per frame, with no React render required for each pointer movement.

Existing balances, upgrades, achievements and leaderboard entries migrate to schema version 3 in the original pocket_neon_save_v2 localStorage key. The existing internal shards field now represents Neon Coins, avoiding a balance reset or two competing wallets. Palettes debit that same wallet only on first purchase. Tokyo Midnight is free; Sunset costs 150 coins and Matrix costs 250.

## Verification

npm test runs isolated store regressions for save migration, palette transactions, upgrade behavior, leaderboard initials and blocked storage.

For input lifecycle checks, start the dev server, open an arcade menu to suspend the live game's inputs, then run this in the browser console:

    import('/tests/input.browser.tsx').then(m => m.runInputSmoke())

The browser fixture mounts the real hook in a disposable React root and verifies keyboard overlap, held fire, blur recovery, disabled input, normalized pointer coordinates, swipe/double tap, simultaneous touch controls and cancellation. Pointer capture is mocked only in that fixture; real-device haptic feedback and physical multitouch should also be checked on target hardware.

Target layout sizes: mobile 390?844 and desktop 1920?1080.
