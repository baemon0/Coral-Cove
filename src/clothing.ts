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
  type ClothingSlot,
  type ClothingSource,
  type GearStats,
  type ClothingItem,
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
  type ClothingSlot,
  type ClothingSource,
  type GearStats,
  type ClothingItem,
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

/**
 * Draws a ClothingItem onto a 16x24 character sprite canvas, handling
 * walking bob/step and clean 4-direction projection (down, up, left, right).
 */
export function drawClothingItemOnSprite(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number,
  rowBand: 'all' | 'wings' | 'feet' = 'all'
) {
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const baseY = getSlotOffsetY(item.slot) + (item.slot === 'shoes' ? 0 : bob);
  const px = item.pixels;
  const pal = item.palette;

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
        ctx.fillStyle = col;
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
      ctx.fillStyle = col;
      ctx.fillRect(drawX, targetY + wingBob, 1, 1);
    }
  }
}

export function drawClothingOnMannequin(
  ctx: CanvasRenderingContext2D,
  item: ClothingItem
) {
  const px = item.pixels;
  const pal = item.palette;

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
      ctx.fillStyle = col;
      ctx.fillRect(1 + x, ty, 1, 1);
    }
  }
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
