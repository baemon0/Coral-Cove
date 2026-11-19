import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Trash2,
  FlipHorizontal2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Eye,
  Plus,
  Moon,
  Sun,
  CloudRain,
  Umbrella,
  Zap,
} from 'lucide-react';
import {
  GRID_SIZE,
  SLOT_LABELS,
  SLOT_SILHOUETTES,
  DESIGN_FABRIC_COST,
  DESIGN_SLOT_STATS,
  OUTFIT_EFFECTS,
  REACTIVE_NEON_PRESETS,
  computeAutoShimmerMask,
  derivePrimaryItemColor,
  drawGlowingPearlsSpriteOverlay,
  drawNightNeonSpriteOverlay,
  drawOutfitAmbientEffects,
  drawRainReactiveOverlay,
  createEmptyGrid,
  cloneGrid,
  encodeGridToItemData,
  countPaintedPixels,
  generateItemUid,
  type ClothingItem,
  type ClothingSlot,
  type OutfitEffectType,
  type RainReactiveStyle,
  type ReactiveOutfitConfig,
} from './clothing';
import type { EditionTier } from './constants';
import type { CloudAppearance } from './firebase';

type ToolKind =
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'picker'
  | 'shade_dark'
  | 'shade_light'
  | 'shimmer_mark'
  | 'neon_mark';
type PreviewEnv = 'day' | 'night' | 'rain';
type Direction = 'down' | 'up' | 'left' | 'right';

interface HSVColor {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

const RECENT_COLORS_STORAGE_KEY = 'coral_cove_recent_colors_v1';
const DEFAULT_RECENT_COLORS: string[] = [
  '#26140e',
  '#ffffff',
  '#e26a67',
  '#ff8fb1',
  '#ffd23f',
  '#3f8f3b',
  '#3ca3b8',
  '#7c3aed',
  '#00f5d4',
  '#ff2a85',
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s);
  const val = clamp01(v);
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) {
    r1 = c;
    g1 = x;
  } else if (hue < 120) {
    r1 = x;
    g1 = c;
  } else if (hue < 180) {
    g1 = c;
    b1 = x;
  } else if (hue < 240) {
    g1 = x;
    b1 = c;
  } else if (hue < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function hexToHsv(hex: string, fallbackHue = 2): HSVColor {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return { h: fallbackHue, s: 0.65, v: 0.88 };
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = fallbackHue;
  if (d > 0.0001) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h: (h + 360) % 360, s, v };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shadeHexColor(hex: string, mode: 'darken' | 'lighten'): string {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d > 0.0001) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }

  const step = 0.1;
  const nextL =
    mode === 'darken'
      ? Math.max(s === 0 ? 0.04 : 0.07, l - step)
      : Math.min(s === 0 ? 1.0 : 0.95, l + step);

  if (s === 0) {
    return rgbToHex(nextL, nextL, nextL);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = nextL < 0.5 ? nextL * (1 + s) : nextL + s - nextL * s;
  const p = 2 * nextL - q;
  return rgbToHex(hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3));
}

function loadSavedRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_COLORS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
        .slice(0, 14);
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RECENT_COLORS;
}

export type RareDyeIngredients = Record<OutfitEffectType, number>;

interface DesignStudioModalProps {
  playerName: string;
  fabricCount: number;
  rareIngredients: RareDyeIngredients;
  baseAppearance: CloudAppearance;
  ownedCount: number;
  renderIngredientIcon?: (kind: OutfitEffectType, size?: number) => React.ReactNode;
  renderCharacterPreview: (
    appearance: CloudAppearance,
    dir: Direction,
    frame: number,
    sunsetPhase?: number
  ) => HTMLCanvasElement;
  onPlayClick: () => void;
  onCreateItem: (
    item: ClothingItem,
    fabricCost: number,
    equipNow: boolean,
    infuseEffect: OutfitEffectType | null
  ) => void;
  onClose: () => void;
}

const SLOTS: ClothingSlot[] = ['hat', 'top', 'bottom', 'dress', 'shoes'];

function createEmptyMask(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<boolean>(GRID_SIZE).fill(false));
}

function encodeMaskToString(mask: boolean[][], grid: (string | null)[][]): string {
  let out = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      out += mask[y]?.[x] && grid[y]?.[x] ? '1' : '0';
    }
  }
  return out;
}

function maskFromString(str: string): boolean[][] {
  const m = createEmptyMask();
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      m[y][x] = str[y * GRID_SIZE + x] === '1';
    }
  }
  return m;
}

