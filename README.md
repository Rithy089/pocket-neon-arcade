# 🕹️ Pocket Neon Arcade

An interactive retro-futuristic mini-arcade cabinet in the browser featuring **Neon Brick Breaker**. Built with **React 18 + TypeScript + Vite + Tailwind CSS + Lucide React**.

![Pocket Neon Arcade Screenshot](https://raw.githubusercontent.com/Rithy089/pocket-neon-arcade/main/dist/assets/preview.png)

---

## ✨ Features

### 🎛️ Arcade Cabinet Shell
- **Illuminated Marquee & Bezel**: Glowing retro header, dual speaker grilles, and realistic screen glass reflection.
- **Authentic CRT Simulation**: CRT phosphor scanlines and vignette effect (toggleable ON/OFF).
- **Physical Controls Deck**:
  - Interactive **Micro-switch Joystick** with smooth touch/mouse drag controls and keyboard mapping.
  - Tactile illuminated push buttons: **FIRE** (Neon Pink), **PAUSE** (Neon Yellow), and **RESET** (Neon Cyan).
  - **25¢ Coin Mechanism**: Working coin slot that increments credits with authentic double-chime audio.
- **Web Audio API Synth**: Custom retro chiptune synthesizer with zero external audio assets.

### ⚡ Neon Brick Breaker
- **60 FPS Canvas Physics**: Precise collision response with directional deflections based on paddle contact angle.
- **Particle Explosion Engine**: Neon sparks, embers, and smoke bursts on collisions.
- **Screen Shake & Shockwaves**: Explosive bricks trigger dynamic camera tremors and chain reactions.
- **Power-Up Drops**:
  - 🔵 **Multi-Ball (3x)**: Triples balls on screen.
  - 🟢 **Wide Paddle**: Expands paddle size with an energy shield.
  - 🟣 **Slow Motion**: Decelerates balls for precision aiming.
  - 🔴 **Laser Cannons**: Dual lasers mounted to destroy bricks on click or `Spacebar`.
  - 🟡 **Extra Life (+1)**: Restores a player heart.
- **Combo Multipliers**: Dynamic score scaling ($x2$ to $x10$) with escalating pitch tones.
- **High Score Persistence**: Automatically saved to browser `localStorage`.

---

## 🎮 Controls

| Action | Keyboard | Arcade Deck | Mouse / Touch |
|---|---|---|---|
| **Move Paddle** | `←` / `→` or `A` / `D` | Drag Joystick | Pointer Movement on Canvas |
| **Launch Ball / Laser** | `Spacebar` | **FIRE** Button | Click Canvas |
| **Pause Game** | `P` or `Esc` | **PAUSE** Button | On-screen Pause |
| **Reset Game** | `R` | **RESET** Button | On-screen Reset |
| **Insert Coin** | — | Coin Slot / Button | Click Coin Slot |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm / yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/Rithy089/pocket-neon-arcade.git
cd pocket-neon-arcade

# Install dependencies
npm install

# Start local dev server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API (Chiptune Synthesizer)
- **Icons**: Lucide React
