import { Pause, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ArcadeInput } from '../hooks/useArcadeInput';

export function ArcadeControls({ input, disabled, overdrive, active, playing }: {
  input: ArcadeInput; disabled: boolean; overdrive: number; active: boolean; playing: boolean;
}) {
  return (
    <section className="control-deck" aria-label="Arcade controls">
      <div className="control-hints">
        <span className="status-dot" />
        {input.mode === 'touch' ? 'DRAG TO MOVE / HOLD A TO SHOOT / SWIPE UP FOR OVERDRIVE' :
          <span><kbd>A D</kbd> / <kbd>← →</kbd> Move <kbd>SPACE</kbd> Shoot <kbd>SHIFT</kbd> Overdrive <kbd>ESC</kbd> Pause</span>}
      </div>
      <div className="control-row">
        <div className="thumbstick-wrap">
          <div {...input.stickProps} className="thumbstick" aria-label="Drag thumbstick to move" role="group">
            <span className="stick-cross">+</span>
            <span className="stick-cap" style={{ transform: `translate(${input.stick.x * 25}px, ${input.stick.y * 25}px)` }} />
          </div>
          <span className="control-caption">MOVE</span>
        </div>
        <div className="deck-center"><span>NEON BRICK BREAKER</span><small>ONE MORE WAVE.</small></div>
        <div className="action-cluster">
          <div><button {...input.fireProps} disabled={disabled} className="arcade-button action-a" aria-label="A: Launch or shoot">A</button><span className="control-caption">SHOOT</span></div>
          <div><button disabled={disabled || !playing || (overdrive < 100 && !active)} {...input.actionProps('overdrive')}
            className={`arcade-button action-b ${overdrive >= 100 ? 'charged' : ''}`} aria-label="B: Activate Overdrive"
            style={{ '--charge': `${overdrive}%` } as CSSProperties}>B</button><span className="control-caption">{active ? 'HYPER' : `${Math.round(overdrive)}%`}</span></div>
          <div className="system-buttons">
            <button disabled={disabled} onClick={() => input.dispatch('pause')} aria-label="Pause or resume"><Pause size={13} /> PAUSE</button>
            <button disabled={disabled} onClick={() => input.dispatch('restart')} aria-label="Restart run"><RotateCcw size={13} /> RESET</button>
          </div>
        </div>
      </div>
    </section>
  );
}
