export type ClothingSlot = 'hat' | 'top' | 'bottom' | 'dress' | 'shoes';
export type ClothingSource = 'starter' | 'custom' | 'luxury' | 'boutique';
export type EditionTier = 'unique' | 'limited' | 'standard';
export type PetKind =
  | 'calico'
  | 'tabby'
  | 'puppy'
  | 'bunny'
  | 'fox'
  | 'panda'
  | 'parrot'
  | 'otter'
  | 'axolotl'
  | 'dragon';

export type BoatKind = 'rowboat' | 'sailboat' | 'swan' | 'skiff';

export interface BoatCatalogEntry {
  kind: BoatKind;
  name: string;
  price: number;
  speedMult: number;
  tagline: string;
  perkLabel: string;
}

export interface PetCatalogEntry {
  kind: PetKind;
  name: string;
  price: number;
  tagline: string;
  animationStyle: 'trot' | 'hop' | 'flutter' | 'waddle';
}

export interface GearStats {
  speedPct: number;
  harvestBonus: number;
  seaRes: number;
}

export interface ClothingItem {
  uid: string;
  name: string;
  slot: ClothingSlot;
  creatorName: string;
  source: ClothingSource;
  palette: string[];
  pixels: string; // 256 chars (16x16), '.' = transparent, PALETTE_CODES[idx] = hex color
  stats: GearStats;
  editionId?: string;
  editionSerial?: number;
  editionTotal?: number;
  editionTier?: EditionTier;
}

export function formatEditionBadge(item: Pick<ClothingItem, 'editionSerial' | 'editionTotal'>): string | null {
  if (!item.editionTotal || !item.editionSerial) return null;
  return `#${item.editionSerial}/${item.editionTotal}`;
}

export const GRID_SIZE = 16;
export const PALETTE_CODES = 'abcdefghijklmnopqrstuvwxyz012345';

export const TILE_SIZE = 16;
export const PIXEL_SCALE = 3;
export const MAP_COLS = 160;
export const MAP_ROWS = 120;

export type ShopTier = 1 | 2 | 3 | 4;

export interface ShopTierSpec {
  tier: ShopTier;
  name: string;
  cols: number;
  rows: number;
  upgradeCost: number;
  perkSummary: string;
}

export const SHOP_TIER_CONFIGS: ShopTierSpec[] = [
  {
    tier: 1,
    name: 'Starter Stall',
    cols: 4,
    rows: 3,
    upgradeCost: 0,
    perkSummary: 'Cozy 4×3 open-front timber stall with twin lanterns.',
  },
  {
    tier: 2,
    name: 'Cozy Boutique',
    cols: 6,
    rows: 4,
    upgradeCost: 1500,
    perkSummary: 'Spacious 6×4 shop floor with triple display windows.',
  },
  {
    tier: 3,
    name: 'Grand Fashion House',
    cols: 8,
    rows: 5,
    upgradeCost: 4000,
    perkSummary: 'Expansive 8×5 salon with gold-trimmed curtains & extra warm lanterns.',
  },
  {
    tier: 4,
    name: 'Royal Fashion Palace',
    cols: 10,
    rows: 6,
    upgradeCost: 10000,
    perkSummary: 'Grand 10×6 flagship with royal red carpet, VIP sign & luxury pillars.',
  },
];

