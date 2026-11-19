import {
  GRID_SIZE,
  PALETTE_CODES,
  SLOT_LABELS,
  DESIGN_FABRIC_COST,
  DESIGN_SLOT_STATS,
  DESIGN_PALETTE,
  createEmptyGrid,
  cloneGrid,
  generateItemUid,
  encodeGridToItemData,
  decodeItemToGrid,
  countPaintedPixels,
  makeItemFromAscii,
  OUTFIT_EFFECTS,
  VALID_OUTFIT_EFFECTS,
  getOutfitEffectMeta,
  normalizeShimmerPixels,
  REACTIVE_NEON_PRESETS,
  sanitizeReactiveConfig,
  getReactiveBadges,
  type ClothingSlot,
  type ClothingSource,
  type GearStats,
  type ClothingItem,
  type OutfitEffectType,
  type OutfitEffectMeta,
  type RainReactiveStyle,
  type ReactiveOutfitConfig,
} from './constants';

export {
  GRID_SIZE,
  PALETTE_CODES,
  SLOT_LABELS,
  DESIGN_FABRIC_COST,
  DESIGN_SLOT_STATS,
  DESIGN_PALETTE,
  createEmptyGrid,
  cloneGrid,
  generateItemUid,
  encodeGridToItemData,
  decodeItemToGrid,
  countPaintedPixels,
  makeItemFromAscii,
  OUTFIT_EFFECTS,
  VALID_OUTFIT_EFFECTS,
  getOutfitEffectMeta,
  normalizeShimmerPixels,
  REACTIVE_NEON_PRESETS,
  sanitizeReactiveConfig,
  getReactiveBadges,
  type ClothingSlot,
  type ClothingSource,
  type GearStats,
  type ClothingItem,
  type OutfitEffectType,
  type OutfitEffectMeta,
  type RainReactiveStyle,
  type ReactiveOutfitConfig,
};

export type { LuxuryRarity, LuxuryCatalogItem as LuxuryCatalogEntry } from './luxuryCatalog';

/**
 * Faint 16x16 body silhouette guides shown inside the Design Studio canvas
 * so players know exactly where head/torso/waist/legs/feet sit on the sprite.
 */
export const SLOT_SILHOUETTES: Record<ClothingSlot, string[]> = {
  hat: [
    '................',
    '................',
    '................',
    '.....XXXXXX.....',
    '....XXXXXXXX....',
    '...XXXXXXXXXX...',
    '...XXXXXXXXXX...',
    '...XX.XXXX.XX...',
    '...XXXXXXXXXX...',
    '...XXXXXXXXXX...',
    '....XXXXXXXX....',
    '.....XXXXXX.....',
    '................',
    '................',
    '................',
    '................',
  ],
  top: [
    '................',
    '................',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '...XXXXXXXXXX...',
    '..XXXXXXXXXXXX..',
    '..XXXXXXXXXXXX..',
    '..XXXXXXXXXXXX..',
    '..XX.XXXXXX.XX..',
    '...XXXXXXXXXX...',
    '....XXXXXXXX....',
    '....XX....XX....',
    '....XX....XX....',
    '................',
    '................',
    '................',
  ],
  bottom: [
    '................',
    '................',
    '................',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '................',
    '................',
  ],
  dress: [
    '................',
    '................',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '...XXXXXXXXXX...',
    '..XXXXXXXXXXXX..',
    '..XXXXXXXXXXXX..',
    '..XXXXXXXXXXXX..',
    '..XX.XXXXXX.XX..',
    '...XXXXXXXXXX...',
    '....XXXXXXXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '................',
    '................',
  ],
  shoes: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '....XXX..XXX....',
    '................',
    '................',
  ],
};

export function getSlotOffsetY(slot: ClothingSlot): number {
  return slot === 'hat' ? 0 : 8;
}

const SUNSET_STOPS: Array<[number, number, number]> = [
  [255, 196, 61],   // Warm Amber Gold
  [251, 113, 133],  // Sunset Coral Rose
  [249, 115, 22],   // Glowing Tangerine
  [217, 70, 239],   // Dusk Orchid
];

function hexToRgbTuple(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function shiftSunsetAmberColor(hex: string, x: number, y: number, sunsetPhase: number): string {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Keep crisp dark outlines anchored while softly warming midtones/highlights
  const blendStrength = luma < 0.2 ? 0.12 : luma > 0.85 ? 0.34 : 0.44;
  const wavePos = (((sunsetPhase / 12) * SUNSET_STOPS.length + y * 0.19 + x * 0.09) % SUNSET_STOPS.length + SUNSET_STOPS.length) % SUNSET_STOPS.length;
  const i0 = Math.floor(wavePos);
  const i1 = (i0 + 1) % SUNSET_STOPS.length;
  const frac = wavePos - i0;
  const c0 = SUNSET_STOPS[i0];
  const c1 = SUNSET_STOPS[i1];
  const tr = c0[0] + (c1[0] - c0[0]) * frac;
  const tg = c0[1] + (c1[1] - c0[1]) * frac;
  const tb = c0[2] + (c1[2] - c0[2]) * frac;
  const nr = Math.round(r * (1 - blendStrength) + tr * blendStrength);
  const ng = Math.round(g * (1 - blendStrength) + tg * blendStrength);
  const nb = Math.round(b * (1 - blendStrength) + tb * blendStrength);
  return `rgb(${nr},${ng},${nb})`;
}

export function isBrightShimmerCandidate(hex: string): boolean {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma >= 0.62;
}

export function computeAutoShimmerMask(grid: (string | null)[][]): string {
  let mask = '';
  let marked = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const col = grid[y]?.[x];
      if (col && isBrightShimmerCandidate(col)) {
        mask += '1';
        marked++;
      } else {
        mask += '0';
      }
    }
  }
  if (marked > 0) return mask;
  // Fallback if all pixels are dark shades: mark checkerboard interior pixels
  let fallback = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const col = grid[y]?.[x];
      fallback += col && (x + y) % 2 === 0 ? '1' : '0';
    }
  }
  return fallback;
}

