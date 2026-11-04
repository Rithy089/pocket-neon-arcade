import React from 'react';
import {
  X,
  Award,
  Zap,
  Flame,
  Crown,
  Sparkles,
  Disc3,
  Shield,
  Trophy,
  Crosshair,
  CircleDot,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../utils/progression';
import { Achievement } from '../types/game';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedMap: Record<string, boolean>;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-5 h-5 text-neon-cyan" />,
  Flame: <Flame className="w-5 h-5 text-neon-pink" />,
  Crown: <Crown className="w-5 h-5 text-neon-yellow" />,
  Sparkles: <Sparkles className="w-5 h-5 text-neon-purple" />,
  Disc3: <Disc3 className="w-5 h-5 text-neon-green" />,
  Shield: <Shield className="w-5 h-5 text-neon-cyan" />,
  Trophy: <Trophy className="w-5 h-5 text-neon-yellow" />,
  Crosshair: <Crosshair className="w-5 h-5 text-neon-pink" />,
  CircleDot: <CircleDot className="w-5 h-5 text-neon-green" />,
};

export const AchievementsModal: React.FC<ModalProps> = ({ isOpen, onClose, unlockedMap }) => {
  if (!isOpen) return null;

  const unlockedCount = Object.values(unlockedMap).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0c1a] border-2 border-neon-purple/70 rounded-2xl shadow-[0_0_40px_rgba(188,19,254,0.3)] p-4 sm:p-6 text-slate-100 font-pixel">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neon-purple/20 border border-neon-purple shadow-neon-purple">
              <Award className="w-6 h-6 text-neon-purple" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base text-neon-purple tracking-wider">CYBER ACHIEVEMENTS</h2>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                UNLOCKED: {unlockedCount} / {ACHIEVEMENTS_LIST.length} CHALLENGES
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of 10 Achievements */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 font-mono">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isUnlocked = Boolean(unlockedMap[ach.id]);
            const icon = ICON_MAP[ach.iconName] || <Award className="w-5 h-5 text-neon-cyan" />;

            return (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isUnlocked
                    ? 'bg-neon-purple/10 border-neon-purple/60 shadow-[0_0_12px_rgba(188,19,254,0.2)]'
                    : 'bg-black/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      isUnlocked
                        ? 'bg-black/60 border-neon-purple shadow-neon-purple'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    {isUnlocked ? icon : <Lock className="w-4 h-4 text-slate-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[11px] text-slate-100">{ach.title}</span>
                      {isUnlocked && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ach.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-pixel text-neon-yellow">
                    +{ach.rewardShards}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 block">SHARDS</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center font-mono text-[9px] text-slate-500">
          Achievements reward permanent Neon Coins instantly.
        </div>
      </div>
    </div>
  );
};

// In-Game Slide-In Achievement Toast Notification
interface ToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<ToastProps> = ({ achievement, onDismiss }) => {
  if (!achievement) return null;

  return (
    <div
      onClick={onDismiss}
      className="fixed top-6 right-6 z-50 max-w-sm w-full bg-[#0a0c1a]/95 border-2 border-neon-yellow rounded-2xl p-4 shadow-[0_0_25px_rgba(255,230,0,0.5)] cursor-pointer animate-bounce backdrop-blur-md font-pixel select-none"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-neon-yellow/20 border border-neon-yellow shadow-neon-yellow">
          <Trophy className="w-6 h-6 text-neon-yellow animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="text-[9px] text-neon-pink uppercase tracking-widest">
            ★ ACHIEVEMENT UNLOCKED! ★
          </div>
          <div className="text-xs text-white font-bold my-0.5">{achievement.title}</div>
          <div className="text-[10px] text-slate-300 font-mono">{achievement.description}</div>
        </div>
        <div className="text-right pl-2 border-l border-slate-800">
          <span className="text-xs text-neon-yellow font-bold">+{achievement.rewardShards}</span>
          <span className="text-[8px] text-slate-400 font-mono block">SHARDS</span>
        </div>
      </div>
    </div>
  );
};
