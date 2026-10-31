import React, { useState } from 'react';
import { Sparkles, Trophy, Zap, Disc3, CircleDot, Flame } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  children: React.ReactNode;
  score: number;
  highScore: number;
  onControlAction: (action: string) => void;
  joystickX: number;
  setJoystickX: (val: number) => void;
}

export const ArcadeCabinet: React.FC<Props> = ({
  children,
  score,
  highScore,
  onControlAction,
  joystickX,
  setJoystickX,
}) => {
  const [credits, setCredits] = useState<number>(3);
  const [isCoinInserted, setIsCoinInserted] = useState<boolean>(false);
  const [joystickDragging, setJoystickDragging] = useState<boolean>(false);

  const handleInsertCoin = () => {
    soundManager.playCoin();
    setIsCoinInserted(true);
    setCredits((prev) => prev + 1);
    setTimeout(() => setIsCoinInserted(false), 800);
  };

  // Joystick touch/mouse drag handlers
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setJoystickDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickDragging) return;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const clamped = Math.max(-1, Math.min(1, deltaX));
    setJoystickX(clamped);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setJoystickDragging(false);
    setJoystickX(0);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030409] via-[#070918] to-[#04050e] text-slate-100 flex flex-col items-center py-6 px-3 relative overflow-hidden">
      {/* Background Neon Atmosphere Gradients */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-neon-purple/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-neon-cyan/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-neon-pink/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Arcade Cabinet Outer Shell */}
      <div className="relative w-full max-w-[820px] bg-[#0c0e1d] rounded-[36px] border-[5px] border-[#1d2242] shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(0,240,255,0.15)] overflow-hidden">
        
        {/* Top Arc Finish / Cabinet Header Bevel */}
        <div className="h-4 bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-purple opacity-80" />

        {/* --- MARQUEE HEADER --- */}
        <div className="relative bg-gradient-to-r from-[#12142e] via-[#1a1d3f] to-[#12142e] px-6 py-5 border-b-4 border-[#222752] flex items-center justify-between shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
          {/* Left Speaker Grille */}
          <div className="grid grid-cols-4 gap-1.5 opacity-60">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900 shadow-inner" />
            ))}
          </div>

          {/* Marquee Center Sign */}
          <div className="text-center relative">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-black/60 border border-neon-cyan/60 shadow-neon-cyan backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-neon-pink animate-pulse" />
              <h1 className="font-pixel text-lg sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-yellow tracking-wider drop-shadow-[0_0_15px_rgba(0,240,255,0.7)]">
                POCKET NEON ARCADE
              </h1>
              <Sparkles className="w-5 h-5 text-neon-cyan animate-pulse" />
            </div>
            <div className="text-[10px] font-pixel text-neon-green/90 mt-1 tracking-widest animate-flicker">
              ★ HI-TECH RETRO MINI-CABINET ★
            </div>
          </div>

          {/* Right Speaker Grille */}
          <div className="grid grid-cols-4 gap-1.5 opacity-60">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900 shadow-inner" />
            ))}
          </div>
        </div>

        {/* --- SCOREBOARD DISPLAY (VINTAGE LED MATRIX STYLE) --- */}
        <div className="bg-[#060710] border-b-2 border-[#161a33] px-6 py-3 flex items-center justify-around flex-wrap gap-4 font-pixel text-xs">
          {/* 1UP Score */}
          <div className="flex flex-col items-center">
            <span className="text-neon-pink text-[10px] tracking-wider mb-0.5">1UP SCORE</span>
            <span className="text-lg text-slate-100 drop-shadow-[0_0_8px_#ff007f]">
              {score.toString().padStart(6, '0')}
            </span>
          </div>

          {/* HIGH SCORE */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-neon-yellow text-[10px] tracking-wider mb-0.5">
              <Trophy className="w-3 h-3 text-neon-yellow animate-pulse" />
              <span>HIGH SCORE</span>
            </div>
            <span className="text-lg text-neon-yellow drop-shadow-[0_0_8px_#ffe600]">
              {highScore.toString().padStart(6, '0')}
            </span>
          </div>

          {/* CREDITS & INSERT COIN */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-neon-cyan text-[10px] tracking-wider mb-0.5">CREDIT</span>
              <span className="text-base text-neon-cyan">{credits.toString().padStart(2, '0')}</span>
            </div>
            <button
              onClick={handleInsertCoin}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isCoinInserted
                  ? 'bg-neon-yellow text-black border-neon-yellow shadow-neon-yellow scale-105'
                  : 'bg-black/60 border-neon-yellow/50 text-neon-yellow hover:bg-neon-yellow/10 shadow-[0_0_10px_rgba(255,230,0,0.2)]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5 animate-spin" />
              INSERT COIN
            </button>
          </div>
        </div>

        {/* --- CRT MONITOR BEZEL & SCREEN AREA --- */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#0a0c1a] via-[#0d1024] to-[#090b17] relative">
          {/* Glass Glare Reflection on the Bezel */}
          <div className="absolute top-6 left-8 right-8 h-24 bg-gradient-to-b from-white/5 to-transparent rounded-t-3xl pointer-events-none z-20" />

          {/* Canvas Component Child */}
          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* --- PHYSICAL ARCADE CONTROL PANEL DECK --- */}
        <div className="bg-gradient-to-b from-[#141834] via-[#0f1228] to-[#0a0c1c] border-t-4 border-[#252b57] px-6 py-6 shadow-[inset_0_10px_30px_rgba(0,0,0,0.8)]">
          <div className="max-w-[700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* 1. Left Section: Arcade Joystick */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-pixel text-slate-400 mb-2">MICRO-SWITCH JOYSTICK</span>
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-b from-slate-900 to-black border-4 border-slate-700 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_6px_15px_rgba(0,0,0,0.7)] flex items-center justify-center">
                {/* Direction Indicators */}
                <div className="absolute top-1 text-[8px] text-slate-600 font-pixel">▲</div>
                <div className="absolute bottom-1 text-[8px] text-slate-600 font-pixel">▼</div>
                <div className="absolute left-1.5 text-[8px] text-slate-600 font-pixel">◄</div>
                <div className="absolute right-1.5 text-[8px] text-slate-600 font-pixel">►</div>

                {/* Joystick Balltop and Shaft */}
                <div
                  onPointerDown={handleJoystickPointerDown}
                  onPointerMove={handleJoystickPointerMove}
                  onPointerUp={handleJoystickPointerUp}
                  style={{
                    transform: `translate(${joystickX * 22}px, 0px)`,
                  }}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br from-neon-pink via-[#d60066] to-[#80003b] border-2 border-pink-300 shadow-[0_8px_16px_rgba(255,0,127,0.4),inset_0_2px_4px_rgba(255,255,255,0.7)] cursor-grab active:cursor-grabbing transition-transform duration-75 flex items-center justify-center`}
                  title="Drag Joystick to Move Paddle"
                >
                  <div className="w-4 h-4 rounded-full bg-white/40 blur-[1px]" />
                </div>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1">DRAG OR USE ARROW KEYS</span>
            </div>

            {/* 2. Middle Section: Coin Slot & Retro Badge */}
            <div className="flex flex-col items-center justify-center px-4 py-2 bg-black/40 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <CircleDot className="w-3.5 h-3.5 text-neon-green animate-pulse" />
                <span className="text-[10px] font-pixel text-neon-green">25¢ TOKENS ACCEPTED</span>
              </div>
              <div
                onClick={handleInsertCoin}
                className="w-16 h-8 bg-gradient-to-b from-slate-800 to-slate-950 rounded-lg border-2 border-slate-600 flex items-center justify-center cursor-pointer hover:border-neon-yellow transition-colors group"
                title="Click to Insert Token"
              >
                <div className="w-1.5 h-5 bg-black border border-slate-700 rounded-sm group-hover:bg-neon-yellow/30" />
              </div>
              <span className="text-[8px] text-slate-500 font-mono mt-1">COIN SLOT</span>
            </div>

            {/* 3. Right Section: Authentic Illuminated Arcade Push Buttons */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-pixel text-slate-400 mb-2">TACTILE ACTION BUTTONS</span>
              <div className="flex items-center gap-4">
                {/* FIRE / ACTION BUTTON (Neon Pink) */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onControlAction('fire')}
                    className="w-14 h-14 rounded-full bg-gradient-to-b from-neon-pink to-[#b30059] border-4 border-pink-300 shadow-[0_8px_20px_rgba(255,0,127,0.5),inset_0_3px_5px_rgba(255,255,255,0.6)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                    title="Launch Ball / Fire Lasers [Spacebar]"
                  >
                    <Flame className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                  </button>
                  <span className="text-[9px] font-pixel text-neon-pink mt-1.5">FIRE</span>
                </div>

                {/* PAUSE BUTTON (Neon Yellow) */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onControlAction('pause')}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-neon-yellow to-[#b3a100] border-4 border-yellow-200 shadow-[0_6px_16px_rgba(255,230,0,0.4),inset_0_3px_5px_rgba(255,255,255,0.6)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                    title="Pause Game [P]"
                  >
                    <Zap className="w-5 h-5 text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]" />
                  </button>
                  <span className="text-[9px] font-pixel text-neon-yellow mt-1.5">PAUSE</span>
                </div>

                {/* RESTART BUTTON (Neon Cyan) */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onControlAction('restart')}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-neon-cyan to-[#0099a3] border-4 border-cyan-200 shadow-[0_6px_16px_rgba(0,240,255,0.4),inset_0_3px_5px_rgba(255,255,255,0.6)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                    title="Reset / Start New Game [R]"
                  >
                    <span className="font-pixel text-[10px] text-black font-bold">RST</span>
                  </button>
                  <span className="text-[9px] font-pixel text-neon-cyan mt-1.5">RESET</span>
                </div>
              </div>
            </div>

          </div>

          {/* Retro Power-up Legend Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="text-[10px] font-pixel text-slate-500 uppercase">Power-ups:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan inline-block shadow-neon-cyan" />
              <span>Multi-Ball (3x)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-green inline-block shadow-neon-green" />
              <span>Wide Paddle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-purple inline-block shadow-neon-purple" />
              <span>Slow Motion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-pink inline-block shadow-neon-pink" />
              <span>Laser Cannons</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-yellow inline-block shadow-neon-yellow" />
              <span>Extra Life (+1)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Details */}
      <footer className="mt-6 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-4">
        <span>© 198X / 2026 POCKET NEON ARCADE</span>
        <span>•</span>
        <span>SYNTH AUDIO & CANVAS 60FPS</span>
      </footer>
    </div>
  );
};