export function isItemPixelGlowing(item: ClothingItem, sx: number, sy: number, col: string): boolean {
  if (item.effect !== 'glowing_pearls') return false;
  if (item.shimmerPixels && item.shimmerPixels.length === 256) {
    return item.shimmerPixels[sy * GRID_SIZE + sx] === '1';
  }
  if (isBrightShimmerCandidate(col)) return true;
  return (sx + sy) % 3 === 0;
}

/**
 * Draws a ClothingItem onto a 16x24 character sprite canvas, handling
 * walking bob/step and clean 4-direction projection (down, up, left, right).
 */
export function drawClothingItemOnSprite(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number,
  rowBand: 'all' | 'wings' | 'feet' = 'all',
  sunsetPhase = 0
) {
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const baseY = getSlotOffsetY(item.slot) + (item.slot === 'shoes' ? 0 : bob);
  const px = item.pixels;
  const pal = item.palette;
  const hasSunset = item.effect === 'sunset_amber';

  const sampleColor = (sx: number, sy: number): string | null => {
    if (sx < 0 || sx >= GRID_SIZE || sy < 0 || sy >= GRID_SIZE) return null;
    const ch = px[sy * GRID_SIZE + sx];
    if (!ch || ch === '.') return null;
    const idx = PALETTE_CODES.indexOf(ch);
    return idx >= 0 && idx < pal.length ? pal[idx] : null;
  };

  const yInBand = (y: number) =>
    rowBand === 'all' || (rowBand === 'wings' ? y < 10 : y >= 10);

  if (dir === 'down' || dir === 'up') {
    const mirror = dir === 'up';
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!yInBand(y)) continue;
      const targetY = baseY + y;
      if (targetY < 0 || targetY >= 24) continue;
      for (let x = 0; x < GRID_SIZE; x++) {
        const sx = mirror ? GRID_SIZE - 1 - x : x;
        const col = sampleColor(sx, y);
        if (!col) continue;
        let stepLift = 0;
        if (item.slot === 'shoes' && y >= 10) {
          if (frame === 1 && x < 8) stepLift = -1;
          else if (frame === 3 && x >= 8) stepLift = -1;
        }
        const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
        ctx.fillStyle = hasSunset ? shiftSunsetAmberColor(col, sx, y, sunsetPhase) : col;
        ctx.fillRect(x, targetY + stepLift + wingBob, 1, 1);
      }
    }
    return;
  }

  // Side view projection (right or flipped left)
  const flipX = dir === 'left';
  const widthFactor = item.slot === 'hat' ? 1.2 : 1.42;

  for (let y = 0; y < GRID_SIZE; y++) {
    if (!yInBand(y)) continue;
    const targetY = baseY + y;
    if (targetY < 0 || targetY >= 24) continue;
    for (let tx = 0; tx < GRID_SIZE; tx++) {
      const sx = Math.round(7.5 + (tx - 7.5) * widthFactor);
      const col = sampleColor(sx, y);
      if (!col) continue;
      let stepShiftX = 0;
      if (item.slot === 'shoes' && y >= 10 && (frame === 1 || frame === 3)) {
        stepShiftX = tx < 8 ? -1 : 1;
      }
      const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
      const drawX = (flipX ? GRID_SIZE - 1 - tx : tx) + stepShiftX;
      if (drawX < 0 || drawX >= 16) continue;
      ctx.fillStyle = hasSunset ? shiftSunsetAmberColor(col, sx, y, sunsetPhase) : col;
      ctx.fillRect(drawX, targetY + wingBob, 1, 1);
    }
  }
}

export function drawClothingOnMannequin(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  sunsetPhase = 0
) {
  const px = item.pixels;
  const pal = item.palette;
  const hasSunset = item.effect === 'sunset_amber';

  if (item.slot === 'shoes') {
    // Draw wooden cobbler pedestal shelf for shoes
    ctx.fillStyle = '#42210b';
    ctx.fillRect(3, 15, 12, 3);
    ctx.fillStyle = '#c48349';
    ctx.fillRect(4, 16, 10, 1);
  }

  const offsetY = item.slot === 'hat' ? 2 : item.slot === 'shoes' ? 3 : 2;
  for (let y = 0; y < GRID_SIZE; y++) {
    const ty = offsetY + y;
    if (ty < 0 || ty >= 24) continue;
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = px[y * GRID_SIZE + x];
      if (!ch || ch === '.') continue;
      const idx = PALETTE_CODES.indexOf(ch);
      const col = idx >= 0 && idx < pal.length ? pal[idx] : null;
      if (!col) continue;
      ctx.fillStyle = hasSunset ? shiftSunsetAmberColor(col, x, y, sunsetPhase) : col;
      ctx.fillRect(1 + x, ty, 1, 1);
    }
  }
}

