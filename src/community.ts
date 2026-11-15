import {
  PIXEL_SCALE,
  type BoatCatalogEntry,
  type BoatKind,
  type ClothingItem,
  type ClothingSlot,
  type PetCatalogEntry,
  type PetKind,
} from './constants';

// ============================================================================
// DYNAMIC ISLAND FASHION TRENDS (10-MINUTE DETERMINISTIC ROTATION)
// ============================================================================

export type ColorFamily = 'blue' | 'pink' | 'gold' | 'teal' | 'red' | 'green' | 'purple';

export interface FashionTrend {
  id: string;
  label: string;
  shortLabel: string;
  colorFamily: ColorFamily;
  slots: ClothingSlot[];
  keywords: string[];
  accentBg: string;
  accentText: string;
}

export const TREND_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const FASHION_TRENDS: FashionTrend[] = [
  {
    id: 'ocean_pirate',
    label: 'Ocean Blue & Pirate Hats',
    shortLabel: 'Blue / Pirate Hats',
    colorFamily: 'blue',
    slots: ['hat'],
    keywords: ['pirate', 'tricorn', 'captain', 'admiral', 'sailor', 'navy', 'blue', 'ocean', 'lagoon', 'sapphire'],
    accentBg: '#dbeafe',
    accentText: '#1e3a8a',
  },
  {
    id: 'sakura_gowns',
    label: 'Sakura Pink & Silk Dresses',
    shortLabel: 'Pink / Silk Dresses',
    colorFamily: 'pink',
    slots: ['dress'],
    keywords: ['pink', 'sakura', 'rose', 'blossom', 'petal', 'gown', 'dress', 'lolita', 'coral', 'strawberry'],
    accentBg: '#fce7f3',
    accentText: '#9d174d',
  },
  {
    id: 'royal_gold',
    label: 'Royal Gold & Crowns',
    shortLabel: 'Gold / Crowns',
    colorFamily: 'gold',
    slots: ['hat', 'dress'],
    keywords: ['gold', 'golden', 'royal', 'crown', 'tiara', 'halo', 'queen', 'king', 'sun', 'star'],
    accentBg: '#fef3c7',
    accentText: '#92400e',
  },
  {
    id: 'seafoam_reef',
    label: 'Seafoam Aqua & Reef Gear',
    shortLabel: 'Aqua / Reef Gear',
    colorFamily: 'teal',
    slots: ['dress', 'shoes'],
    keywords: ['aqua', 'teal', 'seafoam', 'mermaid', 'reef', 'pearl', 'shell', 'wave', 'siren'],
    accentBg: '#ccfbf1',
    accentText: '#115e59',
  },
  {
    id: 'crimson_coats',
    label: 'Crimson Berry & Jackets',
    shortLabel: 'Crimson / Jackets',
    colorFamily: 'red',
    slots: ['top'],
    keywords: ['crimson', 'ruby', 'red', 'berry', 'velvet', 'jacket', 'coat', 'cape', 'flame', 'mariner'],
    accentBg: '#fee2e2',
    accentText: '#991b1b',
  },
  {
    id: 'emerald_meadow',
    label: 'Emerald Meadow & Skirts',
    shortLabel: 'Emerald / Skirts',
    colorFamily: 'green',
    slots: ['bottom', 'hat'],
    keywords: ['emerald', 'forest', 'meadow', 'green', 'leaf', 'vine', 'clover', 'fairy', 'jade', 'skirt'],
    accentBg: '#dcfce7',
    accentText: '#166534',
  },
  {
    id: 'amethyst_witch',
    label: 'Amethyst Violet & Witch Hats',
    shortLabel: 'Violet / Witch Hats',
    colorFamily: 'purple',
    slots: ['hat', 'dress'],
    keywords: ['amethyst', 'violet', 'purple', 'witch', 'moon', 'galaxy', 'mystic', 'lavender', 'nebula'],
    accentBg: '#f3e8ff',
    accentText: '#6b21a8',
  },
  {
    id: 'neon_wings',
    label: 'Cyber Neon & Winged Shoes',
    shortLabel: 'Neon / Wings',
    colorFamily: 'teal',
    slots: ['shoes', 'top'],
    keywords: ['cyber', 'neon', 'wings', 'winged', 'boots', 'sandals', 'angel', 'butterfly', 'laser'],
    accentBg: '#cffafe',
    accentText: '#155e75',
  },
];

