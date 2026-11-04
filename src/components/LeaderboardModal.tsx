import React, { useState } from 'react';
import { X, Trophy, Medal, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { LeaderboardEntry, ChassisId } from '../types/game';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  pendingEntry?: {
    score: number;
    wave: number;
    chassis: ChassisId;
  } | null;
  onSubmitInitials?: (initials: string) => void;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const LeaderboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entries,
  pendingEntry,
  onSubmitInitials,
}) => {
  const [initials, setInitials] = useState<[number, number, number]>([0, 0, 0]); // Index in CHARS

  if (!isOpen) return null;

  const cycleChar = (slotIndex: 0 | 1 | 2, direction: 1 | -1) => {
    soundManager.playPaddleBounce();
    setInitials((prev) => {
      const next = [...prev] as [number, number, number];
      const nextIdx = (next[slotIndex] + direction + CHARS.length) % CHARS.length;
      next[slotIndex] = nextIdx;
      return next;
    });
  };

  const handleConfirm = () => {
    const letters = `${CHARS[initials[0]]}${CHARS[initials[1]]}${CHARS[initials[2]]}`;
    soundManager.playCoin();
    if (onSubmitInitials) {
      onSubmitInitials(letters);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0a0c1a] border-2 border-neon-yellow rounded-2xl shadow-[0_0_40px_rgba(255,230,0,0.3)] p-5 sm:p-6 text-slate-100 font-pixel">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-neon-yellow animate-bounce" />
            <div>
              <h2 className="text-sm sm:text-base text-neon-yellow tracking-wider">HALL OF CYBER CHAMPIONS</h2>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">TOP 5 LOCAL HIGH SCORES</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Initial Entry Prompt if qualified */}
        {pendingEntry && onSubmitInitials && (
          <div className="my-4 p-4 rounded-xl bg-neon-pink/10 border border-neon-pink shadow-neon-pink text-center animate-pulse-glow">
            <div className="text-[10px] text-neon-pink tracking-widest uppercase mb-1">
              ★ NEW TOP 5 RECORD SET! ★
            </div>
            <div className="text-sm text-neon-yellow mb-2">
              SCORE: {pendingEntry.score} • WAVE {pendingEntry.wave}
            </div>
            <p className="text-[10px] text-slate-300 font-mono mb-3">
              ENTER YOUR 3-LETTER ARCADE CALLSIGN:
            </p>

            {/* 3-letter Slot Machine / Wheel */}
            <div className="flex items-center justify-center gap-4 my-3">
              {[0, 1, 2].map((slot) => {
                const charIndex = initials[slot as 0 | 1 | 2];
                const char = CHARS[charIndex];
                return (
                  <div key={slot} className="flex flex-col items-center">
                    <button
                      onClick={() => cycleChar(slot as 0 | 1 | 2, 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-neon-cyan active:scale-90"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <div className="w-12 h-14 bg-black border-2 border-neon-cyan/70 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-neon-cyan my-1">
                      {char}
                    </div>
                    <button
                      onClick={() => cycleChar(slot as 0 | 1 | 2, -1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-neon-cyan active:scale-90"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              className="mt-3 px-6 py-2.5 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-pixel text-xs rounded-xl shadow-neon-pink hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Check className="w-4 h-4" /> SUBMIT CALLSIGN
            </button>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="mt-4 font-mono">
          <div className="grid grid-cols-12 gap-2 pb-2 text-[9px] font-pixel text-slate-400 border-b border-slate-800 text-center">
            <span className="col-span-2 text-left">RANK</span>
            <span className="col-span-3">TAG</span>
            <span className="col-span-4 text-right">SCORE</span>
            <span className="col-span-3 text-right">WAVE</span>
          </div>

          <div className="divide-y divide-slate-800/60 mt-1">
            {entries.map((entry, idx) => {
              const rankColors = [
                'text-neon-yellow border-neon-yellow/40 bg-neon-yellow/5',
                'text-slate-200 border-slate-400/40 bg-white/5',
                'text-amber-500 border-amber-600/40 bg-amber-500/5',
                'text-slate-400',
                'text-slate-500',
              ];
              const isTop3 = idx < 3;

              return (
                <div
                  key={entry.id || idx}
                  className={`grid grid-cols-12 gap-2 py-2.5 items-center text-xs text-center transition-colors ${
                    isTop3 ? rankColors[idx] : ''
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-1.5 text-left font-pixel text-[10px]">
                    {idx === 0 ? (
                      <Medal className="w-4 h-4 text-neon-yellow animate-pulse" />
                    ) : (
                      <span className="w-4 text-center">{idx + 1}</span>
                    )}
                  </div>
                  <div className="col-span-3 font-pixel text-sm font-bold text-white tracking-widest">
                    {entry.initials}
                  </div>
                  <div className="col-span-4 text-right font-pixel text-neon-cyan text-sm font-bold">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="col-span-3 text-right text-[10px] text-neon-pink font-pixel">
                    W-{entry.wave}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center font-mono text-[9px] text-slate-500">
          Top 5 scores saved in persistent arcade storage.
        </div>
      </div>
    </div>
  );
};
