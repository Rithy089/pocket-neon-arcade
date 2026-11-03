import React from 'react';
import { X, Settings, Tv, Sparkles, Volume2, Music, Check } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const toggleSoundFx = () => {
    const next = !settings.soundFxEnabled;
    onUpdateSettings({ soundFxEnabled: next });
    soundManager.setMuted(!next);
    if (next) soundManager.playCoin();
  };

  const toggleSynthBgm = () => {
    const next = !settings.synthBgmEnabled;
    onUpdateSettings({ synthBgmEnabled: next });
    soundManager.setBgmEnabled(next);
  };

  const toggleCrt = () => {
    onUpdateSettings({ crtEnabled: !settings.crtEnabled });
    soundManager.playPaddleBounce();
  };

  const toggleBloomMode = () => {
    const next = settings.bloomMode === 'high' ? 'performance' : 'high';
    onUpdateSettings({ bloomMode: next });
    soundManager.playPaddleBounce();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0a0c1a] border-2 border-neon-cyan rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.3)] p-5 text-slate-100 font-pixel">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-neon-cyan animate-spin" />
            <h2 className="text-sm text-neon-cyan tracking-wider">HARDWARE & SYSTEM CONFIG</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings List */}
        <div className="mt-4 space-y-3 font-mono">
          {/* 1. CRT Scanlines */}
          <div className="p-3 bg-black/50 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tv className="w-5 h-5 text-neon-purple" />
              <div>
                <span className="font-pixel text-[11px] text-slate-200">CRT SCANLINES</span>
                <p className="text-[10px] text-slate-400">Authentic tube monitor scanlines & curvature</p>
              </div>
            </div>

            <button
              onClick={toggleCrt}
              className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border transition-all ${
                settings.crtEnabled
                  ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-neon-purple'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {settings.crtEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* 2. Bloom & VFX Quality */}
          <div className="p-3 bg-black/50 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-neon-pink" />
              <div>
                <span className="font-pixel text-[11px] text-slate-200">BLOOM & GLOW</span>
                <p className="text-[10px] text-slate-400">
                  {settings.bloomMode === 'high' ? 'High Dynamic Range Glow' : 'Performance Optimized (Fast)'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleBloomMode}
              className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border transition-all ${
                settings.bloomMode === 'high'
                  ? 'bg-neon-pink/20 border-neon-pink text-neon-pink shadow-neon-pink'
                  : 'bg-neon-green/20 border-neon-green text-neon-green shadow-neon-green'
              }`}
            >
              {settings.bloomMode === 'high' ? 'ULTRA' : 'PERF'}
            </button>
          </div>

          {/* 3. Sound FX */}
          <div className="p-3 bg-black/50 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-neon-cyan" />
              <div>
                <span className="font-pixel text-[11px] text-slate-200">SYNTH SFX</span>
                <p className="text-[10px] text-slate-400">Procedural Web Audio sound effects</p>
              </div>
            </div>

            <button
              onClick={toggleSoundFx}
              className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border transition-all ${
                settings.soundFxEnabled
                  ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-neon-cyan'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {settings.soundFxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 4. Synthwave BGM */}
          <div className="p-3 bg-black/50 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-neon-yellow" />
              <div>
                <span className="font-pixel text-[11px] text-slate-200">120 BPM SYNTH BASS</span>
                <p className="text-[10px] text-slate-400">Dynamic arpeggiated cyberpunk soundtrack</p>
              </div>
            </div>

            <button
              onClick={toggleSynthBgm}
              className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border transition-all ${
                settings.synthBgmEnabled
                  ? 'bg-neon-yellow/20 border-neon-yellow text-neon-yellow shadow-neon-yellow'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {settings.synthBgmEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