export function getCurrentFashionTrend(nowMs = Date.now()): {
  trend: FashionTrend;
  periodIndex: number;
  msRemaining: number;
  formattedTime: string;
} {
  const periodIndex = Math.floor(nowMs / TREND_DURATION_MS);
  const trend = FASHION_TRENDS[periodIndex % FASHION_TRENDS.length];
  const msRemaining = Math.max(0, (periodIndex + 1) * TREND_DURATION_MS - nowMs);
  const totalSec = Math.ceil(msRemaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
  return { trend, periodIndex, msRemaining, formattedTime };
}

function classifyHexColor(hex: string): ColorFamily | null {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (max < 0.14 || d < 0.12) return null; // ignore outlines, whites, grays

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  h = (h + 360) % 360;

  if (h >= 340 || h < 18) return max > 0.78 && min > 0.35 ? 'pink' : 'red';
  if (h >= 18 && h < 62) return 'gold';
  if (h >= 62 && h < 155) return 'green';
  if (h >= 155 && h < 195) return 'teal';
  if (h >= 195 && h < 252) return 'blue';
  if (h >= 252 && h < 305) return 'purple';
  return 'pink';
}

export function doesItemMatchTrend(item: ClothingItem | null | undefined, trend: FashionTrend): boolean {
  if (!item) return false;
  const lower = item.name.toLowerCase();
  if (trend.keywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  const slotMatches = trend.slots.includes(item.slot);
  let matchingColorCount = 0;
  for (const hex of item.palette) {
    if (classifyHexColor(hex) === trend.colorFamily) {
      matchingColorCount++;
    }
  }
  if (matchingColorCount >= 2) return true;
  if (slotMatches && matchingColorCount >= 1) return true;
  return false;
}

// ============================================================================
// COMPANION PETS CATALOG & PIXEL-ART SPRITES
// ============================================================================

export const PET_CATALOG: PetCatalogEntry[] = [
  {
    kind: 'calico',
    name: 'Calico Cat',
    price: 250,
    tagline: 'Cream-white kitty with cozy ginger and cocoa calico patches.',
    animationStyle: 'trot',
  },
  {
    kind: 'tabby',
    name: 'Orange Tabby',
    price: 280,
    tagline: 'Sun-kissed striped tabby cat with a playful swishing tail.',
    animationStyle: 'trot',
  },
  {
    kind: 'puppy',
    name: 'Island Puppy',
    price: 350,
    tagline: 'Bouncy golden-eared pup that wags its tail all down the dock.',
    animationStyle: 'trot',
  },
  {
    kind: 'bunny',
    name: 'White Bunny',
    price: 400,
    tagline: 'Fluffy snow-white bunny with tall pink ears and springy hops.',
    animationStyle: 'hop',
  },
  {
    kind: 'fox',
    name: 'Red Fox',
    price: 550,
    tagline: 'Clever russet island fox with a cloud-soft white-tipped tail.',
    animationStyle: 'trot',
  },
  {
    kind: 'panda',
    name: 'Baby Panda',
    price: 700,
    tagline: 'Roly-poly bamboo-loving panda cub with an adorable waddle.',
    animationStyle: 'waddle',
  },
  {
    kind: 'parrot',
    name: 'Blue Parrot',
    price: 850,
    tagline: 'Tropical sapphire macaw that flutters happily beside your shoulder.',
    animationStyle: 'flutter',
  },
  {
    kind: 'otter',
    name: 'Sea Otter',
    price: 1000,
    tagline: 'Friendly harbor otter clutching its lucky pink reef pearl.',
    animationStyle: 'waddle',
  },
  {
    kind: 'axolotl',
    name: 'Pink Axolotl',
    price: 1300,
    tagline: 'Smiling pastel lagoon axolotl with frilly coral-magenta gills.',
    animationStyle: 'waddle',
  },
  {
    kind: 'dragon',
    name: 'Mini Dragon',
    price: 2000,
    tagline: 'Tiny emerald-and-gold sea dragon fluttering with cozy ember sparks.',
    animationStyle: 'flutter',
  },
];

export const BOAT_PRICE = 300;

export const BOAT_CATALOG: BoatCatalogEntry[] = [
  {
    kind: 'rowboat',
    name: 'Classic Wooden Rowboat',
    price: 300,
    speedMult: 1.85,
    tagline: 'Handcrafted cedar rowboat with twin wooden oars for coastal sailing.',
    perkLabel: '1.85× Ocean Speed',
  },
  {
    kind: 'sailboat',
    name: 'Painted Sailboat',
    price: 1200,
    speedMult: 2.25,
    tagline: 'Breezy coastal sloop topped with a crisp white & blossom-pink sail.',
    perkLabel: '2.25× Speed · Cute Sail',
  },
  {
    kind: 'swan',
    name: 'Swan Pedal Boat',
    price: 2500,
    speedMult: 2.45,
    tagline: 'Sculpted luxury swan cruiser that trails heart sparkles on the waves.',
    perkLabel: '2.45× Speed · Heart Sparkles',
  },
  {
    kind: 'skiff',
    name: 'Pirate / Royal Speed Skiff',
    price: 5000,
    speedMult: 2.95,
    tagline: 'Gold-trimmed mahogany interceptor built for Deep-Sea Reef expeditions.',
    perkLabel: '2.95× Speed · Reef Luck +1 Yield',
  },
];

export function getBoatCatalogEntry(kind?: BoatKind | null): BoatCatalogEntry {
  return BOAT_CATALOG.find((b) => b.kind === kind) || BOAT_CATALOG[0];
}

export const QUICK_EMOTES = ['❤️', '👍', '💸', '✨'] as const;

const petSpriteCache = new Map<string, HTMLCanvasElement>();

function makeTinyCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function paintRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  pal: Record<string, string>,
  ox = 0,
  oy = 0,
  flipX = false
) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + (flipX ? row.length - 1 - x : x), oy + y, 1, 1);
    }
  }
}