export function drawGlowingPearlsSpriteOverlay(
  ctx: CanvasRenderingContext2D,
  items: Array<ClothingItem | null | undefined>,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number,
  drawX: number,
  drawY: number,
  pxScale: number,
  timeSec: number,
  nightAmount: number
) {
  const glowItems = items.filter((it): it is ClothingItem => Boolean(it && it.effect === 'glowing_pearls'));
  if (glowItems.length === 0) return;

  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const intensity = 0.28 + 0.72 * Math.max(0, Math.min(1, nightAmount));

  // Soft pearl night aura halo
  if (nightAmount > 0.12) {
    const cx = drawX + 8 * pxScale;
    const cy = drawY + 12 * pxScale;
    const rad = (11 + nightAmount * 5) * pxScale;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, `rgba(186, 250, 255, ${(0.24 * nightAmount).toFixed(3)})`);
    grad.addColorStop(0.55, `rgba(165, 243, 252, ${(0.1 * nightAmount).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(165, 243, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const item of glowItems) {
    const baseY = getSlotOffsetY(item.slot) + (item.slot === 'shoes' ? 0 : bob);
    const px = item.pixels;
    const pal = item.palette;
    const sample = (sx: number, sy: number): string | null => {
      if (sx < 0 || sx >= GRID_SIZE || sy < 0 || sy >= GRID_SIZE) return null;
      const ch = px[sy * GRID_SIZE + sx];
      if (!ch || ch === '.') return null;
      const idx = PALETTE_CODES.indexOf(ch);
      return idx >= 0 && idx < pal.length ? pal[idx] : null;
    };

    if (dir === 'down' || dir === 'up') {
      const mirror = dir === 'up';
      for (let y = 0; y < GRID_SIZE; y++) {
        const targetY = baseY + y;
        if (targetY < 0 || targetY >= 24) continue;
        for (let x = 0; x < GRID_SIZE; x++) {
          const sx = mirror ? GRID_SIZE - 1 - x : x;
          const col = sample(sx, y);
          if (!col || !isItemPixelGlowing(item, sx, y, col)) continue;
          const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2 + sx * 0.9 + y * 0.7);
          const alpha = Math.min(0.95, intensity * (0.35 + 0.65 * pulse));
          if (alpha < 0.08) continue;
          let stepLift = 0;
          if (item.slot === 'shoes' && y >= 10) {
            if (frame === 1 && x < 8) stepLift = -1;
            else if (frame === 3 && x >= 8) stepLift = -1;
          }
          const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
          ctx.fillStyle = pulse > 0.72 ? `rgba(255, 255, 255, ${alpha.toFixed(2)})` : `rgba(165, 243, 252, ${alpha.toFixed(2)})`;
          ctx.fillRect(drawX + x * pxScale, drawY + (targetY + stepLift + wingBob) * pxScale, pxScale, pxScale);
        }
      }
    } else {
      const flipX = dir === 'left';
      const widthFactor = item.slot === 'hat' ? 1.2 : 1.42;
      for (let y = 0; y < GRID_SIZE; y++) {
        const targetY = baseY + y;
        if (targetY < 0 || targetY >= 24) continue;
        for (let tx = 0; tx < GRID_SIZE; tx++) {
          const sx = Math.round(7.5 + (tx - 7.5) * widthFactor);
          const col = sample(sx, y);
          if (!col || !isItemPixelGlowing(item, sx, y, col)) continue;
          const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2 + sx * 0.9 + y * 0.7);
          const alpha = Math.min(0.95, intensity * (0.35 + 0.65 * pulse));
          if (alpha < 0.08) continue;
          let stepShiftX = 0;
          if (item.slot === 'shoes' && y >= 10 && (frame === 1 || frame === 3)) {
            stepShiftX = tx < 8 ? -1 : 1;
          }
          const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
          const pxX = (flipX ? GRID_SIZE - 1 - tx : tx) + stepShiftX;
          if (pxX < 0 || pxX >= 16) continue;
          ctx.fillStyle = pulse > 0.72 ? `rgba(255, 255, 255, ${alpha.toFixed(2)})` : `rgba(165, 243, 252, ${alpha.toFixed(2)})`;
          ctx.fillRect(drawX + pxX * pxScale, drawY + (targetY + wingBob) * pxScale, pxScale, pxScale);
        }
      }
    }
  }
}

export function drawGlowingPearlsMannequinOverlay(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  drawX: number,
  drawY: number,
  pxScale: number,
  timeSec: number,
  nightAmount: number
) {
  if (item.effect !== 'glowing_pearls') return;
  const intensity = 0.3 + 0.7 * Math.max(0, Math.min(1, nightAmount));
  if (nightAmount > 0.12) {
    const cx = drawX + 9 * pxScale;
    const cy = drawY + 10 * pxScale;
    const rad = (10 + nightAmount * 4) * pxScale;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    grad.addColorStop(0, `rgba(186, 250, 255, ${(0.24 * nightAmount).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(165, 243, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const px = item.pixels;
  const pal = item.palette;
  const offsetY = item.slot === 'hat' ? 2 : item.slot === 'shoes' ? 3 : 2;
  for (let y = 0; y < GRID_SIZE; y++) {
    const ty = offsetY + y;
    if (ty < 0 || ty >= 24) continue;
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = px[y * GRID_SIZE + x];
      if (!ch || ch === '.') continue;
      const idx = PALETTE_CODES.indexOf(ch);
      const col = idx >= 0 && idx < pal.length ? pal[idx] : null;
      if (!col || !isItemPixelGlowing(item, x, y, col)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2 + x * 0.9 + y * 0.7);
      const alpha = Math.min(0.95, intensity * (0.35 + 0.65 * pulse));
      if (alpha < 0.08) continue;
      ctx.fillStyle = pulse > 0.72 ? `rgba(255, 255, 255, ${alpha.toFixed(2)})` : `rgba(165, 243, 252, ${alpha.toFixed(2)})`;
      ctx.fillRect(drawX + (1 + x) * pxScale, drawY + ty * pxScale, pxScale, pxScale);
    }
  }
}

export function drawOutfitAmbientEffects(
  ctx: CanvasRenderingContext2D,
  effects: OutfitEffectType[],
  centerX: number,
  centerY: number,
  pxScale: number,
  timeSec: number,
  mode: 'mannequin' | 'preview' | 'player'
) {
  if (effects.length === 0) return;

  if (effects.includes('starlight_coral')) {
    const count = mode === 'mannequin' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const phase = (timeSec * 1.15 + i * 0.37) % 1;
      const angle = timeSec * 1.4 + i * ((Math.PI * 2) / count);
      const rx = (mode === 'mannequin' ? 6.5 : 8.5) * pxScale;
      const ry = (mode === 'mannequin' ? 7 : 9) * pxScale;
      const sx = Math.round(centerX + Math.cos(angle) * rx);
      const sy = Math.round(centerY + Math.sin(angle * 0.8) * ry - phase * 4 * pxScale);
      const twinkle = Math.sin(phase * Math.PI);
      if (twinkle <= 0.15) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(0.95, twinkle);
      ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#ff8fb1';
      ctx.fillRect(sx - pxScale, sy, pxScale * 3, pxScale);
      ctx.fillRect(sx, sy - pxScale, pxScale, pxScale * 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, pxScale, pxScale);
      ctx.restore();
    }
  }

  if (effects.includes('seafoam_essence')) {
    const count = mode === 'mannequin' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const prog = (timeSec * 0.72 + i * 0.29) % 1;
      const drift = Math.sin(timeSec * 3.1 + i * 2.2) * 4 * pxScale;
      const bx = Math.round(centerX + ((i - 1.5) * 3.5) * pxScale + drift * 0.5);
      const by = Math.round(centerY + 8 * pxScale - prog * 18 * pxScale);
      const alpha = Math.sin(prog * Math.PI) * 0.88;
      if (alpha <= 0.1) continue;
      const bSize = i % 2 === 0 ? Math.max(2, Math.round(pxScale * 1.4)) : Math.max(2, Math.round(pxScale * 1.1));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(bx, by, bSize, bSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, Math.max(1, Math.floor(bSize * 0.5)), Math.max(1, Math.floor(bSize * 0.5)));
      ctx.restore();
    }
  }
}

export function getItemsActiveEffects(items: Array<ClothingItem | null | undefined>): OutfitEffectType[] {
  const seen = new Set<OutfitEffectType>();
  for (const it of items) {
    if (it?.effect) seen.add(it.effect);
  }
  return Array.from(seen);
}

// ============================================================================
// WEATHER & DAY/NIGHT REACTIVE OUTFIT RENDERING (NIGHT NEON, RAIN UMBRELLA/HOOD)
// ============================================================================

function adjustRgb(rgb: [number, number, number], factor: number): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * factor)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * factor)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * factor)));
  return `rgb(${r},${g},${b})`;
}

