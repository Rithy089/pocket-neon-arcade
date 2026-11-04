import { useState, useCallback, useEffect } from 'react';
import { ArcadeCabinet } from './components/ArcadeCabinet';
import { NeonBrickBreaker } from './components/NeonBrickBreaker';
import { CyberShopModal } from './components/CyberShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AchievementsModal, AchievementToast } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';
import { PaletteModal } from './components/PaletteModal';
import { PaletteId } from './utils/themes';
import { setHapticsEnabled, arcadeHaptic } from './utils/haptics';
import { useArcadeDialogs } from './hooks/useArcadeDialogs';
import { progression } from './utils/progression';
import { soundManager } from './utils/audio';
import { GameSettings, LeaderboardEntry, ChassisId, Achievement } from './types/game';

export function App() {
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => progression.getData().highScore);
  const [shards, setShards] = useState<number>(() => progression.getData().shards);

  const [settings, setSettings] = useState<GameSettings>(() => progression.getData().settings);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Record<string, boolean>>(
    () => progression.getData().achievements
  );
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(
    () => progression.getData().highScoreEntries
  );

  // Modals state
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [palette, setPalette] = useState<PaletteId>(() => progression.getData().selectedPalette);
  const modalOpen = isShopOpen || isLeaderboardOpen || isAchievementsOpen || isSettingsOpen || isPaletteOpen;

  useArcadeDialogs(modalOpen, () => {
    setIsShopOpen(false); setIsLeaderboardOpen(false); setIsAchievementsOpen(false);
    setIsSettingsOpen(false); setIsPaletteOpen(false); setPendingLeaderboard(null);
  });

  useEffect(() => {
    soundManager.setMuted(settings.masterMuted);
    soundManager.setSfxEnabled(settings.soundFxEnabled);
    soundManager.setBgmEnabled(settings.synthBgmEnabled);
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings]);

  // Pending top score entry
  const [pendingLeaderboard, setPendingLeaderboard] = useState<{
    score: number;
    wave: number;
    chassis: ChassisId;
  } | null>(null);

  // In-game achievement toast
  const [activeToast, setActiveToast] = useState<Achievement | null>(null);

  const refreshProgressionData = useCallback(() => {
    const data = progression.getData();
    setShards(data.shards);
    setHighScore(data.highScore);
    setUnlockedAchievements(data.achievements);
    setLeaderboardEntries(data.highScoreEntries);
    setSettings(data.settings);
    setPalette(data.selectedPalette);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    progression.updateSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleTriggerAchievement = useCallback((id: string) => {
    const res = progression.checkAchievement(id);
    if (res.unlocked && res.achievement) {
      soundManager.playAchievement();
      setActiveToast(res.achievement);
      setUnlockedAchievements(progression.getData().achievements);
      setShards(progression.getData().shards);

      // Auto dismiss toast after 4.5s
      setTimeout(() => {
        setActiveToast((current) => (current?.id === res.achievement?.id ? null : current));
      }, 4500);
    }
  }, []);

  const handleOpenLeaderboard = useCallback((pending?: { score: number; wave: number; chassis: ChassisId }) => {
    if (pending) {
      setPendingLeaderboard(pending);
    }
    setIsLeaderboardOpen(true);
  }, []);

  const handleSubmitInitials = (initials: string) => {
    if (!pendingLeaderboard) return;
    const updated = progression.addLeaderboardEntry(
      initials,
      pendingLeaderboard.score,
      pendingLeaderboard.wave,
      pendingLeaderboard.chassis
    );
    setLeaderboardEntries(updated);
    setPendingLeaderboard(null);
    setHighScore(progression.getData().highScore);
  };

  return (
    <>
      <ArcadeCabinet
        score={score}
        highScore={highScore}
        shards={shards}
        palette={palette}
        muted={settings.masterMuted}
        bloomMode={settings.bloomMode}
        onMute={() => handleUpdateSettings({ masterMuted: !settings.masterMuted })}
        onOpenPalettes={() => setIsPaletteOpen(true)}
        onOpenShop={() => setIsShopOpen(true)}
        onOpenLeaderboard={() => {
          setPendingLeaderboard(null);
          setIsLeaderboardOpen(true);
        }}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        <NeonBrickBreaker
          onScoreUpdate={setScore}
          onHighScoreUpdate={setHighScore}
          onShardsUpdate={setShards}
          settings={settings}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenLeaderboard={handleOpenLeaderboard}
          onTriggerAchievementToast={handleTriggerAchievement}
          isObscured={modalOpen}
        />
      </ArcadeCabinet>

      {isPaletteOpen && <PaletteModal onClose={() => setIsPaletteOpen(false)} onChange={() => {
        refreshProgressionData(); soundManager.playUiBeep(); arcadeHaptic();
      }} />}

      {/* Cyber Shop Modal */}
      <CyberShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        onDataChange={refreshProgressionData}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => {
          setIsLeaderboardOpen(false);
          setPendingLeaderboard(null);
        }}
        entries={leaderboardEntries}
        pendingEntry={pendingLeaderboard}
        onSubmitInitials={handleSubmitInitials}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        unlockedMap={unlockedAchievements}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Slide-In Achievement Toast */}
      <AchievementToast
        achievement={activeToast}
        onDismiss={() => setActiveToast(null)}
      />
    </>
  );
}

export default App;
