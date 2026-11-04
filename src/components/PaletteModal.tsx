import { Check, Lock, X } from 'lucide-react';
import { PALETTES, PaletteId } from '../utils/themes';
import { progression } from '../utils/progression';

export function PaletteModal({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const data = progression.getData();
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
    <div className="palette-modal">
      <div className="palette-heading"><div><small>MAKE IT YOURS</small><h2>NEON PALETTES</h2></div><button onClick={onClose} aria-label="Close palettes"><X size={20} /></button></div>
      <p>Earn Neon Coins in every run. Unlock a new atmosphere.</p>
      <div className="palette-balance">YOUR WALLET <strong>{data.shards.toLocaleString()} COINS</strong></div>
      {(Object.entries(PALETTES) as [PaletteId, typeof PALETTES[PaletteId]][]).map(([id, palette]) => {
        const unlocked = data.palettesUnlocked.includes(id), selected = data.selectedPalette === id;
        return <button key={id} className={`palette-option ${selected ? 'selected' : ''}`}
          disabled={!unlocked && data.shards < palette.cost} aria-pressed={selected}
          onClick={() => { if (progression.selectPalette(id)) onChange(); }}>
          <span className="palette-swatch" style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }} />
          <span><strong>{palette.name}</strong><small>{selected ? 'EQUIPPED' : unlocked ? 'SELECT PALETTE' : `${palette.cost} NEON COINS`}</small></span>
          {selected ? <Check size={18} /> : !unlocked ? <Lock size={16} /> : null}
        </button>;
      })}
      <small className="palette-note">Colors are cosmetic. Your upgrades and scores stay with you.</small>
    </div>
  </div>;
}