function mixWithWhite(rgb: [number, number, number], ratio: number): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * ratio)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * ratio)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * ratio)));
  return `rgb(${r},${g},${b})`;
}

export function derivePrimaryItemColor(grid: (string | null)[][]): string {
  const counts = new Map<string, number>();
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const hex = grid[y]?.[x];
      if (!hex) continue;
      const rgb = hexToRgbTuple(hex);
      if (!rgb) continue;
      const luma = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      // Skip very dark outline shades when finding dominant fabric color
      if (luma < 0.18) continue;
      const norm = hex.toLowerCase();
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
  }
  let bestHex = '#3ca3b8';
  let bestCount = 0;
  for (const [h, cnt] of counts.entries()) {
    if (cnt > bestCount) {
      bestCount = cnt;
      bestHex = h;
    }
  }
  return bestHex;
}

export function hasNightNeonItems(items: Array<ClothingItem | null | undefined>): boolean {
  return items.some((it) => Boolean(it?.reactive?.nightNeon?.pixels));
}

export function getActiveRainConfig(
  items: Array<ClothingItem | null | undefined>
): { mode: RainReactiveStyle; color: string } | null {
  // Prioritize umbrella if any equipped item deploys one, otherwise rain hood
  let hoodMatch: { mode: RainReactiveStyle; color: string } | null = null;
  for (const it of items) {
    const rm = it?.reactive?.rainMode;
    if (rm === 'umbrella') {
      return { mode: 'umbrella', color: it?.reactive?.rainColor || '#e26a67' };
    }
    if (rm === 'hood' && !hoodMatch) {
      hoodMatch = { mode: 'hood', color: it?.reactive?.rainColor || '#3ca3b8' };
    }
  }
  return hoodMatch;
}

