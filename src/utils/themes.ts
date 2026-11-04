export type PaletteId = 'tokyo' | 'sunset' | 'matrix';
export const PALETTES: Record<PaletteId, { name: string; primary: string; secondary: string; background: string; cost: number; filter: string }> = {
  tokyo: { name: 'Tokyo Midnight', primary: '#00f0ff', secondary: '#ff007f', background: '#050814', cost: 0, filter: 'none' },
  sunset: { name: 'Synthwave Sunset', primary: '#ff3cac', secondary: '#ff8a24', background: '#160917', cost: 150, filter: 'hue-rotate(70deg)' },
  matrix: { name: 'Cyber Matrix', primary: '#39ff14', secondary: '#c2ff48', background: '#070e0b', cost: 250, filter: 'grayscale(1) sepia(1) saturate(6) hue-rotate(45deg)' },
};
