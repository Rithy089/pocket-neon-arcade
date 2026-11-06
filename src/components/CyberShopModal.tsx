import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Shield,
  Magnet,
  Flame,
  Check,
  Lock,
  ChevronRight,
  Disc3,
  Award
} from 'lucide-react';
import { progression, CHASSIS_CONFIGS } from '../utils/progression';
import { ProgressionData, ChassisId } from '../types/game';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

export const CyberShopModal: React.FC<Props> = ({ isOpen, onClose, onDataChange }) => {
  const [data, setData] = useState<ProgressionData>(() => progression.getData());
  useEffect(() => { if (isOpen) setData(progression.getData()); }, [isOpen]);

  if (!isOpen) return null;

  const refreshData = () => {
    const updated = progression.getData();
    setData(updated);
    onDataChange();
  };

  const handleBuyUpgrade = (upgradeKey: keyof ProgressionData['upgrades']) => {
    const success = progression.upgradeTier(upgradeKey);
    if (success) {
      soundManager.playPowerup();
      refreshData();
    } else {
      soundManager.playWallBounce();
    }
  };

  const handleChassisAction = (id: ChassisId) => {
    if (data.chassisUnlocked[id]) {
      progression.selectChassis(id);
      soundManager.playPaddleBounce();
      refreshData();
    } else {
      const success = progression.unlockChassis(id);
      if (success) {
        soundManager.playPowerup();
        refreshData();
      } else {
        soundManager.playWallBounce();
      }
    }
  };

  const upgradeInfo: Record<
    keyof ProgressionData['upgrades'],
    { name: string; desc: string; icon: React.ReactNode; color: string }
  > = {
    magnetField: {
      name: 'MAGNETIC HARVESTER',
      desc: 'Generates an attraction gravity well for falling power-ups and Neon Coins (+35px radius per tier).',
      icon: <Magnet className="w-5 h-5 text-neon-cyan" />,
      color: 'border-neon-cyan text-neon-cyan',
    },
    comboCapacitor: {
      name: 'COMBO CAPACITOR',
      desc: 'Extends the combo multiplier buffer window before it resets (+0.6s per tier).',
      icon: <Flame className="w-5 h-5 text-neon-pink" />,
      color: 'border-neon-pink text-neon-pink',
    },
    emergencyBarrier: {
      name: 'EMERGENCY BARRIER',
      desc: 'Projects a rechargeable bottom safety laser floor that bounces back a lost ball once per wave.',
      icon: <Shield className="w-5 h-5 text-neon-green" />,
      color: 'border-neon-green text-neon-green',
    },
    overdriveEfficiency: {
      name: 'OVERDRIVE INJECTOR',
      desc: 'Accelerates Overdrive meter generation from brick detonations and combos (+15% efficiency per tier).',
      icon: <Zap className="w-5 h-5 text-neon-yellow" />,
      color: 'border-neon-yellow text-neon-yellow',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0a0c1a] border-2 border-neon-cyan/70 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.3)] p-4 sm:p-6 text-slate-100 font-pixel">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/50 shadow-neon-cyan">
              <Zap className="w-6 h-6 text-neon-cyan animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base text-neon-cyan tracking-wider">CYBER MODIFICATION LAB</h2>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">PERMANENT QUANTUM CORE AUGMENTATIONS</p>
            </div>
          </div>

          {/* Shards Currency Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 border border-neon-yellow/60 shadow-neon-yellow">
              <Disc3 className="w-4 h-4 text-neon-yellow animate-spin" />
              <span className="text-xs text-neon-yellow font-bold">{data.shards}</span>
              <span className="text-[9px] text-slate-400 font-mono">COINS</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs font-mono leading-relaxed text-slate-400">Chassis changes equip on your next run. Barrier upgrades recharge next wave. Other core upgrades apply when you resume.</p>
        {/* Section 1: Permanent Upgrades */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3 text-xs text-neon-pink">
            <Award className="w-4 h-4" />
            <span>CORE SUBSYSTEM UPGRADES (5 TIERS)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {(Object.keys(data.upgrades) as Array<keyof ProgressionData['upgrades']>).map((key) => {
              const upgrade = data.upgrades[key];
              const meta = upgradeInfo[key];
              const isMax = upgrade.tier >= upgrade.maxTier;
              const nextCost = isMax ? 0 : upgrade.costs[upgrade.tier];
              const canAfford = data.shards >= nextCost;

              return (
                <div
                  key={key}
                  className="bg-black/40 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className="font-pixel text-[11px] text-slate-200">{meta.name}</span>
                      </div>
                      <span className="font-pixel text-[10px] text-slate-400">
                        LV {upgrade.tier}/{upgrade.maxTier}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{meta.desc}</p>

                    {/* Tier Progress Pips */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {Array.from({ length: upgrade.maxTier }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm transition-all ${
                            i < upgrade.tier
                              ? 'bg-neon-cyan shadow-[0_0_6px_#00f0ff]'
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <button
                    disabled={isMax || !canAfford}
                    onClick={() => handleBuyUpgrade(key)}
                    className={`w-full py-2 px-3 rounded-lg font-pixel text-[10px] flex items-center justify-center gap-1.5 transition-all ${
                      isMax
                        ? 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan text-neon-cyan shadow-neon-cyan cursor-pointer active:scale-95'
                        : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neon-green" /> MAXED
                      </>
                    ) : (
                      <>
                        <span>UPGRADE</span>
                        <span className="text-neon-yellow">[{nextCost} COINS]</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Chassis Hangar */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3 text-xs text-neon-green">
            <Zap className="w-4 h-4" />
            <span>CHASSIS HANGAR & LOADOUT SELECTION</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            {(Object.keys(CHASSIS_CONFIGS) as ChassisId[]).map((id) => {
              const cfg = CHASSIS_CONFIGS[id];
              const isUnlocked = data.chassisUnlocked[id];
              const isSelected = data.selectedChassis === id;
              const canAfford = data.shards >= cfg.cost;

              return (
                <div
                  key={id}
                  className={`relative bg-black/40 rounded-xl p-3.5 flex flex-col justify-between border-2 transition-all ${
                    isSelected
                      ? 'border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)] bg-neon-cyan/5'
                      : isUnlocked
                      ? 'border-slate-700 hover:border-slate-500'
                      : 'border-slate-800/80 opacity-75'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-pixel text-[11px] text-white">{cfg.name}</span>
                      {isSelected ? (
                        <span className="px-1.5 py-0.5 rounded bg-neon-cyan/20 border border-neon-cyan text-[9px] font-pixel text-neon-cyan">
                          ACTIVE
                        </span>
                      ) : !isUnlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      ) : null}
                    </div>

                    <div className="text-[10px] text-neon-pink font-pixel mb-2">{cfg.tagline}</div>

                    {/* Chassis Preview Paddle Visual */}
                    <div className="h-10 bg-slate-950/80 rounded-lg flex items-center justify-center my-2.5 border border-slate-900">
                      <div
                        style={{
                          width: `${(cfg.width / 135) * 80}%`,
                          backgroundColor: cfg.color,
                          boxShadow: `0 0 10px ${cfg.color}`,
                        }}
                        className="h-3 rounded-full"
                      />
                    </div>

                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{cfg.description}</p>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleChassisAction(id)}
                    disabled={!isUnlocked && !canAfford}
                    className={`w-full py-2 px-2.5 rounded-lg font-pixel text-[10px] flex items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan cursor-default'
                        : isUnlocked
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer active:scale-95'
                        : canAfford
                        ? 'bg-neon-yellow/20 hover:bg-neon-yellow/30 border border-neon-yellow text-neon-yellow shadow-neon-yellow cursor-pointer active:scale-95'
                        : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3" /> EQUIPPED
                      </>
                    ) : isUnlocked ? (
                      <>
                        EQUIP CHASSIS <ChevronRight className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> UNLOCK [{cfg.cost} COINS]
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center font-mono text-[10px] text-slate-500">
          Press ESC or click close to return to the arcade cabinet. All modifications auto-saved.
        </div>
      </div>
    </div>
  );
};