export function drawNightNeonSpriteOverlay(
  ctx: CanvasRenderingContext2D,
  items: Array<ClothingItem | null | undefined>,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number,
  drawX: number,
  drawY: number,
  pxScale: number,
  timeSec: number,
  nightAmount: number
) {
  if (nightAmount <= 0.12) return;
  const neonItems = items.filter(
    (it): it is ClothingItem => Boolean(it?.reactive?.nightNeon?.pixels)
  );
  if (neonItems.length === 0) return;

  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const intensity = Math.max(0, Math.min(1, (nightAmount - 0.12) / 0.88));

  // Bioluminescent radial halo in the first neon item's color
  const primaryHex = neonItems[0].reactive!.nightNeon!.color || '#00f5d4';
  const primaryRgb = hexToRgbTuple(primaryHex) || [0, 245, 212];
  const cx = drawX + 8 * pxScale;
  const cy = drawY + 12 * pxScale;
  const rad = (12 + intensity * 5) * pxScale;
  const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
  halo.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${(0.32 * intensity).toFixed(3)})`);
  halo.addColorStop(0.55, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${(0.12 * intensity).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();

  for (const item of neonItems) {
    const nn = item.reactive!.nightNeon!;
    const mask = nn.pixels;
    const rgb = hexToRgbTuple(nn.color) || [0, 245, 212];
    const baseY = getSlotOffsetY(item.slot) + (item.slot === 'shoes' ? 0 : bob);

    const isMarked = (sx: number, sy: number): boolean => {
      if (sx < 0 || sx >= GRID_SIZE || sy < 0 || sy >= GRID_SIZE) return false;
      const ch = item.pixels[sy * GRID_SIZE + sx];
      if (!ch || ch === '.') return false;
      return mask[sy * GRID_SIZE + sx] === '1';
    };

    if (dir === 'down' || dir === 'up') {
      const mirror = dir === 'up';
      for (let y = 0; y < GRID_SIZE; y++) {
        const targetY = baseY + y;
        if (targetY < 0 || targetY >= 24) continue;
        for (let x = 0; x < GRID_SIZE; x++) {
          const sx = mirror ? GRID_SIZE - 1 - x : x;
          if (!isMarked(sx, y)) continue;
          const pulse = 0.62 + 0.38 * Math.sin(timeSec * 5.6 + sx * 0.7 + y * 0.6);
          const alpha = Math.min(1, intensity * (0.65 + 0.35 * pulse));
          let stepLift = 0;
          if (item.slot === 'shoes' && y >= 10) {
            if (frame === 1 && x < 8) stepLift = -1;
            else if (frame === 3 && x >= 8) stepLift = -1;
          }
          const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
          const pxX = drawX + x * pxScale;
          const pxY = drawY + (targetY + stepLift + wingBob) * pxScale;
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
          ctx.fillRect(pxX, pxY, pxScale, pxScale);
          if (pulse > 0.85) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.45 * intensity).toFixed(2)})`;
            ctx.fillRect(pxX, pxY, Math.max(1, Math.floor(pxScale * 0.6)), Math.max(1, Math.floor(pxScale * 0.6)));
          }
        }
      }
    } else {
      const flipX = dir === 'left';
      const widthFactor = item.slot === 'hat' ? 1.2 : 1.42;
      for (let y = 0; y < GRID_SIZE; y++) {
        const targetY = baseY + y;
        if (targetY < 0 || targetY >= 24) continue;
        for (let tx = 0; tx < GRID_SIZE; tx++) {
          const sx = Math.round(7.5 + (tx - 7.5) * widthFactor);
          if (!isMarked(sx, y)) continue;
          const pulse = 0.62 + 0.38 * Math.sin(timeSec * 5.6 + sx * 0.7 + y * 0.6);
          const alpha = Math.min(1, intensity * (0.65 + 0.35 * pulse));
          let stepShiftX = 0;
          if (item.slot === 'shoes' && y >= 10 && (frame === 1 || frame === 3)) {
            stepShiftX = tx < 8 ? -1 : 1;
          }
          const wingBob = item.slot === 'shoes' && y < 10 ? bob : 0;
          const rx = (flipX ? GRID_SIZE - 1 - tx : tx) + stepShiftX;
          if (rx < 0 || rx >= 16) continue;
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
          ctx.fillRect(drawX + rx * pxScale, drawY + (targetY + wingBob) * pxScale, pxScale, pxScale);
        }
      }
    }
  }
}