export function clampShopTier(tier: unknown): ShopTier {
  const n = Math.floor(Number(tier) || 1);
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

export function getShopTierSpec(tier: unknown): ShopTierSpec {
  const clamped = clampShopTier(tier);
  return SHOP_TIER_CONFIGS[clamped - 1];
}

export const SLOT_LABELS: Record<ClothingSlot, string> = {
  hat: 'Hat / Head',
  top: 'Top / Shirt',
  bottom: 'Bottom / Skirt',
  dress: 'Full Dress',
  shoes: 'Shoes',
};

export const DESIGN_FABRIC_COST: Record<ClothingSlot, number> = {
  hat: 1,
  shoes: 1,
  top: 2,
  bottom: 2,
  dress: 2,
};

export const DESIGN_SLOT_STATS: Record<ClothingSlot, GearStats> = {
  hat: { speedPct: 5, harvestBonus: 1, seaRes: 0 },
  top: { speedPct: 10, harvestBonus: 0, seaRes: 0 },
  bottom: { speedPct: 5, harvestBonus: 1, seaRes: 0 },
  dress: { speedPct: 10, harvestBonus: 1, seaRes: 1 },
  shoes: { speedPct: 10, harvestBonus: 0, seaRes: 0 },
};

export const DESIGN_PALETTE: string[] = [
  '#26140e', // Dark Cocoa Outline
  '#111827', // Deep Obsidian
  '#ffffff', // Pure White
  '#f5e6c8', // Warm Cream
  '#e26a67', // Coral Rose
  '#ff8fb1', // Sakura Pink
  '#c9345a', // Crimson Berry
  '#eb8c38', // Tangerine Gold
  '#ffd23f', // Sunbeam Yellow
  '#66a868', // Meadow Sage
  '#3f8f3b', // Forest Emerald
  '#5eead4', // Seafoam Aqua
  '#3ca3b8', // Lagoon Teal
  '#4684c4', // Ocean Blue
  '#1e3a8a', // Royal Midnight
  '#9b7ede', // Soft Lavender
  '#7c3aed', // Royal Amethyst
  '#a86732', // Warm Cedar
  '#6b3c1b', // Chestnut Wood
  '#9ca3af', // Silver Mist
  '#00f5d4', // Cyber Neon Cyan
  '#ff2a85', // Cyber Neon Magenta
  '#b8f2fc', // Crystal Ice
  '#fde047', // Starlight Spark
];

export function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));
}

export function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map((row) => [...row]);
}

export function generateItemUid(prefix = 'itm'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function encodeGridToItemData(grid: (string | null)[][]): {
  palette: string[];
  pixels: string;
} {
  const palette: string[] = [];
  const colorToCode = new Map<string, string>();
  let pixels = '';

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const col = grid[y]?.[x];
      if (!col) {
        pixels += '.';
        continue;
      }
      const norm = col.toLowerCase();
      let code = colorToCode.get(norm);
      if (!code) {
        if (palette.length >= PALETTE_CODES.length) {
          code = PALETTE_CODES[0];
        } else {
          code = PALETTE_CODES[palette.length];
          palette.push(norm);
          colorToCode.set(norm, code);
        }
      }
      pixels += code;
    }
  }

  if (palette.length === 0) {
    palette.push('#26140e');
  }

  return { palette, pixels };
}

export function decodeItemToGrid(item: Pick<ClothingItem, 'palette' | 'pixels'>): (string | null)[][] {
  const grid = createEmptyGrid();
  const px = item.pixels || '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = px[y * GRID_SIZE + x];
      if (!ch || ch === '.') continue;
      const idx = PALETTE_CODES.indexOf(ch);
      if (idx >= 0 && idx < item.palette.length) {
        grid[y][x] = item.palette[idx];
      }
    }
  }
  return grid;
}

export function countPaintedPixels(grid: (string | null)[][]): number {
  let count = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y]?.[x]) count++;
    }
  }
  return count;
}

export function makeItemFromAscii(cfg: {
  uid: string;
  name: string;
  slot: ClothingSlot;
  creatorName: string;
  source: ClothingSource;
  rows: string[];
  legend: Record<string, string>;
  stats: GearStats;
}): ClothingItem {
  const grid = createEmptyGrid();
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = cfg.rows[y] || '';
    for (let x = 0; x < GRID_SIZE; x++) {
      const ch = row[x];
      if (ch && ch !== '.' && cfg.legend[ch]) {
        grid[y][x] = cfg.legend[ch];
      }
    }
  }
  const { palette, pixels } = encodeGridToItemData(grid);
  return {
    uid: cfg.uid,
    name: cfg.name,
    slot: cfg.slot,
    creatorName: cfg.creatorName,
    source: cfg.source,
    palette,
    pixels,
    stats: cfg.stats,
  };
}
