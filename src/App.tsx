import { useState } from 'react';
import { ArcadeCabinet } from './components/ArcadeCabinet';
import { NeonBrickBreaker } from './components/NeonBrickBreaker';

export function App() {
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('neon_arcade_highscore') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCRTEnabled, setIsCRTEnabled] = useState<boolean>(true);
  const [activeControlAction, setActiveControlAction] = useState<string | null>(null);
  const [joystickX, setJoystickX] = useState<number>(0);

  const handleControlAction = (action: string) => {
    setActiveControlAction(action);
  };

  const clearControlAction = () => {
    setActiveControlAction(null);
  };

  return (
    <ArcadeCabinet
      score={score}
      highScore={highScore}
      onControlAction={handleControlAction}
      joystickX={joystickX}
      setJoystickX={setJoystickX}
    >
      <NeonBrickBreaker
        onScoreUpdate={setScore}
        onHighScoreUpdate={setHighScore}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        isCRTEnabled={isCRTEnabled}
        onToggleCRT={() => setIsCRTEnabled((prev) => !prev)}
        activeControlAction={activeControlAction}
        onClearControlAction={clearControlAction}
        joystickX={joystickX}
      />
    </ArcadeCabinet>
  );
}

export default App;