export function drawNightNeonMannequinOverlay(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  drawX: number,
  drawY: number,
  pxScale: number,
  timeSec: number,
  nightAmount: number
) {
  if (nightAmount <= 0.12 || !item.reactive?.nightNeon?.pixels) return;
  const nn = item.reactive.nightNeon;
  const rgb = hexToRgbTuple(nn.color) || [0, 245, 212];
  const intensity = Math.max(0, Math.min(1, (nightAmount - 0.12) / 0.88));

  const cx = drawX + 9 * pxScale;
  const cy = drawY + 10 * pxScale;
  const rad = (10 + intensity * 4) * pxScale;
  const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
  halo.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.3 * intensity).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();

  const offsetY = item.slot === 'hat' ? 2 : item.slot === 'shoes' ? 3 : 2;
  for (let y = 0; y < GRID_SIZE; y++) {
    const ty = offsetY + y;
    if (ty < 0 || ty >= 24) continue;
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = item.pixels[y * GRID_SIZE + x];
      if (!ch || ch === '.') continue;
      if (nn.pixels[y * GRID_SIZE + x] !== '1') continue;
      const pulse = 0.62 + 0.38 * Math.sin(timeSec * 5.6 + x * 0.7 + y * 0.6);
      const alpha = Math.min(1, intensity * (0.65 + 0.35 * pulse));
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
      ctx.fillRect(drawX + (1 + x) * pxScale, drawY + ty * pxScale, pxScale, pxScale);
    }
  }
}

const UMBRELLA_CANOPY: string[] = [
  '.......OO.......',
  '....OOOHHOOO....',
  '..OOHHMMMMDDOO..',
  '.OOHMMMDMMMDDDO.',
  'OOHMMMMDMMMMDDDO',
  'OOMMDDDMMDDDDDDO',
  '.OO..OO..OO..OO.',
];

const RAIN_HOOD_FRONT: string[] = [
  '.....OOOOOO.....',
  '...OOHHHHHHOO...',
  '..OOHMMMMMMHOO..',
  '..OMMOOOOOOMMO..',
  '..OMO......OMO..',
  '..OMO......OMO..',
  '..OMD......DMO..',
  '..OMD......DMO..',
  '..ODDO....ODDO..',
  '..OODDOOOODDOO..',
  '...OOMWDDWMOO...',
  '....OOOOOOOO....',
];

const RAIN_HOOD_BACK: string[] = [
  '.....OOOOOO.....',
  '...OOHHHHHHOO...',
  '..OOHMMMMMMHOO..',
  '..OMMMMMMMMMMO..',
  '..OMMMMMMMMMMO..',
  '..OMMDDDDDDMMO..',
  '..OMDDDDDDDDMO..',
  '..OMDDDDDDDDMO..',
  '..ODDDDDDDDDDO..',
  '..OODDDDDDDDOO..',
  '...OOMMMMMMOO...',
  '....OOOOOOOO....',
];

const RAIN_HOOD_SIDE: string[] = [
  '.....OOOOOO.....',
  '...OOHHHHHHOO...',
  '..OOHMMMMMMHOO..',
  '..OMMMMMOOOMMO..',
  '..OMMMMO...OO...',
  '..OMMMMO........',
  '..OMDDMO........',
  '..OMDDDO........',
  '..ODDDDOO.......',
  '...OODDDDOO.....',
  '....OOMMWMO.....',
  '.....OOOOO......',
];

function drawMatrixAtScale(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  originX: number,
  originY: number,
  pxScale: number,
  flipX = false
) {
  const width = rows[0]?.length || 16;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) continue;
      const rx = flipX ? width - 1 - x : x;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(originX + rx * pxScale, originY + y * pxScale, pxScale, pxScale);
    }
  }
}

export function drawRainReactiveOverlay(
  ctx: CanvasRenderingContext2D,
  items: Array<ClothingItem | null | undefined>,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number,
  drawX: number,
  drawY: number,
  pxScale: number,
  rainIntensity: number
) {
  if (rainIntensity <= 0.18) return;
  const activeRain = getActiveRainConfig(items);
  if (!activeRain) return;

  const rgb = hexToRgbTuple(activeRain.color) || [60, 163, 184];
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const pal: Record<string, string> = {
    O: '#2a1810',
    M: activeRain.color,
    D: adjustRgb(rgb, 0.72),
    H: mixWithWhite(rgb, 0.48),
    W: '#fff7e6',
  };

  ctx.save();
  ctx.globalAlpha = Math.min(1, (rainIntensity - 0.12) / 0.35);

  if (activeRain.mode === 'umbrella') {
    const tiltX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const poleX = dir === 'left' ? 5 : dir === 'right' ? 10 : 11;
    // Wooden handle pole extending from character hand up to canopy
    ctx.fillStyle = '#3b1e0a';
    ctx.fillRect(drawX + poleX * pxScale, drawY + (-5 + bob) * pxScale, pxScale, 17 * pxScale);
    ctx.fillStyle = '#d99a59';
    ctx.fillRect(drawX + poleX * pxScale, drawY + (11 + bob) * pxScale, pxScale * 2, pxScale);
    // Scalloped matching pixel canopy overhead
    drawMatrixAtScale(
      ctx,
      UMBRELLA_CANOPY,
      pal,
      drawX + tiltX * pxScale,
      drawY + (-9 + bob) * pxScale,
      pxScale,
      dir === 'left'
    );
  } else if (activeRain.mode === 'hood') {
    const mat = dir === 'up' ? RAIN_HOOD_BACK : dir === 'down' ? RAIN_HOOD_FRONT : RAIN_HOOD_SIDE;
    drawMatrixAtScale(
      ctx,
      mat,
      pal,
      drawX,
      drawY + (bob) * pxScale,
      pxScale,
      dir === 'left'
    );
  }

  ctx.restore();
}

