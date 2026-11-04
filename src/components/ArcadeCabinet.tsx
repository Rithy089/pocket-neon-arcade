import type { ReactNode, CSSProperties } from 'react';
import { ArrowUpRight, Award, Coins, Gamepad2, Palette, Settings2, ShoppingBag, Trophy, Volume2, VolumeX } from 'lucide-react';
import { PALETTES, PaletteId } from '../utils/themes';
import type { GameSettings } from '../types/game';

interface Props {
  children: ReactNode;
  score: number;
  highScore: number;
  shards: number;
  palette: PaletteId;
  muted: boolean;
  bloomMode: GameSettings['bloomMode'];
  onMute: () => void;
  onOpenPalettes: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

export function ArcadeCabinet(props: Props) {
  const theme = PALETTES[props.palette];
  return <main className={`arcade-shell ${props.bloomMode !== 'high' ? 'performance-mode' : ''} ${props.bloomMode === 'off' ? 'bloom-off' : ''}`} style={{
    '--accent': theme.primary, '--accent-alt': theme.secondary, '--scene-bg': theme.background, '--game-filter': theme.filter,
  } as CSSProperties}>
    <header className="site-header">
      <a className="arcade-logo" href="#arcade" aria-label="Pocket Neon Arcade"><Gamepad2 /><span>POCKET<span>NEON ARCADE</span></span></a>
      <span className="header-status"><span className="status-dot" /> LOCAL ARCADE / ALWAYS OPEN</span>
      <div className="header-actions"><button onClick={props.onMute} aria-label={props.muted ? 'Unmute all audio' : 'Mute all audio'} aria-pressed={props.muted}>{props.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><button onClick={props.onOpenSettings} aria-label="Open settings"><Settings2 size={18} /></button></div>
    </header>
    <div className="arcade-layout" id="arcade">
      <aside className="arcade-intro">
        <div className="eyebrow"><span className="status-dot" /> VOL. 01 / THE NEON COLLECTION</div>
        <h1>SMALL SCREEN.<br /><span>BIG ENERGY.</span></h1>
        <p>Your next high score is one run away. Break the grid, chain your combos, and push past the next boss.</p>
        <div className="game-card"><span className="game-card-number">01</span><div><small>NOW PLAYING</small><h2>NEON<br />BRICK BREAKER</h2><span className="game-tags">REFLEX / ENDLESS WAVES / SOLO</span></div><ArrowUpRight /></div>
        <nav className="arcade-nav" aria-label="Arcade menu">
          <button onClick={props.onOpenShop}><ShoppingBag /><span>Cyber shop<small>UPGRADE YOUR NEXT RUN</small></span><ArrowUpRight /></button>
          <button onClick={props.onOpenLeaderboard}><Trophy /><span>Hall of fame<small>NEON BRICK BREAKER / LOCAL TOP 5</small></span><ArrowUpRight /></button>
          <button onClick={props.onOpenAchievements}><Award /><span>Achievements<small>CHASE SOMETHING NEW</small></span><ArrowUpRight /></button>
          <button onClick={props.onOpenPalettes}><Palette /><span>Neon palettes<small>{theme.name.toUpperCase()}</small></span><ArrowUpRight /></button>
        </nav>
        <div className="session-tip"><span>PRO TIP / 01</span><p>Save Overdrive for armored clusters. Five seconds of plasma can change the whole run.</p></div>
      </aside>
      <section className="cabinet" aria-label="Neon Brick Breaker arcade cabinet">
        <div className="cabinet-title"><span><span className="status-dot" /> PLAYER ONE</span><span>FREE PLAY <Gamepad2 size={14} /></span></div>
        <div className="cabinet-scoreboard" aria-label="Scoreboard">
          <div><small>1UP SCORE</small><strong>{props.score.toString().padStart(6, '0')}</strong></div>
          <div><small><Trophy size={11} /> PERSONAL BEST</small><strong>{props.highScore.toString().padStart(6, '0')}</strong></div>
          <button onClick={props.onOpenPalettes} aria-label={`${props.shards} Neon Coins. Open palettes`}><small><Coins size={11} /> NEON COINS</small><strong>{props.shards.toLocaleString()}</strong></button>
        </div>
        {props.children}
      </section>
    </div>
    <footer className="site-footer"><span>BUILT FOR THE ONE-MORE-TRY.</span><span>NO DOWNLOADS. JUST PLAY.</span></footer>
  </main>;
}