export function normalizePetKind(raw?: string | null): PetKind | null {
  if (!raw) return null;
  if (raw === 'cat') return 'tabby';
  if (raw === 'seagull') return 'parrot';
  if (raw === 'crab') return 'otter';
  const match = PET_CATALOG.find((p) => p.kind === raw);
  return match ? match.kind : null;
}

export function renderPetSprite(
  rawKind: PetKind | string,
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number
): HTMLCanvasElement {
  const kind = normalizePetKind(rawKind) || 'calico';
  const step = frame % 2;
  const key = `v2|${kind}|${dir}|${step}`;
  const cached = petSpriteCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeTinyCanvas(14, 14);
  const flipX = dir === 'left';

  if (kind === 'calico') {
    const pal = {
      O: '#3b1e0d',
      W: '#fffaf0',
      G: '#f29446',
      B: '#59331e',
      E: '#1c120d',
      P: '#ff94ad',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '..OO......OO..',
            '.OGBO....OWWO.',
            '.OGGOOOOOOWWO.',
            '.OGGWWWWWWBBO.',
            '.OWEWWPPWWBEO.',
            '.OWWWWWWWWBBO.',
            '..OOWWWWWWOO..',
            '..OWWGGWWWBOO.',
            '..OWGGGGWWBOGO',
            '..OWWWWWBBBOGO',
            '..OOWWOOOBBO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..............',
            '..OO......OO..',
            '.OGBO....OWWO.',
            '.OGGOOOOOOWWO.',
            '.OGGWWWWWWBBO.',
            '.OWEWWPPWWBEO.',
            '.OWWWWWWWWBBO.',
            '..OOWWWWWWOO..',
            '..OWWGGWWWBOOO',
            '..OWGGGGWWBOGO',
            '..OWWWWWBBBO..',
            '...OOWWOOBBO..',
            '....OO...OO...',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'tabby') {
    const pal = {
      O: '#3b1e0d',
      B: '#f29e5a',
      D: '#cf6d2b',
      W: '#fff4de',
      E: '#1f140e',
      P: '#ff9eb5',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '..OO......OO..',
            '.OBBO....OBBO.',
            '.OBDOOOOOODBO.',
            '.OBBDDBBBDDBO.',
            '.OBEBBPPBBEBO.',
            '.OBBBWWWWBBBO.',
            '..OOBBBBBBOO..',
            '..OBDWWWWDBOO.',
            '..OBBWWWWBBOBO',
            '..OBDWWWWDBOOO',
            '..OOBBOOOBBO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..............',
            '..OO......OO..',
            '.OBBO....OBBO.',
            '.OBDOOOOOODBO.',
            '.OBBDDBBBDDBO.',
            '.OBEBBPPBBEBO.',
            '.OBBBWWWWBBBO.',
            '..OOBBBBBBOO..',
            '..OBDWWWWDBOOO',
            '..OBBWWWWBBOBO',
            '..OBDWWWWDBO..',
            '...OOBBOOBBO..',
            '....OO...OO...',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'puppy') {
    const pal = {
      O: '#3d210d',
      Y: '#f2c16b',
      D: '#b56e32',
      W: '#fff4d6',
      E: '#1c120b',
      N: '#2b160d',
      R: '#e35664',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '..OOO....OOO..',
            '.ODDDOOOODDD..',
            '.ODYYYYYYYYDO.',
            '.ODEYYYNYYEDO.',
            '.OOYYYYYYYYOO.',
            '..OOWWWWWWO...',
            '..OORRRRRRO...',
            '..OYYYYYYYYOO.',
            '..OYYWWWWYYOYO',
            '..OYYYYYYYYOO.',
            '..OOYYOOYYOO..',
            '...OO...OO....',
            '..............',
          ]
        : [
            '..............',
            '..OOO....OOO..',
            '.ODDDOOOODDD..',
            '.ODYYYYYYYYDO.',
            '.ODEYYYNYYEDO.',
            '.OOYYYYYYYYOO.',
            '..OOWWWWWWO...',
            '..OORRRRRRO...',
            '..OYYYYYYYYOYO',
            '..OYYWWWWYYOOO',
            '..OYYYYYYYOO..',
            '...OOYYOOYYO..',
            '....OO...OO...',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'bunny') {
    const pal = {
      O: '#4d3a42',
      W: '#ffffff',
      S: '#e2e8f0',
      P: '#ffa6c1',
      E: '#261420',
    };
    const rows =
      step === 0
        ? [
            '...OO....OO...',
            '..OWPO..OWPO..',
            '..OWPO..OWPO..',
            '..OWWOOOOWWO..',
            '..OWWWWWWWWO..',
            '..OWEWWPWEWO..',
            '..OWWWWWWWWO..',
            '...OOWWWWOO...',
            '..OWWWWWWWWO..',
            '.OOWWWSSWWWO..',
            '.OWWWWWWWWWOO.',
            '..OOWWOOOWWO..',
            '...OOO...OOO..',
            '..............',
          ]
        : [
            '..OO....OO....',
            '.OWPO..OWPO...',
            '.OWPO..OWPO...',
            '..OWWOOOOWWO..',
            '..OWWWWWWWWO..',
            '..OWEWWPWEWO..',
            '..OWWWWWWWWO..',
            '...OOWWWWOO...',
            '..OWWWWWWWWO..',
            '.OOWWWSSWWWO..',
            '..OOWWWWWWOO..',
            '...OOOWWOOO...',
            '....OO..OO....',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'fox') {
    const pal = {
      O: '#3b1c0a',
      F: '#e8762c',
      L: '#ffa45b',
      W: '#fff7e6',
      E: '#1e130c',
      N: '#2b160a',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '.OO.......OO..',
            '.OFO.....OFO..',
            '.OFFOOOOOFFO..',
            '.OFFFFFFFFFO..',
            '.OFEFFNFFEFO..',
            '.OWWWFFFWWWO..',
            '..OOWWWWWOO...',
            '..OFFFFFFFOWO.',
            '..OFFFFWWFFWWO',
            '..OFFFFFFFOWO.',
            '..OOFFOOOFFO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..............',
            '.OO.......OO..',
            '.OFO.....OFO..',
            '.OFFOOOOOFFO..',
            '.OFFFFFFFFFO..',
            '.OFEFFNFFEFO..',
            '.OWWWFFFWWWO..',
            '..OOWWWWWOO...',
            '..OFFFFFFFOWO.',
            '..OFFFFWWFFWWO',
            '...OFFFFFFOWO.',
            '...OOFFOOFFO..',
            '....OO...OO...',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'panda') {
    const pal = {
      O: '#1c1d24',
      B: '#282936',
      W: '#ffffff',
      S: '#dbe2eb',
      P: '#ffa3b8',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '..OOO....OOO..',
            '.OBBBOOOOBBBO.',
            '.OBWWWWWWWWBO.',
            '.OWWBWWWWBWWO.',
            '.OWWBWPPWBWWO.',
            '..OWWWWWWWWO..',
            '..OOBBBBBBOO..',
            '.OBBWWWWWWBBO.',
            '.OBBWWWWWWBBO.',
            '..OOBBBBBBOO..',
            '..OBBO..OBBO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..............',
            '..OOO....OOO..',
            '.OBBBOOOOBBBO.',
            '.OBWWWWWWWWBO.',
            '.OWWBWWWWBWWO.',
            '.OWWBWPPWBWWO.',
            '..OWWWWWWWWO..',
            '..OOBBBBBBOO..',
            '.OBBWWWWWWBBO.',
            '..OBWWWWWWBBO.',
            '..OOBBBBBBOO..',
            '...OBBOOBBO...',
            '....OO..OO....',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'parrot') {
    const pal = {
      O: '#192a45',
      B: '#2b8ce8',
      C: '#63d2ff',
      Y: '#ffd23f',
      W: '#ffffff',
      E: '#111827',
      G: '#40b878',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '....OOOOO.....',
            '...OBBBBBO....',
            '..OBBWEWYYO...',
            '..OBBBWYYYO...',
            '...OOBBBBO....',
            '..OOBCCCCOO...',
            '.OCBBBBBBCCO..',
            '.OBGGGGGGGBO..',
            '..OOBBBBBOO...',
            '...OBBO.OY.OY.',
            '..OBO...OO.OO.',
            '..............',
            '..............',
          ]
        : [
            '..............',
            '....OOOOO.....',
            '...OBBBBBO....',
            '..OBBWEWYYO...',
            '..OBBBWYYYO...',
            '.OOOBBBBBOOOO.',
            'OCCCBBBBBBCCCO',
            '.OOBBBBBBBBOO.',
            '..OOGGGGGGOO..',
            '...OOBBBBOO...',
            '...OBBO.OY..OY',
            '..OBO...OO..OO',
            '..............',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'otter') {
    const pal = {
      O: '#361f12',
      B: '#8c583a',
      L: '#bd8562',
      W: '#f7e4c6',
      E: '#1c110a',
      P: '#ffa8c5',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '..OO......OO..',
            '.OBOOOOOOOOOBO',
            '.OBBBBBBBBBBO.',
            '.OBEWWBBWWEBO.',
            '.OBWWWOOWWWBO.',
            '..OOWWWWWWO...',
            '..OBWWWWWWBO..',
            '..OBWPPPWWBOO.',
            '..OBWWWWWWBBO.',
            '..OOBBBBBBOOO.',
            '..OOLLOOLLOO..',
            '..............',
            '..............',
          ]
        : [
            '..............',
            '..OO......OO..',
            '.OBOOOOOOOOOBO',
            '.OBBBBBBBBBBO.',
            '.OBEWWBBWWEBO.',
            '.OBWWWOOWWWBO.',
            '..OOWWWWWWO...',
            '..OBWWWWWWBO..',
            '..OBWPPPWWBOOO',
            '..OBWWWWWWBBO.',
            '..OOBBBBBBOO..',
            '...OOLLOOLLO..',
            '..............',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else if (kind === 'axolotl') {
    const pal = {
      O: '#54223a',
      P: '#ff9ec2',
      L: '#ffcce0',
      M: '#e84a84',
      E: '#29121e',
    };
    const rows =
      step === 0
        ? [
            '..............',
            '.MM........MM.',
            'MMPOOOOOOOOPMM',
            '.MMPPPPPPPPMM.',
            'MMPEPPPPPPPEPM',
            '.OOPPPPPPPPOO.',
            '..OLLLLLLLLOO.',
            '..OPPPPPPPPPO.',
            '..OPLLLLLLPPOM',
            '..OPPPPPPPPPOM',
            '..OLLLLLLLOOM.',
            '..OPPO..OPPO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..............',
            '.MM........MM.',
            'MMPOOOOOOOOPMM',
            '.MMPPPPPPPPMM.',
            'MMPEPPPPPPPEPM',
            '.OOPPPPPPPPOO.',
            '..OLLLLLLLLOO.',
            '..OPPPPPPPPPO.',
            '..OPLLLLLLPPOM',
            '..OPPPPPPPPPMM',
            '..OLLLLLLLOO..',
            '...OPPOOPPO...',
            '....OO..OO....',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  } else {
    // Mini Dragon
    const pal = {
      O: '#183629',
      G: '#3fb87f',
      D: '#247d56',
      Y: '#ffd23f',
      W: '#b8ffda',
      E: '#12211a',
      F: '#ff6b4a',
    };
    const rows =
      step === 0
        ? [
            '..OO......OO..',
            '..OYO....OYO..',
            '...OGOOOOOGO..',
            '..OGGGGGGGGGO.',
            '..OGEGGGGGEGO.',
            '..OGGYYYYYGGO.',
            '..OOGGGGGGOO..',
            '.OYYGGGGGGYYO.',
            'OYWGGGGGGGGGYO',
            '.OOGGYYYYGGOOO',
            '..OGGGGGGGGGFO',
            '..OOGGOOOGGO..',
            '...OO....OO...',
            '..............',
          ]
        : [
            '..OO......OO..',
            '..OYO....OYO..',
            '...OGOOOOOGO..',
            '..OGGGGGGGGGO.',
            '..OGEGGGGGEGO.',
            '.OOOGYYYYYGGO.',
            'OYYGGGGGGGGGYO',
            'OYWWGGGGGGGWYO',
            '.OOOGGGGGGOOO.',
            '..OGGYYYYGGFO.',
            '..OGGGGGGGGO..',
            '...OOGGOOGGO..',
            '....OO...OO...',
            '..............',
          ];
    paintRows(ctx, rows, pal, 0, 0, flipX);
  }

  petSpriteCache.set(key, c);
  return c;
}

// ============================================================================
// 4-TIER WATERCRAFT FLEET SPRITE RENDERER
// ============================================================================

const boatCache = new Map<string, HTMLCanvasElement>();

export function renderWatercraftSprite(
  boatKind: BoatKind,
  dir: 'down' | 'up' | 'left' | 'right',
  strokeFrame: number
): HTMLCanvasElement {
  const key = `v2|${boatKind}|${dir}|${strokeFrame % 2}`;
  const cached = boatCache.get(key);
  if (cached) return cached;

  const isHorizontal = dir === 'left' || dir === 'right';
  const w = isHorizontal ? 26 : 20;
  const h = isHorizontal ? 22 : 26;
  const [c, ctx] = makeTinyCanvas(w, h);
  const oarShift = strokeFrame % 2 === 0 ? 0 : 1;

  if (boatKind === 'swan') {
    if (isHorizontal) {
      const faceRight = dir === 'right';
      const sx = (x: number, rw: number) => (faceRight ? x : w - x - rw);
      ctx.fillStyle = 'rgba(255, 228, 240, 0.72)';
      ctx.fillRect(2, 18, 22, 2);
      // Outer dark rim
      ctx.fillStyle = '#3b2436';
      ctx.fillRect(sx(3, 18), 10, 18, 8);
      ctx.fillRect(sx(1, 22), 12, 22, 5);
      // Graceful swan neck + head
      ctx.fillRect(sx(17, 5), 4, 5, 8);
      ctx.fillRect(sx(21, 3), 5, 3, 3);
      // White plumage body & wing ribs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx(4, 16), 11, 16, 6);
      ctx.fillRect(sx(2, 20), 13, 20, 3);
      ctx.fillRect(sx(18, 3), 5, 3, 7);
      ctx.fillStyle = '#dce8f5';
      ctx.fillRect(sx(5, 11), 13, 11, 3);
      ctx.fillRect(sx(6, 8), 10, 8, 2);
      // Pink velvet pedal cushion
      ctx.fillStyle = '#f58eb2';
      ctx.fillRect(sx(10, 5), 11, 5, 4);
      // Gold beak & eye
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx(21, 3), 6, 3, 2);
      ctx.fillStyle = '#1e1b2e';
      ctx.fillRect(sx(19, 1), 6, 1, 1);
      // Tail feather kick wave
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx(2, 3), 9 + oarShift, 3, 3);
    } else {
      ctx.fillStyle = 'rgba(255, 228, 240, 0.72)';
      ctx.fillRect(3, 22, 14, 2);
      ctx.fillStyle = '#3b2436';
      ctx.fillRect(4, 5, 12, 17);
      ctx.fillRect(3, 8, 14, 11);
      ctx.fillRect(8, 2, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 6, 10, 15);
      ctx.fillRect(4, 9, 12, 9);
      ctx.fillRect(9, 3, 2, 4);
      ctx.fillStyle = '#dce8f5';
      ctx.fillRect(4, 10, 2, 8);
      ctx.fillRect(14, 10, 2, 8);
      ctx.fillStyle = '#f58eb2';
      ctx.fillRect(7, 12, 6, 5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(9, dir === 'down' ? 21 : 1, 2, 2);
    }
    boatCache.set(key, c);
    return c;
  }

  // Shared hull palette for Rowboat, Sailboat, Skiff
  const isSkiff = boatKind === 'skiff';
  const isSailboat = boatKind === 'sailboat';
  const hullDark = isSkiff ? '#29120c' : '#3b1d0a';
  const hullMid = isSkiff ? '#5e231c' : isSailboat ? '#d9e8f5' : '#a86732';
  const hullTrim = isSkiff ? '#ffd23f' : isSailboat ? '#f58eb2' : '#d4965b';
  const deckWood = isSkiff ? '#421912' : isSailboat ? '#b8763e' : '#5e3214';

  if (isHorizontal) {
    // Water ripple foam
    ctx.fillStyle = isSkiff ? 'rgba(255, 240, 180, 0.75)' : 'rgba(198, 246, 255, 0.75)';
    ctx.fillRect(2, 18, 22, 2);
    // Boat outer hull
    ctx.fillStyle = hullDark;
    ctx.fillRect(3, 10, 20, 8);
    ctx.fillRect(5, 9, 16, 10);
    ctx.fillRect(1, 12, 24, 4);
    ctx.fillStyle = hullMid;
    ctx.fillRect(4, 11, 18, 6);
    ctx.fillStyle = hullTrim;
    ctx.fillRect(5, 10, 16, 2);
    // Hollow & bench seat
    ctx.fillStyle = deckWood;
    ctx.fillRect(7, 12, 12, 4);
    ctx.fillStyle = '#c48349';
    ctx.fillRect(11, 11, 4, 6);

    if (isSailboat || isSkiff) {
      // Mast + billowing sail
      const billow = strokeFrame % 2 === 0 ? 0 : 1;
      ctx.fillStyle = '#3b1d0a';
      ctx.fillRect(12, 1, 2, 11);
      // Main sail
      ctx.fillStyle = isSkiff ? '#380e16' : '#4a2638';
      ctx.fillRect(7 + billow, 2, 10, 8);
      ctx.fillStyle = isSkiff ? '#c92a42' : '#ffffff';
      ctx.fillRect(8 + billow, 3, 8, 6);
      // Striped / gold accent on sail
      ctx.fillStyle = isSkiff ? '#ffd23f' : '#f58eb2';
      ctx.fillRect(8 + billow, 5, 8, 2);
      if (isSkiff) {
        // Crown/pennant tip & gold hull stripe
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(14 + billow, 0, 4, 2);
        ctx.fillRect(4, 15, 18, 1);
      }
    } else {
      // Wooden oar for classic rowboat
      ctx.fillStyle = '#3b1d0a';
      ctx.fillRect(11 + oarShift, 16, 3, 4);
      ctx.fillStyle = '#e8ba78';
      ctx.fillRect(12 + oarShift, 16, 1, 4);
    }
  } else {
    // Vertical hull (down/up)
    ctx.fillStyle = isSkiff ? 'rgba(255, 240, 180, 0.75)' : 'rgba(198, 246, 255, 0.75)';
    ctx.fillRect(3, 22, 14, 2);
    ctx.fillStyle = hullDark;
    ctx.fillRect(5, 5, 10, 18);
    ctx.fillRect(4, 8, 12, 12);
    ctx.fillRect(7, 4, 6, 20);
    ctx.fillStyle = hullMid;
    ctx.fillRect(5, 8, 10, 12);
    ctx.fillStyle = hullTrim;
    ctx.fillRect(6, 6, 8, 15);
    ctx.fillStyle = deckWood;
    ctx.fillRect(7, 9, 6, 10);
    ctx.fillStyle = '#c48349';
    ctx.fillRect(6, 13, 8, 3);

    if (isSailboat || isSkiff) {
      const billow = strokeFrame % 2 === 0 ? 0 : 1;
      ctx.fillStyle = '#3b1d0a';
      ctx.fillRect(9, 1, 2, 11);
      ctx.fillStyle = isSkiff ? '#380e16' : '#4a2638';
      ctx.fillRect(5, 2 + billow, 10, 7);
      ctx.fillStyle = isSkiff ? '#c92a42' : '#ffffff';
      ctx.fillRect(6, 3 + billow, 8, 5);
      ctx.fillStyle = isSkiff ? '#ffd23f' : '#f58eb2';
      ctx.fillRect(6, 5 + billow, 8, 2);
    } else {
      // Twin wooden oars
      ctx.fillStyle = '#3b1d0a';
      ctx.fillRect(2, 12 + oarShift, 3, 4);
      ctx.fillRect(15, 12 + oarShift, 3, 4);
      ctx.fillStyle = '#e8ba78';
      ctx.fillRect(2, 13 + oarShift, 2, 2);
      ctx.fillRect(16, 13 + oarShift, 2, 2);
    }
  }

  boatCache.set(key, c);
  return c;
}

export function renderRowboatSprite(dir: 'down' | 'up' | 'left' | 'right', strokeFrame: number): HTMLCanvasElement {
  return renderWatercraftSprite('rowboat', dir, strokeFrame);
}

// ============================================================================
// CANVAS OVERLAYS: SPEECH BUBBLES, QUICK EMOTES & RUNWAY STAGE DECOR
// ============================================================================

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  screenX: number,
  screenY: number
): void {
  const clean = text.trim().slice(0, 48);
  if (!clean) return;
  const isRtl = ARABIC_CHAR_REGEX.test(clean);

  ctx.save();
  ctx.direction = isRtl ? 'rtl' : 'ltr';
  ctx.font = isRtl
    ? 'bold 13px "Cairo", sans-serif'
    : 'bold 11.5px "Plus Jakarta Sans", "Cairo", sans-serif';

  // Wrap into up to 2 short lines
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width <= 156 || !current) {
      current = test;
    } else {
      lines.push(current);
      current = w;
      if (lines.length >= 1) break;
    }
  }
  if (current && lines.length < 2) lines.push(current);
  if (lines.length === 0) lines.push(clean);

  const maxW = Math.max(...lines.map((ln) => Math.ceil(ctx.measureText(ln).width)));
  const lineH = isRtl ? 18 : 15;
  const boxW = Math.max(40, maxW + 18);
  const boxH = lines.length * lineH + 10;
  const bx = Math.round(screenX - boxW / 2);
  const by = Math.round(screenY - boxH - 6);

  // Dark cocoa pixel outline + warm parchment bubble
  ctx.fillStyle = '#3d1e0b';
  ctx.fillRect(bx - 2, by - 2, boxW + 4, boxH + 4);
  ctx.fillStyle = '#fff9eb';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.fillStyle = '#ebd2a4';
  ctx.fillRect(bx, by + boxH - 2, boxW, 2);

  // Bubble pointer tail
  ctx.fillStyle = '#3d1e0b';
  ctx.fillRect(Math.round(screenX - 3), by + boxH + 2, 6, 4);
  ctx.fillStyle = '#fff9eb';
  ctx.fillRect(Math.round(screenX - 2), by + boxH, 4, 4);

  ctx.fillStyle = '#3d1e0b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, idx) => {
    ctx.fillText(ln, Math.round(screenX), by + 5 + lineH / 2 + idx * lineH);
  });
  ctx.restore();
}

export function drawFloatingEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  screenX: number,
  screenY: number,
  bobOffsetPx: number
): void {
  const bx = Math.round(screenX - 13);
  const by = Math.round(screenY - 26 + bobOffsetPx);
  ctx.fillStyle = '#3d1e0b';
  ctx.fillRect(bx - 1, by - 1, 28, 24);
  ctx.fillStyle = '#fff9eb';
  ctx.fillRect(bx, by, 26, 22);
  ctx.fillStyle = '#3d1e0b';
  ctx.fillRect(bx + 11, by + 22, 4, 3);

  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, Math.round(screenX), by + 11);
}

export function drawRunwayStageOverlay(
  ctx: CanvasRenderingContext2D,
  stageLeftCol: number,
  stageTopRow: number,
  camX: number,
  camY: number,
  tileSize: number,
  timeSec: number,
  spotlightActive: boolean
): void {
  const stageW = 7 * tileSize;
  const stageH = 4 * tileSize;
  const sx = (stageLeftCol * tileSize - camX) * PIXEL_SCALE;
  const sy = (stageTopRow * tileSize - camY) * PIXEL_SCALE;
  const sw = stageW * PIXEL_SCALE;
  const sh = stageH * PIXEL_SCALE;

  // Raised border trim around wooden boardwalk stage
  ctx.fillStyle = '#42210b';
  ctx.fillRect(sx - PIXEL_SCALE, sy - PIXEL_SCALE, sw + 2 * PIXEL_SCALE, 2 * PIXEL_SCALE);
  ctx.fillRect(sx - PIXEL_SCALE, sy + sh - PIXEL_SCALE, sw + 2 * PIXEL_SCALE, 2 * PIXEL_SCALE);

  // Coral-crimson velvet runway carpet down center
  const carpetX = ((stageLeftCol + 1) * tileSize - camX) * PIXEL_SCALE;
  const carpetY = ((stageTopRow + 1.2) * tileSize - camY) * PIXEL_SCALE;
  const carpetW = 5 * tileSize * PIXEL_SCALE;
  const carpetH = 1.6 * tileSize * PIXEL_SCALE;
  ctx.fillStyle = '#6e1d36';
  ctx.fillRect(carpetX - PIXEL_SCALE, carpetY - PIXEL_SCALE, carpetW + 2 * PIXEL_SCALE, carpetH + 2 * PIXEL_SCALE);
  ctx.fillStyle = '#d9486b';
  ctx.fillRect(carpetX, carpetY, carpetW, carpetH);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(carpetX + 2 * PIXEL_SCALE, carpetY + 2 * PIXEL_SCALE, carpetW - 4 * PIXEL_SCALE, PIXEL_SCALE);
  ctx.fillRect(carpetX + 2 * PIXEL_SCALE, carpetY + carpetH - 3 * PIXEL_SCALE, carpetW - 4 * PIXEL_SCALE, PIXEL_SCALE);

  // Center Spotlight Podium Gold Medallion
  const podX = ((stageLeftCol + 3.5) * tileSize - camX) * PIXEL_SCALE;
  const podY = ((stageTopRow + 2) * tileSize - camY) * PIXEL_SCALE;
  const pulse = 0.25 + 0.14 * Math.sin(timeSec * 3.5);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(podX - 10 * PIXEL_SCALE, podY - 7 * PIXEL_SCALE, 20 * PIXEL_SCALE, 14 * PIXEL_SCALE);
  ctx.fillStyle = '#fff5bd';
  ctx.fillRect(podX - 8 * PIXEL_SCALE, podY - 5 * PIXEL_SCALE, 16 * PIXEL_SCALE, 10 * PIXEL_SCALE);

  // Corner Stage Spotlight Lamps
  const corners = [
    [sx + 4 * PIXEL_SCALE, sy + 4 * PIXEL_SCALE],
    [sx + sw - 8 * PIXEL_SCALE, sy + 4 * PIXEL_SCALE],
    [sx + 4 * PIXEL_SCALE, sy + sh - 8 * PIXEL_SCALE],
    [sx + sw - 8 * PIXEL_SCALE, sy + sh - 8 * PIXEL_SCALE],
  ];
  for (const [lx, ly] of corners) {
    ctx.fillStyle = '#26140e';
    ctx.fillRect(lx, ly, 4 * PIXEL_SCALE, 4 * PIXEL_SCALE);
    ctx.fillStyle = spotlightActive ? '#fff899' : '#ffd966';
    ctx.fillRect(lx + PIXEL_SCALE, ly + PIXEL_SCALE, 2 * PIXEL_SCALE, 2 * PIXEL_SCALE);
  }

  // Sweeping spotlight cone when active or idle ambient shimmer
  if (spotlightActive) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 245, 165, ${pulse + 0.15})`;
    ctx.beginPath();
    ctx.moveTo(podX - 28 * PIXEL_SCALE, sy - 20 * PIXEL_SCALE);
    ctx.lineTo(podX + 28 * PIXEL_SCALE, sy - 20 * PIXEL_SCALE);
    ctx.lineTo(podX + 18 * PIXEL_SCALE, podY + 10 * PIXEL_SCALE);
    ctx.lineTo(podX - 18 * PIXEL_SCALE, podY + 10 * PIXEL_SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