export function drawRainReactiveMannequinOverlay(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  drawX: number,
  drawY: number,
  pxScale: number,
  rainIntensity: number
) {
  if (rainIntensity <= 0.18 || !item.reactive?.rainMode) return;
  const color = item.reactive.rainColor || '#3ca3b8';
  const rgb = hexToRgbTuple(color) || [60, 163, 184];
  const pal: Record<string, string> = {
    O: '#2a1810',
    M: color,
    D: adjustRgb(rgb, 0.72),
    H: mixWithWhite(rgb, 0.48),
    W: '#fff7e6',
  };

  ctx.save();
  ctx.globalAlpha = Math.min(1, (rainIntensity - 0.12) / 0.35);
  if (item.reactive.rainMode === 'umbrella') {
    ctx.fillStyle = '#3b1e0a';
    ctx.fillRect(drawX + 12 * pxScale, drawY - 3 * pxScale, pxScale, 14 * pxScale);
    drawMatrixAtScale(ctx, UMBRELLA_CANOPY, pal, drawX + 1 * pxScale, drawY - 8 * pxScale, pxScale, false);
  } else if (item.reactive.rainMode === 'hood') {
    drawMatrixAtScale(ctx, RAIN_HOOD_FRONT, pal, drawX + 1 * pxScale, drawY - 1 * pxScale, pxScale, false);
  }
  ctx.restore();
}

const thumbCache = new Map<string, HTMLCanvasElement>();

export function renderClothingThumbnail(item: ClothingItem): HTMLCanvasElement {
  const cacheKey = `${item.slot}|${item.pixels}|${item.palette.join(',')}`;
  const existing = thumbCache.get(cacheKey);
  if (existing) return existing;

  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Find bounding box of painted pixels so hats/shoes/dresses fill the 16x16 card neatly
  let minX = 16;
  let maxX = -1;
  let minY = 16;
  let maxY = -1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = item.pixels[y * 16 + x];
      if (ch && ch !== '.') {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX >= minX && maxY >= minY) {
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const offX = Math.floor((16 - bw) / 2) - minX;
    const offY = Math.floor((16 - bh) / 2) - minY;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const ch = item.pixels[y * 16 + x];
        if (!ch || ch === '.') continue;
        const idx = PALETTE_CODES.indexOf(ch);
        if (idx >= 0 && idx < item.palette.length) {
          ctx.fillStyle = item.palette[idx];
          ctx.fillRect(x + offX, y + offY, 1, 1);
        }
      }
    }
  }

  thumbCache.set(cacheKey, c);
  return c;
}

// ============================================================================
// STARTER ITEMS (OWNED ON JOIN)
// ============================================================================