export const DesignStudioModal: React.FC<DesignStudioModalProps> = ({
  playerName,
  fabricCount,
  rareIngredients,
  baseAppearance,
  ownedCount,
  renderIngredientIcon,
  renderCharacterPreview,
  onPlayClick,
  onCreateItem,
  onClose,
}) => {
  const [slot, setSlot] = useState<ClothingSlot>('dress');
  const [grid, setGrid] = useState<(string | null)[][]>(() => createEmptyGrid());
  const [history, setHistory] = useState<(string | null)[][][]>([]);
  const [tool, setTool] = useState<ToolKind>('pencil');
  const [infuseEffect, setInfuseEffect] = useState<OutfitEffectType | null>(null);
  const [shimmerMask, setShimmerMask] = useState<boolean[][]>(() => createEmptyMask());
  const [nightNeonEnabled, setNightNeonEnabled] = useState<boolean>(false);
  const [nightNeonColor, setNightNeonColor] = useState<string>(REACTIVE_NEON_PRESETS[0].hex);
  const [nightNeonMask, setNightNeonMask] = useState<boolean[][]>(() => createEmptyMask());
  const [rainMode, setRainMode] = useState<RainReactiveStyle | null>(null);
  const [rainColor, setRainColor] = useState<string | null>(null);
  const [previewEnv, setPreviewEnv] = useState<PreviewEnv>('day');

  const initialHex = '#e26a67';
  const [hsv, setHsv] = useState<HSVColor>(() => hexToHsv(initialHex));
  const [color, setColor] = useState<string>(initialHex);
  const [hexInput, setHexInput] = useState<string>(initialHex);
  const [recentColors, setRecentColors] = useState<string[]>(() => loadSavedRecentColors());

  const [mirrorX, setMirrorX] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [itemName, setItemName] = useState<string>('');
  const [editionTier, setEditionTier] = useState<EditionTier>('limited');
  const [equipNow, setEquipNow] = useState<boolean>(true);
  const [previewDir, setPreviewDir] = useState<Direction>('down');
  const [previewWalking, setPreviewWalking] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const svBoxRef = useRef<HTMLDivElement | null>(null);
  const hueBarRef = useRef<HTMLDivElement | null>(null);

  const drawingRef = useRef<boolean>(false);
  const draggingSvRef = useRef<boolean>(false);
  const draggingHueRef = useRef<boolean>(false);
  const activeDrawPointerIdRef = useRef<number | null>(null);
  const activeSvPointerIdRef = useRef<number | null>(null);
  const activeHuePointerIdRef = useRef<number | null>(null);
  const strokeSnapshotRef = useRef<(string | null)[][] | null>(null);
  const shadedCellsRef = useRef<Set<string>>(new Set());
  const shimmerDrawModeRef = useRef<boolean>(true);
  const neonDrawModeRef = useRef<boolean>(true);

  const fabricCost = DESIGN_FABRIC_COST[slot];
  const slotStats = DESIGN_SLOT_STATS[slot];
  const paintedCount = countPaintedPixels(grid);
  const canAffordFabric = fabricCount >= fabricCost;
  const canAffordEffect = !infuseEffect || (rareIngredients[infuseEffect] || 0) >= 1;
  const bagFull = ownedCount >= 50;

  const commitHexToRecent = useCallback((hex: string) => {
    const norm = hex.toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(norm)) return;
    setRecentColors((prev) => {
      if (prev[0]?.toLowerCase() === norm) return prev;
      const next = [norm, ...prev.filter((c) => c.toLowerCase() !== norm)].slice(0, 14);
      try {
        localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const selectHexColor = useCallback(
    (nextHex: string, recordRecent = false) => {
      const norm = nextHex.toLowerCase();
      setColor(norm);
      setHexInput(norm);
      setHsv((prev) => hexToHsv(norm, prev.h));
      if (recordRecent) commitHexToRecent(norm);
    },
    [commitHexToRecent]
  );

  const updateFromHsv = useCallback((nextHsv: HSVColor) => {
    setHsv(nextHsv);
    const nextHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
    setColor(nextHex);
    setHexInput(nextHex);
  }, []);

  const applySvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const box = svBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / Math.max(1, rect.width));
      const v = clamp01(1 - (clientY - rect.top) / Math.max(1, rect.height));
      updateFromHsv({ h: hsv.h, s, v });
      if (tool !== 'pencil' && tool !== 'bucket') setTool('pencil');
    },
    [hsv.h, tool, updateFromHsv]
  );

  const applyHuePointer = useCallback(
    (clientX: number) => {
      const bar = hueBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = clamp01((clientX - rect.left) / Math.max(1, rect.width));
      const nextHue = Math.min(359.99, ratio * 360);
      updateFromHsv({ h: nextHue, s: hsv.s, v: hsv.v });
      if (tool !== 'pencil' && tool !== 'bucket') setTool('pencil');
    },
    [hsv.s, hsv.v, tool, updateFromHsv]
  );

  // Build live preview ClothingItem from current grid + active Infuse Effect + Secondary Reactive State
  const shimmerPixelsString = React.useMemo(
    () => (infuseEffect === 'glowing_pearls' ? encodeMaskToString(shimmerMask, grid) : undefined),
    [infuseEffect, shimmerMask, grid]
  );

  const nightNeonPixelsString = React.useMemo(
    () => (nightNeonEnabled ? encodeMaskToString(nightNeonMask, grid) : undefined),
    [nightNeonEnabled, nightNeonMask, grid]
  );

  const draftReactive: ReactiveOutfitConfig | undefined = React.useMemo(() => {
    const out: ReactiveOutfitConfig = {};
    if (nightNeonEnabled) {
      const maskStr =
        nightNeonPixelsString && nightNeonPixelsString.includes('1')
          ? nightNeonPixelsString
          : paintedCount > 0
            ? computeAutoShimmerMask(grid)
            : '';
      if (maskStr.includes('1')) {
        out.nightNeon = { pixels: maskStr, color: nightNeonColor };
      }
    }
    if (rainMode) {
      out.rainMode = rainMode;
      out.rainColor = rainColor || undefined;
    }
    return out.nightNeon || out.rainMode ? out : undefined;
  }, [nightNeonEnabled, nightNeonPixelsString, nightNeonColor, rainMode, rainColor, paintedCount, grid]);

  const draftItem: ClothingItem = React.useMemo(() => {
    const { palette, pixels } = encodeGridToItemData(grid);
    const resolvedReactive: ReactiveOutfitConfig | undefined = draftReactive
      ? {
          ...draftReactive,
          ...(draftReactive.rainMode
            ? {
                rainColor: draftReactive.rainColor || derivePrimaryItemColor(grid),
              }
            : {}),
        }
      : undefined;
    return {
      uid: 'draft_preview',
      name: itemName.trim() || `Custom ${SLOT_LABELS[slot]}`,
      slot,
      creatorName: playerName || 'Islander',
      source: 'custom',
      palette,
      pixels,
      stats: slotStats,
      ...(infuseEffect ? { effect: infuseEffect } : {}),
      ...(infuseEffect === 'glowing_pearls' && shimmerPixelsString && shimmerPixelsString.includes('1')
        ? { shimmerPixels: shimmerPixelsString }
        : {}),
      ...(resolvedReactive ? { reactive: resolvedReactive } : {}),
    };
  }, [grid, itemName, slot, playerName, slotStats, infuseEffect, shimmerPixelsString, draftReactive]);

  // Draw the zoomed-in 16x16 pixel grid canvas + faint body silhouette guide + glow markers
  useEffect(() => {
    const c = editorCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const cell = c.width / GRID_SIZE; // 20px per pixel on 320x320
    ctx.clearRect(0, 0, c.width, c.height);

    const silhouette = SLOT_SILHOUETTES[slot];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f6ebd4' : '#ead8b6';
        ctx.fillRect(x * cell, y * cell, cell, cell);

        if (showGuide && silhouette[y]?.[x] === 'X') {
          ctx.fillStyle = 'rgba(110, 62, 28, 0.20)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }

        const pxColor = grid[y]?.[x];
        if (pxColor) {
          ctx.fillStyle = pxColor;
          ctx.fillRect(x * cell, y * cell, cell, cell);
          if (infuseEffect === 'glowing_pearls' && shimmerMask[y]?.[x]) {
            ctx.strokeStyle = '#a5f3fc';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cell + 2.5, y * cell + 2.5, cell - 5, cell - 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
            ctx.fillRect(x * cell + 4, y * cell + 4, 4, 4);
          }
          if (nightNeonEnabled && nightNeonMask[y]?.[x]) {
            ctx.strokeStyle = nightNeonColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3);
            ctx.fillStyle = nightNeonColor;
            ctx.fillRect(x * cell + cell - 6, y * cell + 2, 4, 4);
          }
        }
      }
    }

    ctx.strokeStyle = 'rgba(92, 54, 26, 0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = Math.round(i * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, c.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(c.width, pos);
      ctx.stroke();
    }

    if (mirrorX) {
      ctx.strokeStyle = 'rgba(201, 52, 90, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.width / 2, 0);
      ctx.lineTo(c.width / 2, c.height);
      ctx.stroke();
    }
  }, [grid, slot, showGuide, mirrorX, infuseEffect, shimmerMask, nightNeonEnabled, nightNeonMask, nightNeonColor]);

  // Live Animated Character Preview wearing the drawing + Infused Deep Sea Effect
  useEffect(() => {
    let raf = 0;
    let t = 0;
    let last = performance.now();

    const draftAppearance: CloudAppearance = {
      ...baseAppearance,
      ...(slot === 'dress'
        ? { top: null, bottom: null, dress: paintedCount > 0 ? draftItem : null }
        : slot === 'top' || slot === 'bottom'
          ? {
              dress: null,
              [slot]: paintedCount > 0 ? draftItem : null,
            }
          : {
              [slot]: paintedCount > 0 ? draftItem : null,
            }),
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (previewWalking) t += dt * 7;
      const timeSec = now / 1000;
      const sunsetPhase = infuseEffect === 'sunset_amber' ? Math.floor(timeSec * 7) % 12 : 0;

      const c = previewCanvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, c.width, c.height);

          if (previewEnv === 'night') {
            ctx.fillStyle = '#0f1c3f';
            ctx.fillRect(0, 0, c.width, 74);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(14, 14, 2, 2);
            ctx.fillRect(42, 24, 2, 2);
            ctx.fillRect(96, 12, 2, 2);
            ctx.fillRect(110, 32, 2, 2);
            ctx.fillStyle = '#fef9c3';
            ctx.fillRect(102, 16, 10, 10);
            ctx.fillStyle = '#183f66';
            ctx.fillRect(0, 74, c.width, 16);
            ctx.fillStyle = '#8b795e';
            ctx.fillRect(0, 90, c.width, c.height - 90);
            ctx.fillStyle = '#6b5c46';
            ctx.fillRect(0, 90, c.width, 3);
          } else if (previewEnv === 'rain') {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, c.width, 74);
            // Soft storm clouds
            ctx.fillStyle = '#475569';
            ctx.fillRect(10, 8, 38, 12);
            ctx.fillRect(72, 14, 46, 12);
            ctx.fillStyle = '#33658a';
            ctx.fillRect(0, 74, c.width, 16);
            ctx.fillStyle = '#c9b37d';
            ctx.fillRect(0, 90, c.width, c.height - 90);
            ctx.fillStyle = '#a89362';
            ctx.fillRect(0, 90, c.width, 3);
          } else {
            ctx.fillStyle = '#bfe8f5';
            ctx.fillRect(0, 0, c.width, 74);
            ctx.fillStyle = '#48b1cc';
            ctx.fillRect(0, 74, c.width, 16);
            ctx.fillStyle = '#ebd08a';
            ctx.fillRect(0, 90, c.width, c.height - 90);
            ctx.fillStyle = '#d9b96e';
            ctx.fillRect(0, 90, c.width, 3);
          }

          const frame = previewWalking ? Math.floor(t) % 4 : 0;
          const sprite = renderCharacterPreview(draftAppearance, previewDir, frame, sunsetPhase);
          ctx.fillStyle = 'rgba(46, 26, 14, 0.25)';
          ctx.fillRect(42, 114, 44, 10);
          ctx.drawImage(sprite, 24, 4, 80, 120);

          if (paintedCount > 0 && infuseEffect) {
            if (infuseEffect === 'glowing_pearls') {
              drawGlowingPearlsSpriteOverlay(
                ctx,
                [draftItem],
                previewDir,
                frame,
                24,
                4,
                5,
                timeSec,
                previewEnv === 'night' ? 1 : 0.22
              );
            } else if (infuseEffect === 'starlight_coral' || infuseEffect === 'seafoam_essence') {
              drawOutfitAmbientEffects(
                ctx,
                [infuseEffect],
                64,
                74,
                4,
                timeSec,
                previewWalking ? 'player' : 'preview'
              );
            }
          }

          // Secondary State: Night Mode Bioluminescent Neon Overlay
          if (paintedCount > 0 && draftItem.reactive?.nightNeon) {
            drawNightNeonSpriteOverlay(
              ctx,
              [draftItem],
              previewDir,
              frame,
              24,
              4,
              5,
              timeSec,
              previewEnv === 'night' ? 1 : 0
            );
          }

          // Secondary State: Rain Mode Umbrella / Rain Hood Overlay
          if (paintedCount > 0 && draftItem.reactive?.rainMode && previewEnv === 'rain') {
            drawRainReactiveOverlay(
              ctx,
              [draftItem],
              previewDir,
              frame,
              24,
              4,
              5,
              1
            );
          }

          // Animated diagonal pixel raindrops in Rain preview
          if (previewEnv === 'rain') {
            ctx.fillStyle = 'rgba(219, 234, 254, 0.72)';
            for (let i = 0; i < 18; i++) {
              const rx = ((i * 29 + timeSec * 44) % (c.width + 20)) - 10;
              const ry = ((i * 37 + timeSec * 160) % (c.height + 16)) - 8;
              ctx.fillRect(Math.floor(rx), Math.floor(ry), 1.5, 7);
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    baseAppearance,
    draftItem,
    paintedCount,
    previewDir,
    previewWalking,
    previewEnv,
    infuseEffect,
    renderCharacterPreview,
    slot,
  ]);

  const pushHistory = (prevGrid: (string | null)[][]) => {
    setHistory((h) => [...h.slice(-24), cloneGrid(prevGrid)]);
  };

  const getCellFromPointer = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const c = editorCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return { x, y };
  };

  const applyFloodFill = (startX: number, startY: number, fillCol: string | null) => {
    const target = grid[startY][startX];
    if (target === fillCol) return;
    pushHistory(grid);
    const next = cloneGrid(grid);
    const queue: Array<[number, number]> = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
      if (next[cy][cx] !== target) continue;

      next[cy][cx] = fillCol;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    setGrid(next);
    if (fillCol) commitHexToRecent(fillCol);
  };

  const paintCell = (x: number, y: number) => {
    if (tool === 'shimmer_mark') {
      const mx = GRID_SIZE - 1 - x;
      const targetVal = shimmerDrawModeRef.current;
      setShimmerMask((prev) => {
        if (
          prev[y]?.[x] === targetVal &&
          (!mirrorX || prev[y]?.[mx] === targetVal)
        ) {
          return prev;
        }
        const next = prev.map((row) => [...row]);
        if (grid[y]?.[x]) next[y][x] = targetVal;
        if (mirrorX && grid[y]?.[mx]) next[y][mx] = targetVal;
        return next;
      });
      return;
    }

    if (tool === 'neon_mark') {
      const mx = GRID_SIZE - 1 - x;
      const targetVal = neonDrawModeRef.current;
      setNightNeonMask((prev) => {
        if (
          prev[y]?.[x] === targetVal &&
          (!mirrorX || prev[y]?.[mx] === targetVal)
        ) {
          return prev;
        }
        const next = prev.map((row) => [...row]);
        if (grid[y]?.[x]) next[y][x] = targetVal;
        if (mirrorX && grid[y]?.[mx]) next[y][mx] = targetVal;
        return next;
      });
      return;
    }

    if (tool === 'shade_dark' || tool === 'shade_light') {
      const mx = GRID_SIZE - 1 - x;
      const key = `${x},${y}`;
      if (shadedCellsRef.current.has(key)) return;
      shadedCellsRef.current.add(key);
      if (mirrorX) {
        shadedCellsRef.current.add(`${mx},${y}`);
      }
      const mode = tool === 'shade_dark' ? 'darken' : 'lighten';
      setGrid((prev) => {
        const curA = prev[y]?.[x] || null;
        const curB = mirrorX ? prev[y]?.[mx] || null : null;
        if (!curA && !curB) return prev;
        const nextA = curA ? shadeHexColor(curA, mode) : null;
        const nextB = mirrorX && curB ? shadeHexColor(curB, mode) : null;
        if (nextA === curA && (!mirrorX || nextB === curB)) return prev;
        const next = cloneGrid(prev);
        if (curA && nextA) next[y][x] = nextA;
        if (mirrorX && curB && nextB) next[y][mx] = nextB;
        return next;
      });
      return;
    }

    const nextColor = tool === 'eraser' ? null : color;
    setGrid((prev) => {
      const mx = GRID_SIZE - 1 - x;
      if (prev[y][x] === nextColor && (!mirrorX || prev[y][mx] === nextColor)) {
        return prev;
      }
      const next = cloneGrid(prev);
      next[y][x] = nextColor;
      if (mirrorX) {
        next[y][mx] = nextColor;
      }
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary && activeDrawPointerIdRef.current !== null) return;
    e.preventDefault();
    const cell = getCellFromPointer(e);
    if (!cell) return;
    setErrorMsg(null);

    if (tool === 'picker') {
      const picked = grid[cell.y][cell.x];
      if (picked) {
        onPlayClick();
        selectHexColor(picked, true);
        setTool('pencil');
      }
      return;
    }

    if (tool === 'bucket') {
      onPlayClick();
      applyFloodFill(cell.x, cell.y, color);
      return;
    }

    activeDrawPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unavailable
    }
    shadedCellsRef.current.clear();
    if (tool === 'shimmer_mark') {
      shimmerDrawModeRef.current = !shimmerMask[cell.y]?.[cell.x];
      drawingRef.current = true;
      strokeSnapshotRef.current = null;
      paintCell(cell.x, cell.y);
      return;
    }
    if (tool === 'neon_mark') {
      neonDrawModeRef.current = !nightNeonMask[cell.y]?.[cell.x];
      drawingRef.current = true;
      strokeSnapshotRef.current = null;
      paintCell(cell.x, cell.y);
      return;
    }
    drawingRef.current = true;
    strokeSnapshotRef.current = cloneGrid(grid);
    paintCell(cell.x, cell.y);
    if (tool === 'pencil') {
      commitHexToRecent(color);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || activeDrawPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const cell = getCellFromPointer(e);
    if (!cell) return;
    paintCell(cell.x, cell.y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDrawPointerIdRef.current !== null && activeDrawPointerIdRef.current !== e.pointerId) return;
    if (drawingRef.current && strokeSnapshotRef.current) {
      pushHistory(strokeSnapshotRef.current);
    }
    shadedCellsRef.current.clear();
    drawingRef.current = false;
    activeDrawPointerIdRef.current = null;
    strokeSnapshotRef.current = null;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    onPlayClick();
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev);
  };

  const handleClear = () => {
    if (paintedCount === 0) return;
    onPlayClick();
    pushHistory(grid);
    setGrid(createEmptyGrid());
    setShimmerMask(createEmptyMask());
    setNightNeonMask(createEmptyMask());
  };

  const handleSelectInfuseEffect = (eff: OutfitEffectType | null) => {
    onPlayClick();
    setErrorMsg(null);
    setInfuseEffect(eff);
    if (eff === 'glowing_pearls') {
      setPreviewEnv('night');
      const anyMarked = shimmerMask.some((row) => row.some(Boolean));
      if (!anyMarked && paintedCount > 0) {
        setShimmerMask(maskFromString(computeAutoShimmerMask(grid)));
      }
    } else if (tool === 'shimmer_mark') {
      setTool('pencil');
    }
  };

  const handleToggleNightNeon = () => {
    onPlayClick();
    setNightNeonEnabled((prev) => {
      const next = !prev;
      if (next) {
        setPreviewEnv('night');
        const anyMarked = nightNeonMask.some((row) => row.some(Boolean));
        if (!anyMarked && paintedCount > 0) {
          setNightNeonMask(maskFromString(computeAutoShimmerMask(grid)));
        }
      } else if (tool === 'neon_mark') {
        setTool('pencil');
      }
      return next;
    });
  };

  const handleSelectRainMode = (nextMode: RainReactiveStyle | null) => {
    onPlayClick();
    setRainMode(nextMode);
    if (nextMode) {
      setPreviewEnv('rain');
    }
  };

  const handleSaveCreation = () => {
    if (paintedCount < 4) {
      setErrorMsg('Draw at least 4 pixels before crafting your design.');
      return;
    }
    if (!canAffordFabric) {
      setErrorMsg(`Need ${fabricCost} Cotton Fabric (harvest Cotton Bushes on the island).`);
      return;
    }
    if (!canAffordEffect && infuseEffect) {
      const effMeta = OUTFIT_EFFECTS.find((e) => e.id === infuseEffect);
      setErrorMsg(
        `Need 1 ${effMeta?.ingredientName || 'rare ingredient'}! Sail deep ocean zones by boat with your pet to gather it.`
      );
      return;
    }
    if (bagFull) {
      setErrorMsg('Your wardrobe bag is full (50 items max). Sell or clear space first.');
      return;
    }

    const cleanName = itemName.trim().slice(0, 32) || `Custom ${SLOT_LABELS[slot].split(' ')[0]}`;
    const { palette, pixels } = encodeGridToItemData(grid);
    const editionTotal = editionTier === 'unique' ? 1 : editionTier === 'limited' ? 5 : 10;
    const rawShimmer =
      infuseEffect === 'glowing_pearls'
        ? encodeMaskToString(shimmerMask, grid) || computeAutoShimmerMask(grid)
        : undefined;
    const rawNeon = nightNeonEnabled
      ? encodeMaskToString(nightNeonMask, grid) || computeAutoShimmerMask(grid)
      : undefined;
    const reactiveConfig: ReactiveOutfitConfig = {};
    if (nightNeonEnabled && rawNeon && rawNeon.includes('1')) {
      reactiveConfig.nightNeon = { pixels: rawNeon, color: nightNeonColor };
    }
    if (rainMode) {
      reactiveConfig.rainMode = rainMode;
      reactiveConfig.rainColor = rainColor || derivePrimaryItemColor(grid);
    }
    const hasReactive = Boolean(reactiveConfig.nightNeon || reactiveConfig.rainMode);
    const created: ClothingItem = {
      uid: generateItemUid('cus'),
      name: cleanName,
      slot,
      creatorName: playerName.trim().slice(0, 20) || 'Islander',
      source: 'custom',
      palette,
      pixels,
      stats: slotStats,
      ...(infuseEffect ? { effect: infuseEffect } : {}),
      ...(infuseEffect === 'glowing_pearls' && rawShimmer && rawShimmer.includes('1')
        ? { shimmerPixels: rawShimmer }
        : {}),
      ...(hasReactive ? { reactive: reactiveConfig } : {}),
      editionId: generateItemUid('ed'),
      editionSerial: 1,
      editionTotal,
      editionTier,
    };

    onCreateItem(created, fabricCost, equipNow, infuseEffect);
  };

  const turnPreview = (delta: number) => {
    onPlayClick();
    const dirs: Direction[] = ['down', 'left', 'up', 'right'];
    const idx = dirs.indexOf(previewDir);
    setPreviewDir(dirs[(idx + delta + 4) % 4]);
  };

  const pureHueHex = hsvToHex(hsv.h, 1, 1);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[94vh] w-full max-w-[920px] overflow-y-auto p-5 text-[#3d1e0b]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
          <div>
            <h2 className="font-pixel text-lg font-bold text-[#45230d]">Design Studio</h2>
            <p className="text-xs font-medium text-[#754623]">
              Draw pixel-art clothing on the 16×16 body guide, mix any shade with HSV, and craft with Fabric.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onClose();
            }}
            aria-label="Close Design Studio"
            className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Slot Selector */}
        <div className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {SLOTS.map((s) => {
            const active = slot === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onPlayClick();
                  setSlot(s);
                  setErrorMsg(null);
                }}
                className={`cursor-pointer border-2 px-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                    : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                }`}
              >
                {SLOT_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Main Studio Grid + Tools + Preview + HSV Color Picker */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[336px_1fr]">
          {/* Left: 16x16 Pixel Canvas + Tools */}
          <div className="flex flex-col items-center gap-3 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
            <div className="flex w-full items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Pencil"
                  onClick={() => {
                    onPlayClick();
                    setTool('pencil');
                  }}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center border-2 ${
                    tool === 'pencil'
                      ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#4d2912]'
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Eraser"
                  onClick={() => {
                    onPlayClick();
                    setTool('eraser');
                  }}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center border-2 ${
                    tool === 'eraser'
                      ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#4d2912]'
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Fill Bucket"
                  onClick={() => {
                    onPlayClick();
                    setTool('bucket');
                  }}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center border-2 ${
                    tool === 'bucket'
                      ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#4d2912]'
                  }`}
                >
                  <PaintBucket className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Color Picker"
                  onClick={() => {
                    onPlayClick();
                    setTool('picker');
                  }}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center border-2 ${
                    tool === 'picker'
                      ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#4d2912]'
                  }`}
                >
                  <Pipette className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Toggle Horizontal Symmetry"
                  onClick={() => {
                    onPlayClick();
                    setMirrorX((m) => !m);
                  }}
                  className={`flex h-9 cursor-pointer items-center gap-1 border-2 px-2 text-[11px] font-bold whitespace-nowrap ${
                    mirrorX
                      ? 'border-[#45230d] bg-[#fff3d6] text-[#45230d] ring-1 ring-[#e6b23c]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#5c361a]'
                  }`}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  <span>Sym</span>
                </button>
                <button
                  type="button"
                  title="Toggle Body Silhouette Guide"
                  onClick={() => {
                    onPlayClick();
                    setShowGuide((g) => !g);
                  }}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center border-2 ${
                    showGuide
                      ? 'border-[#45230d] bg-[#fff3d6] text-[#45230d]'
                      : 'border-[#966236] bg-[#f6e4bf] text-[#5c361a]'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Undo"
                  disabled={history.length === 0}
                  onClick={handleUndo}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center border-2 border-[#966236] bg-[#f6e4bf] text-[#4d2912] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Clear Canvas"
                  onClick={handleClear}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center border-2 border-[#966236] bg-[#f6e4bf] text-[#a62b2b]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Shading Brush: Hue-preserving Darken (Shadow) & Lighten (Highlight) */}
            <div className="flex w-full flex-col gap-1 rounded-sm border border-[#c79963] bg-[#f5e6c8] p-1.5">
              <div className="flex items-center justify-between px-0.5 text-[10px] font-bold text-[#522b14]">
                <span>Shading Brush</span>
                <span className="font-semibold text-[#754623]">Shifts existing pixel lightness</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  title="Shading Brush — Darken (Shadow): shifts painted pixels darker while keeping hue"
                  onClick={() => {
                    onPlayClick();
                    setTool((t) => (t === 'shade_dark' ? 'pencil' : 'shade_dark'));
                  }}
                  className={`flex h-8 cursor-pointer items-center justify-center gap-1 border-2 px-2 text-[11px] font-bold whitespace-nowrap transition-colors ${
                    tool === 'shade_dark'
                      ? 'border-[#312e81] bg-[#4338ca] text-[#eef2ff]'
                      : 'border-[#966236] bg-[#fff7e6] text-[#4d2912] hover:bg-[#ffe8b3]'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 shrink-0" />
                  <span>Darken (Shadow)</span>
                </button>
                <button
                  type="button"
                  title="Shading Brush — Lighten (Highlight): shifts painted pixels lighter while keeping hue"
                  onClick={() => {
                    onPlayClick();
                    setTool((t) => (t === 'shade_light' ? 'pencil' : 'shade_light'));
                  }}
                  className={`flex h-8 cursor-pointer items-center justify-center gap-1 border-2 px-2 text-[11px] font-bold whitespace-nowrap transition-colors ${
                    tool === 'shade_light'
                      ? 'border-[#92400e] bg-[#f59e0b] text-[#291709]'
                      : 'border-[#966236] bg-[#fff7e6] text-[#4d2912] hover:bg-[#ffe8b3]'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 shrink-0" />
                  <span>Lighten (Highlight)</span>
                </button>
              </div>
            </div>

            <canvas
              ref={editorCanvasRef}
              width={320}
              height={320}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="pixelated h-[272px] w-[272px] touch-none select-none cursor-crosshair border-2 border-[#45230d] bg-[#f6ebd4] sm:h-[304px] sm:w-[304px]"
            />

            <div className="flex w-full items-center justify-between text-[11px] font-semibold text-[#6b3c1b]">
              <span>
                {tool === 'neon_mark'
                  ? 'Neon Brush: tap painted pixels to glow in the dark'
                  : tool === 'shimmer_mark'
                    ? 'Glow Brush: tap painted pixels to toggle Pearl Glow'
                    : tool === 'shade_dark'
                      ? 'Shadow Brush: draw over pixels to darken'
                      : tool === 'shade_light'
                        ? 'Highlight Brush: draw over pixels to lighten'
                        : `Guide: ${SLOT_LABELS[slot]}`}
              </span>
              <span className="tabular-nums">{paintedCount} px drawn</span>
            </div>

            {infuseEffect === 'glowing_pearls' && (
              <div className="flex w-full items-center justify-between gap-1.5 rounded-sm border border-[#0891b2] bg-[#ecfeff] p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    setTool((t) => (t === 'shimmer_mark' ? 'pencil' : 'shimmer_mark'));
                  }}
                  className={`flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 border px-2 text-[11px] font-bold ${
                    tool === 'shimmer_mark'
                      ? 'border-[#0e7490] bg-[#06b6d4] text-white'
                      : 'border-[#0891b2] bg-white text-[#0e7490] hover:bg-[#cffafe]'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{tool === 'shimmer_mark' ? 'Pearl Glow Brush On' : 'Select Pearl Pixels'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    setShimmerMask(maskFromString(computeAutoShimmerMask(grid)));
                  }}
                  className="h-7 cursor-pointer border border-[#0891b2] bg-[#cffafe] px-2 text-[10px] font-bold text-[#0e7490] hover:bg-[#a5f3fc]"
                >
                  Auto-Glow
                </button>
              </div>
            )}

            {nightNeonEnabled && (
              <div className="flex w-full flex-col gap-1.5 rounded-sm border border-[#7c3aed] bg-[#1e1b4b] p-2 text-white">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setTool((t) => (t === 'neon_mark' ? 'pencil' : 'neon_mark'));
                    }}
                    className={`flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 border px-2 text-[11px] font-bold ${
                      tool === 'neon_mark'
                        ? 'border-white bg-[#a855f7] text-white'
                        : 'border-[#818cf8] bg-[#312e81] text-[#e0e7ff] hover:bg-[#3730a3]'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    <span>{tool === 'neon_mark' ? 'Neon Brush Active' : 'Paint Neon Pixels'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setNightNeonMask(maskFromString(computeAutoShimmerMask(grid)));
                    }}
                    className="h-7 cursor-pointer border border-[#818cf8] bg-[#312e81] px-2 text-[10px] font-bold text-[#e0e7ff] hover:bg-[#4338ca]"
                  >
                    Auto-Neon
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-[#c7d2fe]">Bioluminescent Glow:</span>
                  <div className="flex items-center gap-1">
                    {REACTIVE_NEON_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.label}
                        onClick={() => {
                          onPlayClick();
                          setNightNeonColor(preset.hex);
                        }}
                        className={`h-5 w-5 cursor-pointer border-2 ${
                          nightNeonColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'scale-110 border-white ring-1 ring-white'
                            : 'border-black/50 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Walking Preview, Full HSV Picker, Infuse Effect & Craft */}
          <div className="flex flex-col justify-between gap-3">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[164px_1fr]">
              {/* Live Animated Character Preview */}
              <div className="flex flex-col items-center justify-between gap-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-2.5">
                <div className="relative">
                  <canvas
                    ref={previewCanvasRef}
                    width={128}
                    height={132}
                    className="pixelated h-[144px] w-36 border-2 border-[#6b3c1b] bg-[#bfe8f5]"
                  />
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'day', label: 'Day', icon: <Sun className="h-2.5 w-2.5" /> },
                        { id: 'night', label: 'Night', icon: <Moon className="h-2.5 w-2.5" /> },
                        { id: 'rain', label: 'Rain', icon: <CloudRain className="h-2.5 w-2.5" /> },
                      ] as const
                    ).map((env) => {
                      const active = previewEnv === env.id;
                      return (
                        <button
                          key={env.id}
                          type="button"
                          onClick={() => {
                            onPlayClick();
                            setPreviewEnv(env.id);
                          }}
                          className={`flex h-6 cursor-pointer items-center justify-center gap-0.5 border text-[9px] font-bold ${
                            active
                              ? env.id === 'night'
                                ? 'border-[#fde047] bg-[#0f1c3f] text-[#fef08a]'
                                : env.id === 'rain'
                                  ? 'border-[#0369a1] bg-[#0284c7] text-white'
                                  : 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                              : 'border-[#966236] bg-[#f5e6c8] text-[#45230d] hover:bg-[#fff7e6]'
                          }`}
                        >
                          {env.icon}
                          <span>{env.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => turnPreview(-1)}
                    aria-label="Turn left"
                    className="wood-btn flex h-8 w-8 cursor-pointer items-center justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setPreviewWalking((w) => !w);
                    }}
                    className="wood-btn h-8 flex-1 cursor-pointer px-2 text-xs font-semibold whitespace-nowrap"
                  >
                    {previewWalking ? 'Walk' : 'Idle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => turnPreview(1)}
                    aria-label="Turn right"
                    className="wood-btn flex h-8 w-8 cursor-pointer items-center justify-center"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-full rounded-sm border border-[#c79963] bg-[#f5e6c8] px-2 py-1 text-center text-[10px] font-semibold text-[#522b14]">
                  +{slotStats.speedPct}% Spd
                  {slotStats.harvestBonus > 0 ? ` · +${slotStats.harvestBonus} Harv` : ''}
                  {slotStats.seaRes > 0 ? ` · +${slotStats.seaRes} Sea` : ''}
                </div>
              </div>

              {/* Full Interactive HSV Color Picker + Recent/Saved Bar */}
              <div className="flex flex-col justify-between gap-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#522b14]">HSV Shade Studio</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-6 w-6 shrink-0 border-2 border-[#45230d]"
                      style={{ backgroundColor: color }}
                      title={`Active color ${color}`}
                    />
                    <input
                      type="text"
                      aria-label="Hex color code"
                      maxLength={7}
                      value={hexInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setHexInput(raw);
                        if (/^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
                          selectHexColor(raw.trim(), false);
                        }
                      }}
                      onBlur={() => setHexInput(color)}
                      className="w-[74px] border-2 border-[#6b3c1b] bg-[#fff7e6] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#3d1e0b] uppercase focus:border-[#b86f34] focus:outline-none"
                    />
                    <button
                      type="button"
                      title="Save shade to Recent Colors"
                      onClick={() => {
                        onPlayClick();
                        commitHexToRecent(color);
                      }}
                      className="flex h-6 cursor-pointer items-center gap-0.5 border-2 border-[#6b3c1b] bg-[#fff3d6] px-1.5 text-[10px] font-bold text-[#45230d] hover:bg-[#ffe8b3]"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                {/* 2D Saturation / Brightness Gradient Box */}
                <div
                  ref={svBoxRef}
                  role="slider"
                  aria-label="Saturation and brightness picker"
                  tabIndex={0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    activeSvPointerIdRef.current = e.pointerId;
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                    draggingSvRef.current = true;
                    applySvPointer(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!draggingSvRef.current || activeSvPointerIdRef.current !== e.pointerId) return;
                    e.preventDefault();
                    applySvPointer(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    if (activeSvPointerIdRef.current === e.pointerId) {
                      draggingSvRef.current = false;
                      activeSvPointerIdRef.current = null;
                    }
                  }}
                  onPointerCancel={() => {
                    draggingSvRef.current = false;
                    activeSvPointerIdRef.current = null;
                  }}
                  className="relative h-[132px] w-full touch-none cursor-crosshair select-none border-2 border-[#45230d]"
                  style={{ backgroundColor: pureHueHex }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: 'linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0))',
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000)',
                    }}
                  />
                  <div
                    className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_#26140e]"
                    style={{
                      left: `${hsv.s * 100}%`,
                      top: `${(1 - hsv.v) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                {/* Bottom Hue Rainbow Slider */}
                <div>
                  <div
                    ref={hueBarRef}
                    role="slider"
                    aria-label="Hue spectrum slider"
                    aria-valuemin={0}
                    aria-valuemax={360}
                    aria-valuenow={Math.round(hsv.h)}
                    tabIndex={0}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      activeHuePointerIdRef.current = e.pointerId;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                      draggingHueRef.current = true;
                      applyHuePointer(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (!draggingHueRef.current || activeHuePointerIdRef.current !== e.pointerId) return;
                      e.preventDefault();
                      applyHuePointer(e.clientX);
                    }}
                    onPointerUp={(e) => {
                      if (activeHuePointerIdRef.current === e.pointerId) {
                        draggingHueRef.current = false;
                        activeHuePointerIdRef.current = null;
                      }
                    }}
                    onPointerCancel={() => {
                      draggingHueRef.current = false;
                      activeHuePointerIdRef.current = null;
                    }}
                    className="relative h-5 w-full touch-none cursor-ew-resize select-none border-2 border-[#45230d]"
                    style={{
                      background:
                        'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                    }}
                  >
                    <div
                      className="pointer-events-none absolute top-1/2 h-6 w-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-[#26140e] shadow-[0_0_0_1px_#ffffff]"
                      style={{
                        left: `${(hsv.h / 360) * 100}%`,
                        backgroundColor: pureHueHex,
                      }}
                    />
                  </div>
                </div>

                {/* Recent / Saved Colors Mini-Bar */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#6b3c1b]">
                    <span>Recent &amp; Saved Shades</span>
                    <span className="tabular-nums">H {Math.round(hsv.h)}° · S {Math.round(hsv.s * 100)}% · V {Math.round(hsv.v * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {recentColors.slice(0, 14).map((swatch) => {
                      const active = color.toLowerCase() === swatch.toLowerCase() && tool !== 'eraser';
                      return (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => {
                            onPlayClick();
                            selectHexColor(swatch, false);
                            if (tool !== 'pencil' && tool !== 'bucket') setTool('pencil');
                          }}
                          className={`h-6 w-full cursor-pointer border-2 ${
                            active
                              ? 'border-[#45230d] ring-2 ring-[#e6b23c]'
                              : 'border-[#6b3c1b] hover:brightness-110'
                          }`}
                          style={{ backgroundColor: swatch }}
                          title={swatch}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Name & Fabric Cost */}
            <div className="space-y-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
              <div>
                <label
                  htmlFor="custom-item-name"
                  className="mb-1 block text-xs font-bold text-[#522b14]"
                >
                  Design Name
                </label>
                <input
                  id="custom-item-name"
                  dir="auto"
                  type="text"
                  maxLength={32}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={`e.g. Coral ${SLOT_LABELS[slot].split(' ')[0]}`}
                  className="w-full border-2 border-[#6b3c1b] bg-[#fff7e6] px-3 py-1.5 text-sm font-bold text-[#3d1e0b] focus:border-[#b86f34] focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#522b14]">
                  <span>Edition Print Run</span>
                  <span dir="auto" className="text-[10px] font-semibold text-[#6b3c1b]">
                    Signed &quot;Designed by {playerName || 'Islander'}&quot;
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'unique', label: '1 of 1', sub: 'Unique Mythic' },
                      { id: 'limited', label: 'Limited (5)', sub: '5 Copies Max' },
                      { id: 'standard', label: 'Standard (10)', sub: '10 Copies Max' },
                    ] as const
                  ).map((ed) => {
                    const active = editionTier === ed.id;
                    return (
                      <button
                        key={ed.id}
                        type="button"
                        onClick={() => {
                          onPlayClick();
                          setEditionTier(ed.id);
                        }}
                        className={`cursor-pointer border-2 px-2 py-1.5 text-center transition-colors ${
                          active
                            ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                            : 'border-[#966236] bg-[#f5e6c8] hover:bg-[#fff7e6]'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#3d1e0b]">{ed.label}</div>
                        <div className="text-[10px] font-semibold text-[#6b3c1b]">{ed.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deep Sea Dye Infuse Effect Slot */}
              <div className="rounded-sm border border-[#966236] bg-[#f5e6c8] p-2">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-[#522b14]">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#0891b2]" />
                    <span>Infuse Effect (Deep Sea Dye Slot)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#6b3c1b]">
                    Optional · Costs 1 rare ocean ingredient
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => handleSelectInfuseEffect(null)}
                    className={`flex cursor-pointer flex-col items-center justify-center border-2 px-1.5 py-1.5 text-center transition-colors ${
                      infuseEffect === null
                        ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                        : 'border-[#966236] bg-[#ebd2a4] hover:bg-[#fff7e6]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[#3d1e0b]">None</span>
                    <span className="text-[9px] font-semibold text-[#6b3c1b]">Classic Fabric</span>
                  </button>
                  {OUTFIT_EFFECTS.map((eff) => {
                    const ownedAmt = rareIngredients[eff.id] || 0;
                    const active = infuseEffect === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        title={eff.description}
                        onClick={() => handleSelectInfuseEffect(eff.id)}
                        className={`flex cursor-pointer items-center gap-1.5 border-2 px-1.5 py-1 text-left transition-colors ${
                          active
                            ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                            : ownedAmt > 0
                              ? 'border-[#966236] bg-[#fff7e6] hover:bg-[#fef3c7]'
                              : 'border-[#966236]/75 bg-[#e6cea3] opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-[#6b3c1b]/50 bg-[#184b6b]/15">
                          {renderIngredientIcon ? (
                            renderIngredientIcon(eff.id, 18)
                          ) : (
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: eff.accentHex }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-bold text-[#3d1e0b]">{eff.label}</div>
                          <div
                            className={`tabular-nums text-[9px] font-bold ${
                              ownedAmt > 0 ? 'text-[#1c5e32]' : 'text-[#a62b2b]'
                            }`}
                          >
                            {eff.shortLabel} · ×{ownedAmt}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {infuseEffect && (
                  <div className="mt-1.5 text-[10px] font-semibold text-[#522b14]">
                    {OUTFIT_EFFECTS.find((e) => e.id === infuseEffect)?.description}
                  </div>
                )}
              </div>

              {/* Weather & Day/Night Reactive Secondary State */}
              <div className="rounded-sm border border-[#6366f1] bg-[#eef2ff] p-2.5">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-[#1e1b4b]">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-[#4f46e5]" />
                    <span>Secondary State (Weather &amp; Night Reactive)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#4338ca]">
                    Free · Triggers automatically at night or in rain
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {/* Night Mode Bioluminescent Toggle */}
                  <div className="flex flex-col justify-between gap-1.5 rounded-xs border border-[#818cf8] bg-white/85 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#1e1b4b]">
                        <Moon className="h-3.5 w-3.5 text-[#4f46e5]" />
                        <span>Night Mode Glow</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleNightNeon}
                        className={`h-6 cursor-pointer border-2 px-2 text-[10px] font-bold transition-colors ${
                          nightNeonEnabled
                            ? 'border-[#312e81] bg-[#4f46e5] text-white'
                            : 'border-[#94a3b8] bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {nightNeonEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <p className="text-[10px] leading-tight text-[#475569]">
                      Selected pixels switch to pulsing neon/bioluminescent glow in the dark.
                    </p>
                  </div>

                  {/* Rain Mode Auto Umbrella / Hood Selector */}
                  <div className="flex flex-col justify-between gap-1.5 rounded-xs border border-[#38bdf8] bg-white/85 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#0c4a6e]">
                        <CloudRain className="h-3.5 w-3.5 text-[#0284c7]" />
                        <span>Rain Mode Gear</span>
                      </span>
                      {rainMode && (
                        <button
                          type="button"
                          title="Match current swatch color"
                          onClick={() => {
                            onPlayClick();
                            setRainColor(color);
                            setPreviewEnv('rain');
                          }}
                          className="flex cursor-pointer items-center gap-1 border border-[#0284c7] bg-[#e0f2fe] px-1.5 py-0.5 text-[9px] font-bold text-[#0369a1]"
                        >
                          <span
                            className="h-2.5 w-2.5 border border-[#0c4a6e]"
                            style={{ backgroundColor: rainColor || color }}
                          />
                          <span>Use Swatch</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: null, label: 'None' },
                          { id: 'umbrella', label: 'Umbrella' },
                          { id: 'hood', label: 'Rain Hood' },
                        ] as const
                      ).map((opt) => {
                        const active = rainMode === opt.id;
                        return (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => handleSelectRainMode(opt.id)}
                            className={`flex h-6 cursor-pointer items-center justify-center gap-0.5 border text-[10px] font-bold ${
                              active
                                ? 'border-[#0c4a6e] bg-[#0284c7] text-white'
                                : 'border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1] hover:bg-[#e0f2fe]'
                            }`}
                          >
                            {opt.id === 'umbrella' && <Umbrella className="h-2.5 w-2.5" />}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className={canAffordFabric && canAffordEffect ? 'text-[#1c5e32]' : 'text-[#a62b2b]'}>
                  Cost: {fabricCost} Fabric (Have {fabricCount})
                  {infuseEffect
                    ? ` + 1 ${OUTFIT_EFFECTS.find((e) => e.id === infuseEffect)?.ingredientName} (Have ${
                        rareIngredients[infuseEffect] || 0
                      })`
                    : ''}
                </span>
                <label className="flex cursor-pointer items-center gap-1.5 text-[#45230d]">
                  <input
                    type="checkbox"
                    checked={equipNow}
                    onChange={(e) => setEquipNow(e.target.checked)}
                    className="h-4 w-4 accent-[#b86f34]"
                  />
                  <span>Equip immediately</span>
                </label>
              </div>

              {errorMsg && (
                <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-[#c79963] pt-2">
              <button
                type="button"
                onClick={() => {
                  onPlayClick();
                  onClose();
                }}
                className="wood-btn h-10 cursor-pointer px-4 text-xs font-bold whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAffordFabric || !canAffordEffect || bagFull}
                onClick={handleSaveCreation}
                className={`flex h-10 items-center gap-1.5 px-5 text-sm font-bold whitespace-nowrap ${
                  canAffordFabric && canAffordEffect && !bagFull
                    ? 'wood-btn cursor-pointer'
                    : 'cursor-not-allowed border-2 border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-75'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {infuseEffect
                    ? `Craft + Infuse (${fabricCost} Fabric + 1 Dye)`
                    : `Craft Design (${fabricCost} Fabric)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