export function createStarterClothingItems(): {
  dress: ClothingItem;
  hat: ClothingItem;
  shoes: ClothingItem;
  top: ClothingItem;
  bottom: ClothingItem;
} {
  const dress = makeItemFromAscii({
    uid: generateItemUid('st_drs'),
    name: 'Coral Sundress',
    slot: 'dress',
    creatorName: 'Coral Cove',
    source: 'starter',
    stats: { speedPct: 5, harvestBonus: 0, seaRes: 0 },
    legend: {
      O: '#4a1d1c',
      M: '#e26a67',
      D: '#b54543',
      L: '#f79c99',
      T: '#fff3e0',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '....OO....OO....',
      '....OMOOOOOMO...',
      '....OMLTTMMLO...',
      '....OMMMMMMMO...',
      '....ODDDDDDDO...',
      '...OOMMMMMMMOO..',
      '..OMMMDDDDDMMMO.',
      '..OMDDDDDDDDDMO.',
      '..OTTTTTTTTTTTO.',
      '...OOOOOOOOOOO..',
      '................',
      '................',
    ],
  });

  const hat = makeItemFromAscii({
    uid: generateItemUid('st_hat'),
    name: 'Straw Sunhat',
    slot: 'hat',
    creatorName: 'Coral Cove',
    source: 'starter',
    stats: { speedPct: 5, harvestBonus: 0, seaRes: 0 },
    legend: {
      O: '#4d3015',
      Y: '#f2d079',
      S: '#cfa048',
      R: '#e05c5c',
    },
    rows: [
      '....OOOOOOOO....',
      '...OYYYYYYYYO...',
      '...ORRRRRRRRO...',
      'OOOOOOOOOOOOOOOO',
      'OYYYYYYYYSSSSSSO',
      '.OOOOOOOOOOOOOO.',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  });

  const shoes = makeItemFromAscii({
    uid: generateItemUid('st_sho'),
    name: 'Woven Sandals',
    slot: 'shoes',
    creatorName: 'Coral Cove',
    source: 'starter',
    stats: { speedPct: 5, harvestBonus: 0, seaRes: 0 },
    legend: {
      O: '#422414',
      M: '#c98a4b',
      D: '#8c5828',
      T: '#f5d7a1',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....OTTOOTTO....',
      '....OMMOOMMO....',
      '....ODDOODDO....',
      '....OOOOOOOO....',
    ],
  });

  const top = makeItemFromAscii({
    uid: generateItemUid('st_top'),
    name: 'Sailor Tee',
    slot: 'top',
    creatorName: 'Coral Cove',
    source: 'starter',
    stats: { speedPct: 5, harvestBonus: 1, seaRes: 0 },
    legend: {
      O: '#1e2c42',
      W: '#ffffff',
      B: '#4684c4',
      D: '#2b5d94',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '...OOOWWWWOOO...',
      '..OWWOBBBBOWWO..',
      '..OWWOBWWBOWWO..',
      '..OOOWWWWWWO.O..',
      '....OBBBBBBO....',
      '....ODDDDDDO....',
      '....OOOOOOOO....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  });

  const bottom = makeItemFromAscii({
    uid: generateItemUid('st_btm'),
    name: 'Lagoon Shorts',
    slot: 'bottom',
    creatorName: 'Coral Cove',
    source: 'starter',
    stats: { speedPct: 5, harvestBonus: 0, seaRes: 1 },
    legend: {
      O: '#1e2c42',
      M: '#3ca3b8',
      D: '#246e82',
      T: '#ffe8b3',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....OOOOOOOO....',
      '....OTTTTTTO....',
      '....OMMMMMMO....',
      '....OMDOODMO....',
      '....ODDOODDO....',
      '....OOOOOOOO....',
      '................',
      '................',
    ],
  });

  return { dress, hat, shoes, top, bottom };
}

export { LUXURY_CATALOG_ITEMS as LUXURY_CATALOG } from './luxuryCatalog';

// ============================================================================
// RIVAL BOUTIQUE ITEMS (SARA & LINA)
// ============================================================================

export const RIVAL_ITEMS = {
  lina_coat: makeItemFromAscii({
    uid: 'rival_lina_coat',
    name: 'Deep-Sea Mariner Coat',
    slot: 'dress',
    creatorName: 'Lina',
    source: 'boutique',
    stats: { speedPct: 15, harvestBonus: 1, seaRes: 2 },
    legend: {
      O: '#182238',
      B: '#2e497a',
      L: '#577ec4',
      G: '#f5c542',
      W: '#ffffff',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '...OOGWWWWGOO...',
      '..OBBOWGGBOBBO..',
      '..OBBOWWWBOBBO..',
      '..OBBGGGGGGGBO..',
      '..OOBBBBBBBBOO..',
      '..OBBLLBBLLBBO..',
      '..OBBBBBBBBBBO..',
      '..OGGGGGGGGGGO..',
      '...OOOOOOOOOO...',
      '................',
      '................',
      '................',
    ],
  }),
  lina_hat: makeItemFromAscii({
    uid: 'rival_lina_hat',
    name: 'Admiral Tide Hat',
    slot: 'hat',
    creatorName: 'Lina',
    source: 'boutique',
    stats: { speedPct: 10, harvestBonus: 1, seaRes: 2 },
    legend: {
      O: '#182238',
      B: '#2c4678',
      L: '#486cb0',
      G: '#f5c542',
    },
    rows: [
      '................',
      '...OOOOOOOOOO...',
      '..OBBGGGGGGGBO..',
      '.OBBBLLLLLLBBBO.',
      '..OOOOOOOOOOOO..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  }),
  sara_gown: makeItemFromAscii({
    uid: 'rival_sara_gown',
    name: 'Siren Tide Gown',
    slot: 'dress',
    creatorName: 'Sara',
    source: 'boutique',
    stats: { speedPct: 20, harvestBonus: 0, seaRes: 2 },
    legend: {
      O: '#14453d',
      M: '#2a9d8f',
      L: '#7de3d4',
      T: '#ffefc2',
    },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '...OOTTTTTTOO...',
      '..OMLOMMMOLMO...',
      '..OMMOTTTOMMO...',
      '...OOMLLLLMOO...',
      '...OMMMMMMMMO...',
      '..OMMTTTTTTMMO..',
      '..OMLLLLLLLLMO..',
      '..OTTTTTTTTTTO..',
      '...OOOOOOOOOO...',
      '................',
      '................',
      '................',
    ],
  }),
  sara_beret: makeItemFromAscii({
    uid: 'rival_sara_beret',
    name: 'Seashell Beret',
    slot: 'hat',
    creatorName: 'Sara',
    source: 'boutique',
    stats: { speedPct: 10, harvestBonus: 1, seaRes: 1 },
    legend: {
      O: '#5c2638',
      P: '#f28aa8',
      L: '#ffc2d4',
      D: '#c45e7b',
      W: '#ffffff',
    },
    rows: [
      '................',
      '....OOOOOOOO....',
      '...OPLLLLLLPO...',
      '..OPPPPPPWPPPO..',
      '...ODDDDDDDDO...',
      '....OOOOOOOO....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  }),
};
