/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Shirt,
  Hammer,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Save,
  ShoppingBag,
  Tag,
  Users,
  Palette,
  Crown,
  Check,
  Trophy,
  MessageCircle,
  Anchor,
  Heart,
  Copy,
  Gavel,
  Gamepad2,
  Hand,
  Store,
  Package,
  Sun,
  Moon,
  CloudRain,
  Camera,
  Newspaper,
  BookOpen,
} from 'lucide-react';
import {
  clampShopTier,
  DESIGN_FABRIC_COST,
  formatEditionBadge,
  getOutfitEffectMeta,
  getReactiveBadges,
  getShopTierSpec,
  MAP_COLS,
  MAP_ROWS,
  PIXEL_SCALE,
  TILE_SIZE,
  type BoatCatalogEntry,
  type BoatKind,
  type OutfitEffectType,
  type PetKind,
  type ShopTier,
} from './constants';
import {
  testFirestoreConnection,
  subscribeCloudHealth,
  getOrCreatePlayerId,
  getStoredNickname,
  storeNickname,
  fetchPlayerProfile,
  savePlayerProfile,
  subscribePlayerProfile,
  syncOnlinePlayer,
  removeOnlinePlayer,
  subscribeOnlinePlayers,
  createWorldStructure,
  updateMannequinListing,
  subscribeWorldStructures,
  upgradeWorldShopTier,
  relocateWorldShopAndContents,
  purchaseFromPlayerMannequin,
  fetchLeaderboardTraders,
  subscribeCurrentAuction,
  startRunwayAuction,
  placeAuctionBid,
  settleCurrentAuction,
  subscribeMagazines,
  publishMagazine,
  purchaseMagazine,
  likeMagazine,
  type CloudPlayerProfile,
  type CloudOnlinePlayer,
  type CloudWorldStructure,
  type CloudAppearance,
  type CloudInventory,
  type CloudListing,
  type CloudAuction,
  type CloudMagazine,
  type MagazinePage,
  type MagazineTheme,
  type LeaderboardTrader,
  type WorldStructureKind,
} from './firebase';
import {
  createStarterClothingItems,
  LUXURY_CATALOG,
  RIVAL_ITEMS,
  SLOT_LABELS,
  drawClothingItemOnSprite,
  drawClothingOnMannequin,
  drawGlowingPearlsSpriteOverlay,
  drawGlowingPearlsMannequinOverlay,
  drawNightNeonSpriteOverlay,
  drawNightNeonMannequinOverlay,
  drawRainReactiveOverlay,
  drawRainReactiveMannequinOverlay,
  drawOutfitAmbientEffects,
  getActiveRainConfig,
  getItemsActiveEffects,
  hasNightNeonItems,
  renderClothingThumbnail,
  generateItemUid,
  type ClothingItem,
  type ClothingSlot,
  type GearStats,
  type LuxuryCatalogEntry,
  type LuxuryRarity,
} from './clothing';
import {
  BOAT_CATALOG,
  doesItemMatchTrend,
  drawFloatingEmoji,
  drawRunwayStageOverlay,
  drawSpeechBubble,
  getBoatCatalogEntry,
  getCurrentFashionTrend,
  normalizePetKind,
  PET_CATALOG,
  QUICK_EMOTES,
  renderPetSprite,
  renderWatercraftSprite,
} from './community';
import { DesignStudioModal } from './DesignStudioModal';
import {
  BoatDockModal,
  LeaderboardShopsModal,
  RunwayAuctionModal,
  ShopManagementModal,
  type OnlineShopDirectoryEntry,
  type ShopDecorCatalogItem,
} from './CommunityModals';
import {
  LookbookCreatorModal,
  NewsstandModal,
  type LookbookSnapshot,
} from './MagazineModals';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallControls';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const WORLD_W = MAP_COLS * TILE_SIZE;
const WORLD_H = MAP_ROWS * TILE_SIZE;
const REEF_START_COL = 114;
const REEF_BOUNDARY_X = (REEF_START_COL - 0.5) * TILE_SIZE;
const RESOURCE_RESPAWN_SEC = 20;
const SAVE_STORAGE_KEY = 'coral_cove_sandbox_v5';
const SNAPSHOTS_STORAGE_KEY = 'coral_cove_snapshots_v1';

const coastColAt = (r: number) =>
  Math.round(74 + Math.sin(r * 0.08) * 4.5 + Math.cos(r * 0.19) * 2.2);

const PLAYER_SPAWN_COL = coastColAt(58) - 5;
const PLAYER_SPAWN_ROW = 58;
const NEWSSTAND_COL = PLAYER_SPAWN_COL - 6;
const NEWSSTAND_ROW = PLAYER_SPAWN_ROW - 4;
const NEWSSTAND_CENTER_X = (NEWSSTAND_COL + 1.5) * TILE_SIZE;
const NEWSSTAND_CENTER_Y = (NEWSSTAND_ROW + 1) * TILE_SIZE;
const RUNWAY_STAGE_COL = PLAYER_SPAWN_COL - 14;
const RUNWAY_STAGE_ROW = PLAYER_SPAWN_ROW - 6;
const RUNWAY_PODIUM_X = (RUNWAY_STAGE_COL + 3.5) * TILE_SIZE;
const RUNWAY_PODIUM_Y = (RUNWAY_STAGE_ROW + 2) * TILE_SIZE;
const BOAT_DOCK_ROW = 65;
const BOAT_DOCK_COL = coastColAt(BOAT_DOCK_ROW) - 1;
const LINA_PIER_ROW = 26;
const LINA_BOUTIQUE_COL = coastColAt(LINA_PIER_ROW) + 5;
const LINA_BOUTIQUE_ROW = 24;
const SARA_PIER_ROW = 90;
const SARA_BOUTIQUE_COL = coastColAt(SARA_PIER_ROW) + 5;
const SARA_BOUTIQUE_ROW = 88;

type Direction = 'down' | 'up' | 'left' | 'right';

const enum TileType {
  GRASS = 0,
  GRASS_FLOWER = 1,
  DIRT_PATH = 2,
  SAND = 3,
  SHALLOW_WATER = 4,
  DEEP_WATER = 5,
  DOCK = 6,
  REEF_WATER = 7,
  REEF_CORAL = 8,
  BOUTIQUE_FLOOR = 9,
}

type HairStyle = 'long_wavy' | 'twin_tails' | 'cozy_bob' | 'high_bun' | 'braided_crown';

type CharacterAppearance = CloudAppearance;
type MannequinListing = CloudListing;

interface SkinTone {
  id: string;
  name: string;
  base: string;
  shade: string;
  highlight: string;
  blush: string;
  mouth: string;
}

interface ColorSwatch {
  id: string;
  name: string;
  main: string;
  shade: string;
  light: string;
  trim: string;
}

type PropKind =
  | 'palm'
  | 'cotton_bush'
  | 'dye_bush'
  | 'rock'
  | 'shell_pink'
  | 'shell_conch'
  | 'starfish'
  | 'golden_oyster'
  | 'royal_silk_coral'
  | 'glowing_pearl_node'
  | 'starlight_coral_node'
  | 'seafoam_essence_node'
  | 'sunset_amber_node'
  | 'shop_wall'
  | 'shop_wall_t2'
  | 'boutique_backwall'
  | 'boutique_pillar_l'
  | 'boutique_pillar_r'
  | 'display_table'
  | 'mannequin'
  | 'changing_booth'
  | 'vanity_mirror'
  | 'clothing_rack'
  | 'cash_counter'
  | 'potted_plant'
  | 'lantern_post'
  | 'rug_pink'
  | 'rug_teal'
  | 'rug_gold'
  | 'newsstand_kiosk';

interface PropObject {
  id: string;
  kind: PropKind;
  col: number;
  row: number;
  x: number;
  y: number;
  solid: boolean;
  radius: number;
  variant: number;
  respawnTimer: number;
  owner?: string;
  ownerId?: string;
  fromCloud?: boolean;
  shopTier?: ShopTier;
  shopStructId?: string;
  listing?: MannequinListing | null;
}

interface RemotePlayerState {
  playerId: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dir: Direction;
  isMoving: boolean;
  animTime: number;
  appearance: CharacterAppearance;
  chatText?: string | null;
  chatAt?: number | null;
  emoteEmoji?: string | null;
  emoteAt?: number | null;
  isBoating?: boolean;
  equippedBoat?: BoatKind | null;
  equippedPet?: PetKind | null;
  runwayShowAt?: number | null;
  petX: number;
  petY: number;
  petDir: Direction;
  petAnim: number;
  petHeartUntil?: number;
  lastServerUpdatedMs: number;
  lastSeenLocalMs: number;
}

interface CharacterEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  animTime: number;
  isMoving: boolean;
  appearance: CharacterAppearance;
  isPlayer: boolean;
  swingTimer?: number;
  swingDir?: Direction;
  targetX?: number;
  targetY?: number;
  waitTimer?: number;
  emote?: 'heart' | 'music' | 'shell' | 'wave' | 'coin' | 'nope' | null;
  emoteTimer?: number;
  targetMannequinId?: string;
  isBoating?: boolean;
  equippedBoat?: BoatKind | null;
  chatText?: string | null;
  emoteEmoji?: string | null;
  isShowcasing?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape?: 'square' | 'star' | 'bubble';
  gravity?: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Bobber {
  x: number;
  y: number;
  timer: number;
}

type DecorKind =
  | 'changing_booth'
  | 'vanity_mirror'
  | 'clothing_rack'
  | 'cash_counter'
  | 'potted_plant'
  | 'lantern_post'
  | 'rug_pink'
  | 'rug_teal'
  | 'rug_gold';

type ItemKind =
  | 'wood'
  | 'fabric'
  | 'pearls'
  | 'dyes'
  | 'golden_pearls'
  | 'royal_silk'
  | 'glowing_pearls'
  | 'starlight_coral'
  | 'seafoam_essence'
  | 'sunset_amber'
  | 'dock_plank'
  | 'shop_wall'
  | 'mannequin'
  | DecorKind
  | 'hatchet'
  | 'fishing_rod'
  | 'watering_can';

type InventoryCounts = CloudInventory;

const DEFAULT_INVENTORY: InventoryCounts = {
  wood: 6,
  fabric: 5,
  pearls: 2,
  dyes: 1,
  golden_pearls: 0,
  royal_silk: 0,
  glowing_pearls: 0,
  starlight_coral: 0,
  seafoam_essence: 0,
  sunset_amber: 0,
  dock_plank: 8,
  shop_wall: 1,
  mannequin: 1,
  changing_booth: 0,
  vanity_mirror: 0,
  clothing_rack: 0,
  cash_counter: 0,
  potted_plant: 0,
  lantern_post: 0,
  rug_pink: 0,
  rug_teal: 0,
  rug_gold: 0,
};

const DECOR_KINDS: DecorKind[] = [
  'changing_booth',
  'vanity_mirror',
  'clothing_rack',
  'cash_counter',
  'potted_plant',
  'lantern_post',
  'rug_pink',
  'rug_teal',
  'rug_gold',
];

function isDecorKind(k: unknown): k is DecorKind {
  return typeof k === 'string' && DECOR_KINDS.includes(k as DecorKind);
}

function isRugKind(k: unknown): boolean {
  return k === 'rug_pink' || k === 'rug_teal' || k === 'rug_gold';
}

interface HotbarSlotDef {
  kind: ItemKind;
  name: string;
  stackable: boolean;
}

// ============================================================================
// PALETTES, GEAR STATS & CUSTOMIZATION CATALOG
// ============================================================================

const SKIN_TONES: SkinTone[] = [
  { id: 'porcelain', name: 'Porcelain', base: '#fde2cf', shade: '#e9baa0', highlight: '#fff1e6', blush: '#f7a6a1', mouth: '#c96f6b' },
  { id: 'peach', name: 'Peach', base: '#f7cbb0', shade: '#dc9f7d', highlight: '#ffe2ce', blush: '#f28f88', mouth: '#bd655e' },
  { id: 'warm_sand', name: 'Warm Sand', base: '#e9b78e', shade: '#c78c62', highlight: '#f5cfa8', blush: '#e08074', mouth: '#ab594c' },
  { id: 'honey_tan', name: 'Honey Tan', base: '#d1986a', shade: '#ad7246', highlight: '#e3b084', blush: '#c76c5b', mouth: '#94473a' },
  { id: 'caramel', name: 'Caramel', base: '#ac7249', shade: '#87512e', highlight: '#c48b61', blush: '#9e5043', mouth: '#783429' },
  { id: 'espresso', name: 'Espresso', base: '#794a30', shade: '#59311c', highlight: '#946144', blush: '#7c3c34', mouth: '#57221c' },
];

const HAIR_COLORS: ColorSwatch[] = [
  { id: 'chestnut', name: 'Chestnut', main: '#7a4528', shade: '#522b16', light: '#a1613b', trim: '#3d1d0d' },
  { id: 'honey', name: 'Honey Blonde', main: '#e6b85c', shade: '#be8a34', light: '#fae08c', trim: '#96661c' },
  { id: 'raven', name: 'Raven Black', main: '#2c2c38', shade: '#181822', light: '#4b4c63', trim: '#101018' },
  { id: 'ginger', name: 'Copper Ginger', main: '#d16135', shade: '#9e3e1c', light: '#ed895c', trim: '#782910' },
  { id: 'rose', name: 'Rose Pink', main: '#e87ca0', shade: '#be4e74', light: '#ffa8c5', trim: '#943255' },
  { id: 'mint', name: 'Seafoam Mint', main: '#64bfa4', shade: '#3c947b', light: '#93e3c9', trim: '#286e5a' },
  { id: 'lavender', name: 'Lavender', main: '#9b7ede', shade: '#6f53b5', light: '#c4b0fa', trim: '#523a8f' },
  { id: 'silver', name: 'Silver Ash', main: '#c5ccd9', shade: '#939cb0', light: '#e8edf5', trim: '#697287' },
];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'long_wavy', label: 'Long Wavy' },
  { id: 'twin_tails', label: 'Twin Tails' },
  { id: 'cozy_bob', label: 'Cozy Bob' },
  { id: 'high_bun', label: 'High Bun' },
  { id: 'braided_crown', label: 'Braided' },
];

function formatStatsLine(stats: GearStats): string {
  const parts: string[] = [];
  if (stats.speedPct > 0) parts.push(`+${stats.speedPct}% Speed`);
  if (stats.harvestBonus > 0) parts.push(`+${stats.harvestBonus} Harvest`);
  if (stats.seaRes > 0) parts.push(`+${stats.seaRes} Sea Breeze Res`);
  return parts.length > 0 ? parts.join(' · ') : 'Casual Style';
}

const HOTBAR_GATHER: HotbarSlotDef[] = [
  { kind: 'wood', name: 'Palm Wood', stackable: true },
  { kind: 'fabric', name: 'Cotton Fabric', stackable: true },
  { kind: 'pearls', name: 'Sea Pearls', stackable: true },
  { kind: 'dyes', name: 'Island Dyes', stackable: true },
  { kind: 'dock_plank', name: 'Wooden Floor / Dock', stackable: true },
  { kind: 'shop_wall', name: 'Boutique Shop Kit', stackable: true },
];

const HOTBAR_BUILD: HotbarSlotDef[] = [
  { kind: 'dock_plank', name: 'Wooden Floor / Dock', stackable: true },
  { kind: 'shop_wall', name: 'Boutique Shop Kit', stackable: true },
  { kind: 'mannequin', name: 'Display Mannequin', stackable: true },
  { kind: 'hatchet', name: 'Gather Hatchet', stackable: false },
  { kind: 'fishing_rod', name: 'Bamboo Rod', stackable: false },
  { kind: 'watering_can', name: 'Copper Can', stackable: false },
];

const HOTBAR_BUILD_DECOR: HotbarSlotDef[] = [
  { kind: 'changing_booth', name: 'Changing Booth', stackable: true },
  { kind: 'vanity_mirror', name: 'Vanity Mirror', stackable: true },
  { kind: 'clothing_rack', name: 'Clothing Rack', stackable: true },
  { kind: 'cash_counter', name: 'Cash Register Counter', stackable: true },
  { kind: 'potted_plant', name: 'Potted Tropical Plant', stackable: true },
  { kind: 'lantern_post', name: 'Glowing Lantern Post', stackable: true },
  { kind: 'rug_pink', name: 'Pink Woven Rug', stackable: true },
  { kind: 'rug_teal', name: 'Teal Woven Rug', stackable: true },
  { kind: 'rug_gold', name: 'Gold Woven Rug', stackable: true },
];

const HOTBAR_BUILD_ALL: HotbarSlotDef[] = [...HOTBAR_BUILD, ...HOTBAR_BUILD_DECOR];

interface CraftRecipe {
  id: string;
  name: string;
  description: string;
  iconKind: ItemKind;
  cost: Partial<Record<'wood' | 'fabric' | 'pearls' | 'dyes' | 'golden_pearls' | 'royal_silk', number>>;
  goldPrice?: number;
  outputItem: keyof InventoryCounts;
  outputQty: number;
}

const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_dock',
    name: 'Wooden Floor / Dock Planks ×2',
    description: 'Build wooden floors on grass & sand, or boardwalk piers out over ocean water.',
    iconKind: 'dock_plank',
    cost: { wood: 2 },
    outputItem: 'dock_plank',
    outputQty: 2,
  },
  {
    id: 'craft_wall',
    name: 'Boutique Shop Kit (4×3)',
    description: 'Open-front 4×3 shop for grass, sand, or ocean docks with wood floor, curtains & lanterns.',
    iconKind: 'shop_wall',
    cost: { wood: 4, fabric: 2 },
    outputItem: 'shop_wall',
    outputQty: 1,
  },
  {
    id: 'craft_mannequin',
    name: 'Display Mannequin',
    description: 'Place on grass, sand, rugs, or docks to sell or flip outfits at any Gold price!',
    iconKind: 'mannequin',
    cost: { wood: 3, fabric: 1 },
    outputItem: 'mannequin',
    outputQty: 1,
  },
  {
    id: 'craft_changing_booth',
    name: 'Changing Booth / Fitting Curtain',
    description: 'Cozy striped fitting room stall with brass curtain rod for boutique interiors.',
    iconKind: 'changing_booth',
    cost: { wood: 3, fabric: 3 },
    goldPrice: 180,
    outputItem: 'changing_booth',
    outputQty: 1,
  },
  {
    id: 'craft_vanity_mirror',
    name: 'Full-Length Vanity Mirror',
    description: 'Carved wooden mirror with gold trim so shoppers can admire their pixel outfits.',
    iconKind: 'vanity_mirror',
    cost: { wood: 2, pearls: 1 },
    goldPrice: 160,
    outputItem: 'vanity_mirror',
    outputQty: 1,
  },
  {
    id: 'craft_clothing_rack',
    name: 'Boutique Clothing Rack',
    description: 'Display stand filled with colorful hanging shirts and coastal summer dresses.',
    iconKind: 'clothing_rack',
    cost: { wood: 2, fabric: 2, dyes: 1 },
    goldPrice: 170,
    outputItem: 'clothing_rack',
    outputQty: 1,
  },
  {
    id: 'craft_cash_counter',
    name: 'Cash Register Counter',
    description: 'Polished oak checkout counter topped with an antique brass register.',
    iconKind: 'cash_counter',
    cost: { wood: 3, pearls: 1 },
    goldPrice: 200,
    outputItem: 'cash_counter',
    outputQty: 1,
  },
  {
    id: 'craft_potted_plant',
    name: 'Potted Tropical Plant',
    description: 'Lush palm & monstera leaves in a warm terracotta planter.',
    iconKind: 'potted_plant',
    cost: { wood: 1, dyes: 1 },
    goldPrice: 90,
    outputItem: 'potted_plant',
    outputQty: 1,
  },
  {
    id: 'craft_lantern_post',
    name: 'Glowing Lantern Post',
    description: 'Tall wooden boardwalk post with a warm golden-halo lantern for cozy evenings.',
    iconKind: 'lantern_post',
    cost: { wood: 2, pearls: 1 },
    goldPrice: 140,
    outputItem: 'lantern_post',
    outputQty: 1,
  },
  {
    id: 'craft_rug_pink',
    name: 'Pink Woven Rug ×2',
    description: 'Walkable sakura-pink floor carpet with fringed cream trim.',
    iconKind: 'rug_pink',
    cost: { fabric: 2, dyes: 1 },
    goldPrice: 110,
    outputItem: 'rug_pink',
    outputQty: 2,
  },
  {
    id: 'craft_rug_teal',
    name: 'Teal Woven Rug ×2',
    description: 'Walkable seafoam-teal floor carpet woven for coastal shops and docks.',
    iconKind: 'rug_teal',
    cost: { fabric: 2, dyes: 1 },
    goldPrice: 110,
    outputItem: 'rug_teal',
    outputQty: 2,
  },
  {
    id: 'craft_rug_gold',
    name: 'Gold Woven Rug ×2',
    description: 'Walkable royal-gold woven runner rug that elevates any boutique floor.',
    iconKind: 'rug_gold',
    cost: { fabric: 2, dyes: 1 },
    goldPrice: 110,
    outputItem: 'rug_gold',
    outputQty: 2,
  },
];

const STRUCTURE_RECIPES = CRAFT_RECIPES.filter((r) => !isDecorKind(r.outputItem));
const DECOR_RECIPES = CRAFT_RECIPES.filter((r) => isDecorKind(r.outputItem));

// ============================================================================
// DETERMINISTIC PRNG & AUDIO SYNTHESIZER
// ============================================================================

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

class CozyAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playClick() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.05);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playWoodPlace() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playHarvest() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playChime() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.05, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playCoin() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [987.77, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.06, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.24);
    });
  }

  public playSplash() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }
}

const sfx = new CozyAudio();

// ============================================================================
// PROCEDURAL PIXEL ART ENGINE (CHARACTERS, TILES, PROPS, MANNEQUINS)
// ============================================================================

const spriteCache = new Map<string, HTMLCanvasElement>();

function makeOffscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  offsetX = 0,
  offsetY = 0,
  flipX = false
) {
  const h = rows.length;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    const w = row.length;
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      const dx = flipX ? w - 1 - x : x;
      ctx.fillRect(offsetX + dx, offsetY + y, 1, 1);
    }
  }
}

const BODY_DOWN_HEAD = [
  '................',
  '................',
  '................',
  '.....OOOOOO.....',
  '....OSSSSSSO....',
  '...OSSSSSSSSO...',
  '...OSSSSSSSSO...',
  '...OSWESSEWSO...',
  '...OSEESSEESO...',
  '...OBBSmmSBBO...',
  '....OSSSSSSO....',
  '.....OOssOO.....',
];

const BODY_UP_HEAD = [
  '................',
  '................',
  '................',
  '.....OOOOOO.....',
  '....OssssssO....',
  '...OssssssssO...',
  '...OssssssssO...',
  '...OssssssssO...',
  '...OssssssssO...',
  '...OssssssssO...',
  '....OssssssO....',
  '.....OOssOO.....',
];

const BODY_RIGHT_HEAD = [
  '................',
  '................',
  '................',
  '.....OOOOOO.....',
  '....OSSSSSSO....',
  '....OSSSSSSSO...',
  '....OSSSSSSSO...',
  '....OSSSSSWEO...',
  '....OSSSSSEEO...',
  '....OSSSSBBmO...',
  '.....OSSSSSO....',
  '.....OOssOO.....',
];

const BODY_TORSO_FRONT = [
  '...OOSSSSSSOO...',
  '..OSSOSSSSOSSO..',
  '..OSSOSSSSOSSO..',
  '..OSSOSSSSOSSO..',
  '..OssOssssOssO..',
  '...OOSSSSSSOO...',
  '....OSSSSSSO....',
];

const BODY_TORSO_SIDE = [
  '....OOSSSSOO....',
  '....OSSSSSSO....',
  '....OSSOSSSO....',
  '....OSSOSSSO....',
  '....OssOsssO....',
  '....OOSSSSOO....',
  '.....OSSSSO.....',
];

const LEGS_FRONT_IDLE = [
  '....OSSOOSSO....',
  '....OSSOOSSO....',
  '....OssOOssO....',
  '................',
  '................',
];

const LEGS_FRONT_STEP1 = [
  '....OSSOOSSO....',
  '....OssOOSSO....',
  '....OOOOOssO....',
  '................',
  '................',
];

const LEGS_FRONT_STEP2 = [
  '....OSSOOSSO....',
  '....OSSOOssO....',
  '....OssOOOOO....',
  '................',
  '................',
];

const LEGS_SIDE_IDLE = [
  '.....OSSSSO.....',
  '.....OSSSSO.....',
  '.....OssssO.....',
  '................',
  '................',
];

const LEGS_SIDE_STEP1 = [
  '....OSSOSSO.....',
  '...OSSO..SSO....',
  '...OssO..ssO....',
  '................',
  '................',
];

const LEGS_SIDE_STEP2 = [
  '.....OSSOSSO....',
  '....OSSO..SSO...',
  '....OssO..ssO...',
  '................',
  '................',
];

const UNDERLAYER_FRONT = [
  '....OOWWWWOO....',
  '....OWWWWWWO....',
  '....OWWWWWWO....',
  '....ODDDDDDO....',
  '....ODDDDDDO....',
  '....ODDOODDO....',
  '.....OOOOOO.....',
];

const UNDERLAYER_SIDE = [
  '.....OWWWOO.....',
  '.....OWWWWO.....',
  '.....OWWWWO.....',
  '.....ODDDDO.....',
  '.....ODDDDO.....',
  '.....ODDDDO.....',
  '.....OOOOOO.....',
];

const UNDERLAYER_PALETTE: Record<string, string> = {
  O: '#3e2c22',
  W: '#fff6e8',
  D: '#dfd0ba',
};

function getHairMatrix(style: HairStyle, dir: 'down' | 'up' | 'side'): string[] {
  if (dir === 'up') {
    switch (style) {
      case 'long_wavy':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMMHO..', '..OMMMMMMMMMMO..', '..OMMMMMMMMMMO..', '..OMMDDDDDDMMO..', '..OMDDDDDDDDMO..', '..OMDDDDDDDDMO..', '..OMDDDDDDDDMO..', '...OMDDDDDDMO...', '...OMDDDDDDMO...', '....OMDDDDMO....', '.....OOOOOO.....'];
      case 'twin_tails':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '.OOMMMMMMMMMMOO.', 'OMMMOMMMMMMOMMMO', 'OMDDOMMMMMMODDMO', 'OMDDOMDDDDMODDMO', 'ODDDOMDDDDMODDDO', '.OO.OMDDDDMO.OO.', '.ODDOMDDDDMODDO.', '..OO.OOOOOO.OO..'];
      case 'cozy_bob':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMMHO..', '..OMMMMMMMMMMO..', '..OMMMMMMMMMMO..', '..OMDDDDDDDDMO..', '..OMDDDDDDDDMO..', '...ODDDDDDDDO...', '....OOOOOOOO....'];
      case 'high_bun':
        return ['.....OOOOOO.....', '....OHHHHHHO....', '....OMMMMMMO....', '...OOHHHHHHOO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMMHO..', '..OMMMMMMMMMMO..', '..OMMMMMMMMMMO..', '..OMDDDDDDDDMO..', '...ODDDDDDDDO...', '....OOOOOOOO....'];
      case 'braided_crown':
        return ['................', '....OOOOOOOO....', '...OHHDDDDHHO...', '..OHMMMMMMMMHO..', '..OHMMMMMMMMHO..', '..OMMMMMMMMMMO..', '..OMMMMMMMMMMO..', '..OMDDDDDDDDMO..', '...ODDDDDDDDO...', '....OOMMMDOO....', '.....OMMDO......', '.....OMDDO......', '......OOO.......'];
    }
  }

  if (dir === 'side') {
    switch (style) {
      case 'long_wavy':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMHHO..', '..OMMMMMMMMDMM..', '..OMMMMMO.......', '..OMMMMMO.......', '..OMDDDMO.......', '..OMDDDMO.......', '..OMDDDO........', '..ODDDDO........', '...ODDO.........', '....OO..........'];
      case 'twin_tails':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '.OOHMMMMMMMHHO..', 'OMMMOMMMMMMDMM..', 'OMDDOMMMO.......', 'OMDDOMMMO.......', 'ODDDOMDMO.......', '.ODDO.OO........', '..OO............'];
      case 'cozy_bob':
        return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMHHO..', '..OMMMMMMMMDMM..', '..OMMMMMO.......', '..OMDDDMO.......', '..OMDDDMO.......', '...OOOOO........'];
      case 'high_bun':
        return ['....OOOOOO......', '...OHHHHHHO.....', '...OMMMMMMO.....', '...OOHHHHHHOO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMHHO..', '..OMMMMMMMMDMM..', '..OMMMMMO.......', '..OMDDDO........', '...OOOO.........'];
      case 'braided_crown':
        return ['................', '....OOOOOOOO....', '...OHHDDDDHHO...', '..OHHHHHHHHHHO..', '..OHMMMMMMMHHO..', '..OMMMMMMMMDMM..', '..OMMMMMO.......', '..OMDDMO........', '..OMDDO.........', '...ODDO.........', '...ODDO.........', '....OO..........'];
    }
  }

  switch (style) {
    case 'long_wavy':
      return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMHHHHMMHO..', '..OMMD.MM.DMMO..', '..OMD......DMO..', '..OMD......DMO..', '..OMDO....ODMO..', '..OMDO....ODMO..', '..ODDO....ODDO..', '..ODDO....ODDO..', '...OO......OO...'];
    case 'twin_tails':
      return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '.OOHMMHHHHMMHOO.', 'OMMOMMMMMMMMOMMO', 'OMDOM......MODMO', 'ODDOO......OODDO', 'ODDO........ODDO', '.OO..........OO.'];
    case 'cozy_bob':
      return ['................', '....OOOOOOOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHMMHHHHMMHO..', '..OMMMMDD..MMO..', '..OMD......DMO..', '..OMD......DMO..', '..ODDO....ODDO..', '...OO......OO...'];
    case 'high_bun':
      return ['.....OOOOOO.....', '....OHHHHHHO....', '....OMMMMMMO....', '...OOHHHHHHOO...', '..OHHHHHHHHHHO..', '..OMMD.MM.DMMO..', '..OMD......DMO..', '..OMD......DMO..', '...OO......OO...'];
    case 'braided_crown':
      return ['................', '....OOOOOOOO....', '...OHHDDDDHHO...', '..OHHHHHHHHHHO..', '..OHMMHHHHMMHO..', '..OMMD.DD.DMMO..', '..OMD......DMO..', '..OMDO.....OO...', '..ODDO..........', '...OO...........'];
  }
}

function itemCacheSig(item: ClothingItem | null | undefined, sunsetPhase = 0): string {
  if (!item) return '0';
  const effTag = item.effect === 'sunset_amber' ? `:sa${sunsetPhase}` : '';
  return `${item.pixels}:${item.palette.join(',')}${effTag}`;
}

function renderCharacterSprite(
  appearance: CharacterAppearance,
  dir: Direction,
  frame: number,
  sunsetPhase = 0
): HTMLCanvasElement {
  const key = [
    appearance.skinId,
    appearance.hairStyle,
    appearance.hairColorId,
    itemCacheSig(appearance.hat, sunsetPhase),
    itemCacheSig(appearance.top, sunsetPhase),
    itemCacheSig(appearance.bottom, sunsetPhase),
    itemCacheSig(appearance.dress, sunsetPhase),
    itemCacheSig(appearance.shoes, sunsetPhase),
    dir,
    frame,
  ].join('|');

  const cached = spriteCache.get(key);
  if (cached) return cached;

  if (spriteCache.size > 1400) {
    spriteCache.clear();
  }

  const [canvas, ctx] = makeOffscreen(16, 24);

  const skin = SKIN_TONES.find((s) => s.id === appearance.skinId) || SKIN_TONES[1];
  const hairColor = HAIR_COLORS.find((h) => h.id === appearance.hairColorId) || HAIR_COLORS[0];

  const flipX = dir === 'left';
  const normDir: 'down' | 'up' | 'side' = dir === 'left' || dir === 'right' ? 'side' : dir;
  const bob = frame === 1 || frame === 3 ? 1 : 0;

  const skinPalette: Record<string, string> = {
    O: '#2e1a12',
    S: skin.base,
    s: skin.shade,
    h: skin.highlight,
    E: '#241410',
    W: '#ffffff',
    B: skin.blush,
    m: skin.mouth,
  };

  const hairPalette: Record<string, string> = {
    O: '#26140e',
    M: hairColor.main,
    D: hairColor.shade,
    H: hairColor.light,
  };

  // 1. Legs
  const legsMatrix =
    normDir === 'side'
      ? frame === 1
        ? LEGS_SIDE_STEP1
        : frame === 3
          ? LEGS_SIDE_STEP2
          : LEGS_SIDE_IDLE
      : frame === 1
        ? LEGS_FRONT_STEP1
        : frame === 3
          ? LEGS_FRONT_STEP2
          : LEGS_FRONT_IDLE;
  drawPixelMatrix(ctx, legsMatrix, skinPalette, 0, 19, flipX);

  // 2. Shoes Layer (feet always under torso; wings behind body on down/side)
  if (appearance.shoes) {
    drawClothingItemOnSprite(
      ctx,
      appearance.shoes,
      dir,
      frame,
      dir === 'up' ? 'feet' : 'all',
      sunsetPhase
    );
  }

  // 3. Base Torso & Arms + cozy base underlayer
  const torsoMat = normDir === 'side' ? BODY_TORSO_SIDE : BODY_TORSO_FRONT;
  drawPixelMatrix(ctx, torsoMat, skinPalette, 0, 12 + bob, flipX);
  drawPixelMatrix(
    ctx,
    normDir === 'side' ? UNDERLAYER_SIDE : UNDERLAYER_FRONT,
    UNDERLAYER_PALETTE,
    0,
    13 + bob,
    flipX
  );

  // 4. Bottom + Top OR Full Dress
  if (appearance.dress) {
    drawClothingItemOnSprite(ctx, appearance.dress, dir, frame, 'all', sunsetPhase);
  } else {
    if (appearance.bottom) {
      drawClothingItemOnSprite(ctx, appearance.bottom, dir, frame, 'all', sunsetPhase);
    }
    if (appearance.top) {
      drawClothingItemOnSprite(ctx, appearance.top, dir, frame, 'all', sunsetPhase);
    }
  }

  // 5. Head Layer
  const headMat = normDir === 'up' ? BODY_UP_HEAD : normDir === 'side' ? BODY_RIGHT_HEAD : BODY_DOWN_HEAD;
  drawPixelMatrix(ctx, headMat, skinPalette, 0, bob, flipX);

  // 6. Hair Layer
  const hairMat = getHairMatrix(appearance.hairStyle as HairStyle, normDir);
  drawPixelMatrix(ctx, hairMat, hairPalette, 0, 1 + bob, flipX);

  // 6b. Back Wings overlay when facing away (up) so wings display across the back
  if (dir === 'up' && appearance.shoes) {
    drawClothingItemOnSprite(ctx, appearance.shoes, dir, frame, 'wings', sunsetPhase);
  }

  // 7. Hat Layer
  if (appearance.hat) {
    drawClothingItemOnSprite(ctx, appearance.hat, dir, frame, 'all', sunsetPhase);
  }

  spriteCache.set(key, canvas);
  return canvas;
}

// --- PROCEDURAL TILE, RESOURCE & MANNEQUIN SPRITES ---

const tileCache = new Map<string, HTMLCanvasElement>();

function getTileSprite(type: TileType, variant: number, waterFrame: number): HTMLCanvasElement {
  const isWater =
    type === TileType.SHALLOW_WATER || type === TileType.DEEP_WATER || type === TileType.REEF_WATER;
  const key = isWater ? `${type}|f${waterFrame}|v${variant % 3}` : `${type}|v${variant % 4}`;
  const existing = tileCache.get(key);
  if (existing) return existing;

  const [c, ctx] = makeOffscreen(16, 16);

  if (type === TileType.GRASS || type === TileType.GRASS_FLOWER) {
    ctx.fillStyle = '#55a846';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#68bf54';
    ctx.fillRect((variant * 5) % 10 + 2, (variant * 3) % 9 + 2, 2, 1);
    ctx.fillRect((variant * 7 + 4) % 10 + 2, (variant * 7 + 5) % 9 + 2, 1, 2);
    ctx.fillStyle = '#48933c';
    ctx.fillRect((variant * 3 + 2) % 10 + 2, (variant * 5 + 8) % 10 + 2, 2, 1);

    if (type === TileType.GRASS_FLOWER) {
      const fx = 3 + (variant * 5) % 9;
      const fy = 3 + (variant * 7) % 9;
      const petal = variant % 3 === 0 ? '#ffe566' : variant % 3 === 1 ? '#ff9eb5' : '#ffffff';
      ctx.fillStyle = petal;
      ctx.fillRect(fx, fy - 1, 1, 1);
      ctx.fillRect(fx, fy + 1, 1, 1);
      ctx.fillRect(fx - 1, fy, 1, 1);
      ctx.fillRect(fx + 1, fy, 1, 1);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(fx, fy, 1, 1);
    }
  } else if (type === TileType.DIRT_PATH) {
    ctx.fillStyle = '#cfa86e';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#dec089';
    ctx.fillRect((variant * 3) % 11 + 2, (variant * 5) % 11 + 2, 3, 2);
    ctx.fillStyle = '#b58d53';
    ctx.fillRect((variant * 7 + 4) % 12 + 1, (variant * 3 + 7) % 12 + 1, 2, 1);
  } else if (type === TileType.SAND) {
    ctx.fillStyle = '#eed38f';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#fae5ae';
    ctx.fillRect((variant * 5 + 1) % 10 + 2, (variant * 3 + 2) % 10 + 2, 2, 1);
    ctx.fillStyle = '#dfbe73';
    ctx.fillRect((variant * 7 + 3) % 10 + 2, (variant * 9 + 4) % 10 + 2, 1, 1);
  } else if (type === TileType.SHALLOW_WATER) {
    ctx.fillStyle = '#48b1cc';
    ctx.fillRect(0, 0, 16, 16);
    const shift = waterFrame * 2;
    ctx.fillStyle = '#73d4e8';
    ctx.fillRect((2 + shift) % 11 + 1, 3, 4, 1);
    ctx.fillRect((9 + shift) % 11 + 1, 11, 3, 1);
    if (waterFrame % 2 === 0) {
      ctx.fillStyle = '#b8f2fc';
      ctx.fillRect((4 + shift) % 11 + 1, 3, 2, 1);
    }
  } else if (type === TileType.DEEP_WATER) {
    ctx.fillStyle = '#2678ad';
    ctx.fillRect(0, 0, 16, 16);
    const shift = waterFrame * 2;
    ctx.fillStyle = '#3a94c9';
    ctx.fillRect((1 + shift + (variant % 3) * 3) % 10 + 1, 5, 4, 1);
    ctx.fillRect((7 + shift) % 10 + 1, 12, 3, 1);
    if ((waterFrame + variant) % 4 === 0) {
      ctx.fillStyle = '#7ac5eb';
      ctx.fillRect((2 + shift) % 10 + 1, 5, 2, 1);
    }
  } else if (type === TileType.REEF_WATER) {
    ctx.fillStyle = '#196085';
    ctx.fillRect(0, 0, 16, 16);
    // Luminous underwater coral silhouettes & swift sea breeze currents
    ctx.fillStyle = '#24809e';
    ctx.fillRect((variant * 4) % 10 + 1, (variant * 5) % 10 + 2, 4, 3);
    const shift = waterFrame * 3;
    ctx.fillStyle = '#5eead4';
    ctx.fillRect((2 + shift) % 11 + 1, 4, 4, 1);
    ctx.fillRect((8 + shift) % 11 + 1, 12, 3, 1);
  } else if (type === TileType.REEF_CORAL) {
    // Walkable shallow turquoise coral reef sandbar
    ctx.fillStyle = '#65cec2';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#a3f2e7';
    ctx.fillRect((variant * 3) % 10 + 2, (variant * 5) % 10 + 2, 3, 2);
    // Tiny pink/gold reef coral flecks
    ctx.fillStyle = variant % 3 === 0 ? '#ff8fb1' : '#ffe380';
    ctx.fillRect((variant * 7 + 2) % 11 + 2, (variant * 3 + 4) % 11 + 2, 2, 2);
  } else if (type === TileType.DOCK) {
    ctx.fillStyle = '#205b85';
    ctx.fillRect(0, 0, 16, 16);
    const plankColors = ['#b8763e', '#a86732', '#c48349', '#b06f39'];
    for (let row = 0; row < 4; row++) {
      const py = row * 4;
      ctx.fillStyle = plankColors[(row + variant) % 4];
      ctx.fillRect(0, py, 16, 3);
      ctx.fillStyle = '#d4965b';
      ctx.fillRect(0, py, 16, 1);
      ctx.fillStyle = '#633716';
      ctx.fillRect(0, py + 3, 16, 1);
      ctx.fillStyle = '#4a260c';
      ctx.fillRect(2, py + 1, 1, 1);
      ctx.fillRect(13, py + 1, 1, 1);
    }
  } else if (type === TileType.BOUTIQUE_FLOOR) {
    // Warm polished interior boutique floorboards
    const floorColors = ['#dfb074', '#d49f61', '#e5ba80', '#cfa062'];
    for (let row = 0; row < 4; row++) {
      const py = row * 4;
      ctx.fillStyle = floorColors[(row + variant) % 4];
      ctx.fillRect(0, py, 16, 3);
      ctx.fillStyle = '#f2cfa0';
      ctx.fillRect(0, py, 16, 1);
      ctx.fillStyle = '#9c6434';
      ctx.fillRect(0, py + 3, 16, 1);
      // Staggered vertical plank joints
      const jointX = (row * 6 + variant * 3) % 14 + 1;
      ctx.fillRect(jointX, py, 1, 3);
    }
    // Cozy subtle woven gold-fleck grain
    if (variant % 3 === 0) {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
      ctx.fillRect(4, 5, 4, 1);
      ctx.fillRect(10, 13, 3, 1);
    }
  }

  tileCache.set(key, c);
  return c;
}

function getMannequinSprite(listing?: MannequinListing | null, sunsetPhase = 0): HTMLCanvasElement {
  const effTag = listing?.item?.effect === 'sunset_amber' ? `|sa${sunsetPhase}` : '';
  const key = listing?.item
    ? `mannequin_v5|${listing.item.slot}|${listing.item.pixels}|${listing.item.palette.join(',')}${effTag}`
    : 'mannequin_v5|empty';
  const existing = tileCache.get(key);
  if (existing) return existing;

  if (tileCache.size > 900) {
    tileCache.clear();
  }

  const [c, ctx] = makeOffscreen(18, 24);
  // Subtle base contact dot (soft elliptical shadow drawn in main pass)
  ctx.fillStyle = 'rgba(28, 18, 10, 0.16)';
  ctx.fillRect(5, 21, 8, 1);

  // Carved wooden tripod base & pole
  ctx.fillStyle = '#3d1e0a';
  ctx.fillRect(4, 20, 10, 2);
  ctx.fillRect(6, 19, 6, 1);
  ctx.fillRect(8, 14, 2, 6);
  ctx.fillStyle = '#a86938';
  ctx.fillRect(5, 20, 8, 1);
  ctx.fillRect(7, 19, 4, 1);
  ctx.fillRect(8, 14, 2, 5);
  ctx.fillStyle = '#dba067';
  ctx.fillRect(6, 20, 4, 1);
  ctx.fillRect(8, 15, 1, 3);

  // Wooden finial neck cap
  ctx.fillStyle = '#3d1e0a';
  ctx.fillRect(7, 3, 4, 3);
  ctx.fillStyle = '#d49a60';
  ctx.fillRect(8, 4, 2, 2);

  if (!listing?.item) {
    // Empty stitched linen dressmaker torso
    ctx.fillStyle = '#3d1e0a';
    ctx.fillRect(5, 6, 8, 9);
    ctx.fillRect(6, 5, 6, 1);
    ctx.fillStyle = '#ebd6b5';
    ctx.fillRect(6, 6, 6, 8);
    ctx.fillStyle = '#fff3de';
    ctx.fillRect(7, 7, 2, 6);
    ctx.fillStyle = '#bfa177';
    ctx.fillRect(6, 10, 6, 1);
  } else {
    // Sculpted linen dressmaker form behind clothing item
    ctx.fillStyle = '#3d1e0a';
    ctx.fillRect(6, 6, 6, 9);
    ctx.fillStyle = '#ebd6b5';
    ctx.fillRect(7, 7, 4, 7);
    ctx.fillStyle = '#d49a60';
    ctx.fillRect(7, 11, 4, 1);
    drawClothingOnMannequin(ctx, listing.item, sunsetPhase);
  }

  tileCache.set(key, c);
  return c;
}

function getPropSprite(prop: PropObject, swayFrame = 0, sunsetPhase = 0): HTMLCanvasElement {
  if (prop.kind === 'mannequin') {
    return getMannequinSprite(prop.listing, sunsetPhase);
  }

  const harvested = prop.respawnTimer > 0;
  const key = prop.kind === 'palm' ? `palm|${harvested ? 'stump' : swayFrame}` : `${prop.kind}|${harvested ? 'h' : 'f'}`;
  const existing = tileCache.get(key);
  if (existing) return existing;

  if (prop.kind === 'palm') {
    const [c, ctx] = makeOffscreen(36, 48);
    ctx.fillStyle = 'rgba(24, 34, 18, 0.14)';
    ctx.fillRect(13, 44, 10, 2);

    if (harvested) {
      ctx.fillStyle = '#5c3419';
      ctx.fillRect(15, 39, 7, 6);
      ctx.fillStyle = '#9c6236';
      ctx.fillRect(16, 40, 5, 4);
      ctx.fillStyle = '#d49a60';
      ctx.fillRect(16, 39, 5, 2);
      tileCache.set(key, c);
      return c;
    }

    const trunkSegments = [
      { x: 16, y: 40, w: 5, h: 4 },
      { x: 16, y: 36, w: 5, h: 4 },
      { x: 17, y: 32, w: 4, h: 4 },
      { x: 17, y: 28, w: 4, h: 4 },
      { x: 18, y: 24, w: 4, h: 4 },
      { x: 18, y: 20, w: 4, h: 4 },
      { x: 17, y: 16, w: 4, h: 4 },
    ];
    trunkSegments.forEach((seg, idx) => {
      ctx.fillStyle = '#5c3419';
      ctx.fillRect(seg.x - 1, seg.y, seg.w + 2, seg.h);
      ctx.fillStyle = idx % 2 === 0 ? '#9c6236' : '#854e27';
      ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
      ctx.fillStyle = '#b87b48';
      ctx.fillRect(seg.x, seg.y, 1, seg.h - 1);
    });

    ctx.fillStyle = '#4d2a12';
    ctx.fillRect(15, 16, 3, 3);
    ctx.fillRect(20, 16, 3, 3);

    const sx = swayFrame === 1 ? 1 : swayFrame === 3 ? -1 : 0;
    const fronds = [
      { x: 3 + sx, y: 12, w: 12, h: 4, tipX: 1 + sx, tipY: 16 },
      { x: 6 + sx, y: 6, w: 11, h: 4, tipX: 4 + sx, tipY: 9 },
      { x: 14 + sx, y: 3, w: 9, h: 6, tipX: 17 + sx, tipY: 2 },
      { x: 20 + sx, y: 6, w: 11, h: 4, tipX: 30 + sx, tipY: 9 },
      { x: 21 + sx, y: 12, w: 12, h: 4, tipX: 32 + sx, tipY: 16 },
    ];
    fronds.forEach((f) => {
      ctx.fillStyle = '#255924';
      ctx.fillRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
      ctx.fillStyle = '#3f8f3b';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#68bf54';
      ctx.fillRect(f.x + 1, f.y, f.w - 2, 2);
      ctx.fillStyle = '#255924';
      ctx.fillRect(f.tipX, f.tipY, 3, 3);
      ctx.fillStyle = '#3f8f3b';
      ctx.fillRect(f.tipX, f.tipY, 2, 2);
    });

    tileCache.set(key, c);
    return c;
  }

  if (prop.kind === 'boutique_backwall') {
    const tier = clampShopTier(prop.shopTier);
    const spec = getShopTierSpec(tier);
    const wallW = spec.cols * TILE_SIZE;
    const wallH = tier >= 3 ? 32 : 28;
    const wKey = `boutique_backwall|t${tier}|v${prop.variant}`;
    const cached = tileCache.get(wKey);
    if (cached) return cached;

    // 4/6/8/10 tiles wide open-front boutique back wall scaled cleanly by ShopTier
    const [c, ctx] = makeOffscreen(wallW, wallH);
    const baseY = wallH - 16;

    // Top beam & cornice
    ctx.fillStyle = '#42210b';
    ctx.fillRect(0, 0, wallW, wallH);
    ctx.fillStyle = tier === 4 ? '#6d28d9' : tier === 3 ? '#7c3aed' : '#9c5a2b';
    if (tier < 3) {
      ctx.fillRect(1, 1, wallW - 2, 4);
      ctx.fillStyle = '#cc8449';
      ctx.fillRect(2, 1, wallW - 4, 1);
    } else {
      ctx.fillStyle = tier === 4 ? '#b45309' : '#9c5a2b';
      ctx.fillRect(1, 1, wallW - 2, 5);
      ctx.fillStyle = '#f5cb52';
      ctx.fillRect(2, 1, wallW - 4, 1);
      ctx.fillRect(2, 4, wallW - 4, 1);
    }

    // Warm horizontal wooden wall planks
    const plankShades =
      tier === 4
        ? ['#a85d32', '#99522a', '#b56739', '#8f4b24']
        : ['#b8733b', '#a86531', '#c47e45', '#9e5d2b'];
    const plankStartY = tier >= 3 ? 6 : 5;
    for (let py = plankStartY; py < wallH - 2; py += 4) {
      ctx.fillStyle = plankShades[Math.floor(py / 4) % 4];
      ctx.fillRect(3, py, wallW - 6, 3);
      ctx.fillStyle = '#d9985f';
      ctx.fillRect(3, py, wallW - 6, 1);
      ctx.fillStyle = '#633415';
      ctx.fillRect(3, py + 3, wallW - 6, 1);
    }

    // Left & right thick corner support posts
    ctx.fillStyle = '#42210b';
    ctx.fillRect(0, 0, 5, wallH);
    ctx.fillRect(wallW - 5, 0, 5, wallH);
    ctx.fillStyle = tier === 4 ? '#f5cb52' : '#8a4c21';
    ctx.fillRect(1, 1, 3, wallH - 2);
    ctx.fillRect(wallW - 4, 1, 3, wallH - 2);
    ctx.fillStyle = tier === 4 ? '#fef08a' : '#bf7841';
    ctx.fillRect(1, 2, 1, wallH - 4);
    ctx.fillRect(wallW - 4, 2, 1, wallH - 4);

    // Baseboard shadow along the polished floor
    ctx.fillStyle = '#42210b';
    ctx.fillRect(1, wallH - 2, wallW - 2, 2);
    ctx.fillStyle = 'rgba(42, 20, 8, 0.25)';
    ctx.fillRect(5, wallH - 3, wallW - 10, 1);

    // Cozy windows spaced cleanly on either side of the central sign
    const windowXs =
      tier === 1
        ? [10, 43]
        : tier === 2
          ? [12, 26, 59, 73]
          : tier === 3
            ? [12, 27, 42, 75, 90, 105]
            : [13, 30, 47, 102, 119, 136];

    for (const wx of windowXs) {
      ctx.fillStyle = tier >= 3 ? '#b45309' : '#42210b';
      ctx.fillRect(wx, baseY + 1, 11, 10);
      if (tier >= 3) {
        ctx.fillStyle = '#f5cb52';
        ctx.fillRect(wx, baseY + 1, 11, 1);
      }
      ctx.fillStyle = '#9be0f7';
      ctx.fillRect(wx + 1, baseY + 2, 9, 8);
      ctx.fillStyle = '#d4f5ff';
      ctx.fillRect(wx + 2, baseY + 3, 3, 3);
      ctx.fillStyle = '#6b3a19';
      ctx.fillRect(wx + 5, baseY + 2, 1, 8);
      ctx.fillRect(wx + 1, baseY + 6, 9, 1);
    }

    // Center boutique storefront hanging sign (Tier 4 = gilded VIP Royal Banner!)
    const signW = tier === 4 ? 24 : 16;
    const signX = Math.floor((wallW - signW) / 2);
    const signY = tier >= 3 ? 11 : 9;
    ctx.fillStyle = tier >= 3 ? '#f5cb52' : '#42210b';
    ctx.fillRect(signX - (tier >= 3 ? 1 : 0), signY, signW + (tier >= 3 ? 2 : 0), 12);
    ctx.fillStyle = tier === 4 ? '#7f1d1d' : '#f5dfb3';
    ctx.fillRect(signX + 1, signY + 1, signW - 2, 9);
    if (tier === 4) {
      // Gold "VIP" pixel letters + royal crown crest
      ctx.fillStyle = '#fde047';
      // Crown above letters
      ctx.fillRect(signX + 9, signY + 2, 6, 1);
      ctx.fillRect(signX + 9, signY + 1, 1, 1);
      ctx.fillRect(signX + 12, signY + 1, 1, 1);
      ctx.fillRect(signX + 14, signY + 1, 1, 1);
      // V
      ctx.fillRect(signX + 4, signY + 4, 1, 3);
      ctx.fillRect(signX + 6, signY + 4, 1, 3);
      ctx.fillRect(signX + 5, signY + 7, 1, 1);
      // I
      ctx.fillRect(signX + 11, signY + 4, 2, 4);
      // P
      ctx.fillRect(signX + 16, signY + 4, 1, 4);
      ctx.fillRect(signX + 17, signY + 4, 2, 1);
      ctx.fillRect(signX + 18, signY + 5, 1, 1);
      ctx.fillRect(signX + 17, signY + 6, 1, 1);
    } else {
      ctx.fillStyle = '#d9b577';
      ctx.fillRect(signX + 1, signY + 9, signW - 2, 1);
      ctx.fillStyle = prop.variant === 1 ? '#297a8c' : '#c94c6e';
      ctx.fillRect(signX + 6, signY + 3, 4, 1);
      ctx.fillRect(signX + 5, signY + 4, 6, 2);
      ctx.fillRect(signX + 4, signY + 6, 8, 2);
      ctx.fillStyle = '#ffd15c';
      ctx.fillRect(signX + 7, signY + 2, 2, 1);
    }

    // Decorative draped fabric scalloped valances across full width
    const valanceColors =
      tier === 4
        ? ['#be123c', '#f5cb52', '#f58eb2']
        : prop.variant === 1
          ? ['#4dc2b8', '#f5cb52', '#f58eb2']
          : ['#f58eb2', '#4dc2b8', '#f5cb52'];
    const valY = tier >= 3 ? 5 : 4;
    for (let sx = 4, seg = 0; sx <= wallW - 9; sx += 5, seg++) {
      const col = valanceColors[seg % 3];
      const dark =
        col === '#be123c'
          ? '#881337'
          : col === '#f58eb2'
            ? '#c95c83'
            : col === '#4dc2b8'
              ? '#2c8c84'
              : '#c99924';
      ctx.fillStyle = '#42210b';
      ctx.fillRect(sx - 1, valY, 6, 6);
      ctx.fillStyle = col;
      ctx.fillRect(sx, valY, 4, 5);
      ctx.fillStyle = dark;
      ctx.fillRect(sx, valY + 4, 4, 1);
      ctx.fillRect(sx + 1, valY + 5, 2, 1);
      if (tier >= 3) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 1, valY + 5, 2, 1);
      }
    }

    // Draped tied-back side curtains framing the back wall (Gold-trimmed at Tier 3+)
    const curtainMain =
      tier === 4 ? '#be123c' : prop.variant === 1 ? '#4dc2b8' : '#f58eb2';
    const curtainDark =
      tier === 4 ? '#881337' : prop.variant === 1 ? '#2c8c84' : '#c95c83';
    const curW = tier >= 3 ? 5 : 4;
    // Left curtain
    ctx.fillStyle = '#42210b';
    ctx.fillRect(5, valY + 3, curW + 1, wallH - valY - 7);
    ctx.fillStyle = curtainMain;
    ctx.fillRect(5, valY + 4, curW, wallH - valY - 9);
    ctx.fillStyle = curtainDark;
    ctx.fillRect(5 + curW - 2, valY + 4, 2, wallH - valY - 9);
    ctx.fillStyle = '#f5cb52';
    ctx.fillRect(5, valY + 12, curW, 2);
    if (tier >= 3) {
      ctx.fillRect(5 + curW - 1, valY + 4, 1, wallH - valY - 9);
    }
    // Right curtain
    const rcX = wallW - 5 - curW;
    ctx.fillStyle = '#42210b';
    ctx.fillRect(rcX - 1, valY + 3, curW + 1, wallH - valY - 7);
    ctx.fillStyle = curtainMain;
    ctx.fillRect(rcX, valY + 4, curW, wallH - valY - 9);
    ctx.fillStyle = curtainDark;
    ctx.fillRect(rcX, valY + 4, 2, wallH - valY - 9);
    ctx.fillStyle = '#f5cb52';
    ctx.fillRect(rcX, valY + 12, curW, 2);
    if (tier >= 3) {
      ctx.fillRect(rcX, valY + 4, 1, wallH - valY - 9);
    }

    // Warm glowing pixel lanterns along the upper facade (2 for T1-2, 4 for T3, 5 for T4)
    const lanternXs =
      tier === 3
        ? [1, Math.round(wallW * 0.34), Math.round(wallW * 0.66) - 4, wallW - 5]
        : tier === 4
          ? [1, Math.round(wallW * 0.25), Math.round(wallW * 0.5) - 2, Math.round(wallW * 0.75) - 4, wallW - 5]
          : [1, wallW - 5];
    for (const lx of lanternXs) {
      ctx.fillStyle = '#3b1e0a';
      ctx.fillRect(lx, valY + 3, 4, 6);
      ctx.fillStyle = '#ffd966';
      ctx.fillRect(lx + 1, valY + 4, 2, 4);
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(lx + 1, valY + 5, 1, 2);
    }

    tileCache.set(wKey, c);
    return c;
  }

  if (prop.kind === 'newsstand_kiosk') {
    const nKey = 'newsstand_kiosk_v1';
    const cached = tileCache.get(nKey);
    if (cached) return cached;

    const [nc, nctx] = makeOffscreen(48, 36);
    // Soft ground shadow
    nctx.fillStyle = 'rgba(28, 18, 10, 0.28)';
    nctx.fillRect(2, 32, 44, 4);
    // Outer wooden kiosk frame
    nctx.fillStyle = '#3b1e0a';
    nctx.fillRect(3, 6, 42, 27);
    // Cream back display board & wooden pillars
    nctx.fillStyle = '#f5e1bc';
    nctx.fillRect(6, 12, 36, 12);
    nctx.fillStyle = '#8c5326';
    nctx.fillRect(4, 10, 3, 22);
    nctx.fillRect(41, 10, 3, 22);
    // Lower wooden counter with trim
    nctx.fillStyle = '#a86531';
    nctx.fillRect(5, 22, 38, 10);
    nctx.fillStyle = '#d4965b';
    nctx.fillRect(4, 21, 40, 3);
    nctx.fillStyle = '#5c3314';
    nctx.fillRect(6, 25, 36, 1);
    nctx.fillRect(6, 29, 36, 1);
    // Striped coral & cream awning roof
    const awningCols = ['#e11d48', '#fff5e4', '#0ea5e9', '#fff5e4', '#e11d48', '#fff5e4', '#0ea5e9', '#fff5e4'];
    for (let i = 0; i < 8; i++) {
      nctx.fillStyle = awningCols[i];
      nctx.fillRect(2 + i * 5 + 2, 4, 5, 7);
      nctx.fillStyle = i % 2 === 0 ? '#9f1239' : '#e6cfa3';
      nctx.fillRect(2 + i * 5 + 2, 11, 5, 2);
    }
    nctx.fillStyle = '#3b1e0a';
    nctx.fillRect(3, 3, 42, 1);
    // Colorful fashion magazine covers displayed on rack
    const covers = ['#f43f5e', '#38bdf8', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6'];
    for (let i = 0; i < 6; i++) {
      const mx = 8 + i * 5;
      nctx.fillStyle = '#2b1508';
      nctx.fillRect(mx, 14, 4, 6);
      nctx.fillStyle = covers[i];
      nctx.fillRect(mx + 1, 15, 2, 4);
      nctx.fillStyle = '#ffffff';
      nctx.fillRect(mx + 1, 15, 2, 1);
    }
    // Stacked newsprints on counter
    nctx.fillStyle = '#fff8e7';
    nctx.fillRect(10, 20, 7, 2);
    nctx.fillRect(31, 20, 7, 2);
    // Hanging brass lantern on right post
    nctx.fillStyle = '#3b1e0a';
    nctx.fillRect(41, 13, 4, 5);
    nctx.fillStyle = '#fde047';
    nctx.fillRect(42, 14, 2, 3);
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(42, 14, 1, 1);
    // Top gold plaque sign
    nctx.fillStyle = '#3b1e0a';
    nctx.fillRect(15, 0, 18, 5);
    nctx.fillStyle = '#f5cb52';
    nctx.fillRect(16, 1, 16, 3);
    nctx.fillStyle = '#5c2b0e';
    nctx.fillRect(18, 2, 12, 1);

    tileCache.set(nKey, nc);
    return nc;
  }

  if (prop.kind === 'boutique_pillar_l' || prop.kind === 'boutique_pillar_r') {
    const tier = clampShopTier(prop.shopTier);
    const pKey = `${prop.kind}|t${tier}`;
    const cached = tileCache.get(pKey);
    if (cached) return cached;

    const [c, ctx] = makeOffscreen(16, 26);
    const isLeft = prop.kind === 'boutique_pillar_l';
    const postX = isLeft ? 1 : 11;

    // Side rope / velvet stanchion extending along outer shop edge
    ctx.fillStyle = '#42210b';
    ctx.fillRect(isLeft ? 2 : 12, 0, 2, 22);
    ctx.fillStyle = tier === 4 ? '#be123c' : '#d9b577';
    ctx.fillRect(isLeft ? 2 : 13, 2, 1, 16);

    // Front support post (Tier 4 = Marble & Gold Royal Luxury Pillar)
    ctx.fillStyle = 'rgba(28, 18, 10, 0.3)';
    ctx.fillRect(postX - 1, 23, 6, 3);
    ctx.fillStyle = '#42210b';
    ctx.fillRect(postX, 5, 4, 20);
    if (tier === 4) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(postX + 1, 6, 2, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(postX + 1, 6, 1, 16);
      // Gilded crown & plinth
      ctx.fillStyle = '#f5cb52';
      ctx.fillRect(postX, 3, 4, 3);
      ctx.fillRect(postX, 22, 4, 2);
    } else {
      ctx.fillStyle = '#9c5a2b';
      ctx.fillRect(postX + 1, 6, 2, 18);
      ctx.fillStyle = '#cf8d53';
      ctx.fillRect(postX + 1, 6, 1, 16);
      ctx.fillStyle = '#f5cb52';
      ctx.fillRect(postX + 1, 4, 2, 2);
      if (tier === 3) {
        ctx.fillRect(postX + 1, 14, 2, 1);
      }
    }

    // Hanging warm pixel lantern
    const lx = isLeft ? postX + 3 : postX - 4;
    ctx.fillStyle = '#42210b';
    ctx.fillRect(isLeft ? postX + 2 : postX - 3, 8, 3, 1);
    ctx.fillRect(lx, 9, 4, 6);
    ctx.fillStyle = tier === 4 ? '#fde047' : '#ffd966';
    ctx.fillRect(lx + 1, 10, 2, 4);
    ctx.fillStyle = '#fffce6';
    ctx.fillRect(lx + 1, 11, 1, 2);

    tileCache.set(pKey, c);
    return c;
  }

  if (prop.kind === 'display_table') {
    const dKey = `display_table|v${prop.variant}`;
    const cached = tileCache.get(dKey);
    if (cached) return cached;

    const [c, ctx] = makeOffscreen(16, 18);
    ctx.fillStyle = 'rgba(28, 18, 10, 0.28)';
    ctx.fillRect(1, 15, 14, 3);

    // Wooden boutique display table
    ctx.fillStyle = '#42210b';
    ctx.fillRect(1, 6, 14, 10);
    // Table legs
    ctx.fillStyle = '#753f1a';
    ctx.fillRect(2, 11, 2, 4);
    ctx.fillRect(12, 11, 2, 4);
    // Table skirt & lace runner
    ctx.fillStyle = '#b8733b';
    ctx.fillRect(2, 7, 12, 5);
    ctx.fillStyle = '#e0a267';
    ctx.fillRect(2, 7, 12, 3);
    // Pastel velvet display cloth
    ctx.fillStyle = prop.variant === 1 ? '#f598b2' : '#58c4ba';
    ctx.fillRect(3, 6, 10, 4);
    ctx.fillStyle = prop.variant === 1 ? '#ffd4e2' : '#9cebe3';
    ctx.fillRect(4, 6, 8, 2);

    // Tiny pixel jewelry, pearl box & accessories on top!
    ctx.fillStyle = '#42210b';
    ctx.fillRect(3, 3, 4, 4);
    ctx.fillStyle = '#fff5d6'; // pearl jewelry box
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillStyle = '#ffd23f'; // gold brooch / necklace
    ctx.fillRect(8, 5, 3, 2);
    ctx.fillStyle = '#ff6b8b'; // ruby/coral gem
    ctx.fillRect(9, 4, 1, 1);
    ctx.fillStyle = '#b8f2fc'; // sea glass ring
    ctx.fillRect(11, 6, 2, 2);

    tileCache.set(dKey, c);
    return c;
  }

  if (prop.kind === 'shop_wall' || prop.kind === 'shop_wall_t2') {
    const h = prop.kind === 'shop_wall_t2' ? 40 : 28;
    const [c, ctx] = makeOffscreen(16, h);
    const baseY = h - 16;

    if (prop.kind === 'shop_wall_t2') {
      ctx.fillStyle = '#47250d';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#b84c4c';
      ctx.fillRect(0, 1, 16, 5);
      ctx.fillStyle = '#e06c6c';
      ctx.fillRect(1, 2, 14, 2);
      ctx.fillStyle = '#f5e4c3';
      ctx.fillRect(1, 6, 14, 10);
      ctx.fillStyle = '#7a4522';
      ctx.fillRect(0, 6, 2, 10);
      ctx.fillRect(14, 6, 2, 10);
      ctx.fillStyle = '#47250d';
      ctx.fillRect(4, 8, 8, 6);
      ctx.fillStyle = '#8fd8f2';
      ctx.fillRect(5, 9, 6, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 9, 2, 1);
    }

    ctx.fillStyle = '#47250d';
    ctx.fillRect(0, baseY - 2, 16, 18);
    ctx.fillStyle = '#f2dec0';
    ctx.fillRect(1, baseY + 4, 14, 10);
    ctx.fillStyle = '#7d4722';
    ctx.fillRect(0, baseY + 4, 2, 11);
    ctx.fillRect(14, baseY + 4, 2, 11);
    ctx.fillRect(1, baseY + 13, 14, 2);
    ctx.fillStyle = '#47250d';
    ctx.fillRect(3, baseY + 6, 10, 6);
    ctx.fillStyle = '#9be0f7';
    ctx.fillRect(4, baseY + 7, 8, 4);
    ctx.fillStyle = '#e8f9ff';
    ctx.fillRect(5, baseY + 7, 2, 2);
    for (let x = 0; x < 16; x += 2) {
      ctx.fillStyle = (x / 2) % 2 === 0 ? '#e36464' : '#fff5e1';
      ctx.fillRect(x, baseY - 1, 2, 6);
      ctx.fillStyle = (x / 2) % 2 === 0 ? '#b54141' : '#dec9a4';
      ctx.fillRect(x, baseY + 4, 2, 2);
    }
    ctx.fillStyle = '#47250d';
    ctx.fillRect(0, baseY - 2, 16, 1);

    tileCache.set(key, c);
    return c;
  }

  const [c, ctx] = makeOffscreen(16, 16);

  if (prop.kind === 'cotton_bush') {
    ctx.fillStyle = 'rgba(20, 35, 18, 0.25)';
    ctx.fillRect(2, 13, 12, 3);
    if (harvested) {
      ctx.fillStyle = '#265424';
      ctx.fillRect(4, 9, 8, 5);
      ctx.fillStyle = '#3d8538';
      ctx.fillRect(5, 10, 6, 3);
    } else {
      ctx.fillStyle = '#265424';
      ctx.fillRect(2, 5, 12, 9);
      ctx.fillRect(4, 3, 8, 11);
      ctx.fillStyle = '#3d8538';
      ctx.fillRect(3, 5, 10, 7);
      ctx.fillRect(5, 4, 6, 8);
      ctx.fillStyle = '#d9e3e8';
      ctx.fillRect(4, 5, 3, 3);
      ctx.fillRect(9, 6, 3, 3);
      ctx.fillRect(6, 9, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 5, 2, 2);
      ctx.fillRect(9, 6, 2, 2);
      ctx.fillRect(6, 9, 2, 2);
    }
  } else if (prop.kind === 'dye_bush') {
    ctx.fillStyle = 'rgba(20, 35, 18, 0.25)';
    ctx.fillRect(2, 13, 12, 3);
    if (harvested) {
      ctx.fillStyle = '#265424';
      ctx.fillRect(4, 9, 8, 5);
      ctx.fillStyle = '#3d8538';
      ctx.fillRect(5, 10, 6, 3);
    } else {
      ctx.fillStyle = '#265424';
      ctx.fillRect(2, 5, 12, 9);
      ctx.fillRect(4, 3, 8, 11);
      ctx.fillStyle = '#3d8538';
      ctx.fillRect(3, 5, 10, 7);
      ctx.fillStyle = '#62b354';
      ctx.fillRect(4, 5, 5, 3);
      ctx.fillStyle = '#e84a7a';
      ctx.fillRect(4, 7, 2, 2);
      ctx.fillRect(9, 8, 2, 2);
      ctx.fillStyle = '#ffd447';
      ctx.fillRect(7, 5, 2, 2);
      ctx.fillStyle = '#79b8ff';
      ctx.fillRect(6, 10, 2, 2);
    }
  } else if (prop.kind === 'rock') {
    ctx.fillStyle = 'rgba(20, 28, 32, 0.25)';
    ctx.fillRect(2, 13, 12, 2);
    if (harvested) {
      ctx.fillStyle = '#5c6470';
      ctx.fillRect(5, 11, 3, 2);
      ctx.fillRect(9, 12, 2, 2);
    } else {
      ctx.fillStyle = '#474e59';
      ctx.fillRect(2, 7, 12, 7);
      ctx.fillRect(4, 5, 8, 9);
      ctx.fillStyle = '#737d8c';
      ctx.fillRect(3, 7, 10, 5);
      ctx.fillRect(5, 6, 6, 6);
      ctx.fillStyle = '#9aa5b5';
      ctx.fillRect(5, 6, 4, 2);
      ctx.fillStyle = '#5ca14c';
      ctx.fillRect(4, 10, 3, 2);
    }
  } else if (prop.kind === 'golden_oyster') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#47250d';
      ctx.fillRect(4, 6, 8, 7);
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(5, 7, 6, 5);
      ctx.fillStyle = '#ffdf4d';
      ctx.fillRect(7, 8, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 8, 1, 1);
    }
  } else if (prop.kind === 'royal_silk_coral') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#3b154d';
      ctx.fillRect(4, 4, 8, 10);
      ctx.fillStyle = '#9b4dca';
      ctx.fillRect(5, 5, 2, 8);
      ctx.fillRect(9, 6, 2, 7);
      ctx.fillRect(7, 7, 2, 6);
      ctx.fillStyle = '#e09eff';
      ctx.fillRect(5, 5, 1, 3);
      ctx.fillRect(9, 6, 1, 3);
    }
  } else if (prop.kind === 'glowing_pearl_node') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#0e4d64';
      ctx.fillRect(3, 7, 10, 6);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(4, 8, 8, 4);
      ctx.fillStyle = '#cffafe';
      ctx.fillRect(6, 5, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 6, 2, 2);
    }
  } else if (prop.kind === 'starlight_coral_node') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#4a1d42';
      ctx.fillRect(4, 5, 8, 8);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(5, 6, 2, 6);
      ctx.fillRect(9, 5, 2, 7);
      ctx.fillRect(7, 7, 2, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(5, 4, 2, 2);
      ctx.fillRect(9, 4, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 6, 1, 1);
    }
  } else if (prop.kind === 'seafoam_essence_node') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#134e4a';
      ctx.fillRect(5, 4, 6, 9);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(6, 5, 4, 7);
      ctx.fillStyle = '#99f6e4';
      ctx.fillRect(4, 7, 2, 3);
      ctx.fillRect(10, 6, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 6, 2, 2);
    }
  } else if (prop.kind === 'sunset_amber_node') {
    if (harvested) {
      ctx.fillStyle = '#4ab5a9';
      ctx.fillRect(6, 10, 4, 2);
    } else {
      ctx.fillStyle = '#5c2210';
      ctx.fillRect(4, 5, 8, 8);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(5, 6, 6, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(5, 10, 6, 2);
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(7, 7, 1, 2);
    }
  } else if (prop.kind === 'shell_pink') {
    if (harvested) {
      ctx.fillStyle = '#d9b96e';
      ctx.fillRect(6, 9, 4, 2);
    } else {
      ctx.fillStyle = '#a85167';
      ctx.fillRect(5, 7, 6, 5);
      ctx.fillStyle = '#f598b2';
      ctx.fillRect(6, 7, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 8, 2, 2);
    }
  } else if (prop.kind === 'shell_conch') {
    if (harvested) {
      ctx.fillStyle = '#d9b96e';
      ctx.fillRect(6, 9, 4, 2);
    } else {
      ctx.fillStyle = '#9e6742';
      ctx.fillRect(5, 8, 7, 4);
      ctx.fillStyle = '#f7cba4';
      ctx.fillRect(6, 8, 5, 3);
      ctx.fillStyle = '#fff0db';
      ctx.fillRect(7, 9, 2, 1);
    }
  } else if (prop.kind === 'starfish') {
    if (harvested) {
      ctx.fillStyle = '#d9b96e';
      ctx.fillRect(6, 9, 4, 2);
    } else {
      ctx.fillStyle = '#a63f2b';
      ctx.fillRect(7, 5, 2, 6);
      ctx.fillRect(5, 7, 6, 2);
      ctx.fillStyle = '#ff7d59';
      ctx.fillRect(7, 6, 2, 4);
      ctx.fillRect(6, 7, 4, 2);
      ctx.fillRect(6, 10, 1, 2);
      ctx.fillRect(9, 10, 1, 2);
      ctx.fillStyle = '#ffb89e';
      ctx.fillRect(7, 7, 1, 1);
    }
  } else if (prop.kind === 'changing_booth') {
    const [bc, bctx] = makeOffscreen(16, 24);
    bctx.fillStyle = 'rgba(28, 18, 10, 0.25)';
    bctx.fillRect(1, 21, 14, 3);
    // Wooden booth frame & top brass rod
    bctx.fillStyle = '#42210b';
    bctx.fillRect(1, 1, 14, 22);
    bctx.fillStyle = '#a86531';
    bctx.fillRect(2, 2, 12, 20);
    // Brass rod + rings
    bctx.fillStyle = '#ffd23f';
    bctx.fillRect(2, 3, 12, 2);
    bctx.fillStyle = '#fff5bd';
    bctx.fillRect(3, 3, 2, 1);
    bctx.fillRect(7, 3, 2, 1);
    bctx.fillRect(11, 3, 2, 1);
    // Striped pastel fitting curtain with slightly parted peek at bottom
    for (let cx = 2; cx < 14; cx += 2) {
      const isPink = ((cx - 2) / 2) % 2 === 0;
      bctx.fillStyle = isPink ? '#f58eb2' : '#fff5eb';
      bctx.fillRect(cx, 5, 2, 16);
      bctx.fillStyle = isPink ? '#c95c83' : '#e6d3b8';
      bctx.fillRect(cx, 19, 2, 2);
    }
    // Dark wood floor reveal inside parted curtain corner
    bctx.fillStyle = '#4a260f';
    bctx.fillRect(10, 14, 3, 7);
    bctx.fillStyle = '#753f1a';
    bctx.fillRect(10, 18, 3, 3);
    tileCache.set(key, bc);
    return bc;
  } else if (prop.kind === 'vanity_mirror') {
    const [mc, mctx] = makeOffscreen(16, 22);
    mctx.fillStyle = 'rgba(28, 18, 10, 0.25)';
    mctx.fillRect(3, 19, 10, 3);
    // Wooden stand & feet
    mctx.fillStyle = '#42210b';
    mctx.fillRect(3, 17, 10, 4);
    mctx.fillStyle = '#9c5a2b';
    mctx.fillRect(4, 18, 8, 2);
    // Gold & wood mirror frame
    mctx.fillStyle = '#42210b';
    mctx.fillRect(3, 1, 10, 17);
    mctx.fillRect(4, 0, 8, 18);
    mctx.fillStyle = '#f5cb52';
    mctx.fillRect(4, 1, 8, 16);
    mctx.fillStyle = '#b8861d';
    mctx.fillRect(4, 15, 8, 2);
    // Reflective glass & diagonal sheen
    mctx.fillStyle = '#9ce6fa';
    mctx.fillRect(5, 2, 6, 13);
    mctx.fillStyle = '#d9f8ff';
    mctx.fillRect(6, 3, 2, 5);
    mctx.fillRect(5, 6, 2, 3);
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(7, 3, 1, 2);
    tileCache.set(key, mc);
    return mc;
  } else if (prop.kind === 'clothing_rack') {
    const [rc, rctx] = makeOffscreen(16, 20);
    rctx.fillStyle = 'rgba(28, 18, 10, 0.25)';
    rctx.fillRect(1, 17, 14, 3);
    // Wooden A-frame stand
    rctx.fillStyle = '#42210b';
    rctx.fillRect(1, 2, 2, 16);
    rctx.fillRect(13, 2, 2, 16);
    rctx.fillRect(1, 3, 14, 2);
    rctx.fillStyle = '#9c5a2b';
    rctx.fillRect(2, 3, 1, 14);
    rctx.fillRect(13, 3, 1, 14);
    rctx.fillStyle = '#ffd23f';
    rctx.fillRect(2, 3, 12, 1);
    // 3 hanging colorful shirts/dresses
    // Pink dress
    rctx.fillStyle = '#7d2948';
    rctx.fillRect(3, 5, 4, 10);
    rctx.fillStyle = '#f58eb2';
    rctx.fillRect(3, 6, 3, 8);
    // Teal top
    rctx.fillStyle = '#185c57';
    rctx.fillRect(7, 5, 3, 8);
    rctx.fillStyle = '#4dc2b8';
    rctx.fillRect(7, 6, 2, 6);
    // Golden dress
    rctx.fillStyle = '#85580f';
    rctx.fillRect(10, 5, 3, 10);
    rctx.fillStyle = '#ffd23f';
    rctx.fillRect(10, 6, 2, 8);
    tileCache.set(key, rc);
    return rc;
  } else if (prop.kind === 'cash_counter') {
    const [cc, cctx] = makeOffscreen(16, 18);
    cctx.fillStyle = 'rgba(28, 18, 10, 0.26)';
    cctx.fillRect(1, 15, 14, 3);
    // Oak counter desk
    cctx.fillStyle = '#42210b';
    cctx.fillRect(1, 6, 14, 10);
    cctx.fillStyle = '#a86531';
    cctx.fillRect(2, 9, 12, 6);
    cctx.fillStyle = '#d4965b';
    cctx.fillRect(2, 7, 12, 2);
    // Brass cash register on left/center
    cctx.fillStyle = '#42210b';
    cctx.fillRect(3, 1, 8, 6);
    cctx.fillStyle = '#f5cb52';
    cctx.fillRect(4, 2, 6, 4);
    cctx.fillStyle = '#fff5bd';
    cctx.fillRect(5, 2, 4, 2);
    cctx.fillStyle = '#381e0c';
    cctx.fillRect(4, 5, 6, 1);
    // Little bell & receipt paper on right
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(12, 4, 2, 3);
    tileCache.set(key, cc);
    return cc;
  } else if (prop.kind === 'potted_plant') {
    const [pc, pctx] = makeOffscreen(16, 18);
    pctx.fillStyle = 'rgba(28, 18, 10, 0.24)';
    pctx.fillRect(4, 15, 8, 3);
    // Terracotta pot
    pctx.fillStyle = '#42210b';
    pctx.fillRect(4, 10, 8, 6);
    pctx.fillStyle = '#c4633b';
    pctx.fillRect(5, 11, 6, 4);
    pctx.fillStyle = '#e3845b';
    pctx.fillRect(4, 10, 8, 2);
    // Lush tropical fronds
    pctx.fillStyle = '#1e4a20';
    pctx.fillRect(2, 3, 12, 7);
    pctx.fillRect(5, 1, 6, 9);
    pctx.fillStyle = '#3d8f3b';
    pctx.fillRect(3, 4, 10, 5);
    pctx.fillRect(6, 2, 4, 8);
    pctx.fillStyle = '#6ad158';
    pctx.fillRect(4, 4, 3, 2);
    pctx.fillRect(8, 3, 3, 2);
    pctx.fillRect(6, 6, 3, 2);
    tileCache.set(key, pc);
    return pc;
  } else if (prop.kind === 'lantern_post') {
    const [lc, lctx] = makeOffscreen(16, 24);
    lctx.fillStyle = 'rgba(28, 18, 10, 0.26)';
    lctx.fillRect(5, 21, 6, 3);
    // Wooden post & base
    lctx.fillStyle = '#3b1e0a';
    lctx.fillRect(5, 19, 6, 3);
    lctx.fillRect(6, 2, 4, 18);
    lctx.fillStyle = '#8a4c21';
    lctx.fillRect(7, 3, 2, 17);
    // Top iron arm
    lctx.fillStyle = '#29170b';
    lctx.fillRect(6, 2, 8, 2);
    lctx.fillRect(12, 4, 1, 2);
    // Hanging warm lantern
    lctx.fillStyle = '#3b1e0a';
    lctx.fillRect(10, 6, 5, 7);
    lctx.fillStyle = '#ffd966';
    lctx.fillRect(11, 7, 3, 5);
    lctx.fillStyle = '#fffce6';
    lctx.fillRect(12, 8, 1, 3);
    tileCache.set(key, lc);
    return lc;
  } else if (prop.kind === 'rug_pink' || prop.kind === 'rug_teal' || prop.kind === 'rug_gold') {
    const baseMain = prop.kind === 'rug_pink' ? '#e879a0' : prop.kind === 'rug_teal' ? '#3cb3a9' : '#e6b23c';
    const baseShade = prop.kind === 'rug_pink' ? '#c25178' : prop.kind === 'rug_teal' ? '#25877f' : '#ba851c';
    const baseLight = prop.kind === 'rug_pink' ? '#ffc2d7' : prop.kind === 'rug_teal' ? '#8ce8df' : '#fff0a3';
    // Fringe on left/right edges
    ctx.fillStyle = '#fff5e1';
    ctx.fillRect(0, 3, 1, 10);
    ctx.fillRect(15, 3, 1, 10);
    // Woven rug body
    ctx.fillStyle = '#4d2b16';
    ctx.fillRect(1, 2, 14, 12);
    ctx.fillStyle = baseShade;
    ctx.fillRect(2, 3, 12, 10);
    ctx.fillStyle = baseMain;
    ctx.fillRect(3, 4, 10, 8);
    // Inner cream frame & diamond emblem
    ctx.fillStyle = baseLight;
    ctx.fillRect(4, 5, 8, 1);
    ctx.fillRect(4, 10, 8, 1);
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillRect(6, 7, 4, 2);
  }

  tileCache.set(key, c);
  return c;
}

// --- HOTBAR PIXEL ICONS (16x16) ---
function drawItemIconCanvas(canvas: HTMLCanvasElement, kind: ItemKind | 'rare_outfit' | 'rare_hat') {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 16, 16);

  if (kind === 'wood') {
    drawPixelMatrix(
      ctx,
      ['................', '................', '....OOOOOOOO....', '..OOBBBBBBBBOO..', '.OBLLBBBBBBBBBO.', '.OBLLBBBBBBBBBO.', '..OOBBBBBBBBOO..', '...OOBBBBBBOO...', '..OOBBBBBBBBOO..', '.OBLLBBBBBBBBBO.', '.OBLLBBBBBBBBBO.', '..OOBBBBBBBBOO..', '....OOOOOOOO....', '................', '................', '................'],
      { O: '#42220d', B: '#9c5c2b', L: '#dea56a' }
    );
  } else if (kind === 'fabric') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '....OOWWWWOO....', '...OWWSSSSWWO...', '..OWWSSSSSSWWO..', '..OWSSWWWWSSWO..', '..OWSWWWWWWSWO..', '...OWWWWWWWWO...', '....OWWWWWWO....', '....ODDDDDDO....', '...ODDDDDDDDO...', '....OOOOOOOO....', '................', '................', '................', '................'],
      { O: '#3c4552', W: '#ffffff', S: '#d4e2ed', D: '#b4c7d9' }
    );
  } else if (kind === 'pearls') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOO.....', '...OOPPPPPPOO...', '..OPPPPPPPPPPO..', '..OPPPPPPPPPPO..', '..OODDDDDDDDOO..', '..OODWWWWWWDOO..', '..ODWWWHHHWWDO..', '..ODWWWWWWWWDO..', '...OODDDDDDOO...', '.....OOOOOO.....', '................', '................', '................', '................', '................'],
      { O: '#6e2c40', P: '#f598b2', D: '#cf6f8b', W: '#fff2f7', H: '#ffffff' }
    );
  } else if (kind === 'golden_pearls') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOO.....', '...OOPPPPPPOO...', '..OPPPPPPPPPPO..', '..OODDDDDDDDOO..', '..OODGGGGGGDOO..', '..ODGGGHHHGGDO..', '..ODGGGGGGGGDO..', '...OODDDDDDOO...', '.....OOOOOO.....', '................', '................', '................', '................', '................', '................'],
      { O: '#4a260a', P: '#9b59b6', D: '#6d3585', G: '#ffd23f', H: '#ffffff' }
    );
  } else if (kind === 'royal_silk') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '....OORRRROO....', '...ORRRRRRRRO...', '..ORRLLLLLLRRO..', '..ORRRRRRRRRRO..', '..OODDDDDDDDOO..', '...ORRRRRRRRO...', '....OORRRROO....', '......OOOO......', '................', '................', '................', '................', '................', '................'],
      { O: '#3b154d', R: '#a855f7', L: '#e9d5ff', D: '#ffd86b' }
    );
  } else if (kind === 'glowing_pearls') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOO.....', '...OOCCCCCCOO...', '..OCCCCCCCCCCOO.', '..OCCWWWWWWCCOO.', '..OCWWHHHWWWCCO.', '..OCCWWWWWWCCOO.', '...OOCCCCCCOO...', '....OODDDDOO....', '.....OOOOOO.....', '................', '................', '................', '................', '................', '................'],
      { O: '#0e4d64', C: '#22d3ee', D: '#0891b2', W: '#cffafe', H: '#ffffff' }
    );
  } else if (kind === 'starlight_coral') {
    drawPixelMatrix(
      ctx,
      ['................', '....OO....OO....', '...OYYO..OYYO...', '...OPPO..OPPO...', '...OPPOO.OPPO...', '..OOPPPPPPPOOO..', '..OPPPWWWWPPPO..', '...OPPPPPPPPO...', '....OOPPPPOO....', '.....OOOOOO.....', '................', '................', '................', '................', '................', '................'],
      { O: '#4a1d42', P: '#fb7185', Y: '#fde047', W: '#ffffff' }
    );
  } else if (kind === 'seafoam_essence') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '.....OCCCCO.....', '......OOOO......', '....OOTTTTOO....', '...OTTTTTTTTO...', '..OTLLLLLLLLTO..', '..OTLLHHHHLLTO..', '..OTTTTTTTTTTO..', '...OTTTTTTTTO...', '....OOOOOOOO....', '................', '................', '................', '................', '................'],
      { O: '#134e4a', C: '#a7f3d0', T: '#14b8a6', L: '#5eead4', H: '#ffffff' }
    );
  } else if (kind === 'sunset_amber') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '....OOYYYYOO....', '...OYYYYYYYYO...', '..OYYHHHHHHYYO..', '..OYYYYAAAAYYO..', '..OYYAAAAAAPP0..', '...OAPPPPPPAO...', '....OOPPPPOO....', '......OOOO......', '................', '................', '................', '................', '................', '................'],
      { O: '#5c2210', Y: '#fbbf24', H: '#fffbeb', A: '#f97316', P: '#fb7185', '0': '#5c2210' }
    );
  } else if (kind === 'dyes') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '.....OCCCCO.....', '......OOOO......', '....OOGGGGOO....', '...OGGGGGGGGO...', '..OGGMMMMMMGGO..', '..OGMMMMMMMMGO..', '..OGMMHHHHMMGO..', '..OGMMMMMMMMGO..', '...OGMMMMMMGO...', '....OOOOOOOO....', '................', '................', '................', '................'],
      { O: '#3b1d2e', C: '#c98a4b', G: '#bce6f5', M: '#e84a7a', H: '#ffa6c2' }
    );
  } else if (kind === 'dock_plank') {
    drawPixelMatrix(
      ctx,
      ['................', '................', '..OOOOOOOOOOOO..', '.OLLLLLLLLLLLLO.', '.OMMMMMMMMMMMMO.', '.ODDDDDDDDDDDDO.', '..OOOOOOOOOOOO..', '..OOOOOOOOOOOO..', '.OLLLLLLLLLLLLO.', '.OMMMMMMMMMMMMO.', '.ODDDDDDDDDDDDO.', '..OOOOOOOOOOOO..', '................', '................', '................', '................'],
      { O: '#42220d', L: '#d99a59', M: '#b57236', D: '#854b1e' }
    );
  } else if (kind === 'shop_wall') {
    drawPixelMatrix(
      ctx,
      ['................', '.OOOOOOOOOOOOOO.', '.OBBBBBBBBBBBBO.', '.OPPTTTGGTTTGGP.', '.OWWWWWWWWWWWWO.', '.OWWWOOSSOOWWWO.', '.OLWWOOOOOOWWLO.', '.OFFFFFFFFFFFHO.', '.OFFFFFFFFFFFFO.', '.OFFFFFFFFFFFFO.', '.OLLLLLLLLLLLLO.', '.OOOOOOOOOOOOOO.', '................', '................', '................', '................'],
      { O: '#42210b', B: '#9c5a2b', P: '#f58eb2', T: '#4dc2b8', G: '#f5cb52', W: '#b8733b', S: '#f5dfb3', L: '#ffd966', F: '#dfb074', H: '#e5ba80' }
    );
  } else if (kind === 'mannequin') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOO......', '......OWWO......', '....OOOOOOOO....', '...ORRRRRRRRO...', '...ORRWWWWRRO...', '....ORRRRRRO....', '...ORRRRRRRRO...', '..ORRRRRRRRRRO..', '..OOOOOOOOOOOO..', '.......OO.......', '.......OO.......', '.....OOOOOO.....', '................', '................', '................'],
      { O: '#3b1e0c', W: '#d49a60', R: '#e26a67' }
    );
  } else if (kind === 'hatchet') {
    drawPixelMatrix(
      ctx,
      ['................', '.........OOOO...', '........OSSSSO..', '.......OSSWWSSO.', '.......OSSOOWSO.', '.......OSSO.OO..', '......OSSO......', '.....OWWO.......', '....OWWO........', '...OWWO.........', '..OWWO..........', '..OOO...........', '................', '................', '................', '................'],
      { O: '#3b2110', S: '#9fb1c4', W: '#b56e35' }
    );
  } else if (kind === 'fishing_rod') {
    drawPixelMatrix(
      ctx,
      ['................', '...........OOO..', '..........OYYO..', '.........OYYOO..', '........OYYO.L..', '.......OYYO..L..', '......OYYO...L..', '.....OYYO....R..', '....OYYO....RRR.', '...OYYO.....WWW.', '..OYYO.......O..', '..OOO...........', '................', '................', '................', '................'],
      { O: '#3b2110', Y: '#d9a44e', L: '#d9eef7', R: '#e34949', W: '#ffffff' }
    );
  } else if (kind === 'watering_can') {
    drawPixelMatrix(
      ctx,
      ['................', '......OOOOO.....', '.....OCCCCCO....', '..OO.OC...CO....', '.OLLOCCCCCCOO...', '..OLLOCCCCCCCO..', '...OLLOCCCCCCCO.', '....OOCCCCCCCO..', '.....OCCCCCCCO..', '.....ODDDDDDDO..', '......OOOOOOO...', '................', '................', '................', '................', '................'],
      { O: '#362115', C: '#5d9fd6', L: '#9cd0fa', D: '#386ea3' }
    );
  } else if (kind === 'rare_outfit') {
    drawPixelMatrix(
      ctx,
      ['................', '....OO....OO....', '...OLLO..OLLO...', '...OMMOOOOOMMO..', '....OMMMMMMMO...', '....OMTTTTTMO...', '...OOMMMMMMMOO..', '..OMMLLLLLLMMMO.', '..OMMMMMMMMMMMO.', '..OTTTTTTTTTTTO.', '...OOOOOOOOOOO..', '................', '................', '................', '................', '................'],
      { O: '#244854', M: '#3ca3b8', L: '#87e0eb', T: '#ffe6ec' }
    );
  } else if (kind === 'rare_hat') {
    drawPixelMatrix(
      ctx,
      ['................', '................', '....O..OO..O....', '...OPOGPPGOPO...', '...OGLGAAGLGO...', '....OOOOOOOO....', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................'],
      { O: '#423318', G: '#f5c542', L: '#fff099', P: '#ffffff', A: '#b8f2fc' }
    );
  } else if (kind === 'changing_booth') {
    drawPixelMatrix(
      ctx,
      ['................', '..OOOOOOOOOOOO..', '..OGGGGGGGGGGO..', '..OPWWPPWWPPWO..', '..OPWWPPWWPPWO..', '..OPWWPPWWPPWO..', '..OPWWPPWWPPWO..', '..OPWWPPWWPPWO..', '..OPWWPPWWPPWO..', '..OPWWPPDDPPWO..', '..OPWWPPDDPPWO..', '..OPWWPPDDPPWO..', '..OOOOOOOOOOOO..', '................', '................', '................'],
      { O: '#42210b', G: '#ffd23f', P: '#f58eb2', W: '#fff5eb', D: '#5e3214' }
    );
  } else if (kind === 'vanity_mirror') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOO.....', '....OGGGGGGO....', '...OGBBBBBBGO...', '...OGBHHHHBGO...', '...OGBHBBBBGO...', '...OGBBBBBBGO...', '...OGBBBBBBGO...', '...OGBBBBBBGO...', '...OGBBBBBBGO...', '....OGGGGGGO....', '.....OOOOOO.....', '....OWWWWWWO....', '...OOOOOOOOOO...', '................', '................'],
      { O: '#42210b', G: '#f5cb52', B: '#8fe0fa', H: '#ffffff', W: '#9c5a2b' }
    );
  } else if (kind === 'clothing_rack') {
    drawPixelMatrix(
      ctx,
      ['................', '..OOOOOOOOOOOO..', '..OWGGGGGGGGWO..', '..OWPPTTTYYGWO..', '..OWPPTTTYYYWO..', '..OWPPTTTYYYWO..', '..OWPPTTTYYYWO..', '..OWPPTTTYYYWO..', '..OWPP...YYYWO..', '..OW.........WO.', '..OW.........WO.', '..OO.........OO.', '................', '................', '................', '................'],
      { O: '#42210b', W: '#9c5a2b', G: '#ffd23f', P: '#f58eb2', T: '#4dc2b8', Y: '#fbbf24' }
    );
  } else if (kind === 'cash_counter') {
    drawPixelMatrix(
      ctx,
      ['................', '................', '...OOOOOO.......', '..OGGGGGGO.OO...', '..OGWWWWGO.OWO..', '..OGGGGGGO.OWO..', '.OOOOOOOOOOOOOO.', '.OLLLLLLLLLLLLO.', '.OMMMMMMMMMMMMO.', '.OMMMMMMMMMMMMO.', '.OMMMMMMMMMMMMO.', '.OOOOOOOOOOOOOO.', '................', '................', '................', '................'],
      { O: '#42210b', G: '#f5cb52', W: '#fff5bd', L: '#d99a59', M: '#a86531' }
    );
  } else if (kind === 'potted_plant') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOO.....', '...OOGGGGGGOO...', '..OGGLLLLLLGGO..', '..OGGGGGGGGGGO..', '...OOGGGGGGOO...', '....OOOOOOOO....', '....OTTTTTTO....', '.....OTTTTO.....', '.....OTTTTO.....', '.....OTTTTO.....', '......OOOO......', '................', '................', '................', '................'],
      { O: '#3b2110', G: '#3d8f3b', L: '#6ad158', T: '#c4633b' }
    );
  } else if (kind === 'lantern_post') {
    drawPixelMatrix(
      ctx,
      ['................', '.....OOOOOOO....', '.....OWWWWWOO...', '.....OWO..OYO...', '.....OWO.OYYYO..', '.....OWO.OYHYO..', '.....OWO.OYYYO..', '.....OWO..OOO...', '.....OWO........', '.....OWO........', '.....OWO........', '....OWWWO.......', '....OOOOO.......', '................', '................', '................'],
      { O: '#3b1e0a', W: '#8a4c21', Y: '#ffd966', H: '#fffce6' }
    );
  } else if (kind === 'rug_pink' || kind === 'rug_teal' || kind === 'rug_gold') {
    const main = kind === 'rug_pink' ? '#e879a0' : kind === 'rug_teal' ? '#3cb3a9' : '#e6b23c';
    const light = kind === 'rug_pink' ? '#ffc2d7' : kind === 'rug_teal' ? '#8ce8df' : '#fff0a3';
    drawPixelMatrix(
      ctx,
      ['................', '................', '..OOOOOOOOOOOO..', '.WMMMMMMMMMMMMW.', '.WMLLLLLLLLLLMW.', '.WMLMMMMMMMMMLW.', '.WMLMMMLLMMMLMW.', '.WMLMMMLLMMMLMW.', '.WMLMMMMMMMMMLW.', '.WMLLLLLLLLLLMW.', '.WMMMMMMMMMMMMW.', '..OOOOOOOOOOOO..', '................', '................', '................', '................'],
      { O: '#4d2b16', W: '#fff5e1', M: main, L: light }
    );
  }
}

// ============================================================================
// WORLD MAP GENERATION (ISLAND, RIVAL BOUTIQUE DOCKS, DEEP-SEA REEF)
// ============================================================================

function buildWorld() {
  const rng = mulberry32(20261115);
  const tiles: TileType[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => TileType.DEEP_WATER)
  );
  const variants: number[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => Math.floor(rng() * 16))
  );

  for (let r = 0; r < MAP_ROWS; r++) {
    const coast = coastColAt(r);
    for (let c = 0; c < MAP_COLS; c++) {
      if (c < coast - 8) {
        tiles[r][c] = rng() < 0.15 ? TileType.GRASS_FLOWER : TileType.GRASS;
      } else if (c < coast) {
        tiles[r][c] = TileType.SAND;
      } else if (c < coast + 5) {
        tiles[r][c] = TileType.SHALLOW_WATER;
      } else if (c >= REEF_START_COL) {
        tiles[r][c] = TileType.REEF_WATER;
      } else {
        tiles[r][c] = TileType.DEEP_WATER;
      }
    }
  }

  // Scenic Wildflower Clearings across western & central meadows
  const flowerClearings = [
    { cx: 28, cy: 30, rad: 8 },
    { cx: 44, cy: 64, rad: 7 },
    { cx: 26, cy: 90, rad: 8.5 },
  ];
  for (const fc of flowerClearings) {
    for (let r = Math.max(2, fc.cy - 10); r <= Math.min(MAP_ROWS - 3, fc.cy + 10); r++) {
      for (let c = Math.max(2, fc.cx - 10); c <= Math.min(coastColAt(r) - 9, fc.cx + 10); c++) {
        const dist = Math.hypot(c - fc.cx, r - fc.cy);
        if (dist <= fc.rad && rng() < 0.58) {
          tiles[r][c] = TileType.GRASS_FLOWER;
        }
      }
    }
  }

  // Rocky Highland Trail Patches (North & South cliffs)
  const highlandPatches = [
    { cx: 14, cy: 14, rad: 7 },
    { cx: 16, cy: 104, rad: 7.5 },
  ];
  for (const hp of highlandPatches) {
    for (let r = Math.max(2, hp.cy - 8); r <= Math.min(MAP_ROWS - 3, hp.cy + 8); r++) {
      for (let c = Math.max(2, hp.cx - 8); c <= Math.min(coastColAt(r) - 10, hp.cx + 8); c++) {
        const dist = Math.hypot(c - hp.cx, r - hp.cy);
        if (dist <= hp.rad * 0.72 && rng() < 0.65) {
          tiles[r][c] = TileType.DIRT_PATH;
        }
      }
    }
  }

  // Main East-West Dirt Footpath from grassy meadows to Player's Main Pier
  for (let c = 14; c <= coastColAt(PLAYER_SPAWN_ROW) - 2; c++) {
    const pathR = PLAYER_SPAWN_ROW + Math.round(Math.sin(c * 0.14) * 1.4);
    for (const dr of [0, 1]) {
      const rr = pathR + dr;
      if (tiles[rr]?.[c] === TileType.GRASS || tiles[rr]?.[c] === TileType.GRASS_FLOWER) {
        tiles[rr][c] = TileType.DIRT_PATH;
      }
    }
  }

  // North-South Coastal Promenade Trail connecting Lina's, Player's, and Sara's coasts
  for (let r = LINA_PIER_ROW; r <= SARA_PIER_ROW; r++) {
    const trailC = coastColAt(r) - 11 + Math.round(Math.sin(r * 0.12) * 1.5);
    for (const dc of [0, 1]) {
      const cc = trailC + dc;
      if (tiles[r]?.[cc] === TileType.GRASS || tiles[r]?.[cc] === TileType.GRASS_FLOWER) {
        tiles[r][cc] = TileType.DIRT_PATH;
      }
    }
  }

  // Deep-Sea Coral Reef Sandbar & Lagoon (cols 124..148, rows 42..76)
  for (let r = 42; r <= 76; r++) {
    for (let c = 124; c <= 148; c++) {
      const dist = Math.hypot((c - 136) * 0.85, (r - 58) * 0.72);
      if (dist < 10.5) {
        tiles[r][c] = TileType.REEF_CORAL;
      }
    }
  }
  // Natural coral reef stepping-stone approach across the deep reef edge (rows 57..58, cols 112..126)
  for (let c = 112; c <= 126; c++) {
    tiles[57][c] = TileType.REEF_CORAL;
    tiles[58][c] = TileType.REEF_CORAL;
  }

  // 1. Player's Starter Main Pier (center coast)
  const mainCoast = coastColAt(PLAYER_SPAWN_ROW);
  for (let c = mainCoast - 2; c <= mainCoast + 10; c++) {
    tiles[PLAYER_SPAWN_ROW - 1][c] = TileType.DOCK;
    tiles[PLAYER_SPAWN_ROW][c] = TileType.DOCK;
  }
  for (let r = PLAYER_SPAWN_ROW - 3; r <= PLAYER_SPAWN_ROW + 2; r++) {
    for (let c = mainCoast + 8; c <= mainCoast + 11; c++) {
      tiles[r][c] = TileType.DOCK;
    }
  }

  // 1b. Central Runway & Auction Stage (7x4 raised wooden plaza just west of spawn)
  for (let r = RUNWAY_STAGE_ROW; r < RUNWAY_STAGE_ROW + 4; r++) {
    for (let c = RUNWAY_STAGE_COL; c < RUNWAY_STAGE_COL + 7; c++) {
      tiles[r][c] = TileType.BOUTIQUE_FLOOR;
    }
  }
  // Connect Runway Stage cleanly south to main dirt footpath
  for (let r = RUNWAY_STAGE_ROW + 4; r <= PLAYER_SPAWN_ROW + 1; r++) {
    tiles[r][RUNWAY_STAGE_COL + 3] = TileType.DIRT_PATH;
    tiles[r][RUNWAY_STAGE_COL + 4] = TileType.DIRT_PATH;
  }

  // 1c. Sandy Beach Wooden Boat Dock (south-east of player pier)
  for (let r = BOAT_DOCK_ROW; r <= BOAT_DOCK_ROW + 1; r++) {
    for (let c = BOAT_DOCK_COL; c <= coastColAt(BOAT_DOCK_ROW) + 4; c++) {
      tiles[r][c] = TileType.DOCK;
    }
  }

  // 2. Rival Boutique Dock #1: Lina's Mariner Pier (North Coast)
  const linaCoast = coastColAt(LINA_PIER_ROW);
  for (let c = linaCoast - 2; c <= LINA_BOUTIQUE_COL - 1; c++) {
    tiles[LINA_PIER_ROW][c] = TileType.DOCK;
    tiles[LINA_PIER_ROW + 1][c] = TileType.DOCK;
  }
  for (let r = LINA_BOUTIQUE_ROW - 1; r <= LINA_BOUTIQUE_ROW + 4; r++) {
    for (let c = LINA_BOUTIQUE_COL - 1; c <= LINA_BOUTIQUE_COL + 4; c++) {
      tiles[r][c] = TileType.DOCK;
    }
  }
  for (let r = LINA_BOUTIQUE_ROW + 1; r <= LINA_BOUTIQUE_ROW + 2; r++) {
    for (let c = LINA_BOUTIQUE_COL; c <= LINA_BOUTIQUE_COL + 3; c++) {
      tiles[r][c] = TileType.BOUTIQUE_FLOOR;
    }
  }

  // 3. Rival Boutique Dock #2: Sara's Sunlit Pier (South Coast)
  const saraCoast = coastColAt(SARA_PIER_ROW);
  for (let c = saraCoast - 2; c <= SARA_BOUTIQUE_COL - 1; c++) {
    tiles[SARA_PIER_ROW][c] = TileType.DOCK;
    tiles[SARA_PIER_ROW + 1][c] = TileType.DOCK;
  }
  for (let r = SARA_BOUTIQUE_ROW - 1; r <= SARA_BOUTIQUE_ROW + 4; r++) {
    for (let c = SARA_BOUTIQUE_COL - 1; c <= SARA_BOUTIQUE_COL + 4; c++) {
      tiles[r][c] = TileType.DOCK;
    }
  }
  for (let r = SARA_BOUTIQUE_ROW + 1; r <= SARA_BOUTIQUE_ROW + 2; r++) {
    for (let c = SARA_BOUTIQUE_COL; c <= SARA_BOUTIQUE_COL + 3; c++) {
      tiles[r][c] = TileType.BOUTIQUE_FLOOR;
    }
  }

  const props: PropObject[] = [];
  const occupied = new Set<string>();
  const markOccupied = (c: number, r: number) => occupied.add(`${c},${r}`);

  // Keep player pier, runway stage, boat dock, Lina's pier, and Sara's pier clear of random trees
  for (let r = PLAYER_SPAWN_ROW - 5; r <= PLAYER_SPAWN_ROW + 5; r++) {
    for (let c = PLAYER_SPAWN_COL - 5; c <= mainCoast + 13; c++) markOccupied(c, r);
  }
  for (let r = RUNWAY_STAGE_ROW - 2; r <= PLAYER_SPAWN_ROW + 2; r++) {
    for (let c = RUNWAY_STAGE_COL - 2; c <= RUNWAY_STAGE_COL + 8; c++) markOccupied(c, r);
  }
  for (let r = BOAT_DOCK_ROW - 2; r <= BOAT_DOCK_ROW + 3; r++) {
    for (let c = BOAT_DOCK_COL - 2; c <= coastColAt(BOAT_DOCK_ROW) + 6; c++) markOccupied(c, r);
  }
  for (let r = LINA_BOUTIQUE_ROW - 2; r <= LINA_BOUTIQUE_ROW + 5; r++) {
    for (let c = linaCoast - 4; c <= LINA_BOUTIQUE_COL + 6; c++) markOccupied(c, r);
  }
  for (let r = SARA_BOUTIQUE_ROW - 2; r <= SARA_BOUTIQUE_ROW + 5; r++) {
    for (let c = saraCoast - 4; c <= SARA_BOUTIQUE_COL + 6; c++) markOccupied(c, r);
  }

  // 1d. Public Island Newsstand Plaza (between Spawn & Runway)
  for (let r = NEWSSTAND_ROW; r <= NEWSSTAND_ROW + 2; r++) {
    for (let c = NEWSSTAND_COL - 1; c <= NEWSSTAND_COL + 3; c++) {
      tiles[r][c] = TileType.DIRT_PATH;
    }
  }
  for (let r = NEWSSTAND_ROW - 1; r <= NEWSSTAND_ROW + 3; r++) {
    for (let c = NEWSSTAND_COL - 2; c <= NEWSSTAND_COL + 4; c++) markOccupied(c, r);
  }

  let propCounter = 0;

  // Place Public Island Newsstand Kiosk (Browse, Buy & Publish Fashion Magazines!)
  props.push({
    id: 'island_newsstand',
    kind: 'newsstand_kiosk',
    col: NEWSSTAND_COL,
    row: NEWSSTAND_ROW,
    x: NEWSSTAND_CENTER_X,
    y: (NEWSSTAND_ROW + 1) * TILE_SIZE + 12,
    solid: true,
    radius: 14,
    variant: 0,
    respawnTimer: 0,
  });

  // Place Lina's 4x3 Open-Front Boutique Structures, Display Table & Mannequins
  props.push(
    {
      id: 'lina_backwall',
      kind: 'boutique_backwall',
      col: LINA_BOUTIQUE_COL,
      row: LINA_BOUTIQUE_ROW,
      x: (LINA_BOUTIQUE_COL + 2) * TILE_SIZE,
      y: LINA_BOUTIQUE_ROW * TILE_SIZE + 14,
      solid: true,
      radius: 7,
      variant: 1,
      respawnTimer: 0,
      owner: 'Lina',
    },
    {
      id: 'lina_pillar_l',
      kind: 'boutique_pillar_l',
      col: LINA_BOUTIQUE_COL,
      row: LINA_BOUTIQUE_ROW + 2,
      x: LINA_BOUTIQUE_COL * TILE_SIZE + 3,
      y: (LINA_BOUTIQUE_ROW + 2) * TILE_SIZE + 14,
      solid: false,
      radius: 2,
      variant: 1,
      respawnTimer: 0,
      owner: 'Lina',
    },
    {
      id: 'lina_pillar_r',
      kind: 'boutique_pillar_r',
      col: LINA_BOUTIQUE_COL + 3,
      row: LINA_BOUTIQUE_ROW + 2,
      x: (LINA_BOUTIQUE_COL + 3) * TILE_SIZE + 13,
      y: (LINA_BOUTIQUE_ROW + 2) * TILE_SIZE + 14,
      solid: false,
      radius: 2,
      variant: 1,
      respawnTimer: 0,
      owner: 'Lina',
    },
    {
      id: 'lina_table',
      kind: 'display_table',
      col: LINA_BOUTIQUE_COL,
      row: LINA_BOUTIQUE_ROW + 1,
      x: LINA_BOUTIQUE_COL * TILE_SIZE + 8,
      y: (LINA_BOUTIQUE_ROW + 1) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 0,
      respawnTimer: 0,
      owner: 'Lina',
    },
    {
      id: 'lina_mannequin_1',
      kind: 'mannequin',
      col: LINA_BOUTIQUE_COL + 1,
      row: LINA_BOUTIQUE_ROW + 2,
      x: (LINA_BOUTIQUE_COL + 1) * TILE_SIZE + 8,
      y: (LINA_BOUTIQUE_ROW + 2) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 0,
      respawnTimer: 0,
      owner: 'Lina',
      listing: { item: RIVAL_ITEMS.lina_coat, price: 320 },
    },
    {
      id: 'lina_mannequin_2',
      kind: 'mannequin',
      col: LINA_BOUTIQUE_COL + 2,
      row: LINA_BOUTIQUE_ROW + 2,
      x: (LINA_BOUTIQUE_COL + 2) * TILE_SIZE + 8,
      y: (LINA_BOUTIQUE_ROW + 2) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 0,
      respawnTimer: 0,
      owner: 'Lina',
      listing: { item: RIVAL_ITEMS.lina_hat, price: 260 },
    }
  );

  // Place Sara's 4x3 Open-Front Boutique Structures, Display Table & Mannequins
  props.push(
    {
      id: 'sara_backwall',
      kind: 'boutique_backwall',
      col: SARA_BOUTIQUE_COL,
      row: SARA_BOUTIQUE_ROW,
      x: (SARA_BOUTIQUE_COL + 2) * TILE_SIZE,
      y: SARA_BOUTIQUE_ROW * TILE_SIZE + 14,
      solid: true,
      radius: 7,
      variant: 0,
      respawnTimer: 0,
      owner: 'Sara',
    },
    {
      id: 'sara_pillar_l',
      kind: 'boutique_pillar_l',
      col: SARA_BOUTIQUE_COL,
      row: SARA_BOUTIQUE_ROW + 2,
      x: SARA_BOUTIQUE_COL * TILE_SIZE + 3,
      y: (SARA_BOUTIQUE_ROW + 2) * TILE_SIZE + 14,
      solid: false,
      radius: 2,
      variant: 0,
      respawnTimer: 0,
      owner: 'Sara',
    },
    {
      id: 'sara_pillar_r',
      kind: 'boutique_pillar_r',
      col: SARA_BOUTIQUE_COL + 3,
      row: SARA_BOUTIQUE_ROW + 2,
      x: (SARA_BOUTIQUE_COL + 3) * TILE_SIZE + 13,
      y: (SARA_BOUTIQUE_ROW + 2) * TILE_SIZE + 14,
      solid: false,
      radius: 2,
      variant: 0,
      respawnTimer: 0,
      owner: 'Sara',
    },
    {
      id: 'sara_table',
      kind: 'display_table',
      col: SARA_BOUTIQUE_COL,
      row: SARA_BOUTIQUE_ROW + 1,
      x: SARA_BOUTIQUE_COL * TILE_SIZE + 8,
      y: (SARA_BOUTIQUE_ROW + 1) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 1,
      respawnTimer: 0,
      owner: 'Sara',
    },
    {
      id: 'sara_mannequin_1',
      kind: 'mannequin',
      col: SARA_BOUTIQUE_COL + 1,
      row: SARA_BOUTIQUE_ROW + 2,
      x: (SARA_BOUTIQUE_COL + 1) * TILE_SIZE + 8,
      y: (SARA_BOUTIQUE_ROW + 2) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 0,
      respawnTimer: 0,
      owner: 'Sara',
      listing: { item: RIVAL_ITEMS.sara_gown, price: 280 },
    },
    {
      id: 'sara_mannequin_2',
      kind: 'mannequin',
      col: SARA_BOUTIQUE_COL + 2,
      row: SARA_BOUTIQUE_ROW + 2,
      x: (SARA_BOUTIQUE_COL + 2) * TILE_SIZE + 8,
      y: (SARA_BOUTIQUE_ROW + 2) * TILE_SIZE + 12,
      solid: true,
      radius: 5,
      variant: 0,
      respawnTimer: 0,
      owner: 'Sara',
      listing: { item: RIVAL_ITEMS.sara_beret, price: 220 },
    }
  );

  // Place Deep-Sea Reef Rare Nodes (Golden Pearl Oysters & Royal Sea-Silk Coral)
  const reefSpots: Array<{ c: number; r: number; kind: 'golden_oyster' | 'royal_silk_coral' }> = [
    { c: 129, r: 54, kind: 'golden_oyster' },
    { c: 132, r: 51, kind: 'royal_silk_coral' },
    { c: 135, r: 55, kind: 'golden_oyster' },
    { c: 138, r: 52, kind: 'royal_silk_coral' },
    { c: 142, r: 57, kind: 'golden_oyster' },
    { c: 133, r: 61, kind: 'royal_silk_coral' },
    { c: 137, r: 63, kind: 'golden_oyster' },
    { c: 140, r: 66, kind: 'royal_silk_coral' },
    { c: 128, r: 60, kind: 'golden_oyster' },
    { c: 144, r: 61, kind: 'royal_silk_coral' },
    { c: 135, r: 48, kind: 'golden_oyster' },
    { c: 139, r: 69, kind: 'royal_silk_coral' },
  ];
  for (const rs of reefSpots) {
    if (tiles[rs.r]?.[rs.c] === TileType.REEF_CORAL) {
      props.push({
        id: `reef_${propCounter++}`,
        kind: rs.kind,
        col: rs.c,
        row: rs.r,
        x: rs.c * TILE_SIZE + 8,
        y: rs.r * TILE_SIZE + 11,
        solid: rs.kind === 'royal_silk_coral',
        radius: 5,
        variant: 0,
        respawnTimer: 0,
      });
    }
  }

  // Place Deep Ocean Rare Dye Nodes (accessible by boat & companion pets!)
  const deepOceanDyeSpots: Array<{
    c: number;
    r: number;
    kind: 'glowing_pearl_node' | 'starlight_coral_node' | 'seafoam_essence_node' | 'sunset_amber_node';
  }> = [
    // Open Deep Ocean (accessible with any Boat + Pet)
    { c: 92, r: 22, kind: 'glowing_pearl_node' },
    { c: 97, r: 30, kind: 'starlight_coral_node' },
    { c: 103, r: 25, kind: 'seafoam_essence_node' },
    { c: 108, r: 36, kind: 'sunset_amber_node' },
    { c: 91, r: 44, kind: 'seafoam_essence_node' },
    { c: 98, r: 50, kind: 'glowing_pearl_node' },
    { c: 105, r: 58, kind: 'sunset_amber_node' },
    { c: 94, r: 66, kind: 'starlight_coral_node' },
    { c: 101, r: 74, kind: 'glowing_pearl_node' },
    { c: 108, r: 82, kind: 'seafoam_essence_node' },
    { c: 95, r: 92, kind: 'sunset_amber_node' },
    { c: 104, r: 99, kind: 'starlight_coral_node' },
    // Outer Reef Deep Waters
    { c: 120, r: 28, kind: 'glowing_pearl_node' },
    { c: 126, r: 38, kind: 'starlight_coral_node' },
    { c: 146, r: 44, kind: 'seafoam_essence_node' },
    { c: 150, r: 55, kind: 'sunset_amber_node' },
    { c: 122, r: 70, kind: 'sunset_amber_node' },
    { c: 147, r: 71, kind: 'glowing_pearl_node' },
    { c: 132, r: 82, kind: 'seafoam_essence_node' },
    { c: 144, r: 88, kind: 'starlight_coral_node' },
  ];
  for (const ds of deepOceanDyeSpots) {
    const dt = tiles[ds.r]?.[ds.c];
    if ((dt === TileType.DEEP_WATER || dt === TileType.REEF_WATER) && !occupied.has(`${ds.c},${ds.r}`)) {
      props.push({
        id: `deep_dye_${propCounter++}`,
        kind: ds.kind,
        col: ds.c,
        row: ds.r,
        x: ds.c * TILE_SIZE + 8,
        y: ds.r * TILE_SIZE + 10,
        solid: false,
        radius: 5,
        variant: 0,
        respawnTimer: 0,
      });
    }
  }

  // Island Palms, Cotton Bushes, Dye Bushes, Rocky Cliffs
  for (let r = 2; r < MAP_ROWS - 2; r++) {
    const maxLandCol = Math.min(MAP_COLS - 2, coastColAt(r));
    for (let c = 2; c < maxLandCol; c++) {
      const t = tiles[r][c];
      if (t !== TileType.GRASS && t !== TileType.GRASS_FLOWER && t !== TileType.SAND) continue;
      if (occupied.has(`${c},${r}`) || occupied.has(`${c - 1},${r}`) || occupied.has(`${c + 1},${r}`)) continue;

      const inHighland = (r < 25 && c < 30) || (r > 94 && c < 34);
      const roll = rng();
      if (roll < (t === TileType.SAND ? 0.022 : 0.038)) {
        props.push({
          id: `palm_${propCounter++}`,
          kind: 'palm',
          col: c,
          row: r,
          x: c * TILE_SIZE + 8,
          y: r * TILE_SIZE + 13,
          solid: true,
          radius: 5,
          variant: Math.floor(rng() * 4),
          respawnTimer: 0,
        });
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) markOccupied(c + dc, r + dr);
      } else if (t !== TileType.SAND && roll < 0.07) {
        props.push({
          id: `cotton_${propCounter++}`,
          kind: 'cotton_bush',
          col: c,
          row: r,
          x: c * TILE_SIZE + 8,
          y: r * TILE_SIZE + 12,
          solid: true,
          radius: 5.5,
          variant: 0,
          respawnTimer: 0,
        });
        markOccupied(c, r);
      } else if (t !== TileType.SAND && roll < 0.095) {
        props.push({
          id: `dye_${propCounter++}`,
          kind: 'dye_bush',
          col: c,
          row: r,
          x: c * TILE_SIZE + 8,
          y: r * TILE_SIZE + 12,
          solid: true,
          radius: 5.5,
          variant: 0,
          respawnTimer: 0,
        });
        markOccupied(c, r);
      } else if (roll < (inHighland ? 0.145 : 0.109) && c > 4) {
        props.push({
          id: `rock_${propCounter++}`,
          kind: 'rock',
          col: c,
          row: r,
          x: c * TILE_SIZE + 8,
          y: r * TILE_SIZE + 12,
          solid: true,
          radius: 6,
          variant: 0,
          respawnTimer: 0,
        });
        markOccupied(c, r);
      }
    }
  }

  // Guaranteed gatherable nodes near spawn plaza
  const guaranteedSpots: Array<{ c: number; r: number; kind: PropKind }> = [
    { c: PLAYER_SPAWN_COL - 4, r: PLAYER_SPAWN_ROW - 3, kind: 'cotton_bush' },
    { c: PLAYER_SPAWN_COL - 3, r: PLAYER_SPAWN_ROW + 3, kind: 'dye_bush' },
    { c: PLAYER_SPAWN_COL + 1, r: PLAYER_SPAWN_ROW - 4, kind: 'palm' },
    { c: PLAYER_SPAWN_COL + 2, r: PLAYER_SPAWN_ROW + 4, kind: 'rock' },
    { c: PLAYER_SPAWN_COL - 5, r: PLAYER_SPAWN_ROW + 1, kind: 'cotton_bush' },
    { c: PLAYER_SPAWN_COL - 1, r: PLAYER_SPAWN_ROW + 5, kind: 'dye_bush' },
  ];
  for (const spot of guaranteedSpots) {
    const t = tiles[spot.r]?.[spot.c];
    if (t === TileType.GRASS || t === TileType.GRASS_FLOWER || t === TileType.SAND) {
      props.push({
        id: `guar_${propCounter++}`,
        kind: spot.kind,
        col: spot.c,
        row: spot.r,
        x: spot.c * TILE_SIZE + 8,
        y: spot.r * TILE_SIZE + 12,
        solid: true,
        radius: 5.5,
        variant: 1,
        respawnTimer: 0,
      });
    }
  }

  // Beach Seashells & Starfish along the 120-row coast
  for (let r = 2; r < MAP_ROWS - 2; r++) {
    const coast = coastColAt(r);
    for (let c = coast - 8; c < coast; c++) {
      if (tiles[r]?.[c] !== TileType.SAND) continue;
      if (occupied.has(`${c},${r}`)) continue;
      if (rng() < 0.17) {
        const kinds: PropKind[] = ['shell_pink', 'shell_conch', 'starfish'];
        props.push({
          id: `shell_${propCounter++}`,
          kind: kinds[Math.floor(rng() * kinds.length)],
          col: c,
          row: r,
          x: c * TILE_SIZE + 8,
          y: r * TILE_SIZE + 9,
          solid: false,
          radius: 4,
          variant: 0,
          respawnTimer: 0,
        });
      }
    }
  }

  return { tiles, variants, props };
}

// ============================================================================
// REACT UI SUBCOMPONENTS
// ============================================================================

const PixelItemIcon: React.FC<{ kind: ItemKind | 'rare_outfit' | 'rare_hat'; size?: number }> = ({
  kind,
  size = 28,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawItemIconCanvas(ref.current, kind);
  }, [kind]);
  return (
    <canvas
      ref={ref}
      width={16}
      height={16}
      style={{ width: size, height: size }}
      className="pixelated pointer-events-none shrink-0"
    />
  );
};

const GoldCoinIcon: React.FC<{ size?: number }> = ({ size = 18 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawPixelMatrix(
      ctx,
      ['....OOOO....', '..OOYYYYOO..', '.OYHHHHYYDO.', '.OYHYYYYYDO.', '.OYHYDDYYDO.', '.OYHYDDYYDO.', '.OYHYYYYYDO.', '.OYYYYYDDDO.', '..OODDDDOO..', '....OOOO....'],
      { O: '#4a260a', Y: '#f7c531', H: '#fff199', D: '#c48314' },
      1,
      1
    );
  }, []);
  const h = Math.round((size * 12) / 14);
  return <canvas ref={ref} width={14} height={12} style={{ width: size, height: h }} className="pixelated shrink-0" />;
};

const WardrobePreviewCanvas: React.FC<{
  appearance: CharacterAppearance;
  dir: Direction;
  walking: boolean;
}> = ({ appearance, dir, walking }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (walking) t += dt * 7;
      const timeSec = now / 1000;
      const pieces = [
        appearance.hat,
        appearance.top,
        appearance.bottom,
        appearance.dress,
        appearance.shoes,
      ];
      const effects = getItemsActiveEffects(pieces);
      const sunsetPhase = effects.includes('sunset_amber') ? Math.floor(timeSec * 7) % 12 : 0;

      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, c.width, c.height);

          const hasGlow = effects.includes('glowing_pearls');
          const hasNeon = hasNightNeonItems(pieces);
          const rainCfg = getActiveRainConfig(pieces);
          if (hasGlow || hasNeon) {
            ctx.fillStyle = '#12264f';
            ctx.fillRect(0, 0, c.width, 74);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(16, 14, 2, 2);
            ctx.fillRect(98, 22, 2, 2);
            ctx.fillStyle = '#1b4770';
            ctx.fillRect(0, 74, c.width, 16);
            ctx.fillStyle = '#9c8663';
            ctx.fillRect(0, 90, c.width, c.height - 90);
            ctx.fillStyle = '#756347';
            ctx.fillRect(0, 90, c.width, 3);
          } else if (rainCfg) {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, c.width, 74);
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

          const frame = walking ? Math.floor(t) % 4 : 0;
          const sprite = renderCharacterSprite(appearance, dir, frame, sunsetPhase);

          ctx.fillStyle = 'rgba(46, 26, 14, 0.25)';
          ctx.fillRect(42, 114, 44, 10);
          ctx.drawImage(sprite, 24, 4, 80, 120);

          if (hasGlow) {
            drawGlowingPearlsSpriteOverlay(ctx, pieces, dir, frame, 24, 4, 5, timeSec, 0.9);
          }
          if (hasNeon) {
            drawNightNeonSpriteOverlay(ctx, pieces, dir, frame, 24, 4, 5, timeSec, 0.95);
          }
          if (rainCfg) {
            drawRainReactiveOverlay(ctx, pieces, dir, frame, 24, 4, 5, 1);
            ctx.fillStyle = 'rgba(219, 234, 254, 0.65)';
            for (let i = 0; i < 12; i++) {
              const rx = ((i * 29 + timeSec * 40) % (c.width + 12)) - 6;
              const ry = ((i * 37 + timeSec * 145) % (c.height + 12)) - 6;
              ctx.fillRect(Math.floor(rx), Math.floor(ry), 1.5, 6);
            }
          }
          if (effects.includes('starlight_coral') || effects.includes('seafoam_essence')) {
            drawOutfitAmbientEffects(
              ctx,
              effects,
              64,
              74,
              4,
              timeSec,
              walking ? 'player' : 'preview'
            );
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [appearance, dir, walking]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={132}
      className="pixelated h-[148px] w-36 border-2 border-[#6b3c1b] bg-[#bfe8f5]"
    />
  );
};

const ClothingThumb: React.FC<{ item: ClothingItem; size?: number }> = ({
  item,
  size = 34,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);
    ctx.drawImage(renderClothingThumbnail(item), 0, 0);
  }, [item]);
  return (
    <canvas
      ref={ref}
      width={16}
      height={16}
      style={{ width: size, height: size }}
      className="pixelated pointer-events-none shrink-0"
    />
  );
};

const PetThumb: React.FC<{ kind: PetKind; size?: number }> = ({ kind, size = 34 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let raf = 0;
    let tick = 0;
    const drawFrame = () => {
      tick++;
      const c = ref.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, 14, 14);
          ctx.drawImage(renderPetSprite(kind, 'down', Math.floor(tick / 24) % 2), 0, 0);
        }
      }
      raf = requestAnimationFrame(drawFrame);
    };
    raf = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(raf);
  }, [kind]);
  return (
    <canvas
      ref={ref}
      width={14}
      height={14}
      style={{ width: size, height: size }}
      className="pixelated pointer-events-none shrink-0"
    />
  );
};

// ============================================================================
// SAVE / LOAD HELPERS (LOCALSTORAGE)
// ============================================================================

interface SavedGameData {
  playerName: string;
  gold: number;
  appearance: CharacterAppearance;
  ownedItems: ClothingItem[];
  inventory: InventoryCounts;
  hasBoat?: boolean;
  ownedBoats?: BoatKind[];
  equippedBoat?: BoatKind | null;
  ownedPets?: PetKind[];
  equippedPet?: PetKind | null;
  ownedMagazineIds?: string[];
  totalSales?: number;
  editionMintCounts?: Record<string, number>;
}

function loadSavedSnapshots(): LookbookSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is LookbookSnapshot =>
          Boolean(s && typeof s.id === 'string' && typeof s.dataUrl === 'string' && s.dataUrl.startsWith('data:image/'))
      )
      .slice(0, 18);
  } catch {
    return [];
  }
}

function loadSavedGame(): SavedGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGameData;
    if (!parsed || typeof parsed.gold !== 'number' || !parsed.appearance || !Array.isArray(parsed.ownedItems)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  const initialSave = useMemo(() => loadSavedGame(), []);
  const starterItems = useMemo(() => createStarterClothingItems(), []);
  const playerId = useMemo(() => getOrCreatePlayerId(), []);

  const baselineWorldRef = useRef(buildWorld());
  const worldRef = useRef(buildWorld());

  // Multiplayer & Join Screen State
  const [joinedIsland, setJoinedIsland] = useState(false);
  const [joinInputName, setJoinInputName] = useState(
    () => getStoredNickname() || initialSave?.playerName || 'Islander'
  );
  const [joiningBusy, setJoiningBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [cloudPreviewProfile, setCloudPreviewProfile] = useState<CloudPlayerProfile | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [buyingBusy, setBuyingBusy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Player State
  const [playerName, setPlayerName] = useState(
    () => getStoredNickname() || initialSave?.playerName || 'Islander'
  );
  const [appearance, setAppearance] = useState<CharacterAppearance>(
    initialSave?.appearance || {
      skinId: 'peach',
      hairStyle: 'long_wavy',
      hairColorId: 'chestnut',
      hat: starterItems.hat,
      top: null,
      bottom: null,
      dress: starterItems.dress,
      shoes: starterItems.shoes,
    }
  );
  const [ownedItems, setOwnedItems] = useState<ClothingItem[]>(
    initialSave?.ownedItems || [
      starterItems.dress,
      starterItems.hat,
      starterItems.shoes,
      starterItems.top,
      starterItems.bottom,
    ]
  );
  const [gold, setGold] = useState(initialSave?.gold ?? 1000);
  const [inventory, setInventory] = useState<InventoryCounts>(() => ({
    ...DEFAULT_INVENTORY,
    ...(initialSave?.inventory || {}),
  }));

  // Modals & UI State
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [designStudioOpen, setDesignStudioOpen] = useState(false);
  const [activeStallPropId, setActiveStallPropId] = useState<string | null>(null);
  const [buyPreviewPropId, setBuyPreviewPropId] = useState<string | null>(null);
  const [shopsModalOpen, setShopsModalOpen] = useState(false);
  const [tradersList, setTradersList] = useState<LeaderboardTrader[]>([]);
  const [loadingTraders, setLoadingTraders] = useState(false);
  const [runwayModalOpen, setRunwayModalOpen] = useState(false);
  const [boatModalOpen, setBoatModalOpen] = useState(false);
  const [activeAuction, setActiveAuction] = useState<CloudAuction | null>(null);
  const [trendTick, setTrendTick] = useState(() => Date.now());

  // Social Chat & Emotes
  const [chatBarOpen, setChatBarOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Boats, Pets & Edition Mint Tracking
  const initialBoatList = useMemo<BoatKind[]>(() => {
    if (Array.isArray(initialSave?.ownedBoats) && initialSave.ownedBoats.length > 0) {
      return initialSave.ownedBoats;
    }
    return initialSave?.hasBoat ? ['rowboat'] : [];
  }, [initialSave]);
  const [ownedBoats, setOwnedBoats] = useState<BoatKind[]>(initialBoatList);
  const [equippedBoat, setEquippedBoat] = useState<BoatKind | null>(() => {
    if (initialSave?.equippedBoat && initialBoatList.includes(initialSave.equippedBoat)) {
      return initialSave.equippedBoat;
    }
    return initialBoatList[0] || null;
  });
  const hasBoat = ownedBoats.length > 0;
  const [isBoating, setIsBoating] = useState<boolean>(false);
  const [ownedPets, setOwnedPets] = useState<PetKind[]>(() => {
    const rawList = initialSave?.ownedPets || [];
    const seen = new Set<PetKind>();
    for (const pk of rawList) {
      const norm = normalizePetKind(pk);
      if (norm) seen.add(norm);
    }
    return Array.from(seen);
  });
  const [equippedPet, setEquippedPet] = useState<PetKind | null>(() =>
    initialSave?.equippedPet ? normalizePetKind(initialSave.equippedPet) : null
  );
  const [totalSales, setTotalSales] = useState<number>(initialSave?.totalSales || 0);
  const [editionMintCounts, setEditionMintCounts] = useState<Record<string, number>>(
    initialSave?.editionMintCounts || {}
  );
  const [ownedMagazineIds, setOwnedMagazineIds] = useState<string[]>(
    initialSave?.ownedMagazineIds || []
  );
  const ownedMagazineIdsRef = useRef<string[]>(ownedMagazineIds);
  const [magazines, setMagazines] = useState<CloudMagazine[]>([]);
  const [snapshots, setSnapshots] = useState<LookbookSnapshot[]>(() => loadSavedSnapshots());
  const [newsstandOpen, setNewsstandOpen] = useState<boolean>(false);
  const [lookbookOpen, setLookbookOpen] = useState<boolean>(false);
  const [cameraModeOpen, setCameraModeOpen] = useState<boolean>(false);
  const [cameraFlash, setCameraFlash] = useState<boolean>(false);
  const [nearLandmarkPrompt, setNearLandmarkPrompt] = useState<'runway' | 'boat' | 'newsstand' | null>(null);
  const [manageShopId, setManageShopId] = useState<string | null>(null);
  const [nearOwnShopId, setNearOwnShopId] = useState<string | null>(null);
  const [movingShop, setMovingShop] = useState<{
    shopStructId: string;
    oldCol: number;
    oldRow: number;
    tier: ShopTier;
    spanCols: number;
    spanRows: number;
    interiorItems: Array<{
      id: string;
      kind: WorldStructureKind;
      relCol: number;
      relRow: number;
      listing?: MannequinListing | null;
    }>;
  } | null>(null);

  // Stall Manager Draft State
  const [stallSelectedUid, setStallSelectedUid] = useState<string | null>(null);
  const [stallPrice, setStallPrice] = useState<number>(250);
  const [equipOnBuy, setEquipOnBuy] = useState<boolean>(true);

  const [previewDir, setPreviewDir] = useState<Direction>('down');
  const [previewWalking, setPreviewWalking] = useState(true);
  const [wardrobeTab, setWardrobeTab] = useState<'closet' | 'skin' | 'hair'>('closet');
  const [wardrobeSlotFilter, setWardrobeSlotFilter] = useState<'all' | ClothingSlot>('all');
  const [craftTab, setCraftTab] = useState<'luxury' | 'structures' | 'decor' | 'pets'>('luxury');
  const [luxuryCategoryFilter, setLuxuryCategoryFilter] = useState<'all' | ClothingSlot>('all');
  const [luxuryRarityFilter, setLuxuryRarityFilter] = useState<'all' | LuxuryRarity>('all');

  const [hotbarMode, setHotbarMode] = useState<'gather' | 'build'>('build');
  const [selectedSlot, setSelectedSlot] = useState(3);
  const [selectedDecorKind, setSelectedDecorKind] = useState<DecorKind | null>(null);
  const [muted, setMuted] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [, setPropsVersion] = useState(0);

  // Mobile / iPad Analog Joystick & Action Button (visible by default + toggleable)
  const [showTouchControls, setShowTouchControls] = useState<boolean>(true);
  const [timeOfDayMode, setTimeOfDayMode] = useState<'auto' | 'day' | 'night'>('auto');
  const timeOfDayModeRef = useRef<'auto' | 'day' | 'night'>('auto');
  const [weatherMode, setWeatherMode] = useState<'auto' | 'sunny' | 'rain'>('auto');
  const weatherModeRef = useRef<'auto' | 'sunny' | 'rain'>('auto');
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const [actionBtnPressed, setActionBtnPressed] = useState(false);
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickPointerIdRef = useRef<number | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const dprRef = useRef<number>(1);

  // Canvas & Mutable 60fps State Refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniBaseDirtyRef = useRef(true);

  const playerRef = useRef<CharacterEntity>({
    id: 'player',
    name: playerName,
    x: PLAYER_SPAWN_COL * TILE_SIZE + 8,
    y: PLAYER_SPAWN_ROW * TILE_SIZE + 8,
    vx: 0,
    vy: 0,
    dir: 'down',
    animTime: 0,
    isMoving: false,
    appearance,
    isPlayer: true,
    swingTimer: 0,
    swingDir: 'down',
  });

  const npcsRef = useRef<CharacterEntity[]>([
    {
      id: 'sara',
      name: 'Sara',
      x: (SARA_BOUTIQUE_COL + 1) * TILE_SIZE + 8,
      y: (SARA_BOUTIQUE_ROW + 3) * TILE_SIZE + 8,
      vx: 0,
      vy: 0,
      dir: 'up',
      animTime: 0,
      isMoving: false,
      isPlayer: false,
      waitTimer: 1.2,
      emote: null,
      emoteTimer: 0,
      appearance: {
        skinId: 'warm_sand',
        hairStyle: 'long_wavy',
        hairColorId: 'ginger',
        hat: RIVAL_ITEMS.sara_beret,
        top: null,
        bottom: null,
        dress: RIVAL_ITEMS.sara_gown,
        shoes: starterItems.shoes,
      },
    },
    {
      id: 'lina',
      name: 'Lina',
      x: (LINA_BOUTIQUE_COL + 1) * TILE_SIZE + 8,
      y: (LINA_BOUTIQUE_ROW + 3) * TILE_SIZE + 8,
      vx: 0,
      vy: 0,
      dir: 'up',
      animTime: 0,
      isMoving: false,
      isPlayer: false,
      waitTimer: 1.8,
      emote: 'wave',
      emoteTimer: 2.5,
      appearance: {
        skinId: 'porcelain',
        hairStyle: 'twin_tails',
        hairColorId: 'raven',
        hat: RIVAL_ITEMS.lina_hat,
        top: null,
        bottom: null,
        dress: RIVAL_ITEMS.lina_coat,
        shoes: starterItems.shoes,
      },
    },
    {
      id: 'maya',
      name: 'Maya',
      x: (PLAYER_SPAWN_COL + 2) * TILE_SIZE + 8,
      y: (PLAYER_SPAWN_ROW - 2) * TILE_SIZE + 8,
      vx: 0,
      vy: 0,
      dir: 'down',
      animTime: 0,
      isMoving: false,
      isPlayer: false,
      waitTimer: 0.8,
      emote: null,
      emoteTimer: 0,
      appearance: {
        skinId: 'honey_tan',
        hairStyle: 'high_bun',
        hairColorId: 'chestnut',
        hat: null,
        top: starterItems.top,
        bottom: starterItems.bottom,
        dress: null,
        shoes: starterItems.shoes,
      },
    },
  ]);

  const cameraRef = useRef({ x: 0, y: 0, initialized: false });
  const keysRef = useRef<Set<string>>(new Set());
  const mouseHoverRef = useRef<{ active: boolean; screenX: number; screenY: number }>({
    active: false,
    screenX: 0,
    screenY: 0,
  });
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const bobberRef = useRef<Bobber | null>(null);

  const modalOpenRef = useRef(true);
  const joinedIslandRef = useRef(false);
  const inventoryRef = useRef(inventory);
  const hotbarModeRef = useRef(hotbarMode);
  const selectedSlotRef = useRef(selectedSlot);
  const selectedDecorKindRef = useRef(selectedDecorKind);
  const appearanceRef = useRef(appearance);
  const ownedItemsRef = useRef(ownedItems);
  const goldRef = useRef(gold);
  const playerNameRef = useRef(playerName);
  const hasBoatRef = useRef(hasBoat);
  const ownedBoatsRef = useRef(ownedBoats);
  const equippedBoatRef = useRef(equippedBoat);
  const isBoatingRef = useRef(isBoating);
  const ownedPetsRef = useRef(ownedPets);
  const equippedPetRef = useRef(equippedPet);
  const totalSalesRef = useRef(totalSales);
  const editionMintCountsRef = useRef(editionMintCounts);
  const localPetHeartUntilRef = useRef<number>(0);
  const socialStateRef = useRef<{
    chatText: string | null;
    chatAt: number;
    emoteEmoji: string | null;
    emoteAt: number;
    runwayShowAt: number;
  }>({
    chatText: null,
    chatAt: 0,
    emoteEmoji: null,
    emoteAt: 0,
    runwayShowAt: 0,
  });
  const localPetRef = useRef<{ x: number; y: number; dir: Direction; anim: number }>({
    x: PLAYER_SPAWN_COL * TILE_SIZE - 8,
    y: PLAYER_SPAWN_ROW * TILE_SIZE + 8,
    dir: 'down',
    anim: 0,
  });
  const reefWarnCooldownRef = useRef(0);
  const movingShopRef = useRef<typeof movingShop>(null);
  const dockPlankCoordsRef = useRef<Set<string>>(new Set());
  const remotePlayersRef = useRef<Map<string, RemotePlayerState>>(new Map());
  const lastSeenSaleAtRef = useRef<number>(0);
  const lastPosSaveRef = useRef<{ x: number; y: number; dir: Direction; time: number }>({
    x: playerRef.current.x,
    y: playerRef.current.y,
    dir: playerRef.current.dir,
    time: 0,
  });
  const presenceSyncRef = useRef<{
    lastSentAt: number;
    lastX: number;
    lastY: number;
    lastDir: Direction;
    wasMoving: boolean;
    pendingStop: boolean;
  }>({
    lastSentAt: 0,
    lastX: playerRef.current.x,
    lastY: playerRef.current.y,
    lastDir: playerRef.current.dir,
    wasMoving: false,
    pendingStop: false,
  });

  // Combined Tactical Stats across all equipped clothing slots
  const activeStats = useMemo<GearStats>(() => {
    const equipped = [
      appearance.hat,
      appearance.top,
      appearance.bottom,
      appearance.dress,
      appearance.shoes,
    ];
    return equipped.reduce<GearStats>(
      (acc, piece) => {
        if (!piece) return acc;
        return {
          speedPct: acc.speedPct + (piece.stats?.speedPct || 0),
          harvestBonus: acc.harvestBonus + (piece.stats?.harvestBonus || 0),
          seaRes: acc.seaRes + (piece.stats?.seaRes || 0),
        };
      },
      { speedPct: 0, harvestBonus: 0, seaRes: 0 }
    );
  }, [appearance.hat, appearance.top, appearance.bottom, appearance.dress, appearance.shoes]);

  const statsRef = useRef(activeStats);
  useEffect(() => {
    statsRef.current = activeStats;
  }, [activeStats]);

  useEffect(() => {
    const clean = playerName.trim() || 'Islander';
    playerRef.current.name = clean;
    playerNameRef.current = clean;
  }, [playerName]);

  useEffect(() => {
    playerRef.current.appearance = appearance;
    appearanceRef.current = appearance;
  }, [appearance]);

  useEffect(() => {
    ownedItemsRef.current = ownedItems;
  }, [ownedItems]);

  useEffect(() => {
    joinedIslandRef.current = joinedIsland;
  }, [joinedIsland]);

  useEffect(() => {
    goldRef.current = gold;
  }, [gold]);

  useEffect(() => {
    hasBoatRef.current = hasBoat;
  }, [hasBoat]);

  useEffect(() => {
    ownedBoatsRef.current = ownedBoats;
  }, [ownedBoats]);

  useEffect(() => {
    equippedBoatRef.current = equippedBoat;
  }, [equippedBoat]);

  useEffect(() => {
    isBoatingRef.current = isBoating;
  }, [isBoating]);

  useEffect(() => {
    ownedPetsRef.current = ownedPets;
  }, [ownedPets]);

  useEffect(() => {
    equippedPetRef.current = equippedPet;
  }, [equippedPet]);

  useEffect(() => {
    totalSalesRef.current = totalSales;
  }, [totalSales]);

  useEffect(() => {
    editionMintCountsRef.current = editionMintCounts;
  }, [editionMintCounts]);

  useEffect(() => {
    movingShopRef.current = movingShop;
  }, [movingShop]);

  useEffect(() => {
    timeOfDayModeRef.current = timeOfDayMode;
  }, [timeOfDayMode]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    ownedMagazineIdsRef.current = ownedMagazineIds;
  }, [ownedMagazineIds]);

  useEffect(() => {
    modalOpenRef.current =
      !joinedIsland ||
      wardrobeOpen ||
      craftingOpen ||
      designStudioOpen ||
      shopsModalOpen ||
      runwayModalOpen ||
      boatModalOpen ||
      newsstandOpen ||
      lookbookOpen ||
      manageShopId !== null ||
      activeStallPropId !== null ||
      buyPreviewPropId !== null;
    if (modalOpenRef.current) {
      keysRef.current.clear();
      joystickVecRef.current = { x: 0, y: 0 };
      joystickPointerIdRef.current = null;
      setJoystickThumb((prev) => (prev.active || prev.x !== 0 || prev.y !== 0 ? { x: 0, y: 0, active: false } : prev));
    }
  }, [
    joinedIsland,
    wardrobeOpen,
    craftingOpen,
    designStudioOpen,
    shopsModalOpen,
    runwayModalOpen,
    boatModalOpen,
    newsstandOpen,
    lookbookOpen,
    manageShopId,
    activeStallPropId,
    buyPreviewPropId,
  ]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    hotbarModeRef.current = hotbarMode;
  }, [hotbarMode]);

  useEffect(() => {
    selectedSlotRef.current = selectedSlot;
  }, [selectedSlot]);

  useEffect(() => {
    selectedDecorKindRef.current = selectedDecorKind;
  }, [selectedDecorKind]);

  const equipItem = useCallback((item: ClothingItem) => {
    setAppearance((prev) => {
      if (item.slot === 'dress') {
        return { ...prev, dress: item, top: null, bottom: null };
      }
      if (item.slot === 'top') {
        return { ...prev, top: item, dress: null };
      }
      if (item.slot === 'bottom') {
        return { ...prev, bottom: item, dress: null };
      }
      if (item.slot === 'hat') {
        return { ...prev, hat: item };
      }
      return { ...prev, shoes: item };
    });
  }, []);

  const unequipSlot = useCallback((slot: ClothingSlot) => {
    setAppearance((prev) => ({ ...prev, [slot]: null }));
  }, []);

  // Save Game Function (Local Fallback + Cloud Firestore Profile)
  const saveProgress = useCallback(
    (showToast = false) => {
      try {
        const payload: SavedGameData = {
          playerName,
          gold,
          appearance,
          ownedItems,
          inventory,
          hasBoat,
          ownedBoats,
          equippedBoat,
          ownedPets,
          equippedPet,
          ownedMagazineIds,
          totalSales,
          editionMintCounts,
        };
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore quota errors
      }

      if (joinedIslandRef.current) {
        savePlayerProfile(
          {
            playerId,
            playerName: playerName.trim() || 'Islander',
            gold,
            x: playerRef.current.x,
            y: playerRef.current.y,
            dir: playerRef.current.dir,
            appearance,
            ownedItems,
            inventory,
            hasBoat,
            ownedBoats,
            equippedBoat,
            ownedPets,
            equippedPet,
            ownedMagazineIds,
            totalSales,
            editionMintCounts,
          },
          'update'
        )
          .then(() => {
            lastPosSaveRef.current = {
              x: playerRef.current.x,
              y: playerRef.current.y,
              dir: playerRef.current.dir,
              time: Date.now(),
            };
            if (showToast) {
              sfx.playChime();
              setSaveNotice(true);
              setTimeout(() => setSaveNotice(false), 1800);
            }
          })
          .catch(() => {
            // fallback already persisted locally
          });
      } else if (showToast) {
        sfx.playChime();
        setSaveNotice(true);
        setTimeout(() => setSaveNotice(false), 1800);
      }
    },
    [
      playerId,
      playerName,
      gold,
      appearance,
      ownedItems,
      inventory,
      hasBoat,
      ownedBoats,
      equippedBoat,
      ownedPets,
      equippedPet,
      totalSales,
      editionMintCounts,
    ]
  );

  // Auto-save whenever core player state changes once joined
  useEffect(() => {
    if (!joinedIsland) return;
    const id = setTimeout(() => saveProgress(false), 450);
    return () => clearTimeout(id);
  }, [joinedIsland, saveProgress]);

  // Periodic position cloud save (every 8s if player moved)
  useEffect(() => {
    if (!joinedIsland) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      const prev = lastPosSaveRef.current;
      if (Math.hypot(p.x - prev.x, p.y - prev.y) > 4 || p.dir !== prev.dir) {
        saveProgress(false);
      }
    }, 8000);
    return () => clearInterval(id);
  }, [joinedIsland, saveProgress]);

  const activeSlots = hotbarMode === 'gather' ? HOTBAR_GATHER : HOTBAR_BUILD;
  const activeSlotDef = activeSlots[selectedSlot] || activeSlots[0];
  const selectedDecorDef =
    hotbarMode === 'build' && selectedDecorKind
      ? HOTBAR_BUILD_DECOR.find((d) => d.kind === selectedDecorKind) || null
      : null;

  const selectDecorForPlacement = useCallback((kind: DecorKind) => {
    setHotbarMode('build');
    setSelectedDecorKind(kind);
    setCraftingOpen(false);
    setManageShopId(null);
  }, []);

  const selectStructureForPlacement = useCallback((kind: ItemKind) => {
    const idx = HOTBAR_BUILD.findIndex((s) => s.kind === kind);
    if (idx !== -1) {
      setHotbarMode('build');
      setSelectedDecorKind(null);
      setSelectedSlot(idx);
      setCraftingOpen(false);
    }
  }, []);

  // Collision Helper
  const isPositionWalkable = useCallback((wx: number, wy: number, allowWater = false): boolean => {
    const r = 4.5;
    const points = [
      [wx - r, wy - 2],
      [wx + r, wy - 2],
      [wx - r, wy + 2],
      [wx + r, wy + 2],
    ];

    const tiles = worldRef.current.tiles;
    for (const [px, py] of points) {
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);
      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
      const t = tiles[row][col];
      if (!allowWater && (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER || t === TileType.REEF_WATER)) {
        return false;
      }
    }

    for (const prop of worldRef.current.props) {
      if (!prop.solid) continue;
      if (prop.respawnTimer > 0 && prop.kind !== 'palm') continue;

      if (prop.kind === 'boutique_backwall') {
        const spanCols = getShopTierSpec(prop.shopTier).cols;
        const minX = prop.col * TILE_SIZE;
        const maxX = (prop.col + spanCols) * TILE_SIZE;
        const minY = prop.row * TILE_SIZE;
        const maxY = prop.row * TILE_SIZE + 13;
        if (wx + r > minX && wx - r < maxX && wy + 2 > minY && wy - 2 < maxY) {
          return false;
        }
        continue;
      }

      const dx = wx - prop.x;
      const dy = wy - prop.y;
      const minDist = r + prop.radius;
      if (dx * dx + dy * dy < minDist * minDist) return false;
    }

    return true;
  }, []);

  // Placement Validation for Free-Building System (Grass, Sand, Wooden Floors, Rugs, AND Ocean Docks)
  const validatePlacement = useCallback(
    (
      kind: 'dock_plank' | 'shop_wall' | 'mannequin' | DecorKind,
      col: number,
      row: number
    ): { valid: boolean; upgradeT2?: boolean } => {
      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return { valid: false };
      const p = playerRef.current;
      const tileCenterX = col * TILE_SIZE + 8;
      const tileCenterY = row * TILE_SIZE + 8;
      const reachTargetX = kind === 'shop_wall' ? (col + 2) * TILE_SIZE : tileCenterX;
      const reachTargetY = kind === 'shop_wall' ? (row + 1.5) * TILE_SIZE : tileCenterY;
      const dist = Math.hypot(reachTargetX - p.x, reachTargetY - p.y);
      if (dist > TILE_SIZE * (kind === 'shop_wall' ? 6.0 : 4.5)) return { valid: false };

      const tiles = worldRef.current.tiles;
      const props = worldRef.current.props;
      const tile = tiles[row][col];

      const chars = [playerRef.current, ...npcsRef.current];
      const charBlocking = chars.some(
        (ch) => Math.abs(ch.x - tileCenterX) < 10 && Math.abs(ch.y - tileCenterY) < 10
      );

      const hasPropAt = (c: number, r: number, ignoreRugs = false) =>
        props.some((pr) => {
          if (ignoreRugs && isRugKind(pr.kind)) return false;
          return pr.kind === 'boutique_backwall'
            ? r === pr.row && c >= pr.col && c <= pr.col + getShopTierSpec(pr.shopTier).cols - 1
            : pr.col === c && pr.row === r;
        });

      const hasRugAt = (c: number, r: number) =>
        props.some((pr) => isRugKind(pr.kind) && pr.col === c && pr.row === r);

      if (kind === 'dock_plank') {
        if (charBlocking || hasPropAt(col, row)) return { valid: false };
        // Build wooden floor directly on Grass, Flowers, Path, or Beach Sand
        if (
          tile === TileType.GRASS ||
          tile === TileType.GRASS_FLOWER ||
          tile === TileType.DIRT_PATH ||
          tile === TileType.SAND
        ) {
          return { valid: true };
        }
        // Or extend boardwalk planks out over Shallow, Deep, or Reef water when anchored
        if (tile !== TileType.SHALLOW_WATER && tile !== TileType.DEEP_WATER && tile !== TileType.REEF_WATER) {
          return { valid: false };
        }
        const neighbors = [
          tiles[row - 1]?.[col],
          tiles[row + 1]?.[col],
          tiles[row]?.[col - 1],
          tiles[row]?.[col + 1],
        ];
        const hasAnchor = neighbors.some(
          (nt) =>
            nt === TileType.SAND ||
            nt === TileType.GRASS ||
            nt === TileType.GRASS_FLOWER ||
            nt === TileType.DIRT_PATH ||
            nt === TileType.DOCK ||
            nt === TileType.BOUTIQUE_FLOOR ||
            nt === TileType.REEF_CORAL
        );
        return { valid: hasAnchor };
      }

      if (kind === 'shop_wall') {
        // 4-tile wide x 3-tile tall Open-Front Boutique Shop Kit footprint (Grass, Sand, or Dock)
        if (col + 3 >= MAP_COLS || row + 2 >= MAP_ROWS) return { valid: false };
        for (let r = row; r <= row + 2; r++) {
          for (let c = col; c <= col + 3; c++) {
            const t = tiles[r]?.[c];
            const validSurface =
              t === TileType.DOCK ||
              t === TileType.SAND ||
              t === TileType.GRASS ||
              t === TileType.GRASS_FLOWER ||
              t === TileType.DIRT_PATH;
            if (!validSurface) return { valid: false };
            if (hasPropAt(c, r)) return { valid: false };

            // Prevent trapping a character inside the back wall row
            if (r === row) {
              const cx = c * TILE_SIZE + 8;
              const cy = r * TILE_SIZE + 8;
              if (chars.some((ch) => Math.abs(ch.x - cx) < 10 && Math.abs(ch.y - cy) < 10)) {
                return { valid: false };
              }
            }
          }
        }
        return { valid: true };
      }

      const validSurface =
        tile === TileType.DOCK ||
        tile === TileType.BOUTIQUE_FLOOR ||
        tile === TileType.SAND ||
        tile === TileType.GRASS ||
        tile === TileType.GRASS_FLOWER ||
        tile === TileType.DIRT_PATH;

      // Woven Rugs: walkable carpets that can sit under standing furniture/characters
      if (isRugKind(kind)) {
        if (!validSurface || hasRugAt(col, row)) return { valid: false };
        return { valid: true };
      }

      // Display Mannequin & Boutique Furniture (can stand on Grass, Sand, Docks, Boutique Floors, or Rugs!)
      if (charBlocking || hasPropAt(col, row, true)) return { valid: false };
      return { valid: validSurface };
    },
    []
  );

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 18 + Math.random() * 26;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 14,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.65,
        color,
        size: Math.random() < 0.5 ? 2 : 1,
      });
    }
  }, []);

  const spawnFloatingText = useCallback((x: number, y: number, text: string, color = '#fff5cc') => {
    floatingTextsRef.current.push({ x, y, text, color, life: 1.35 });
  }, []);

  // Startup Cloud Subscriptions: Connection Check, Profile Preview, Shared World Structures, Online Players
  useEffect(() => {
    let active = true;

    void testFirestoreConnection();

    const unsubHealth = subscribeCloudHealth((healthy) => {
      if (!active) return;
      if (healthy && joinedIslandRef.current) {
        void savePlayerProfile(
          {
            playerId,
            playerName: playerNameRef.current.trim() || 'Islander',
            gold: goldRef.current,
            x: playerRef.current.x,
            y: playerRef.current.y,
            dir: playerRef.current.dir,
            appearance: appearanceRef.current,
            ownedItems: ownedItemsRef.current,
            inventory: inventoryRef.current,
            hasBoat: hasBoatRef.current,
            ownedBoats: ownedBoatsRef.current,
            equippedBoat: equippedBoatRef.current,
            ownedPets: ownedPetsRef.current,
            equippedPet: equippedPetRef.current,
            ownedMagazineIds: ownedMagazineIdsRef.current,
            totalSales: totalSalesRef.current,
            editionMintCounts: editionMintCountsRef.current,
          },
          'update'
        );
        const nowMs = Date.now();
        const soc = socialStateRef.current;
        void syncOnlinePlayer({
          playerId,
          name: playerNameRef.current,
          x: playerRef.current.x,
          y: playerRef.current.y,
          dir: playerRef.current.dir,
          isMoving: playerRef.current.isMoving,
          appearance: appearanceRef.current,
          chatText: soc.chatText && nowMs - soc.chatAt < 5000 ? soc.chatText : null,
          chatAt: soc.chatText && nowMs - soc.chatAt < 5000 ? soc.chatAt : null,
          emoteEmoji: soc.emoteEmoji && nowMs - soc.emoteAt < 5000 ? soc.emoteEmoji : null,
          emoteAt: soc.emoteEmoji && nowMs - soc.emoteAt < 5000 ? soc.emoteAt : null,
          isBoating: isBoatingRef.current,
          equippedBoat: equippedBoatRef.current,
          equippedPet: equippedPetRef.current,
          runwayShowAt: soc.runwayShowAt && nowMs - soc.runwayShowAt < 5000 ? soc.runwayShowAt : null,
        });
      }
    });

    fetchPlayerProfile(playerId)
      .then((profile) => {
        if (!active) return;
        setCloudPreviewProfile(profile);
        if (profile?.playerName) {
          setJoinInputName((prev) => (prev === 'Islander' || !prev ? profile.playerName : prev));
        }
        setCheckingProfile(false);
      })
      .catch(() => {
        if (active) {
          setCheckingProfile(false);
        }
      });

    const unsubWorld = subscribeWorldStructures((structures: CloudWorldStructure[]) => {
      const base = baselineWorldRef.current;
      const world = worldRef.current;

      // Reset tiles from baseline so cloud world stays authoritative
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          world.tiles[r][c] = base.tiles[r][c];
        }
      }

      // Preserve baseline props (including resource respawn timers) and replace cloud props
      const baseProps = world.props.filter((pr) => !pr.fromCloud);
      const orderRank: Record<WorldStructureKind, number> = {
        dock_plank: 0,
        boutique_shop: 1,
        rug_pink: 2,
        rug_teal: 2,
        rug_gold: 2,
        mannequin: 3,
        changing_booth: 3,
        vanity_mirror: 3,
        clothing_rack: 3,
        cash_counter: 3,
        potted_plant: 3,
        lantern_post: 3,
      };
      const sorted = [...structures].sort(
        (a, b) => (orderRank[a.kind] ?? 3) - (orderRank[b.kind] ?? 3)
      );

      const nextDockCoords = new Set<string>();
      for (const s of sorted) {
        if (s.kind === 'dock_plank') {
          if (world.tiles[s.row]?.[s.col] !== undefined) {
            world.tiles[s.row][s.col] = TileType.DOCK;
            nextDockCoords.add(`${s.col}_${s.row}`);
          }
        } else if (s.kind === 'boutique_shop') {
          const tier = clampShopTier(s.tier);
          const spec = getShopTierSpec(tier);
          for (let r = s.row + 1; r <= s.row + spec.rows - 1; r++) {
            for (let c = s.col; c <= s.col + spec.cols - 1; c++) {
              if (world.tiles[r]?.[c] !== undefined) {
                world.tiles[r][c] = TileType.BOUTIQUE_FLOOR;
              }
            }
          }
          baseProps.push(
            {
              id: `${s.id}_bw`,
              kind: 'boutique_backwall',
              col: s.col,
              row: s.row,
              x: (s.col + spec.cols / 2) * TILE_SIZE,
              y: s.row * TILE_SIZE + 14,
              solid: true,
              radius: 7,
              variant: 0,
              respawnTimer: 0,
              owner: s.ownerName,
              ownerId: s.ownerId,
              fromCloud: true,
              shopTier: tier,
              shopStructId: s.id,
            },
            {
              id: `${s.id}_pl`,
              kind: 'boutique_pillar_l',
              col: s.col,
              row: s.row + spec.rows - 1,
              x: s.col * TILE_SIZE + 3,
              y: (s.row + spec.rows - 1) * TILE_SIZE + 14,
              solid: false,
              radius: 2,
              variant: 0,
              respawnTimer: 0,
              owner: s.ownerName,
              ownerId: s.ownerId,
              fromCloud: true,
              shopTier: tier,
              shopStructId: s.id,
            },
            {
              id: `${s.id}_pr`,
              kind: 'boutique_pillar_r',
              col: s.col + spec.cols - 1,
              row: s.row + spec.rows - 1,
              x: (s.col + spec.cols - 1) * TILE_SIZE + 13,
              y: (s.row + spec.rows - 1) * TILE_SIZE + 14,
              solid: false,
              radius: 2,
              variant: 0,
              respawnTimer: 0,
              owner: s.ownerName,
              ownerId: s.ownerId,
              fromCloud: true,
              shopTier: tier,
              shopStructId: s.id,
            }
          );
        } else if (s.kind === 'mannequin') {
          baseProps.push({
            id: s.id,
            kind: 'mannequin',
            col: s.col,
            row: s.row,
            x: s.col * TILE_SIZE + 8,
            y: s.row * TILE_SIZE + 12,
            solid: true,
            radius: 5,
            variant: 0,
            respawnTimer: 0,
            owner: s.ownerName,
            ownerId: s.ownerId,
            fromCloud: true,
            listing: (s.listing as MannequinListing | null | undefined) || null,
          });
        } else if (isDecorKind(s.kind)) {
          baseProps.push({
            id: s.id,
            kind: s.kind,
            col: s.col,
            row: s.row,
            x: s.col * TILE_SIZE + 8,
            y: s.row * TILE_SIZE + 12,
            solid: !isRugKind(s.kind),
            radius: isRugKind(s.kind) ? 0 : 4.5,
            variant: 0,
            respawnTimer: 0,
            owner: s.ownerName,
            ownerId: s.ownerId,
            fromCloud: true,
          });
        }
      }

      dockPlankCoordsRef.current = nextDockCoords;
      world.props = baseProps;
      miniBaseDirtyRef.current = true;
      setPropsVersion((v) => v + 1);
    });

    const unsubOnline = subscribeOnlinePlayers((players: CloudOnlinePlayer[]) => {
      const nowWall = Date.now();
      const map = remotePlayersRef.current;
      const seenIds = new Set<string>();

      for (const op of players) {
        if (op.playerId === playerId) continue;
        seenIds.add(op.playerId);

        const serverMs = op.updatedAt ? op.updatedAt.toMillis() : nowWall;
        const existing = map.get(op.playerId);
        const normPet = op.equippedPet ? normalizePetKind(op.equippedPet) : null;

        if (!existing) {
          // Ignore stale presence records from crashed sessions older than 12s
          if (nowWall - serverMs > 12000) continue;
          map.set(op.playerId, {
            playerId: op.playerId,
            name: op.name,
            x: op.x,
            y: op.y,
            targetX: op.x,
            targetY: op.y,
            dir: op.dir,
            isMoving: op.isMoving,
            animTime: 0,
            appearance: op.appearance as CharacterAppearance,
            chatText: op.chatText ?? null,
            chatAt: op.chatAt ?? null,
            emoteEmoji: op.emoteEmoji ?? null,
            emoteAt: op.emoteAt ?? null,
            isBoating: Boolean(op.isBoating),
            equippedBoat: op.equippedBoat ?? null,
            equippedPet: normPet,
            runwayShowAt: op.runwayShowAt ?? null,
            petX: op.x - 14,
            petY: op.y + 4,
            petDir: op.dir,
            petAnim: 0,
            lastServerUpdatedMs: serverMs,
            lastSeenLocalMs: nowWall,
          });
        } else {
          if (serverMs !== existing.lastServerUpdatedMs) {
            existing.lastServerUpdatedMs = serverMs;
            existing.lastSeenLocalMs = nowWall;
          }
          existing.name = op.name;
          existing.targetX = op.x;
          existing.targetY = op.y;
          existing.dir = op.dir;
          existing.isMoving = op.isMoving;
          existing.appearance = op.appearance as CharacterAppearance;
          existing.chatText = op.chatText ?? null;
          existing.chatAt = op.chatAt ?? null;
          existing.emoteEmoji = op.emoteEmoji ?? null;
          existing.emoteAt = op.emoteAt ?? null;
          existing.isBoating = Boolean(op.isBoating);
          existing.equippedBoat = op.equippedBoat ?? null;
          existing.equippedPet = normPet;
          existing.runwayShowAt = op.runwayShowAt ?? null;
        }
      }

      for (const id of Array.from(map.keys())) {
        if (!seenIds.has(id)) {
          map.delete(id);
        }
      }

      setOnlineCount((joinedIslandRef.current ? 1 : 0) + map.size);
    });

    const unsubAuction = subscribeCurrentAuction((auction) => {
      if (active) setActiveAuction(auction);
    });

    const unsubMagazines = subscribeMagazines((mags) => {
      if (active) setMagazines(mags);
    });

    const handleUnload = () => {
      void removeOnlinePlayer(playerId);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      active = false;
      unsubHealth();
      unsubWorld();
      unsubOnline();
      unsubAuction();
      unsubMagazines();
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      void removeOnlinePlayer(playerId);
    };
  }, [playerId]);

  // 1-Second Trend Countdown Ticker & Live Auction Settlement Watcher
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setTrendTick(now);
      const auc = activeAuction;
      if (auc && !auc.settled && now >= auc.endsAtMs && joinedIslandRef.current) {
        void settleCurrentAuction(auc.id).then((settled) => {
          if (!settled) return;
          if (settled.highestBidderId === playerId) {
            void fetchPlayerProfile(playerId).then((prof) => {
              if (prof) {
                setGold(prof.gold);
                setOwnedItems(prof.ownedItems);
              }
            });
            sfx.playCoin();
            spawnParticles(playerRef.current.x, playerRef.current.y - 10, '#ffe548', 16);
            spawnFloatingText(
              playerRef.current.x,
              playerRef.current.y - 26,
              `Won ${settled.item.name}!`,
              '#ffe566'
            );
          } else if (settled.sellerId === playerId && !settled.highestBidderId) {
            setOwnedItems((prev) =>
              prev.some((i) => i.uid === settled.item.uid) ? prev : [settled.item, ...prev]
            );
            spawnFloatingText(
              playerRef.current.x,
              playerRef.current.y - 24,
              `Auction ended (no bids)`,
              '#ffe49e'
            );
          }
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeAuction, playerId, spawnFloatingText, spawnParticles]);

  // Real-time Player Profile Subscription (detects live cross-player boutique & auction sales!)
  useEffect(() => {
    if (!joinedIsland) return;
    const unsub = subscribePlayerProfile(playerId, (profile) => {
      if (profile.lastSale && profile.lastSale.at > lastSeenSaleAtRef.current) {
        lastSeenSaleAtRef.current = profile.lastSale.at;
        setGold(profile.gold);
        if (typeof profile.totalSales === 'number') {
          setTotalSales(profile.totalSales);
        }
        sfx.playCoin();
        spawnParticles(playerRef.current.x, playerRef.current.y - 10, '#ffe548', 14);
        spawnFloatingText(
          playerRef.current.x,
          playerRef.current.y - 26,
          `+${profile.lastSale.amount}G Sold to ${profile.lastSale.buyerName}!`,
          '#ffe566'
        );
      }
    });
    return () => unsub();
  }, [joinedIsland, playerId, spawnFloatingText, spawnParticles]);

  // Join Island Handler (Load or Create Cloud/Local Profile — never blocks entry)
  const handleJoinIsland = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (joiningBusy) return;
    const cleanName = joinInputName.trim().slice(0, 20) || 'Islander';
    setJoiningBusy(true);
    setJoinError(null);
    storeNickname(cleanName);

    try {
      const existing = await fetchPlayerProfile(playerId);
      let activeAppearance = appearanceRef.current;
      let activeGold = goldRef.current;
      let activeOwned = ownedItemsRef.current;
      let activeInv = inventoryRef.current;
      let activeOwnedBoats = ownedBoatsRef.current;
      let activeEquippedBoat = equippedBoatRef.current;
      let activeHasBoat = activeOwnedBoats.length > 0;
      let activeOwnedPets = ownedPetsRef.current;
      let activeEquippedPet = equippedPetRef.current;
      let activeTotalSales = totalSalesRef.current;
      let activeMintCounts = editionMintCountsRef.current;
      let activeOwnedMagazines = ownedMagazineIdsRef.current;

      if (existing) {
        activeAppearance = existing.appearance as CharacterAppearance;
        activeGold = existing.gold;
        activeOwned = existing.ownedItems;
        activeInv = { ...DEFAULT_INVENTORY, ...(existing.inventory || {}) };
        activeOwnedBoats =
          Array.isArray(existing.ownedBoats) && existing.ownedBoats.length > 0
            ? existing.ownedBoats
            : existing.hasBoat
              ? ['rowboat']
              : [];
        activeEquippedBoat =
          existing.equippedBoat && activeOwnedBoats.includes(existing.equippedBoat)
            ? existing.equippedBoat
            : activeOwnedBoats[0] || null;
        activeHasBoat = activeOwnedBoats.length > 0;
        const normPets = new Set<PetKind>();
        for (const pk of existing.ownedPets || []) {
          const n = normalizePetKind(pk);
          if (n) normPets.add(n);
        }
        activeOwnedPets = Array.from(normPets);
        activeEquippedPet = existing.equippedPet ? normalizePetKind(existing.equippedPet) : null;
        activeTotalSales = existing.totalSales || 0;
        activeMintCounts = existing.editionMintCounts || {};
        activeOwnedMagazines = Array.isArray(existing.ownedMagazineIds) ? existing.ownedMagazineIds : [];
        lastSeenSaleAtRef.current = existing.lastSale?.at || 0;

        setAppearance(activeAppearance);
        setGold(activeGold);
        setOwnedItems(activeOwned);
        setInventory(activeInv);
        setOwnedBoats(activeOwnedBoats);
        setEquippedBoat(activeEquippedBoat);
        setOwnedPets(activeOwnedPets);
        setEquippedPet(activeEquippedPet);
        setTotalSales(activeTotalSales);
        setEditionMintCounts(activeMintCounts);
        setOwnedMagazineIds(activeOwnedMagazines);

        playerRef.current.x = Math.max(16, Math.min(WORLD_W - 16, existing.x));
        playerRef.current.y = Math.max(16, Math.min(WORLD_H - 16, existing.y));
        playerRef.current.dir = existing.dir;
        playerRef.current.appearance = activeAppearance;
        localPetRef.current.x = playerRef.current.x - 14;
        localPetRef.current.y = playerRef.current.y + 4;
        cameraRef.current.initialized = false;

        if (existing._migratedFromLegacy || existing.playerName !== cleanName) {
          await savePlayerProfile(
            {
              playerId,
              playerName: cleanName,
              gold: activeGold,
              x: playerRef.current.x,
              y: playerRef.current.y,
              dir: playerRef.current.dir,
              appearance: activeAppearance,
              ownedItems: activeOwned,
              inventory: activeInv,
              hasBoat: activeHasBoat,
              ownedBoats: activeOwnedBoats,
              equippedBoat: activeEquippedBoat,
              ownedPets: activeOwnedPets,
              equippedPet: activeEquippedPet,
              ownedMagazineIds: activeOwnedMagazines,
              totalSales: activeTotalSales,
              editionMintCounts: activeMintCounts,
            },
            existing._migratedFromLegacy ? 'migrate' : 'update'
          );
        }
      } else {
        await savePlayerProfile(
          {
            playerId,
            playerName: cleanName,
            gold: activeGold,
            x: playerRef.current.x,
            y: playerRef.current.y,
            dir: playerRef.current.dir,
            appearance: activeAppearance,
            ownedItems: activeOwned,
            inventory: activeInv,
            hasBoat: activeHasBoat,
            ownedBoats: activeOwnedBoats,
            equippedBoat: activeEquippedBoat,
            ownedPets: activeOwnedPets,
            equippedPet: activeEquippedPet,
            ownedMagazineIds: activeOwnedMagazines,
            totalSales: activeTotalSales,
            editionMintCounts: activeMintCounts,
          },
          'create'
        );
      }

      setPlayerName(cleanName);
      playerRef.current.name = cleanName;
      playerNameRef.current = cleanName;

      await syncOnlinePlayer({
        playerId,
        name: cleanName,
        x: playerRef.current.x,
        y: playerRef.current.y,
        dir: playerRef.current.dir,
        isMoving: false,
        appearance: activeAppearance,
        isBoating: false,
        equippedBoat: activeEquippedBoat,
        equippedPet: activeEquippedPet,
      });
    } catch {
      setPlayerName(cleanName);
      playerRef.current.name = cleanName;
      playerNameRef.current = cleanName;
    } finally {
      presenceSyncRef.current = {
        lastSentAt: Date.now(),
        lastX: playerRef.current.x,
        lastY: playerRef.current.y,
        lastDir: playerRef.current.dir,
        wasMoving: false,
        pendingStop: false,
      };
      lastPosSaveRef.current = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        dir: playerRef.current.dir,
        time: Date.now(),
      };

      setOnlineCount(1 + remotePlayersRef.current.size);
      setJoinedIsland(true);
      setJoiningBusy(false);
      sfx.playChime();
    }
  };

  const openMannequinModal = useCallback(
    (prop: PropObject) => {
      sfx.playClick();
      const isMine = prop.ownerId ? prop.ownerId === playerId : prop.owner === 'player';
      if (!isMine) {
        if (!prop.listing) {
          spawnFloatingText(prop.x, prop.y - 16, 'Empty Stall', '#ffe49e');
          return;
        }
        setBuyError(null);
        setEquipOnBuy(true);
        setBuyPreviewPropId(prop.id);
        return;
      }

      // Player's Shop Stall Manager
      if (prop.listing?.item) {
        setStallSelectedUid(prop.listing.item.uid);
        setStallPrice(prop.listing.price);
      } else {
        const firstOwned = ownedItemsRef.current[0] || null;
        setStallSelectedUid(firstOwned?.uid || null);
        setStallPrice(
          firstOwned?.source === 'luxury' ? 2400 : firstOwned?.source === 'boutique' ? 400 : 220
        );
      }
      setActiveStallPropId(prop.id);
    },
    [playerId, spawnFloatingText]
  );

  // Shop Expansion (Tiers 1-4) & Move Entire Shop Helpers
  const getShopStructId = useCallback((shopProp: PropObject): string => {
    return shopProp.shopStructId || shopProp.id.replace(/_bw$/, '');
  }, []);

  const isLandmarkTile = useCallback((c: number, r: number): boolean => {
    if (
      c >= RUNWAY_STAGE_COL - 1 &&
      c <= RUNWAY_STAGE_COL + 7 &&
      r >= RUNWAY_STAGE_ROW - 1 &&
      r <= RUNWAY_STAGE_ROW + 4
    ) {
      return true;
    }
    if (
      c >= NEWSSTAND_COL - 1 &&
      c <= NEWSSTAND_COL + 3 &&
      r >= NEWSSTAND_ROW - 1 &&
      r <= NEWSSTAND_ROW + 2
    ) {
      return true;
    }
    if (
      c >= BOAT_DOCK_COL - 1 &&
      c <= BOAT_DOCK_COL + 6 &&
      r >= BOAT_DOCK_ROW - 1 &&
      r <= BOAT_DOCK_ROW + 2
    ) {
      return true;
    }
    if (
      c >= LINA_BOUTIQUE_COL - 1 &&
      c <= LINA_BOUTIQUE_COL + 4 &&
      r >= LINA_BOUTIQUE_ROW - 1 &&
      r <= LINA_BOUTIQUE_ROW + 3
    ) {
      return true;
    }
    if (
      c >= SARA_BOUTIQUE_COL - 1 &&
      c <= SARA_BOUTIQUE_COL + 4 &&
      r >= SARA_BOUTIQUE_ROW - 1 &&
      r <= SARA_BOUTIQUE_ROW + 3
    ) {
      return true;
    }
    return false;
  }, []);

  const getShopInteriorProps = useCallback(
    (shopProp: PropObject): PropObject[] => {
      const spec = getShopTierSpec(shopProp.shopTier);
      return worldRef.current.props.filter((pr) => {
        if (pr.kind !== 'mannequin' && !isDecorKind(pr.kind)) return false;
        const owned = pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player';
        if (!owned) return false;
        return (
          pr.col >= shopProp.col &&
          pr.col < shopProp.col + spec.cols &&
          pr.row >= shopProp.row &&
          pr.row < shopProp.row + spec.rows
        );
      });
    },
    [playerId]
  );

  const canExpandShopAt = useCallback(
    (shopProp: PropObject, nextTier: ShopTier): { valid: boolean; reason?: string } => {
      const curSpec = getShopTierSpec(shopProp.shopTier);
      const nextSpec = getShopTierSpec(nextTier);
      if (
        shopProp.col < 2 ||
        shopProp.row < 2 ||
        shopProp.col + nextSpec.cols > MAP_COLS - 2 ||
        shopProp.row + nextSpec.rows > MAP_ROWS - 2
      ) {
        return {
          valid: false,
          reason: 'Too close to the island border! Use Move Shop to relocate to an open spot.',
        };
      }

      const tiles = worldRef.current.tiles;
      const props = worldRef.current.props;
      const structId = getShopStructId(shopProp);
      const interiorIds = new Set(getShopInteriorProps(shopProp).map((i) => i.id));
      interiorIds.add(`${structId}_bw`);
      interiorIds.add(`${structId}_pl`);
      interiorIds.add(`${structId}_pr`);

      for (let r = shopProp.row; r < shopProp.row + nextSpec.rows; r++) {
        for (let c = shopProp.col; c < shopProp.col + nextSpec.cols; c++) {
          const inOldFootprint =
            c >= shopProp.col &&
            c < shopProp.col + curSpec.cols &&
            r >= shopProp.row &&
            r < shopProp.row + curSpec.rows;
          if (inOldFootprint) continue;

          if (isLandmarkTile(c, r)) {
            return {
              valid: false,
              reason: 'Blocked by a Coral Cove landmark nearby. Use Move Shop to relocate!',
            };
          }
          const t = tiles[r]?.[c];
          if (
            t === undefined ||
            t === TileType.SHALLOW_WATER ||
            t === TileType.DEEP_WATER ||
            t === TileType.REEF_WATER ||
            t === TileType.REEF_CORAL
          ) {
            return {
              valid: false,
              reason: 'Ocean water blocks expansion! Build Dock Planks first or Move Shop.',
            };
          }
          if (t === TileType.BOUTIQUE_FLOOR) {
            return {
              valid: false,
              reason: 'Another boutique is in the way. Use Move Shop to expand freely!',
            };
          }

          const blockingProp = props.find((pr) => {
            if (interiorIds.has(pr.id)) return false;
            if (pr.respawnTimer > 0 && pr.kind !== 'palm') return false;
            if (pr.kind === 'boutique_backwall') {
              return r === pr.row && c >= pr.col && c < pr.col + getShopTierSpec(pr.shopTier).cols;
            }
            return pr.col === c && pr.row === r;
          });
          if (blockingProp) {
            return {
              valid: false,
              reason: 'Trees, rocks, or furniture nearby block expansion. Harvest them or Move Shop!',
            };
          }
        }
      }
      return { valid: true };
    },
    [getShopInteriorProps, getShopStructId, isLandmarkTile]
  );

  const handleExpandShop = useCallback(
    (shopStructId: string) => {
      const props = worldRef.current.props;
      const shopProp = props.find(
        (pr) => pr.kind === 'boutique_backwall' && getShopStructId(pr) === shopStructId
      );
      if (!shopProp) return;
      const curTier = clampShopTier(shopProp.shopTier);
      if (curTier >= 4) return;
      const nextTier = (curTier + 1) as ShopTier;
      const nextSpec = getShopTierSpec(nextTier);
      if (goldRef.current < nextSpec.upgradeCost) return;

      const check = canExpandShopAt(shopProp, nextTier);
      if (!check.valid) return;

      const tiles = worldRef.current.tiles;
      for (let r = shopProp.row + 1; r <= shopProp.row + nextSpec.rows - 1; r++) {
        for (let c = shopProp.col; c <= shopProp.col + nextSpec.cols - 1; c++) {
          if (tiles[r]?.[c] !== undefined) {
            tiles[r][c] = TileType.BOUTIQUE_FLOOR;
          }
        }
      }

      shopProp.shopTier = nextTier;
      shopProp.shopStructId = shopStructId;
      shopProp.x = (shopProp.col + nextSpec.cols / 2) * TILE_SIZE;

      const pl = props.find((pr) => pr.id === `${shopStructId}_pl`);
      if (pl) {
        pl.col = shopProp.col;
        pl.row = shopProp.row + nextSpec.rows - 1;
        pl.x = shopProp.col * TILE_SIZE + 3;
        pl.y = (shopProp.row + nextSpec.rows - 1) * TILE_SIZE + 14;
        pl.shopTier = nextTier;
      }
      const pr = props.find((item) => item.id === `${shopStructId}_pr`);
      if (pr) {
        pr.col = shopProp.col + nextSpec.cols - 1;
        pr.row = shopProp.row + nextSpec.rows - 1;
        pr.x = (shopProp.col + nextSpec.cols - 1) * TILE_SIZE + 13;
        pr.y = (shopProp.row + nextSpec.rows - 1) * TILE_SIZE + 14;
        pr.shopTier = nextTier;
      }

      setGold((g) => g - nextSpec.upgradeCost);
      miniBaseDirtyRef.current = true;
      setPropsVersion((v) => v + 1);
      sfx.playChime();
      spawnParticles(
        (shopProp.col + nextSpec.cols / 2) * TILE_SIZE,
        (shopProp.row + nextSpec.rows / 2) * TILE_SIZE,
        '#fde047',
        20
      );
      spawnFloatingText(
        (shopProp.col + nextSpec.cols / 2) * TILE_SIZE,
        shopProp.row * TILE_SIZE - 10,
        `Upgraded: ${nextSpec.name}!`,
        '#fde047'
      );
      void upgradeWorldShopTier(shopStructId, nextTier);
    },
    [canExpandShopAt, getShopStructId, spawnFloatingText, spawnParticles]
  );

  const startMoveShop = useCallback(
    (shopStructId: string) => {
      const shopProp = worldRef.current.props.find(
        (pr) => pr.kind === 'boutique_backwall' && getShopStructId(pr) === shopStructId
      );
      if (!shopProp) return;
      const tier = clampShopTier(shopProp.shopTier);
      const spec = getShopTierSpec(tier);
      const interior = getShopInteriorProps(shopProp).map((pr) => ({
        id: pr.id,
        kind: pr.kind as WorldStructureKind,
        relCol: pr.col - shopProp.col,
        relRow: pr.row - shopProp.row,
        listing: pr.listing ?? null,
      }));
      setManageShopId(null);
      setMovingShop({
        shopStructId,
        oldCol: shopProp.col,
        oldRow: shopProp.row,
        tier,
        spanCols: spec.cols,
        spanRows: spec.rows,
        interiorItems: interior,
      });
      spawnFloatingText(
        playerRef.current.x,
        playerRef.current.y - 24,
        'Click clear spot to Move Shop!',
        '#bae6fd'
      );
    },
    [getShopInteriorProps, getShopStructId, spawnFloatingText]
  );

  const validateShopRelocation = useCallback(
    (
      targetCol: number,
      targetRow: number,
      ms: NonNullable<typeof movingShop>
    ): boolean => {
      if (
        targetCol < 2 ||
        targetRow < 2 ||
        targetCol + ms.spanCols > MAP_COLS - 2 ||
        targetRow + ms.spanRows > MAP_ROWS - 2
      ) {
        return false;
      }

      const tiles = worldRef.current.tiles;
      const props = worldRef.current.props;
      const ownIds = new Set<string>([
        `${ms.shopStructId}_bw`,
        `${ms.shopStructId}_pl`,
        `${ms.shopStructId}_pr`,
        ...ms.interiorItems.map((i) => i.id),
      ]);
      const chars = [playerRef.current, ...npcsRef.current];

      for (let r = targetRow; r < targetRow + ms.spanRows; r++) {
        for (let c = targetCol; c < targetCol + ms.spanCols; c++) {
          if (isLandmarkTile(c, r)) return false;

          const t = tiles[r]?.[c];
          const inOldFloor =
            c >= ms.oldCol &&
            c < ms.oldCol + ms.spanCols &&
            r >= ms.oldRow + 1 &&
            r < ms.oldRow + ms.spanRows;

          const validSurface =
            t === TileType.GRASS ||
            t === TileType.GRASS_FLOWER ||
            t === TileType.DIRT_PATH ||
            t === TileType.SAND ||
            t === TileType.DOCK ||
            (inOldFloor && t === TileType.BOUTIQUE_FLOOR);

          if (!validSurface) return false;

          const blockedByProp = props.some((pr) => {
            if (ownIds.has(pr.id)) return false;
            if (pr.respawnTimer > 0 && pr.kind !== 'palm') return false;
            if (pr.kind === 'boutique_backwall') {
              return r === pr.row && c >= pr.col && c < pr.col + getShopTierSpec(pr.shopTier).cols;
            }
            return pr.col === c && pr.row === r;
          });
          if (blockedByProp) return false;

          if (r === targetRow) {
            const cx = c * TILE_SIZE + 8;
            const cy = r * TILE_SIZE + 8;
            if (chars.some((ch) => Math.abs(ch.x - cx) < 10 && Math.abs(ch.y - cy) < 10)) {
              return false;
            }
          }
        }
      }

      return true;
    },
    [isLandmarkTile]
  );

  const confirmShopRelocation = useCallback(
    (targetCol: number, targetRow: number) => {
      const ms = movingShopRef.current;
      if (!ms) return;

      if (!validateShopRelocation(targetCol, targetRow, ms)) {
        sfx.playClick();
        spawnFloatingText(
          (targetCol + ms.spanCols / 2) * TILE_SIZE,
          targetRow * TILE_SIZE - 8,
          'Needs clear grass, sand, or dock!',
          '#fda4af'
        );
        return;
      }

      const tiles = worldRef.current.tiles;
      const baseTiles = baselineWorldRef.current.tiles;
      const props = worldRef.current.props;

      // 1. Restore old Boutique Floor tiles back to dock planks or original terrain
      for (let r = ms.oldRow + 1; r < ms.oldRow + ms.spanRows; r++) {
        for (let c = ms.oldCol; c < ms.oldCol + ms.spanCols; c++) {
          if (tiles[r]?.[c] !== undefined) {
            tiles[r][c] = dockPlankCoordsRef.current.has(`${c}_${r}`)
              ? TileType.DOCK
              : baseTiles[r][c];
          }
        }
      }

      // 2. Paint new Boutique Floor tiles
      for (let r = targetRow + 1; r < targetRow + ms.spanRows; r++) {
        for (let c = targetCol; c < targetCol + ms.spanCols; c++) {
          if (tiles[r]?.[c] !== undefined) {
            tiles[r][c] = TileType.BOUTIQUE_FLOOR;
          }
        }
      }

      // 3. Relocate Backwall & Pillars
      const bw = props.find(
        (pr) => pr.kind === 'boutique_backwall' && getShopStructId(pr) === ms.shopStructId
      );
      if (bw) {
        bw.col = targetCol;
        bw.row = targetRow;
        bw.x = (targetCol + ms.spanCols / 2) * TILE_SIZE;
        bw.y = targetRow * TILE_SIZE + 14;
        bw.shopTier = ms.tier;
        bw.shopStructId = ms.shopStructId;
      }
      const pl = props.find((pr) => pr.id === `${ms.shopStructId}_pl`);
      if (pl) {
        pl.col = targetCol;
        pl.row = targetRow + ms.spanRows - 1;
        pl.x = targetCol * TILE_SIZE + 3;
        pl.y = (targetRow + ms.spanRows - 1) * TILE_SIZE + 14;
        pl.shopTier = ms.tier;
      }
      const pr = props.find((item) => item.id === `${ms.shopStructId}_pr`);
      if (pr) {
        pr.col = targetCol + ms.spanCols - 1;
        pr.row = targetRow + ms.spanRows - 1;
        pr.x = (targetCol + ms.spanCols - 1) * TILE_SIZE + 13;
        pr.y = (targetRow + ms.spanRows - 1) * TILE_SIZE + 14;
        pr.shopTier = ms.tier;
      }

      // 4. Relocate every interior Mannequin, Rug & Furniture preserving relative offset & listings
      const ownerDisplay = playerNameRef.current;
      const updates: Array<{
        id: string;
        kind: WorldStructureKind;
        col: number;
        row: number;
        ownerId: string;
        ownerName: string;
        tier?: ShopTier;
        listing?: CloudListing | null;
      }> = [
        {
          id: ms.shopStructId,
          kind: 'boutique_shop',
          col: targetCol,
          row: targetRow,
          ownerId: playerId,
          ownerName: ownerDisplay,
          tier: ms.tier,
          listing: null,
        },
      ];

      for (const item of ms.interiorItems) {
        const newCol = targetCol + item.relCol;
        const newRow = targetRow + item.relRow;
        const existingProp = props.find((pItem) => pItem.id === item.id);
        if (existingProp) {
          existingProp.col = newCol;
          existingProp.row = newRow;
          existingProp.x = newCol * TILE_SIZE + 8;
          existingProp.y = newRow * TILE_SIZE + 12;
        }
        updates.push({
          id: item.id,
          kind: item.kind,
          col: newCol,
          row: newRow,
          ownerId: playerId,
          ownerName: ownerDisplay,
          listing: item.listing ?? null,
        });
      }

      setMovingShop(null);
      miniBaseDirtyRef.current = true;
      setPropsVersion((v) => v + 1);
      sfx.playChime();
      spawnParticles(
        (targetCol + ms.spanCols / 2) * TILE_SIZE,
        (targetRow + ms.spanRows / 2) * TILE_SIZE,
        '#fde047',
        22
      );
      spawnFloatingText(
        (targetCol + ms.spanCols / 2) * TILE_SIZE,
        targetRow * TILE_SIZE - 10,
        'Boutique Relocated!',
        '#a7f3d0'
      );
      void relocateWorldShopAndContents(updates);
    },
    [getShopStructId, playerId, spawnFloatingText, spawnParticles, validateShopRelocation]
  );

  // Interaction Handler
  const triggerActionAt = useCallback(
    (targetCol?: number, targetRow?: number) => {
      const p = playerRef.current;
      const tiles = worldRef.current.tiles;
      const props = worldRef.current.props;
      const inv = inventoryRef.current;

      // 0. Active Shop Relocation Mode takes top priority
      const ms = movingShopRef.current;
      if (ms) {
        const centerCol = targetCol !== undefined ? targetCol : Math.floor(p.x / TILE_SIZE);
        const centerRow = targetRow !== undefined ? targetRow : Math.floor(p.y / TILE_SIZE) - 1;
        const anchorCol = centerCol - Math.floor(ms.spanCols / 2);
        const anchorRow = centerRow - Math.floor(ms.spanRows / 2);
        confirmShopRelocation(anchorCol, anchorRow);
        return;
      }

      let col = targetCol;
      let row = targetRow;
      if (col === undefined || row === undefined) {
        const reach = 14;
        const fx = p.x + (p.dir === 'right' ? reach : p.dir === 'left' ? -reach : 0);
        const fy = p.y + (p.dir === 'down' ? reach : p.dir === 'up' ? -reach : 0);
        col = Math.floor(fx / TILE_SIZE);
        row = Math.floor(fy / TILE_SIZE);
      }

      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;

      const tileCenterX = col * TILE_SIZE + 8;
      const tileCenterY = row * TILE_SIZE + 8;

      const dx = tileCenterX - p.x;
      const dy = tileCenterY - p.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
        else p.dir = dy > 0 ? 'down' : 'up';
      }

      // 1. Check nearby Mannequin interaction FIRST (own stall or rival boutique!)
      const nearMannequin =
        props.find(
          (pr) =>
            pr.kind === 'mannequin' &&
            Math.hypot(pr.x - tileCenterX, pr.y - tileCenterY) <= TILE_SIZE * 1.1 &&
            Math.hypot(pr.x - p.x, pr.y - p.y) <= TILE_SIZE * 2.75
        ) ||
        props.find(
          (pr) =>
            pr.kind === 'mannequin' && Math.hypot(pr.x - p.x, pr.y - p.y) <= TILE_SIZE * 1.85
        );

      if (nearMannequin) {
        openMannequinModal(nearMannequin);
        return;
      }

      // 1a. Clicking own Cash Register Counter OR Shop Backwall Sign opens Shop Management (Expand / Move)
      if (targetCol !== undefined && targetRow !== undefined) {
        const clickedCashCounter = props.find(
          (pr) =>
            pr.kind === 'cash_counter' &&
            (pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player') &&
            Math.hypot(pr.x - tileCenterX, pr.y - tileCenterY) <= TILE_SIZE * 1.15 &&
            Math.hypot(pr.x - p.x, pr.y - p.y) <= TILE_SIZE * 3.5
        );
        if (clickedCashCounter) {
          const ownShops = props.filter(
            (pr) =>
              pr.kind === 'boutique_backwall' &&
              (pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player')
          );
          const enclosingShop =
            ownShops.find((sh) => {
              const spec = getShopTierSpec(sh.shopTier);
              return (
                clickedCashCounter.col >= sh.col &&
                clickedCashCounter.col < sh.col + spec.cols &&
                clickedCashCounter.row >= sh.row &&
                clickedCashCounter.row < sh.row + spec.rows
              );
            }) || ownShops[0];
          if (enclosingShop) {
            sfx.playClick();
            setManageShopId(getShopStructId(enclosingShop));
            return;
          }
        }

        const clickedOwnSign = props.find((pr) => {
          if (pr.kind !== 'boutique_backwall') return false;
          const isMine = pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player';
          if (!isMine) return false;
          const spanCols = getShopTierSpec(pr.shopTier).cols;
          return (
            row === pr.row &&
            col >= pr.col &&
            col < pr.col + spanCols &&
            Math.hypot(tileCenterX - p.x, tileCenterY - p.y) <= TILE_SIZE * 4.5
          );
        });
        if (clickedOwnSign) {
          sfx.playClick();
          setManageShopId(getShopStructId(clickedOwnSign));
          return;
        }
      }

      // 1b. Central Runway & Auction Stage interaction
      const targetOnRunway =
        col >= RUNWAY_STAGE_COL &&
        col <= RUNWAY_STAGE_COL + 6 &&
        row >= RUNWAY_STAGE_ROW &&
        row <= RUNWAY_STAGE_ROW + 3;
      const nearRunwayPodium = Math.hypot(p.x - RUNWAY_PODIUM_X, p.y - RUNWAY_PODIUM_Y) <= TILE_SIZE * 4.5;
      if ((targetOnRunway && Math.hypot(tileCenterX - p.x, tileCenterY - p.y) <= TILE_SIZE * 5.2) || (targetCol === undefined && nearRunwayPodium)) {
        sfx.playClick();
        setRunwayModalOpen(true);
        return;
      }

      // 1c. Beach Boat Dock interaction
      const targetOnBoatDock =
        col >= BOAT_DOCK_COL &&
        col <= BOAT_DOCK_COL + 5 &&
        row >= BOAT_DOCK_ROW &&
        row <= BOAT_DOCK_ROW + 1;
      const boatDockCenterX = (BOAT_DOCK_COL + 2.5) * TILE_SIZE;
      const boatDockCenterY = (BOAT_DOCK_ROW + 0.5) * TILE_SIZE;
      const nearBoatDock = Math.hypot(p.x - boatDockCenterX, p.y - boatDockCenterY) <= TILE_SIZE * 3.8;
      if ((targetOnBoatDock && Math.hypot(tileCenterX - p.x, tileCenterY - p.y) <= TILE_SIZE * 4.5) || (targetCol === undefined && nearBoatDock)) {
        sfx.playClick();
        setBoatModalOpen(true);
        return;
      }

      // 1d. Public Island Newsstand Kiosk interaction
      const targetOnNewsstand =
        col >= NEWSSTAND_COL - 1 &&
        col <= NEWSSTAND_COL + 3 &&
        row >= NEWSSTAND_ROW - 1 &&
        row <= NEWSSTAND_ROW + 2;
      const nearNewsstand = Math.hypot(p.x - NEWSSTAND_CENTER_X, p.y - NEWSSTAND_CENTER_Y) <= TILE_SIZE * 3.8;
      if ((targetOnNewsstand && Math.hypot(tileCenterX - p.x, tileCenterY - p.y) <= TILE_SIZE * 4.8) || (targetCol === undefined && nearNewsstand)) {
        sfx.playClick();
        setNewsstandOpen(true);
        return;
      }

      // 2. Building Placement when buildable item is selected
      const activeList = hotbarModeRef.current === 'gather' ? HOTBAR_GATHER : HOTBAR_BUILD;
      const activeDecorDef =
        hotbarModeRef.current === 'build' && selectedDecorKindRef.current
          ? HOTBAR_BUILD_DECOR.find((d) => d.kind === selectedDecorKindRef.current)
          : undefined;
      const activeDef = activeDecorDef || activeList[selectedSlotRef.current];

      if (
        activeDef &&
        (activeDef.kind === 'dock_plank' ||
          activeDef.kind === 'shop_wall' ||
          activeDef.kind === 'mannequin' ||
          isDecorKind(activeDef.kind)) &&
        inv[activeDef.kind] > 0
      ) {
        const check = validatePlacement(activeDef.kind, col, row);
        if (check.valid) {
          p.swingTimer = 0.22;
          p.swingDir = p.dir;

          if (activeDef.kind === 'dock_plank') {
            tiles[row][col] = TileType.DOCK;
            dockPlankCoordsRef.current.add(`${col}_${row}`);
            miniBaseDirtyRef.current = true;
            spawnParticles(tileCenterX, tileCenterY, '#d4965b', 9);
            spawnFloatingText(tileCenterX, tileCenterY - 8, 'Floor Built', '#ffe49e');
            sfx.playWoodPlace();
            setInventory((prev) => ({ ...prev, dock_plank: Math.max(0, prev.dock_plank - 1) }));
            void createWorldStructure({
              id: `dock_${col}_${row}`,
              kind: 'dock_plank',
              col,
              row,
              ownerId: playerId,
              ownerName: playerNameRef.current,
              listing: null,
            });
            return;
          }

          if (activeDef.kind === 'shop_wall') {
            for (let r = row + 1; r <= row + 2; r++) {
              for (let c = col; c <= col + 3; c++) {
                tiles[r][c] = TileType.BOUTIQUE_FLOOR;
              }
            }
            miniBaseDirtyRef.current = true;
            const structId = `boutique_${col}_${row}_${Date.now().toString(36)}`;
            props.push(
              {
                id: `${structId}_bw`,
                kind: 'boutique_backwall',
                col,
                row,
                x: (col + 2) * TILE_SIZE,
                y: row * TILE_SIZE + 14,
                solid: true,
                radius: 7,
                variant: 0,
                respawnTimer: 0,
                owner: playerNameRef.current,
                ownerId: playerId,
                fromCloud: true,
                shopTier: 1,
                shopStructId: structId,
              },
              {
                id: `${structId}_pl`,
                kind: 'boutique_pillar_l',
                col,
                row: row + 2,
                x: col * TILE_SIZE + 3,
                y: (row + 2) * TILE_SIZE + 14,
                solid: false,
                radius: 2,
                variant: 0,
                respawnTimer: 0,
                owner: playerNameRef.current,
                ownerId: playerId,
                fromCloud: true,
                shopTier: 1,
                shopStructId: structId,
              },
              {
                id: `${structId}_pr`,
                kind: 'boutique_pillar_r',
                col: col + 3,
                row: row + 2,
                x: (col + 3) * TILE_SIZE + 13,
                y: (row + 2) * TILE_SIZE + 14,
                solid: false,
                radius: 2,
                variant: 0,
                respawnTimer: 0,
                owner: playerNameRef.current,
                ownerId: playerId,
                fromCloud: true,
                shopTier: 1,
                shopStructId: structId,
              }
            );
            spawnFloatingText((col + 2) * TILE_SIZE, row * TILE_SIZE - 8, 'Boutique Built!', '#ffd875');
            spawnParticles((col + 2) * TILE_SIZE, (row + 1) * TILE_SIZE, '#f58eb2', 14);
            sfx.playWoodPlace();
            setInventory((prev) => ({ ...prev, shop_wall: Math.max(0, prev.shop_wall - 1) }));
            void createWorldStructure({
              id: structId,
              kind: 'boutique_shop',
              col,
              row,
              ownerId: playerId,
              ownerName: playerNameRef.current,
              tier: 1,
              listing: null,
            });
            return;
          }

          if (activeDef.kind === 'mannequin') {
            const mannequinId = `mannequin_${col}_${row}_${Date.now().toString(36)}`;
            props.push({
              id: mannequinId,
              kind: 'mannequin',
              col,
              row,
              x: tileCenterX,
              y: row * TILE_SIZE + 12,
              solid: true,
              radius: 5,
              variant: 0,
              respawnTimer: 0,
              owner: playerNameRef.current,
              ownerId: playerId,
              fromCloud: true,
              listing: null,
            });
            spawnParticles(tileCenterX, tileCenterY, '#ffd1df', 9);
            spawnFloatingText(tileCenterX, tileCenterY - 12, 'Click to Stock!', '#ffd1df');
            sfx.playChime();
            setInventory((prev) => ({ ...prev, mannequin: Math.max(0, prev.mannequin - 1) }));
            setPropsVersion((v) => v + 1);
            void createWorldStructure({
              id: mannequinId,
              kind: 'mannequin',
              col,
              row,
              ownerId: playerId,
              ownerName: playerNameRef.current,
              listing: null,
            });
            return;
          }

          if (isDecorKind(activeDef.kind)) {
            const decorKind = activeDef.kind;
            const structId = `${decorKind}_${col}_${row}_${Date.now().toString(36)}`;
            const isRug = isRugKind(decorKind);
            props.push({
              id: structId,
              kind: decorKind,
              col,
              row,
              x: tileCenterX,
              y: row * TILE_SIZE + 12,
              solid: !isRug,
              radius: isRug ? 0 : 4.5,
              variant: 0,
              respawnTimer: 0,
              owner: playerNameRef.current,
              ownerId: playerId,
              fromCloud: true,
            });
            spawnParticles(tileCenterX, tileCenterY, isRug ? '#f58eb2' : '#ffe49e', 9);
            spawnFloatingText(tileCenterX, tileCenterY - 12, `${activeDef.name}!`, '#ffe49e');
            if (isRug) sfx.playChime();
            else sfx.playWoodPlace();
            const remainingDecor = Math.max(0, (inv[decorKind] || 0) - 1);
            setInventory((prev) => ({ ...prev, [decorKind]: Math.max(0, prev[decorKind] - 1) }));
            if (remainingDecor <= 0 && selectedDecorKindRef.current === decorKind) {
              setSelectedDecorKind(null);
            }
            setPropsVersion((v) => v + 1);
            void createWorldStructure({
              id: structId,
              kind: decorKind,
              col,
              row,
              ownerId: playerId,
              ownerName: playerNameRef.current,
              listing: null,
            });
            return;
          }
        }
      }

      // 3. Resource Harvesting (Island + Deep-Sea Reef!)
      const isNonResource = (k: PropKind) =>
        k === 'shop_wall' ||
        k === 'shop_wall_t2' ||
        k === 'boutique_backwall' ||
        k === 'boutique_pillar_l' ||
        k === 'boutique_pillar_r' ||
        k === 'display_table' ||
        k === 'mannequin' ||
        isDecorKind(k);

      const targetProp =
        props.find(
          (pr) =>
            pr.respawnTimer <= 0 &&
            !isNonResource(pr.kind) &&
            Math.hypot(pr.x - p.x, pr.y - p.y) <= TILE_SIZE * 2.35 &&
            Math.hypot(pr.x - tileCenterX, pr.y - tileCenterY) <= TILE_SIZE * 1.4
        ) ||
        props.find(
          (pr) =>
            pr.respawnTimer <= 0 &&
            !isNonResource(pr.kind) &&
            Math.hypot(pr.x - p.x, pr.y - p.y) <= TILE_SIZE * 1.75
        );

      if (targetProp) {
        p.swingTimer = 0.25;
        p.swingDir = p.dir;
        const harvestBonus = statsRef.current.harvestBonus;
        const skiffReefLuck = equippedBoatRef.current === 'skiff' ? 1 : 0;
        targetProp.respawnTimer = RESOURCE_RESPAWN_SEC;

        if (targetProp.kind === 'palm') {
          const amt = 2 + harvestBonus;
          setInventory((prev) => ({ ...prev, wood: prev.wood + amt }));
          spawnParticles(targetProp.x, targetProp.y - 6, '#c48349', 10);
          spawnFloatingText(targetProp.x, targetProp.y - 16, `+${amt} Wood`, '#ffe0a3');
          sfx.playHarvest();
          return;
        }

        if (targetProp.kind === 'cotton_bush') {
          const amt = 2 + harvestBonus;
          setInventory((prev) => ({ ...prev, fabric: prev.fabric + amt }));
          spawnParticles(targetProp.x, targetProp.y - 4, '#ffffff', 9);
          spawnFloatingText(targetProp.x, targetProp.y - 14, `+${amt} Fabric`, '#ffffff');
          sfx.playHarvest();
          return;
        }

        if (targetProp.kind === 'dye_bush') {
          const amt = 2 + Math.floor(harvestBonus / 2);
          setInventory((prev) => ({ ...prev, dyes: prev.dyes + amt }));
          spawnParticles(targetProp.x, targetProp.y - 4, '#ff7aa8', 9);
          spawnFloatingText(targetProp.x, targetProp.y - 14, `+${amt} Dyes`, '#ffb5d0');
          sfx.playHarvest();
          return;
        }

        if (targetProp.kind === 'rock') {
          const gotPearl = Math.random() < 0.45;
          setInventory((prev) => ({
            ...prev,
            dyes: prev.dyes + 1,
            pearls: prev.pearls + (gotPearl ? 1 : 0),
          }));
          setGold((g) => g + 10);
          spawnParticles(targetProp.x, targetProp.y - 4, '#b8c4d4', 9);
          spawnFloatingText(
            targetProp.x,
            targetProp.y - 14,
            gotPearl ? '+1 Dye, +1 Pearl' : '+1 Dye, +10 G',
            '#d9efff'
          );
          sfx.playHarvest();
          return;
        }

        if (
          targetProp.kind === 'shell_pink' ||
          targetProp.kind === 'shell_conch' ||
          targetProp.kind === 'starfish'
        ) {
          const amt = 1 + (harvestBonus > 0 ? 1 : 0);
          setInventory((prev) => ({ ...prev, pearls: prev.pearls + amt }));
          setGold((g) => g + 5);
          spawnParticles(targetProp.x, targetProp.y - 2, '#ffd1df', 9);
          spawnFloatingText(targetProp.x, targetProp.y - 12, `+${amt} Pearl`, '#ffd9eb');
          sfx.playChime();
          return;
        }

        if (targetProp.kind === 'golden_oyster') {
          const amt = 1 + (harvestBonus > 1 ? 1 : 0) + skiffReefLuck;
          setInventory((prev) => ({ ...prev, golden_pearls: prev.golden_pearls + amt }));
          setGold((g) => g + 35 + skiffReefLuck * 25);
          spawnParticles(targetProp.x, targetProp.y - 4, '#ffd23f', 12);
          spawnFloatingText(
            targetProp.x,
            targetProp.y - 14,
            skiffReefLuck ? `+${amt} Golden Pearl! (Skiff Luck)` : `+${amt} Golden Pearl!`,
            '#ffe566'
          );
          sfx.playCoin();
          return;
        }

        if (targetProp.kind === 'royal_silk_coral') {
          const amt = 1 + (harvestBonus > 0 ? 1 : 0) + skiffReefLuck;
          setInventory((prev) => ({ ...prev, royal_silk: prev.royal_silk + amt }));
          setGold((g) => g + 25 + skiffReefLuck * 20);
          spawnParticles(targetProp.x, targetProp.y - 4, '#e09eff', 12);
          spawnFloatingText(
            targetProp.x,
            targetProp.y - 14,
            skiffReefLuck ? `+${amt} Royal Silk! (Skiff Luck)` : `+${amt} Royal Silk!`,
            '#f3d4ff'
          );
          sfx.playChime();
          return;
        }

        if (
          targetProp.kind === 'glowing_pearl_node' ||
          targetProp.kind === 'starlight_coral_node' ||
          targetProp.kind === 'seafoam_essence_node' ||
          targetProp.kind === 'sunset_amber_node'
        ) {
          if (!isBoatingRef.current) {
            targetProp.respawnTimer = 0;
            spawnFloatingText(targetProp.x, targetProp.y - 14, 'Sail by Boat to Harvest!', '#9cebff');
            return;
          }
          const hasPetBonus = equippedPetRef.current ? 1 : 0;
          const isReefWater = worldRef.current.tiles[targetProp.row]?.[targetProp.col] === TileType.REEF_WATER;
          const amt = 1 + hasPetBonus + (isReefWater ? skiffReefLuck : 0);
          const nodeMap: Record<
            'glowing_pearl_node' | 'starlight_coral_node' | 'seafoam_essence_node' | 'sunset_amber_node',
            { invKey: OutfitEffectType; label: string; pColor: string; tColor: string }
          > = {
            glowing_pearl_node: {
              invKey: 'glowing_pearls',
              label: 'Glowing Pearl',
              pColor: '#67e8f9',
              tColor: '#cffafe',
            },
            starlight_coral_node: {
              invKey: 'starlight_coral',
              label: 'Starlight Coral',
              pColor: '#fde047',
              tColor: '#fef08a',
            },
            seafoam_essence_node: {
              invKey: 'seafoam_essence',
              label: 'Seafoam Essence',
              pColor: '#5eead4',
              tColor: '#ccfbf1',
            },
            sunset_amber_node: {
              invKey: 'sunset_amber',
              label: 'Sunset Amber',
              pColor: '#fb923c',
              tColor: '#ffedd5',
            },
          };
          const meta = nodeMap[targetProp.kind];
          setInventory((prev) => ({
            ...prev,
            [meta.invKey]: (prev[meta.invKey] || 0) + amt,
          }));
          setGold((g) => g + 20);
          if (hasPetBonus) {
            localPetHeartUntilRef.current = Date.now() + 2600;
          }
          spawnParticles(targetProp.x, targetProp.y - 4, meta.pColor, 14);
          spawnFloatingText(
            targetProp.x,
            targetProp.y - 16,
            hasPetBonus ? `+${amt} ${meta.label}! (Pet Dive!)` : `+${amt} ${meta.label}!`,
            meta.tColor
          );
          sfx.playChime();
          return;
        }
      }

      // 4. Fishing / Watering actions
      const dist = Math.hypot(tileCenterX - p.x, tileCenterY - p.y);
      if (dist <= TILE_SIZE * 3 && activeDef?.kind === 'fishing_rod') {
        const clickedTile = tiles[row][col];
        if (
          clickedTile === TileType.SHALLOW_WATER ||
          clickedTile === TileType.DEEP_WATER ||
          clickedTile === TileType.REEF_WATER
        ) {
          p.swingTimer = 0.25;
          p.swingDir = p.dir;
          bobberRef.current = { x: tileCenterX, y: tileCenterY, timer: 1.8 };
          spawnParticles(tileCenterX, tileCenterY, '#b8f2fc', 6);
          sfx.playSplash();
          const hasSkiffBonus = equippedBoatRef.current === 'skiff';
          if (clickedTile === TileType.REEF_WATER && Math.random() < (hasSkiffBonus ? 0.78 : 0.5)) {
            setInventory((prev) => ({
              ...prev,
              golden_pearls: prev.golden_pearls + 1,
              royal_silk: prev.royal_silk + (hasSkiffBonus && Math.random() < 0.4 ? 1 : 0),
            }));
            spawnFloatingText(
              tileCenterX,
              tileCenterY - 12,
              hasSkiffBonus ? '+1 Golden Pearl (Skiff Luck!)' : '+1 Golden Pearl!',
              '#ffe566'
            );
          } else if (Math.random() < (hasSkiffBonus ? 0.65 : 0.45)) {
            setInventory((prev) => ({ ...prev, pearls: prev.pearls + 1 }));
            spawnFloatingText(tileCenterX, tileCenterY - 12, '+1 Pearl!', '#b8f2fc');
          }
          return;
        }
      }

      if (dist <= TILE_SIZE * 2.5 && activeDef?.kind === 'watering_can') {
        p.swingTimer = 0.22;
        p.swingDir = p.dir;
        spawnParticles(tileCenterX, tileCenterY, '#7ac5eb', 7);
        sfx.playSplash();
        return;
      }

      // 5. Quick Watercraft Launch / Disembark when clicking adjacent water or land while owning a boat
      const targetTile = tiles[row]?.[col];
      const targetIsWater =
        targetTile === TileType.SHALLOW_WATER ||
        targetTile === TileType.DEEP_WATER ||
        targetTile === TileType.REEF_WATER;
      if (hasBoatRef.current && dist <= TILE_SIZE * 2.6) {
        if (!isBoatingRef.current && targetIsWater && isPositionWalkable(tileCenterX, tileCenterY, true)) {
          if (tileCenterX >= REEF_BOUNDARY_X && statsRef.current.seaRes < 2) {
            spawnFloatingText(p.x, p.y - 22, 'Need +2 Sea Res for Reef!', '#ff9e9e');
            return;
          }
          p.x = tileCenterX;
          p.y = tileCenterY;
          isBoatingRef.current = true;
          setIsBoating(true);
          sfx.playSplash();
          spawnParticles(tileCenterX, tileCenterY, '#b8f2fc', 10);
          const craftEntry = getBoatCatalogEntry(equippedBoatRef.current);
          spawnFloatingText(tileCenterX, tileCenterY - 14, `${craftEntry.name}!`, '#9cebff');
          return;
        }
        if (isBoatingRef.current && !targetIsWater && isPositionWalkable(tileCenterX, tileCenterY, false)) {
          p.x = tileCenterX;
          p.y = tileCenterY;
          isBoatingRef.current = false;
          setIsBoating(false);
          sfx.playWoodPlace();
          spawnFloatingText(tileCenterX, tileCenterY - 14, 'Docked!', '#ffe49e');
          return;
        }
      }

      // 6. Fallback when pressing E / Action inside own boutique -> Open Shop Management
      if (targetCol === undefined) {
        const ownShopNearby = props.find((pr) => {
          if (pr.kind !== 'boutique_backwall') return false;
          const isMine = pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player';
          if (!isMine) return false;
          const spec = getShopTierSpec(pr.shopTier);
          const pCol = p.x / TILE_SIZE;
          const pRow = p.y / TILE_SIZE;
          return (
            pCol >= pr.col - 0.8 &&
            pCol <= pr.col + spec.cols + 0.8 &&
            pRow >= pr.row - 0.5 &&
            pRow <= pr.row + spec.rows + 0.8
          );
        });
        if (ownShopNearby) {
          sfx.playClick();
          setManageShopId(getShopStructId(ownShopNearby));
        }
      }
    },
    [
      confirmShopRelocation,
      getShopStructId,
      isPositionWalkable,
      openMannequinModal,
      playerId,
      spawnFloatingText,
      spawnParticles,
      validatePlacement,
    ]
  );

  // Craft Structure or Decor Handler
  const handleCraftStructure = (recipe: CraftRecipe) => {
    const canAfford = Object.entries(recipe.cost).every(([k, amt]) => {
      const key = k as keyof typeof recipe.cost;
      return inventory[key] >= (amt || 0);
    });
    if (!canAfford) return;

    sfx.playChime();
    setInventory((prev) => {
      const next = { ...prev };
      (Object.keys(recipe.cost) as Array<keyof typeof recipe.cost>).forEach((k) => {
        next[k] = Math.max(0, next[k] - (recipe.cost[k] || 0));
      });
      next[recipe.outputItem] += recipe.outputQty;
      return next;
    });

    if (!isDecorKind(recipe.outputItem)) {
      const buildIdx = HOTBAR_BUILD.findIndex((s) => s.kind === recipe.outputItem);
      if (buildIdx !== -1) {
        setHotbarMode('build');
        setSelectedDecorKind(null);
        setSelectedSlot(buildIdx);
      }
    }
  };

  // Buy Decorative Furniture with Gold Handler
  const handleBuyDecorGold = (recipe: CraftRecipe) => {
    if (!recipe.goldPrice || goldRef.current < recipe.goldPrice) return;
    sfx.playCoin();
    setGold((g) => g - recipe.goldPrice!);
    setInventory((prev) => ({
      ...prev,
      [recipe.outputItem]: prev[recipe.outputItem] + recipe.outputQty,
    }));
  };

  // Craft Custom Design Studio Piece (with optional Deep-Sea Dye Effect Infusion)
  const handleCraftDesignItem = (
    item: ClothingItem,
    fabricCost: number,
    equipNow: boolean,
    infuseEffect: OutfitEffectType | null
  ) => {
    if (inventoryRef.current.fabric < fabricCost || ownedItemsRef.current.length >= 50) return;
    if (infuseEffect && (inventoryRef.current[infuseEffect] || 0) < 1) return;
    sfx.playChime();
    setInventory((prev) => ({
      ...prev,
      fabric: Math.max(0, prev.fabric - fabricCost),
      ...(infuseEffect ? { [infuseEffect]: Math.max(0, (prev[infuseEffect] || 0) - 1) } : {}),
    }));
    if (item.editionId) {
      setEditionMintCounts((prev) => ({ ...prev, [item.editionId!]: item.editionSerial || 1 }));
    }
    setOwnedItems((prev) => [item, ...prev]);
    if (equipNow) {
      equipItem(item);
    }
    setDesignStudioOpen(false);
    const effectMeta = getOutfitEffectMeta(infuseEffect);
    spawnParticles(playerRef.current.x, playerRef.current.y - 8, effectMeta?.accentHex || '#f58eb2', 14);
    spawnFloatingText(
      playerRef.current.x,
      playerRef.current.y - 22,
      effectMeta ? `Infused ${item.name}!` : `Designed ${item.name}!`,
      effectMeta?.accentHex || '#ffd4e2'
    );
  };

  // Buy High-Tier Piece from Luxury Wholesale Catalog
  const handleBuyLuxuryWholesale = (entry: LuxuryCatalogEntry) => {
    if (goldRef.current < entry.wholesalePrice) return;
    if (ownedItemsRef.current.length >= 50) {
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 20, 'Wardrobe Bag Full (50 max)', '#ffb3b3');
      return;
    }

    sfx.playCoin();
    const newItem: ClothingItem = {
      ...entry.item,
      uid: generateItemUid('lux'),
    };
    setGold((g) => g - entry.wholesalePrice);
    setOwnedItems((prev) => [newItem, ...prev]);
    equipItem(newItem);
    spawnParticles(playerRef.current.x, playerRef.current.y - 10, '#ffd23f', 14);
    spawnFloatingText(playerRef.current.x, playerRef.current.y - 24, `Purchased ${newItem.name}!`, '#ffe566');
  };

  // List Owned Item (or update price of currently listed item) on Player's Mannequin
  const handleListOnMannequin = () => {
    if (!activeStallPropId || !stallSelectedUid) return;
    const prop = worldRef.current.props.find((pr) => pr.id === activeStallPropId);
    if (!prop) return;

    const cleanPrice = Math.max(50, Math.min(50000, Math.round(stallPrice)));

    // Case 1: Updating price of item already stocked on this mannequin
    if (prop.listing?.item && prop.listing.item.uid === stallSelectedUid) {
      sfx.playChime();
      const updated: MannequinListing = { item: prop.listing.item, price: cleanPrice };
      prop.listing = updated;
      setPropsVersion((v) => v + 1);
      setActiveStallPropId(null);
      void updateMannequinListing(prop.id, updated);
      return;
    }

    // Case 2: Moving selected item from player's ownedItems bag onto the mannequin
    const chosen = ownedItemsRef.current.find((i) => i.uid === stallSelectedUid);
    if (!chosen) return;

    const previousListedItem = prop.listing?.item || null;

    sfx.playChime();
    setOwnedItems((prev) => {
      const remaining = prev.filter((i) => i.uid !== chosen.uid);
      return previousListedItem ? [previousListedItem, ...remaining] : remaining;
    });

    // Unequip if player was wearing this exact piece
    setAppearance((prev) => {
      if (prev[chosen.slot]?.uid === chosen.uid) {
        return { ...prev, [chosen.slot]: null };
      }
      return prev;
    });

    const nextListing: MannequinListing = { item: chosen, price: cleanPrice };
    prop.listing = nextListing;
    setPropsVersion((v) => v + 1);
    setActiveStallPropId(null);
    void updateMannequinListing(prop.id, nextListing);
  };

  const handleRemoveListing = () => {
    if (!activeStallPropId) return;
    const prop = worldRef.current.props.find((pr) => pr.id === activeStallPropId);
    if (!prop) return;
    sfx.playClick();
    const returnedItem = prop.listing?.item;
    if (returnedItem) {
      setOwnedItems((prev) =>
        prev.some((i) => i.uid === returnedItem.uid) ? prev : [returnedItem, ...prev]
      );
    }
    prop.listing = null;
    setPropsVersion((v) => v + 1);
    setActiveStallPropId(null);
    void updateMannequinListing(prop.id, null);
  };

  // Immediate Real-Time Presence Broadcast Helper (Chat, Emotes, Runway Pose, Boating, Pet)
  const sendPresenceNow = useCallback(() => {
    if (!joinedIslandRef.current) return;
    const nowMs = Date.now();
    const soc = socialStateRef.current;
    const p = playerRef.current;
    presenceSyncRef.current.lastSentAt = nowMs;
    void syncOnlinePlayer({
      playerId,
      name: playerNameRef.current,
      x: p.x,
      y: p.y,
      dir: p.dir,
      isMoving: p.isMoving,
      appearance: appearanceRef.current,
      chatText: soc.chatText && nowMs - soc.chatAt < 5000 ? soc.chatText : null,
      chatAt: soc.chatText && nowMs - soc.chatAt < 5000 ? soc.chatAt : null,
      emoteEmoji: soc.emoteEmoji && nowMs - soc.emoteAt < 5000 ? soc.emoteEmoji : null,
      emoteAt: soc.emoteEmoji && nowMs - soc.emoteAt < 5000 ? soc.emoteAt : null,
      isBoating: isBoatingRef.current,
      equippedBoat: equippedBoatRef.current,
      equippedPet: equippedPetRef.current,
      runwayShowAt: soc.runwayShowAt && nowMs - soc.runwayShowAt < 5000 ? soc.runwayShowAt : null,
    });
  }, [playerId]);

  const handleSendChat = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const clean = chatDraft.trim().slice(0, 48);
      setChatDraft('');
      setChatBarOpen(false);
      chatInputRef.current?.blur();
      if (!clean) return;
      sfx.playClick();
      socialStateRef.current.chatText = clean;
      socialStateRef.current.chatAt = Date.now();
      sendPresenceNow();
    },
    [chatDraft, sendPresenceNow]
  );

  const handleSendEmote = useCallback(
    (emoji: string) => {
      sfx.playChime();
      socialStateRef.current.emoteEmoji = emoji;
      socialStateRef.current.emoteAt = Date.now();
      sendPresenceNow();
    },
    [sendPresenceNow]
  );

  const handleShowcaseOutfit = useCallback(() => {
    sfx.playChime();
    socialStateRef.current.runwayShowAt = Date.now();
    spawnParticles(playerRef.current.x, playerRef.current.y - 8, '#fde047', 18);
    spawnFloatingText(playerRef.current.x, playerRef.current.y - 26, 'Runway Spotlight!', '#fff3b0');
    sendPresenceNow();
  }, [sendPresenceNow, spawnFloatingText, spawnParticles]);

  const handleBuyOrEquipBoat = useCallback(
    (boat: BoatCatalogEntry) => {
      const alreadyOwned = ownedBoatsRef.current.includes(boat.kind);
      if (alreadyOwned) {
        sfx.playClick();
        equippedBoatRef.current = boat.kind;
        setEquippedBoat(boat.kind);
        spawnFloatingText(playerRef.current.x, playerRef.current.y - 22, `${boat.name} Equipped!`, '#9cebff');
        sendPresenceNow();
        return;
      }
      if (goldRef.current < boat.price) return;
      sfx.playCoin();
      setGold((g) => g - boat.price);
      setOwnedBoats((prev) => (prev.includes(boat.kind) ? prev : [...prev, boat.kind]));
      equippedBoatRef.current = boat.kind;
      setEquippedBoat(boat.kind);
      spawnParticles(playerRef.current.x, playerRef.current.y - 8, '#9cebff', 16);
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 22, `${boat.name} Unlocked!`, '#9cebff');
      sendPresenceNow();
    },
    [sendPresenceNow, spawnFloatingText, spawnParticles]
  );

  const handleToggleBoardBoat = useCallback(() => {
    if (!hasBoatRef.current) return;
    const p = playerRef.current;
    const craft = getBoatCatalogEntry(equippedBoatRef.current);
    if (!isBoatingRef.current) {
      const waterX = (coastColAt(BOAT_DOCK_ROW) + 4) * TILE_SIZE + 8;
      const waterY = BOAT_DOCK_ROW * TILE_SIZE + 8;
      p.x = waterX;
      p.y = waterY;
      p.dir = 'right';
      isBoatingRef.current = true;
      setIsBoating(true);
      sfx.playSplash();
      spawnParticles(waterX, waterY, '#b8f2fc', 12);
      spawnFloatingText(waterX, waterY - 16, `Sailing ${craft.name}!`, '#9cebff');
      sendPresenceNow();
    } else {
      const dockLandX = (BOAT_DOCK_COL + 1) * TILE_SIZE + 8;
      const dockLandY = BOAT_DOCK_ROW * TILE_SIZE + 8;
      p.x = dockLandX;
      p.y = dockLandY;
      isBoatingRef.current = false;
      setIsBoating(false);
      sfx.playWoodPlace();
      spawnFloatingText(dockLandX, dockLandY - 16, 'Watercraft Docked!', '#ffe49e');
      sendPresenceNow();
    }
  }, [sendPresenceNow, spawnFloatingText, spawnParticles]);

  const handleAdoptOrEquipPet = useCallback(
    (pet: (typeof PET_CATALOG)[number]) => {
      const isOwned = ownedPetsRef.current.includes(pet.kind);
      if (isOwned) {
        sfx.playClick();
        const nextPet = equippedPetRef.current === pet.kind ? null : pet.kind;
        equippedPetRef.current = nextPet;
        setEquippedPet(nextPet);
        sendPresenceNow();
        return;
      }
      if (goldRef.current < pet.price) return;
      sfx.playCoin();
      setGold((g) => g - pet.price);
      setOwnedPets((prev) => (prev.includes(pet.kind) ? prev : [...prev, pet.kind]));
      equippedPetRef.current = pet.kind;
      setEquippedPet(pet.kind);
      localPetRef.current.x = playerRef.current.x - 14;
      localPetRef.current.y = playerRef.current.y + 4;
      spawnParticles(playerRef.current.x, playerRef.current.y - 6, '#ffd1df', 12);
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 20, `Adopted ${pet.name}!`, '#ffd1df');
      sendPresenceNow();
    },
    [sendPresenceNow, spawnFloatingText, spawnParticles]
  );

  const handleMintEditionCopy = useCallback(
    (item: ClothingItem) => {
      if (!item.editionId || !item.editionTotal || item.editionTotal <= 1) return;
      const currentHighest = editionMintCountsRef.current[item.editionId];
      if (!currentHighest || currentHighest >= item.editionTotal) return;
      const fabricCost = DESIGN_FABRIC_COST[item.slot];
      if (inventoryRef.current.fabric < fabricCost || ownedItemsRef.current.length >= 50) return;

      const nextSerial = currentHighest + 1;
      const newCopy: ClothingItem = {
        ...item,
        uid: generateItemUid('ed'),
        editionSerial: nextSerial,
      };
      sfx.playChime();
      setInventory((prev) => ({ ...prev, fabric: Math.max(0, prev.fabric - fabricCost) }));
      setEditionMintCounts((prev) => ({ ...prev, [item.editionId!]: nextSerial }));
      setOwnedItems((prev) => [newCopy, ...prev]);
      spawnParticles(playerRef.current.x, playerRef.current.y - 8, '#d8b4fe', 12);
      spawnFloatingText(
        playerRef.current.x,
        playerRef.current.y - 22,
        `Minted #${nextSerial}/${item.editionTotal}!`,
        '#e9d5ff'
      );
    },
    [spawnFloatingText, spawnParticles]
  );

  const onlineShopDirectory = useMemo<OnlineShopDirectoryEntry[]>(() => {
    const props = worldRef.current.props;
    const countShopsFor = (oid: string) =>
      props.filter((pr) => pr.kind === 'boutique_backwall' && pr.ownerId === oid).length;
    const countListedFor = (oid: string) =>
      props.filter((pr) => pr.kind === 'mannequin' && pr.ownerId === oid && pr.listing).length;

    const list: OnlineShopDirectoryEntry[] = [
      {
        id: playerId,
        name: playerName || 'Islander',
        isSelf: true,
        shopCount: countShopsFor(playerId),
        listedCount: countListedFor(playerId),
      },
    ];

    for (const rp of remotePlayersRef.current.values()) {
      list.push({
        id: rp.playerId,
        name: rp.name,
        isSelf: false,
        shopCount: countShopsFor(rp.playerId),
        listedCount: countListedFor(rp.playerId),
      });
    }

    list.push(
      {
        id: 'npc_sara',
        name: "Sara's Boutique",
        isSelf: false,
        isNpc: true,
        shopCount: 1,
        listedCount: props.filter((pr) => pr.kind === 'mannequin' && pr.owner === 'Sara' && pr.listing).length,
      },
      {
        id: 'npc_lina',
        name: "Lina's Boutique",
        isSelf: false,
        isNpc: true,
        shopCount: 1,
        listedCount: props.filter((pr) => pr.kind === 'mannequin' && pr.owner === 'Lina' && pr.listing).length,
      }
    );

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, playerName, shopsModalOpen, onlineCount]);

  const openShopsModal = useCallback(() => {
    sfx.playClick();
    setWardrobeOpen(false);
    setCraftingOpen(false);
    setDesignStudioOpen(false);
    setRunwayModalOpen(false);
    setBoatModalOpen(false);
    setManageShopId(null);
    setActiveStallPropId(null);
    setBuyPreviewPropId(null);
    setShopsModalOpen(true);
    setLoadingTraders(true);
    void fetchLeaderboardTraders()
      .then((rows) => setTradersList(rows))
      .finally(() => setLoadingTraders(false));
  }, []);

  const handleVisitTarget = useCallback(
    (targetId: string) => {
      const p = playerRef.current;
      let destX: number | null = null;
      let destY: number | null = null;
      let label = 'Boutique';

      if (targetId === 'npc_sara') {
        destX = (SARA_BOUTIQUE_COL + 2) * TILE_SIZE;
        destY = (SARA_BOUTIQUE_ROW + 3) * TILE_SIZE + 4;
        label = "Sara's Boutique";
      } else if (targetId === 'npc_lina') {
        destX = (LINA_BOUTIQUE_COL + 2) * TILE_SIZE;
        destY = (LINA_BOUTIQUE_ROW + 3) * TILE_SIZE + 4;
        label = "Lina's Boutique";
      } else {
        const shop = worldRef.current.props.find(
          (pr) => pr.kind === 'boutique_backwall' && pr.ownerId === targetId
        );
        if (shop) {
          const spec = getShopTierSpec(shop.shopTier);
          destX = (shop.col + spec.cols / 2) * TILE_SIZE;
          destY = (shop.row + spec.rows) * TILE_SIZE + 4;
          label = `${shop.owner || 'Player'}'s Shop`;
        } else {
          const stall = worldRef.current.props.find(
            (pr) => pr.kind === 'mannequin' && pr.ownerId === targetId
          );
          if (stall) {
            destX = stall.x;
            destY = stall.y + 14;
            label = `${stall.owner || 'Player'}'s Stall`;
          } else if (targetId === playerId) {
            destX = PLAYER_SPAWN_COL * TILE_SIZE + 8;
            destY = PLAYER_SPAWN_ROW * TILE_SIZE + 8;
            label = 'Home Boardwalk';
          } else {
            const rp = remotePlayersRef.current.get(targetId);
            if (rp) {
              destX = rp.x;
              destY = rp.y + 12;
              label = rp.name;
            }
          }
        }
      }

      if (destX !== null && destY !== null) {
        if (!isPositionWalkable(destX, destY, false) && isPositionWalkable(destX, destY - 12, false)) {
          destY -= 12;
        }
        isBoatingRef.current = false;
        setIsBoating(false);
        p.x = Math.max(16, Math.min(WORLD_W - 16, destX));
        p.y = Math.max(16, Math.min(WORLD_H - 16, destY));
        localPetRef.current.x = p.x - 14;
        localPetRef.current.y = p.y + 4;
        cameraRef.current.initialized = false;
        sfx.playChime();
        spawnParticles(p.x, p.y - 8, '#a5f3fc', 16);
        spawnFloatingText(p.x, p.y - 24, `Visited ${label}!`, '#bae6fd');
        setShopsModalOpen(false);
        sendPresenceNow();
      }
    },
    [isPositionWalkable, playerId, sendPresenceNow, spawnFloatingText, spawnParticles]
  );

  const handleStartAuction = useCallback(
    async (item: ClothingItem, startingPrice: number) => {
      const created = await startRunwayAuction({
        item,
        sellerId: playerId,
        sellerName: playerNameRef.current,
        startingPrice,
      });
      setActiveAuction(created);
      setOwnedItems((prev) => prev.filter((i) => i.uid !== item.uid));
      setAppearance((prev) => (prev[item.slot]?.uid === item.uid ? { ...prev, [item.slot]: null } : prev));
      sfx.playChime();
      spawnParticles(playerRef.current.x, playerRef.current.y - 10, '#fde047', 16);
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 24, `Auction Live: ${item.name}!`, '#ffe566');
    },
    [playerId, spawnFloatingText, spawnParticles]
  );

  const handlePlaceBid = useCallback(
    async (amount: number) => {
      if (!activeAuction) return;
      const updated = await placeAuctionBid({
        auctionId: activeAuction.id,
        bidderId: playerId,
        bidderName: playerNameRef.current,
        bidAmount: amount,
        bidderGold: goldRef.current,
      });
      setActiveAuction(updated);
      sfx.playCoin();
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 22, `Bid ${amount} G Placed!`, '#d9f99d');
    },
    [activeAuction, playerId, spawnFloatingText]
  );

  // Buy from Rival Boutique OR Live Player Mannequin (Free Market: Wear or Flip at Any Price!)
  const handleBuyFromBoutique = async (prop: PropObject) => {
    if (!prop.listing?.item) return;
    const { item, price } = prop.listing;
    const isRealPlayerStall = Boolean(prop.ownerId && prop.ownerId !== playerId);
    const activeTrendNow = getCurrentFashionTrend().trend;
    const trendMatched = doesItemMatchTrend(item, activeTrendNow);

    // Live Player-to-Player Transaction via Firestore
    if (isRealPlayerStall) {
      if (buyingBusy || gold < price) return;
      setBuyingBusy(true);
      setBuyError(null);
      try {
        const res = await purchaseFromPlayerMannequin({
          structureId: prop.id,
          buyerId: playerId,
          buyerName: playerNameRef.current,
          trendMatched,
        });

        sfx.playCoin();
        setGold(res.newBuyerGold);
        prop.listing = null;
        setPropsVersion((v) => v + 1);
        setOwnedItems((prev) => [res.purchasedItem, ...prev]);
        if (equipOnBuy) {
          equipItem(res.purchasedItem);
        }

        spawnParticles(playerRef.current.x, playerRef.current.y - 8, '#ffe548', 12);
        spawnFloatingText(
          playerRef.current.x,
          playerRef.current.y - 22,
          `Bought from ${prop.owner}!`,
          '#ffe566'
        );
        setBuyPreviewPropId(null);
      } catch (err) {
        setBuyError(err instanceof Error ? err.message : 'Purchase failed.');
      } finally {
        setBuyingBusy(false);
      }
      return;
    }

    // NPC Boutique (Sara & Lina)
    if (gold < price) return;
    if (ownedItemsRef.current.length >= 50) {
      setBuyError('Your wardrobe bag is full (50 items max).');
      return;
    }
    sfx.playCoin();
    const boughtCopy: ClothingItem = {
      ...item,
      uid: generateItemUid('btq'),
    };
    setGold((g) => g - price);
    setOwnedItems((prev) => [boughtCopy, ...prev]);
    if (equipOnBuy) {
      equipItem(boughtCopy);
    }

    spawnParticles(playerRef.current.x, playerRef.current.y - 8, '#ffe548', 10);
    spawnFloatingText(
      playerRef.current.x,
      playerRef.current.y - 20,
      equipOnBuy ? `Bought & Equipped!` : `Added to Closet!`,
      '#ffe566'
    );
    setBuyPreviewPropId(null);
  };

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          setWardrobeOpen(false);
          setCraftingOpen(false);
          setDesignStudioOpen(false);
          setShopsModalOpen(false);
          setRunwayModalOpen(false);
          setBoatModalOpen(false);
          setActiveStallPropId(null);
          setBuyPreviewPropId(null);
          setChatBarOpen(false);
          chatInputRef.current?.blur();
        }
        return;
      }

      if (e.key === 'Enter' && joinedIslandRef.current && !modalOpenRef.current) {
        e.preventDefault();
        setChatBarOpen(true);
        setTimeout(() => chatInputRef.current?.focus(), 20);
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        if (!joinedIslandRef.current) return;
        sfx.playClick();
        setWardrobeOpen(false);
        setDesignStudioOpen(false);
        setShopsModalOpen(false);
        setRunwayModalOpen(false);
        setBoatModalOpen(false);
        setActiveStallPropId(null);
        setBuyPreviewPropId(null);
        setCraftingOpen((open) => !open);
        return;
      }

      if (e.key === 'u' || e.key === 'U') {
        if (!joinedIslandRef.current) return;
        sfx.playClick();
        setCraftingOpen(false);
        setDesignStudioOpen(false);
        setShopsModalOpen(false);
        setRunwayModalOpen(false);
        setBoatModalOpen(false);
        setActiveStallPropId(null);
        setBuyPreviewPropId(null);
        setWardrobeOpen((open) => !open);
        return;
      }

      if (
        e.key === 'Escape' &&
        (modalOpenRef.current || chatBarOpen || cameraModeOpen || movingShopRef.current || selectedDecorKindRef.current)
      ) {
        sfx.playClick();
        setWardrobeOpen(false);
        setCraftingOpen(false);
        setDesignStudioOpen(false);
        setShopsModalOpen(false);
        setRunwayModalOpen(false);
        setBoatModalOpen(false);
        setNewsstandOpen(false);
        setLookbookOpen(false);
        setCameraModeOpen(false);
        setManageShopId(null);
        setMovingShop(null);
        setSelectedDecorKind(null);
        setActiveStallPropId(null);
        setBuyPreviewPropId(null);
        setChatBarOpen(false);
        return;
      }

      if (modalOpenRef.current) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        sfx.playClick();
        setHotbarMode((m) => {
          const next = m === 'gather' ? 'build' : 'gather';
          if (next === 'gather') {
            setSelectedDecorKind(null);
            setSelectedSlot((s) => Math.min(s, HOTBAR_GATHER.length - 1));
          }
          return next;
        });
        return;
      }

      if (e.key >= '1' && e.key <= '6') {
        setSelectedDecorKind(null);
        setSelectedSlot(Number(e.key) - 1);
        sfx.playClick();
        return;
      }

      if (e.key === ' ' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        triggerActionAt();
        return;
      }

      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const onBlur = () => keysRef.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [chatBarOpen, triggerActionAt]);

  // Main 60fps Game Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let globalTime = 0;

    const handleResize = () => {
      const c = mainCanvasRef.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      dprRef.current = dpr;
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const updateNPC = (npc: CharacterEntity, dt: number) => {
      if (npc.emoteTimer && npc.emoteTimer > 0) {
        npc.emoteTimer -= dt;
        if (npc.emoteTimer <= 0) npc.emote = null;
      }

      if (npc.waitTimer && npc.waitTimer > 0) {
        npc.waitTimer -= dt;
        npc.isMoving = false;
        if (npc.waitTimer <= 0) {
          const tiles = worldRef.current.tiles;
          // Prioritize visiting player's own listed mannequins to inspect & buy!
          const listedPlayerStalls = worldRef.current.props.filter(
            (pr) =>
              pr.kind === 'mannequin' &&
              (pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player') &&
              pr.listing
          );

          if (listedPlayerStalls.length > 0 && Math.random() < 0.55) {
            const stall = listedPlayerStalls[Math.floor(Math.random() * listedPlayerStalls.length)];
            const tx = stall.x;
            const ty = stall.y + 13;
            if (isPositionWalkable(tx, ty)) {
              npc.targetX = tx;
              npc.targetY = ty;
              npc.targetMannequinId = stall.id;
              return;
            }
          }

          npc.targetMannequinId = undefined;
          for (let attempt = 0; attempt < 14; attempt++) {
            let tc = Math.floor(npc.x / TILE_SIZE) + Math.floor((Math.random() - 0.5) * 18);
            let tr = Math.floor(npc.y / TILE_SIZE) + Math.floor((Math.random() - 0.5) * 16);
            if (npc.id === 'maya' && Math.random() < 0.55) {
              // Maya visits player's coastal boardwalk often!
              tc = coastColAt(PLAYER_SPAWN_ROW) + Math.floor(Math.random() * 10);
              tr = PLAYER_SPAWN_ROW - 2 + Math.floor(Math.random() * 5);
            } else if (npc.id === 'lina' && Math.random() < 0.5) {
              tc = LINA_BOUTIQUE_COL + Math.floor(Math.random() * 4);
              tr = LINA_BOUTIQUE_ROW + 1 + Math.floor(Math.random() * 3);
            } else if (npc.id === 'sara' && Math.random() < 0.5) {
              tc = SARA_BOUTIQUE_COL + Math.floor(Math.random() * 4);
              tr = SARA_BOUTIQUE_ROW + 1 + Math.floor(Math.random() * 3);
            }
            tc = Math.max(4, Math.min(REEF_START_COL - 4, tc));
            tr = Math.max(4, Math.min(MAP_ROWS - 4, tr));
            const t = tiles[tr]?.[tc];
            if (
              t === TileType.SAND ||
              t === TileType.GRASS ||
              t === TileType.GRASS_FLOWER ||
              t === TileType.DIRT_PATH ||
              t === TileType.DOCK ||
              t === TileType.BOUTIQUE_FLOOR
            ) {
              const tx = tc * TILE_SIZE + 8;
              const ty = tr * TILE_SIZE + 8;
              if (isPositionWalkable(tx, ty)) {
                npc.targetX = tx;
                npc.targetY = ty;
                break;
              }
            }
          }
        }
        return;
      }

      if (npc.targetX !== undefined && npc.targetY !== undefined) {
        const dx = npc.targetX - npc.x;
        const dy = npc.targetY - npc.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
          const targetId = npc.targetMannequinId;
          npc.targetX = undefined;
          npc.targetY = undefined;
          npc.targetMannequinId = undefined;
          npc.isMoving = false;
          npc.waitTimer = 2.0 + Math.random() * 2.5;

          if (targetId) {
            const stall = worldRef.current.props.find((pr) => pr.id === targetId);
            if (stall && stall.listing?.item) {
              npc.dir = 'up';
              const listing = stall.listing;
              const statPower =
                listing.item.stats.speedPct * 6 +
                listing.item.stats.harvestBonus * 80 +
                listing.item.stats.seaRes * 90;
              const baseFair =
                listing.item.source === 'luxury'
                  ? 2600
                  : listing.item.source === 'boutique'
                    ? 400
                    : 220 + statPower;

              const ratio = listing.price / Math.max(80, baseFair);
              const activeTrendNow = getCurrentFashionTrend().trend;
              const trendMatched = doesItemMatchTrend(listing.item, activeTrendNow);
              const baseChance = ratio <= 1.05 ? 0.9 : ratio <= 1.4 ? 0.58 : ratio <= 1.75 ? 0.2 : 0.0;
              const buyChance = trendMatched && baseChance > 0 ? Math.min(0.96, baseChance + 0.25) : baseChance;

              if (Math.random() < buyChance) {
                const earned = trendMatched ? listing.price * 2 : listing.price;
                stall.listing = null;
                npc.emote = 'coin';
                npc.emoteTimer = 2.6;
                setGold((g) => g + earned);
                setTotalSales((s) => s + earned);
                setPropsVersion((v) => v + 1);
                void updateMannequinListing(stall.id, null).catch(() => {});
                sfx.playCoin();
                spawnParticles(stall.x, stall.y - 8, '#ffe548', trendMatched ? 18 : 12);
                spawnFloatingText(
                  stall.x,
                  stall.y - 22,
                  trendMatched ? `+${earned}G (2x TREND!)` : `+${earned}G Sold!`,
                  trendMatched ? '#86efac' : '#ffe566'
                );
              } else {
                npc.emote = ratio > 1.4 ? 'nope' : 'heart';
                npc.emoteTimer = 2.3;
                if (ratio > 1.4) {
                  spawnFloatingText(npc.x, npc.y - 26, 'Too pricey!', '#ffb3b3');
                }
              }
              return;
            }
          }

          if (Math.random() < 0.4) {
            const emotes: CharacterEntity['emote'][] = ['heart', 'music', 'shell', 'wave'];
            npc.emote = emotes[Math.floor(Math.random() * emotes.length)];
            npc.emoteTimer = 2.2;
          }
          return;
        }

        const speed = 38;
        const stepX = (dx / dist) * speed * dt;
        const stepY = (dy / dist) * speed * dt;

        let moved = false;
        if (isPositionWalkable(npc.x + stepX, npc.y)) {
          npc.x += stepX;
          moved = true;
        }
        if (isPositionWalkable(npc.x, npc.y + stepY)) {
          npc.y += stepY;
          moved = true;
        }

        if (!moved) {
          npc.targetX = undefined;
          npc.targetY = undefined;
          npc.targetMannequinId = undefined;
          npc.isMoving = false;
          npc.waitTimer = 0.8 + Math.random();
          return;
        }

        npc.isMoving = true;
        npc.animTime += dt * 7;
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.dir = dx > 0 ? 'right' : 'left';
        } else {
          npc.dir = dy > 0 ? 'down' : 'up';
        }
      } else {
        npc.waitTimer = 1.0;
      }
    };

    const drawNameTag = (
      ctx: CanvasRenderingContext2D,
      name: string,
      screenX: number,
      screenY: number,
      isPlayer: boolean
    ) => {
      const isRtl = /[\u0600-\u06FF]/.test(name);
      ctx.save();
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.font = isRtl
        ? 'bold 12px "Cairo", sans-serif'
        : 'bold 11px "Plus Jakarta Sans", "Cairo", sans-serif';
      const textWidth = Math.ceil(ctx.measureText(name).width);
      const padX = 7;
      const boxW = textWidth + padX * 2;
      const boxH = isRtl ? 20 : 18;
      const bx = Math.round(screenX - boxW / 2);
      const by = Math.round(screenY - boxH);

      ctx.fillStyle = isPlayer ? '#45230d' : 'rgba(54, 30, 14, 0.85)';
      ctx.fillRect(bx - 1, by - 1, boxW + 2, boxH + 2);
      ctx.fillStyle = isPlayer ? '#fff2cf' : '#f5e6c8';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.fillStyle = isPlayer ? '#d4965b' : '#b87f4b';
      ctx.fillRect(bx, by + boxH - 2, boxW, 2);

      ctx.fillStyle = '#381c0a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, Math.round(screenX), by + boxH / 2 - 0.5);
      ctx.restore();
    };

    const drawPriceTag = (
      ctx: CanvasRenderingContext2D,
      price: number,
      screenX: number,
      screenY: number,
      isRival: boolean
    ) => {
      const label = `${price}G`;
      ctx.font = 'bold 10px "Silkscreen", monospace';
      const w = Math.ceil(ctx.measureText(label).width) + 10;
      const h = 15;
      const bx = Math.round(screenX - w / 2);
      const by = Math.round(screenY - h);

      ctx.fillStyle = '#3b1d0a';
      ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
      ctx.fillStyle = isRival ? '#ffe9b0' : '#d9f99d';
      ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = '#3b1d0a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, Math.round(screenX), by + h / 2);
    };

    const drawEmote = (
      ctx: CanvasRenderingContext2D,
      emote: NonNullable<CharacterEntity['emote']>,
      sx: number,
      sy: number
    ) => {
      const bx = Math.round(sx - 12);
      const by = Math.round(sy - 26);
      ctx.fillStyle = '#45230d';
      ctx.fillRect(bx - 1, by - 1, 26, 22);
      ctx.fillStyle = '#fff9eb';
      ctx.fillRect(bx, by, 24, 20);
      ctx.fillStyle = '#45230d';
      ctx.fillRect(bx + 10, by + 20, 4, 3);

      const icon =
        emote === 'heart'
          ? '♥'
          : emote === 'music'
            ? '♪'
            : emote === 'shell'
              ? '✿'
              : emote === 'coin'
                ? '$'
                : emote === 'nope'
                  ? '!'
                  : '☺';
      ctx.fillStyle =
        emote === 'heart'
          ? '#e04f63'
          : emote === 'music'
            ? '#4a7ec7'
            : emote === 'coin'
              ? '#b8760b'
              : emote === 'nope'
                ? '#c93434'
                : '#d9822b';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, bx + 12, by + 10);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      globalTime += dt;

      if (reefWarnCooldownRef.current > 0) {
        reefWarnCooldownRef.current = Math.max(0, reefWarnCooldownRef.current - dt);
      }

      // 1. Resource Respawns
      for (const prop of worldRef.current.props) {
        if (prop.respawnTimer > 0) {
          prop.respawnTimer = Math.max(0, prop.respawnTimer - dt);
          if (prop.respawnTimer === 0) {
            spawnParticles(prop.x, prop.y - 4, '#a6f08c', 5);
          }
        }
      }

      // 2. Player Movement & Deep-Sea Reef Gate (+2 Sea Breeze Resistance)
      const p = playerRef.current;
      if (p.swingTimer && p.swingTimer > 0) p.swingTimer = Math.max(0, p.swingTimer - dt);

      const keys = keysRef.current;
      let moveX = 0;
      let moveY = 0;
      let analogScale = 1;
      if (!modalOpenRef.current) {
        if (keys.has('w') || keys.has('arrowup')) moveY -= 1;
        if (keys.has('s') || keys.has('arrowdown')) moveY += 1;
        if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
        if (keys.has('d') || keys.has('arrowright')) moveX += 1;

        if (moveX === 0 && moveY === 0) {
          const jv = joystickVecRef.current;
          const jMag = Math.hypot(jv.x, jv.y);
          if (jMag > 0.05) {
            moveX = jv.x;
            moveY = jv.y;
            analogScale = Math.min(1, jMag);
          }
        }
      }

      const activeCraft = getBoatCatalogEntry(equippedBoatRef.current);
      const boatMult = isBoatingRef.current ? activeCraft.speedMult : 1;
      const speedMult = (1 + statsRef.current.speedPct / 100) * boatMult;
      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        const nx = moveX / len;
        const ny = moveY / len;
        const speed = 78 * speedMult * analogScale;

        const stepX = nx * speed * dt;
        const stepY = ny * speed * dt;

        if (isPositionWalkable(p.x + stepX, p.y, isBoatingRef.current)) p.x += stepX;
        if (isPositionWalkable(p.x, p.y + stepY, isBoatingRef.current)) p.y += stepY;

        p.isMoving = true;
        p.animTime += dt * 9 * speedMult * Math.max(0.55, analogScale);

        if (Math.abs(moveX) > Math.abs(moveY)) {
          p.dir = moveX > 0 ? 'right' : 'left';
        } else if (moveY !== 0) {
          p.dir = moveY > 0 ? 'down' : 'up';
        }

        if (isBoatingRef.current && Math.random() < 0.38) {
          particlesRef.current.push({
            x: p.x + (Math.random() - 0.5) * 8,
            y: p.y + 4,
            vx: -nx * 14,
            vy: -ny * 10,
            life: 0.4,
            maxLife: 0.4,
            color: '#d4f7ff',
            size: 1.5,
          });
          if (equippedBoatRef.current === 'swan' && Math.random() < 0.55) {
            particlesRef.current.push({
              x: p.x + (Math.random() - 0.5) * 10,
              y: p.y + 1,
              vx: -nx * 10,
              vy: -12 - Math.random() * 8,
              life: 0.55,
              maxLife: 0.55,
              color: Math.random() < 0.55 ? '#ff7eb6' : '#fde047',
              size: 1.3,
            });
          } else if (equippedBoatRef.current === 'skiff' && Math.random() < 0.5) {
            particlesRef.current.push({
              x: p.x + (Math.random() - 0.5) * 10,
              y: p.y + 3,
              vx: -nx * 18,
              vy: -8,
              life: 0.45,
              maxLife: 0.45,
              color: '#fde047',
              size: 1.4,
            });
          }
        } else if (speedMult >= 1.15 && Math.random() < 0.22) {
          particlesRef.current.push({
            x: p.x + (Math.random() - 0.5) * 6,
            y: p.y - 1,
            vx: 0,
            vy: -6,
            life: 0.35,
            maxLife: 0.35,
            color: '#9cebff',
            size: 1,
          });
        }
      } else {
        p.isMoving = false;
        p.animTime = 0;
      }

      // Auto-disembark rowboat when steering onto shore, dock, or coral island
      if (isBoatingRef.current) {
        const curCol = Math.floor(p.x / TILE_SIZE);
        const curRow = Math.floor(p.y / TILE_SIZE);
        const curTile = worldRef.current.tiles[curRow]?.[curCol];
        const onWater =
          curTile === TileType.SHALLOW_WATER ||
          curTile === TileType.DEEP_WATER ||
          curTile === TileType.REEF_WATER;
        if (!onWater) {
          isBoatingRef.current = false;
          setIsBoating(false);
          spawnFloatingText(p.x, p.y - 18, 'Docked!', '#ffe49e');
        }
      }

      // Contextual landmark & own-boutique proximity prompts
      const nearRunway = Math.hypot(p.x - RUNWAY_PODIUM_X, p.y - RUNWAY_PODIUM_Y) <= TILE_SIZE * 4.5;
      const boatCenterX = (BOAT_DOCK_COL + 2.5) * TILE_SIZE;
      const boatCenterY = (BOAT_DOCK_ROW + 0.5) * TILE_SIZE;
      const nearBoat = Math.hypot(p.x - boatCenterX, p.y - boatCenterY) <= TILE_SIZE * 3.8;
      const nearNewsstand = Math.hypot(p.x - NEWSSTAND_CENTER_X, p.y - NEWSSTAND_CENTER_Y) <= TILE_SIZE * 3.8;
      const nextPrompt: 'runway' | 'boat' | 'newsstand' | null = nearRunway
        ? 'runway'
        : nearNewsstand
          ? 'newsstand'
          : nearBoat
            ? 'boat'
            : null;
      setNearLandmarkPrompt((prev) => (prev === nextPrompt ? prev : nextPrompt));

      const pColTile = p.x / TILE_SIZE;
      const pRowTile = p.y / TILE_SIZE;
      const nearbyOwnBoutique = worldRef.current.props.find((pr) => {
        if (pr.kind !== 'boutique_backwall') return false;
        const isMine = pr.ownerId ? pr.ownerId === playerId : pr.owner === 'player';
        if (!isMine) return false;
        const spec = getShopTierSpec(pr.shopTier);
        return (
          pColTile >= pr.col - 0.8 &&
          pColTile <= pr.col + spec.cols + 0.8 &&
          pRowTile >= pr.row - 0.5 &&
          pRowTile <= pr.row + spec.rows + 0.8
        );
      });
      const nextOwnShopId = nearbyOwnBoutique ? getShopStructId(nearbyOwnBoutique) : null;
      setNearOwnShopId((prev) => (prev === nextOwnShopId ? prev : nextOwnShopId));

      // Local Companion Pet Smooth Trailing & Watercraft Co-Piloting
      if (equippedPetRef.current) {
        const pet = localPetRef.current;
        if (isBoatingRef.current) {
          const seatX = p.x + (p.dir === 'right' ? -6 : p.dir === 'left' ? 6 : -5);
          const seatY = p.y + (p.dir === 'down' ? -3 : p.dir === 'up' ? 3 : 0);
          pet.x += (seatX - pet.x) * Math.min(1, 16 * dt);
          pet.y += (seatY - pet.y) * Math.min(1, 16 * dt);
          pet.dir = p.dir;
          pet.anim += dt * (p.isMoving ? 6 : 2.6);
        } else {
          const offsetX = p.dir === 'right' ? -15 : p.dir === 'left' ? 15 : -12;
          const offsetY = p.dir === 'down' ? -10 : p.dir === 'up' ? 12 : 4;
          const goalX = p.x + offsetX;
          const goalY = p.y + offsetY;
          const dxp = goalX - pet.x;
          const dyp = goalY - pet.y;
          const distP = Math.hypot(dxp, dyp);
          if (distP > 3.5) {
            const stepP = Math.min(distP, 110 * dt);
            pet.x += (dxp / distP) * stepP;
            pet.y += (dyp / distP) * stepP;
            pet.anim += dt * 7;
            if (Math.abs(dxp) > Math.abs(dyp)) pet.dir = dxp > 0 ? 'right' : 'left';
            else pet.dir = dyp > 0 ? 'down' : 'up';
          } else {
            pet.anim += dt * 2.4;
          }
        }
      }

      // Deep-Sea Reef Strong Wave Pushback if Sea Breeze Resistance < 2
      if (p.x >= REEF_BOUNDARY_X && statsRef.current.seaRes < 2) {
        p.x = REEF_BOUNDARY_X - 18;
        spawnParticles(p.x + 8, p.y, '#b8f2fc', 12);
        sfx.playSplash();
        if (reefWarnCooldownRef.current <= 0) {
          reefWarnCooldownRef.current = 1.6;
          spawnFloatingText(
            p.x,
            p.y - 24,
            'Strong Waves! Need +2 Sea Breeze Res',
            '#ff9e9e'
          );
        }
      }

      // 3. NPCs
      for (const npc of npcsRef.current) {
        updateNPC(npc, dt);
      }

      // 3b. Remote Online Players Interpolation, Pet Trailing, 10s Pruning & Presence Sync (<= 2/sec)
      const nowWall = Date.now();
      let prunedAny = false;
      for (const [rpId, rp] of remotePlayersRef.current.entries()) {
        if (nowWall - rp.lastSeenLocalMs > 10000) {
          remotePlayersRef.current.delete(rpId);
          prunedAny = true;
          continue;
        }
        const lerpPos = Math.min(1, 12 * dt);
        rp.x += (rp.targetX - rp.x) * lerpPos;
        rp.y += (rp.targetY - rp.y) * lerpPos;
        rp.animTime = rp.isMoving ? rp.animTime + dt * 9 : 0;

        if (rp.equippedPet) {
          if (rp.isBoating) {
            const seatX = rp.x + (rp.dir === 'right' ? -6 : rp.dir === 'left' ? 6 : -5);
            const seatY = rp.y + (rp.dir === 'down' ? -3 : rp.dir === 'up' ? 3 : 0);
            rp.petX += (seatX - rp.petX) * Math.min(1, 16 * dt);
            rp.petY += (seatY - rp.petY) * Math.min(1, 16 * dt);
            rp.petDir = rp.dir;
            rp.petAnim += dt * (rp.isMoving ? 6 : 2.6);
          } else {
            const ox = rp.dir === 'right' ? -15 : rp.dir === 'left' ? 15 : -12;
            const oy = rp.dir === 'down' ? -10 : rp.dir === 'up' ? 12 : 4;
            const dxp = rp.x + ox - rp.petX;
            const dyp = rp.y + oy - rp.petY;
            const dp = Math.hypot(dxp, dyp);
            if (dp > 3.5) {
              const step = Math.min(dp, 110 * dt);
              rp.petX += (dxp / dp) * step;
              rp.petY += (dyp / dp) * step;
              rp.petAnim += dt * 7;
              rp.petDir = Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 'right' : 'left') : dyp > 0 ? 'down' : 'up';
            } else {
              rp.petAnim += dt * 2.4;
            }
          }
        }
      }
      if (prunedAny) {
        setOnlineCount((joinedIslandRef.current ? 1 : 0) + remotePlayersRef.current.size);
      }

      if (joinedIslandRef.current) {
        const soc = socialStateRef.current;
        if (soc.chatText && nowWall - soc.chatAt >= 5000) {
          soc.chatText = null;
          soc.chatAt = 0;
        }
        if (soc.emoteEmoji && nowWall - soc.emoteAt >= 5000) {
          soc.emoteEmoji = null;
          soc.emoteAt = 0;
        }
        if (soc.runwayShowAt && nowWall - soc.runwayShowAt >= 5000) {
          soc.runwayShowAt = 0;
        }

        const ps = presenceSyncRef.current;
        if (!p.isMoving && ps.wasMoving) {
          ps.pendingStop = true;
        }
        if (p.isMoving) {
          ps.pendingStop = false;
        }
        const elapsedSinceSend = nowWall - ps.lastSentAt;
        const shouldSendMoving = p.isMoving && elapsedSinceSend >= 500;
        const shouldSendStop = !p.isMoving && ps.pendingStop && elapsedSinceSend >= 500;
        const heartbeatDue = elapsedSinceSend >= 4500;

        if (shouldSendMoving || shouldSendStop || heartbeatDue) {
          ps.lastSentAt = nowWall;
          ps.lastX = p.x;
          ps.lastY = p.y;
          ps.lastDir = p.dir;
          ps.wasMoving = p.isMoving;
          ps.pendingStop = false;
          void syncOnlinePlayer({
            playerId,
            name: playerNameRef.current,
            x: p.x,
            y: p.y,
            dir: p.dir,
            isMoving: p.isMoving,
            appearance: appearanceRef.current,
            chatText: soc.chatText,
            chatAt: soc.chatAt || null,
            emoteEmoji: soc.emoteEmoji,
            emoteAt: soc.emoteAt || null,
            isBoating: isBoatingRef.current,
            equippedBoat: equippedBoatRef.current,
            equippedPet: equippedPetRef.current,
            runwayShowAt: soc.runwayShowAt || null,
          });
        } else {
          ps.wasMoving = p.isMoving;
        }
      }

      // 3c. Animated Outfit Pixel Particles (Starlight Coral trailing stars + Seafoam Essence bubbles)
      const localEffectsNow = getItemsActiveEffects([
        appearanceRef.current.hat,
        appearanceRef.current.top,
        appearanceRef.current.bottom,
        appearanceRef.current.dress,
        appearanceRef.current.shoes,
      ]);
      if (localEffectsNow.includes('starlight_coral') && p.isMoving && Math.random() < 0.36) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 9,
          y: p.y - 7 + (Math.random() - 0.5) * 8,
          vx: -p.vx * 0.1 + (Math.random() - 0.5) * 16,
          vy: -14 - Math.random() * 14,
          life: 0.65,
          maxLife: 0.65,
          color: Math.random() < 0.55 ? '#fde047' : '#ff8fb1',
          size: 1,
          shape: 'star',
          gravity: -10,
        });
      }
      if (localEffectsNow.includes('seafoam_essence') && Math.random() < (p.isMoving ? 0.28 : 0.12)) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 11,
          y: p.y - 3 + (Math.random() - 0.5) * 7,
          vx: (Math.random() - 0.5) * 10,
          vy: -18 - Math.random() * 12,
          life: 0.72,
          maxLife: 0.72,
          color: Math.random() < 0.55 ? '#5eead4' : '#b8f2fc',
          size: 2,
          shape: 'bubble',
          gravity: -18,
        });
      }
      for (const rp of remotePlayersRef.current.values()) {
        const rpEffectsNow = getItemsActiveEffects([
          rp.appearance.hat,
          rp.appearance.top,
          rp.appearance.bottom,
          rp.appearance.dress,
          rp.appearance.shoes,
        ]);
        if (rpEffectsNow.includes('starlight_coral') && rp.isMoving && Math.random() < 0.32) {
          particlesRef.current.push({
            x: rp.x + (Math.random() - 0.5) * 9,
            y: rp.y - 7 + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 16,
            vy: -14 - Math.random() * 12,
            life: 0.6,
            maxLife: 0.6,
            color: Math.random() < 0.55 ? '#fde047' : '#ff8fb1',
            size: 1,
            shape: 'star',
            gravity: -10,
          });
        }
        if (rpEffectsNow.includes('seafoam_essence') && Math.random() < (rp.isMoving ? 0.25 : 0.1)) {
          particlesRef.current.push({
            x: rp.x + (Math.random() - 0.5) * 11,
            y: rp.y - 3 + (Math.random() - 0.5) * 7,
            vx: (Math.random() - 0.5) * 10,
            vy: -18 - Math.random() * 12,
            life: 0.68,
            maxLife: 0.68,
            color: Math.random() < 0.55 ? '#5eead4' : '#b8f2fc',
            size: 2,
            shape: 'bubble',
            gravity: -18,
          });
        }
      }

      // 4. Particles, Floating Text & Bobber
      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += (pt.gravity ?? 40) * dt;
        return pt.life > 0;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.life -= dt;
        ft.y -= 14 * dt;
        return ft.life > 0;
      });
      if (bobberRef.current) {
        bobberRef.current.timer -= dt;
        if (bobberRef.current.timer <= 0) bobberRef.current = null;
      }

      // 5. Render Main Canvas (High-DPI Retina scaled with crisp pixel art)
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const dpr = dprRef.current || 1;
        const viewCssW = canvas.width / dpr;
        const viewCssH = canvas.height / dpr;
        const viewLogicalW = viewCssW / PIXEL_SCALE;
        const viewLogicalH = viewCssH / PIXEL_SCALE;

        const targetCamX = Math.max(0, Math.min(WORLD_W - viewLogicalW, p.x - viewLogicalW / 2));
        const targetCamY = Math.max(0, Math.min(WORLD_H - viewLogicalH, p.y - viewLogicalH / 2));

        if (!cameraRef.current.initialized) {
          cameraRef.current.x = targetCamX;
          cameraRef.current.y = targetCamY;
          cameraRef.current.initialized = true;
        } else {
          const lerp = 1 - Math.exp(-8 * dt);
          cameraRef.current.x += (targetCamX - cameraRef.current.x) * lerp;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * lerp;
        }

        const camX = Math.round(cameraRef.current.x);
        const camY = Math.round(cameraRef.current.y);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#2678ad';
          ctx.fillRect(0, 0, viewCssW, viewCssH);

          const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
          const endCol = Math.min(MAP_COLS - 1, Math.ceil((camX + viewLogicalW) / TILE_SIZE));
          const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
          const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camY + viewLogicalH) / TILE_SIZE));

          const waterFrame = Math.floor(globalTime * 2.2) % 4;
          const swayFrame = Math.floor(globalTime * 1.4) % 4;
          const tiles = worldRef.current.tiles;
          const variants = worldRef.current.variants;

          const isWaterTile = (tt?: TileType) =>
            tt === TileType.SHALLOW_WATER || tt === TileType.DEEP_WATER || tt === TileType.REEF_WATER;
          const isDeckTile = (tt?: TileType) => tt === TileType.DOCK || tt === TileType.BOUTIQUE_FLOOR;

          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const t = tiles[r][c];
              const dx = (c * TILE_SIZE - camX) * PIXEL_SCALE;
              const dy = (r * TILE_SIZE - camY) * PIXEL_SCALE;
              const x0 = Math.floor(dx * dpr) / dpr;
              const y0 = Math.floor(dy * dpr) / dpr;
              const x1 = Math.ceil(((c + 1) * TILE_SIZE - camX) * PIXEL_SCALE * dpr) / dpr;
              const y1 = Math.ceil(((r + 1) * TILE_SIZE - camY) * PIXEL_SCALE * dpr) / dpr;
              const tileCanvas = getTileSprite(t, variants[r][c], waterFrame);
              ctx.drawImage(tileCanvas, x0, y0, x1 - x0, y1 - y0);

              // Animated beach shoreline foam where shallow water meets sand
              if (t === TileType.SHALLOW_WATER) {
                const foamPulse = waterFrame % 2 === 0 ? 2 : 1;
                if (tiles[r][c - 1] === TileType.SAND) {
                  ctx.fillStyle = '#d4f7ff';
                  ctx.fillRect(dx, dy, foamPulse * PIXEL_SCALE, TILE_SIZE * PIXEL_SCALE);
                }
                if (tiles[r - 1]?.[c] === TileType.SAND) {
                  ctx.fillStyle = '#d4f7ff';
                  ctx.fillRect(dx, dy, TILE_SIZE * PIXEL_SCALE, foamPulse * PIXEL_SCALE);
                }
                if (tiles[r + 1]?.[c] === TileType.SAND) {
                  ctx.fillStyle = '#d4f7ff';
                  ctx.fillRect(
                    dx,
                    dy + (TILE_SIZE - foamPulse) * PIXEL_SCALE,
                    TILE_SIZE * PIXEL_SCALE,
                    foamPulse * PIXEL_SCALE
                  );
                }
              }

              // Darker water shadow & subtle animated water foam around dock edges
              if (isWaterTile(t)) {
                const dockAbove = isDeckTile(tiles[r - 1]?.[c]);
                const dockLeft = isDeckTile(tiles[r]?.[c - 1]);
                const dockRight = isDeckTile(tiles[r]?.[c + 1]);
                const dockBelow = isDeckTile(tiles[r + 1]?.[c]);

                if (dockAbove) {
                  ctx.fillStyle = 'rgba(8, 32, 54, 0.42)';
                  ctx.fillRect(dx, dy, TILE_SIZE * PIXEL_SCALE, 3 * PIXEL_SCALE);
                  const foamW = waterFrame % 2 === 0 ? 5 : 3;
                  ctx.fillStyle = 'rgba(198, 245, 255, 0.55)';
                  ctx.fillRect(dx + ((waterFrame + c) % 4) * 2 * PIXEL_SCALE, dy + 3 * PIXEL_SCALE, foamW * PIXEL_SCALE, PIXEL_SCALE);
                }
                if (dockLeft) {
                  ctx.fillStyle = 'rgba(8, 32, 54, 0.34)';
                  ctx.fillRect(dx, dy, 2 * PIXEL_SCALE, TILE_SIZE * PIXEL_SCALE);
                  if ((waterFrame + r) % 2 === 0) {
                    ctx.fillStyle = 'rgba(198, 245, 255, 0.45)';
                    ctx.fillRect(dx + 2 * PIXEL_SCALE, dy + 3 * PIXEL_SCALE, PIXEL_SCALE, 5 * PIXEL_SCALE);
                  }
                }
                if (dockRight) {
                  ctx.fillStyle = 'rgba(8, 32, 54, 0.34)';
                  ctx.fillRect(dx + (TILE_SIZE - 2) * PIXEL_SCALE, dy, 2 * PIXEL_SCALE, TILE_SIZE * PIXEL_SCALE);
                  if ((waterFrame + r) % 2 === 1) {
                    ctx.fillStyle = 'rgba(198, 245, 255, 0.45)';
                    ctx.fillRect(dx + (TILE_SIZE - 3) * PIXEL_SCALE, dy + 6 * PIXEL_SCALE, PIXEL_SCALE, 5 * PIXEL_SCALE);
                  }
                }
                if (dockBelow && waterFrame % 2 === 0) {
                  ctx.fillStyle = 'rgba(198, 245, 255, 0.45)';
                  ctx.fillRect(dx + 2 * PIXEL_SCALE, dy + (TILE_SIZE - 1) * PIXEL_SCALE, 6 * PIXEL_SCALE, PIXEL_SCALE);
                }
                // Subtle animated water shimmer glints across ocean & shallow water tiles
                const tileHash = ((r * 73856093) ^ (c * 19349663)) >>> 0;
                if (tileHash % 11 === 0) {
                  const shimmerWave = Math.sin(globalTime * 2.5 + (tileHash % 628) / 100);
                  if (shimmerWave > 0.15) {
                    const glintAlpha = Math.min(0.65, (shimmerWave - 0.15) * 0.72);
                    const gxOff = (tileHash % 10) + 2 + Math.round(Math.sin(globalTime * 1.4 + r) * 1);
                    const gyOff = ((tileHash >> 4) % 10) + 2;
                    ctx.fillStyle = `rgba(232, 252, 255, ${glintAlpha.toFixed(2)})`;
                    ctx.fillRect(dx + gxOff * PIXEL_SCALE, dy + gyOff * PIXEL_SCALE, 2 * PIXEL_SCALE, PIXEL_SCALE);
                    if (shimmerWave > 0.65) {
                      ctx.fillRect(dx + (gxOff + 1) * PIXEL_SCALE, dy + (gyOff - 1) * PIXEL_SCALE, PIXEL_SCALE, 3 * PIXEL_SCALE);
                    }
                  }
                }
              }

              // Deep-Sea Reef boundary wave line
              if (c === REEF_START_COL && (t === TileType.REEF_WATER || t === TileType.REEF_CORAL)) {
                ctx.fillStyle = waterFrame % 2 === 0 ? 'rgba(94, 234, 212, 0.55)' : 'rgba(186, 230, 253, 0.35)';
                ctx.fillRect(dx, dy, 2 * PIXEL_SCALE, TILE_SIZE * PIXEL_SCALE);
              }

              // Dock support pilings extending into water + cozy outer rope railings
              if (isDeckTile(t)) {
                if (isWaterTile(tiles[r + 1]?.[c])) {
                  // Wooden support posts extending down into water
                  for (const px of [1, 12]) {
                    ctx.fillStyle = '#3d1e0a';
                    ctx.fillRect(dx + px * PIXEL_SCALE, dy + TILE_SIZE * PIXEL_SCALE, 3 * PIXEL_SCALE, 6 * PIXEL_SCALE);
                    ctx.fillStyle = '#7c451e';
                    ctx.fillRect(dx + (px + 1) * PIXEL_SCALE, dy + TILE_SIZE * PIXEL_SCALE, 1 * PIXEL_SCALE, 5 * PIXEL_SCALE);
                    // Waterline ripple ring around piling
                    ctx.fillStyle = waterFrame % 2 === 0 ? 'rgba(212, 247, 255, 0.7)' : 'rgba(156, 232, 250, 0.45)';
                    ctx.fillRect(dx + (px - 1) * PIXEL_SCALE, dy + (TILE_SIZE + 5) * PIXEL_SCALE, 5 * PIXEL_SCALE, PIXEL_SCALE);
                  }
                }

                // Subtle rope railing along top edge of dock bordering water
                if (t === TileType.DOCK && isWaterTile(tiles[r - 1]?.[c])) {
                  ctx.fillStyle = '#42210b';
                  ctx.fillRect(dx, dy, TILE_SIZE * PIXEL_SCALE, 2 * PIXEL_SCALE);
                  ctx.fillStyle = '#d9b577';
                  ctx.fillRect(dx, dy + PIXEL_SCALE, TILE_SIZE * PIXEL_SCALE, PIXEL_SCALE);
                  ctx.fillStyle = '#42210b';
                  ctx.fillRect(dx + 1 * PIXEL_SCALE, dy - 2 * PIXEL_SCALE, 2 * PIXEL_SCALE, 4 * PIXEL_SCALE);
                  ctx.fillRect(dx + 13 * PIXEL_SCALE, dy - 2 * PIXEL_SCALE, 2 * PIXEL_SCALE, 4 * PIXEL_SCALE);
                  ctx.fillStyle = '#9c5a2b';
                  ctx.fillRect(dx + 1 * PIXEL_SCALE, dy - 1 * PIXEL_SCALE, 2 * PIXEL_SCALE, 2 * PIXEL_SCALE);
                  ctx.fillRect(dx + 13 * PIXEL_SCALE, dy - 1 * PIXEL_SCALE, 2 * PIXEL_SCALE, 2 * PIXEL_SCALE);
                }
              }
            }
          }

          // Central Runway Stage Velvet Carpet & Spotlights
          const anyShowcasing =
            (socialStateRef.current.runwayShowAt > 0 && nowWall - socialStateRef.current.runwayShowAt < 5000) ||
            Array.from(remotePlayersRef.current.values()).some(
              (rp) => rp.runwayShowAt && nowWall - rp.runwayShowAt < 5000
            );
          drawRunwayStageOverlay(
            ctx,
            RUNWAY_STAGE_COL,
            RUNWAY_STAGE_ROW,
            camX,
            camY,
            TILE_SIZE,
            globalTime,
            anyShowcasing
          );

          // Tier 4 Royal Fashion Palace Red Carpet Runner Floor Pass
          for (const shopProp of worldRef.current.props) {
            if (shopProp.kind !== 'boutique_backwall' || clampShopTier(shopProp.shopTier) !== 4) {
              continue;
            }
            const spec = getShopTierSpec(4);
            const runnerX = (shopProp.col + spec.cols / 2 - 1) * TILE_SIZE - camX;
            const runnerY = (shopProp.row + 1) * TILE_SIZE - camY;
            const runnerW = 2 * TILE_SIZE;
            const runnerH = (spec.rows - 1) * TILE_SIZE;
            if (
              runnerX + runnerW < -16 ||
              runnerX > viewLogicalW + 16 ||
              runnerY + runnerH < -16 ||
              runnerY > viewLogicalH + 16
            ) {
              continue;
            }
            const rx = Math.round(runnerX * PIXEL_SCALE);
            const ry = Math.round(runnerY * PIXEL_SCALE);
            const rw = runnerW * PIXEL_SCALE;
            const rh = runnerH * PIXEL_SCALE;
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(rx + PIXEL_SCALE, ry, rw - 2 * PIXEL_SCALE, rh - PIXEL_SCALE);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(rx + 3 * PIXEL_SCALE, ry + PIXEL_SCALE, rw - 6 * PIXEL_SCALE, rh - 3 * PIXEL_SCALE);
            // Gold braided runner borders
            ctx.fillStyle = '#f5cb52';
            ctx.fillRect(rx + 2 * PIXEL_SCALE, ry, PIXEL_SCALE, rh - PIXEL_SCALE);
            ctx.fillRect(rx + rw - 3 * PIXEL_SCALE, ry, PIXEL_SCALE, rh - PIXEL_SCALE);
            // Gold tassels at entrance
            for (let tx = 2; tx < runnerW - 2; tx += 3) {
              ctx.fillRect(rx + tx * PIXEL_SCALE, ry + rh - PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
            }
          }

          // Moored Watercraft visual alongside the Beach Boat Dock
          if (!isBoatingRef.current) {
            const mooredBoat = renderWatercraftSprite(
              equippedBoatRef.current || 'rowboat',
              'right',
              Math.floor(globalTime * 1.5)
            );
            const mbX = Math.round((coastColAt(BOAT_DOCK_ROW) + 4.3) * TILE_SIZE - camX) * PIXEL_SCALE;
            const mbY = Math.round((BOAT_DOCK_ROW + 1.1) * TILE_SIZE - camY + Math.sin(globalTime * 2.4) * 1.2) * PIXEL_SCALE;
            ctx.drawImage(
              mooredBoat,
              mbX,
              mbY,
              mooredBoat.width * PIXEL_SCALE,
              mooredBoat.height * PIXEL_SCALE
            );
          }

          // Boutique, Runway, Boat Dock & Reef Floating Zone Banners
          const zoneLabels = [
            { text: "Lina's Boutique", x: (LINA_BOUTIQUE_COL + 2) * TILE_SIZE, y: (LINA_BOUTIQUE_ROW - 1) * TILE_SIZE - 2 },
            { text: "Sara's Boutique", x: (SARA_BOUTIQUE_COL + 2) * TILE_SIZE, y: (SARA_BOUTIQUE_ROW - 1) * TILE_SIZE - 2 },
            { text: 'Island Newsstand', x: NEWSSTAND_CENTER_X, y: (NEWSSTAND_ROW - 0.6) * TILE_SIZE },
            { text: 'Runway & Auction Stage', x: RUNWAY_PODIUM_X, y: (RUNWAY_STAGE_ROW - 0.6) * TILE_SIZE },
            { text: 'Boat Fleet Dock', x: (BOAT_DOCK_COL + 2.5) * TILE_SIZE, y: (BOAT_DOCK_ROW - 0.8) * TILE_SIZE },
            { text: 'Deep-Sea Coral Reef (+2 Sea Res)', x: 136 * TILE_SIZE, y: 42 * TILE_SIZE },
          ];
          for (const zl of zoneLabels) {
            const sx = (zl.x - camX) * PIXEL_SCALE;
            const sy = (zl.y - camY) * PIXEL_SCALE;
            if (sx > -120 && sx < viewCssW + 120 && sy > -40 && sy < viewCssH + 40) {
              drawNameTag(ctx, zl.text, sx, sy, false);
            }
          }

          // Free-Building & Shop Relocation Live Preview
          const activeMoveShop = movingShopRef.current;
          const activeList = hotbarModeRef.current === 'gather' ? HOTBAR_GATHER : HOTBAR_BUILD;
          const activeDecorDef =
            hotbarModeRef.current === 'build' && selectedDecorKindRef.current
              ? HOTBAR_BUILD_DECOR.find((d) => d.kind === selectedDecorKindRef.current)
              : undefined;
          const activeDef = activeDecorDef || activeList[selectedSlotRef.current];
          if (!modalOpenRef.current && activeMoveShop) {
            let centerCol: number;
            let centerRow: number;
            if (mouseHoverRef.current.active) {
              centerCol = Math.floor((mouseHoverRef.current.screenX / PIXEL_SCALE + camX) / TILE_SIZE);
              centerRow = Math.floor((mouseHoverRef.current.screenY / PIXEL_SCALE + camY) / TILE_SIZE);
            } else {
              centerCol = Math.floor(p.x / TILE_SIZE);
              centerRow = Math.floor(p.y / TILE_SIZE) - 1;
            }
            const previewCol = centerCol - Math.floor(activeMoveShop.spanCols / 2);
            const previewRow = centerRow - Math.floor(activeMoveShop.spanRows / 2);
            const isValidMove = validateShopRelocation(previewCol, previewRow, activeMoveShop);
            const gx = (previewCol * TILE_SIZE - camX) * PIXEL_SCALE;
            const gy = (previewRow * TILE_SIZE - camY) * PIXEL_SCALE;
            const size = TILE_SIZE * PIXEL_SCALE;
            const gridW = size * activeMoveShop.spanCols;
            const gridH = size * activeMoveShop.spanRows;

            ctx.fillStyle = isValidMove ? 'rgba(74, 222, 128, 0.22)' : 'rgba(248, 113, 113, 0.26)';
            ctx.fillRect(gx, gy, gridW, gridH);

            ctx.save();
            ctx.globalAlpha = isValidMove ? 0.68 : 0.35;
            const floorSpr = getTileSprite(TileType.BOUTIQUE_FLOOR, 0, 0);
            for (let fr = 1; fr < activeMoveShop.spanRows; fr++) {
              for (let fc = 0; fc < activeMoveShop.spanCols; fc++) {
                ctx.drawImage(floorSpr, gx + fc * size, gy + fr * size, size, size);
              }
            }
            if (activeMoveShop.tier === 4) {
              const rx = gx + (activeMoveShop.spanCols / 2 - 1) * size;
              const ry = gy + size;
              const rw = 2 * size;
              const rh = (activeMoveShop.spanRows - 1) * size;
              ctx.fillStyle = '#991b1b';
              ctx.fillRect(rx + PIXEL_SCALE, ry, rw - 2 * PIXEL_SCALE, rh - PIXEL_SCALE);
              ctx.fillStyle = '#f5cb52';
              ctx.fillRect(rx + 2 * PIXEL_SCALE, ry, PIXEL_SCALE, rh - PIXEL_SCALE);
              ctx.fillRect(rx + rw - 3 * PIXEL_SCALE, ry, PIXEL_SCALE, rh - PIXEL_SCALE);
            }

            const ghostBw = getPropSprite({
              id: 'ghost_move_bw',
              kind: 'boutique_backwall',
              col: previewCol,
              row: previewRow,
              x: 0,
              y: 0,
              solid: false,
              radius: 7,
              variant: 0,
              respawnTimer: 0,
              shopTier: activeMoveShop.tier,
            });
            ctx.drawImage(
              ghostBw,
              gx,
              gy + (TILE_SIZE - ghostBw.height) * PIXEL_SCALE,
              ghostBw.width * PIXEL_SCALE,
              ghostBw.height * PIXEL_SCALE
            );

            for (const pKind of ['boutique_pillar_l', 'boutique_pillar_r'] as const) {
              const ghostPillar = getPropSprite({
                id: `ghost_${pKind}`,
                kind: pKind,
                col: previewCol + (pKind === 'boutique_pillar_r' ? activeMoveShop.spanCols - 1 : 0),
                row: previewRow + activeMoveShop.spanRows - 1,
                x: 0,
                y: 0,
                solid: false,
                radius: 2,
                variant: 0,
                respawnTimer: 0,
                shopTier: activeMoveShop.tier,
              });
              const pColOff = pKind === 'boutique_pillar_r' ? activeMoveShop.spanCols - 1 : 0;
              ctx.drawImage(
                ghostPillar,
                gx + pColOff * size,
                gy + (activeMoveShop.spanRows - 1) * size + (TILE_SIZE - ghostPillar.height) * PIXEL_SCALE,
                ghostPillar.width * PIXEL_SCALE,
                ghostPillar.height * PIXEL_SCALE
              );
            }

            // Translucent interior Mannequins, Rugs & Decorations inside relocation ghost
            for (const item of activeMoveShop.interiorItems) {
              const ghostInterior: PropObject = {
                id: `ghost_int_${item.id}`,
                kind: item.kind as PropKind,
                col: previewCol + item.relCol,
                row: previewRow + item.relRow,
                x: 0,
                y: 0,
                solid: false,
                radius: 0,
                variant: 0,
                respawnTimer: 0,
                listing: item.listing ?? null,
              };
              const spr = getPropSprite(ghostInterior, 0);
              const ix = gx + item.relCol * size + ((TILE_SIZE - spr.width) / 2) * PIXEL_SCALE;
              const iy = gy + item.relRow * size + (TILE_SIZE - spr.height) * PIXEL_SCALE;
              ctx.drawImage(spr, ix, iy, spr.width * PIXEL_SCALE, spr.height * PIXEL_SCALE);
            }
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = isValidMove ? 'rgba(34, 197, 94, 0.92)' : 'rgba(239, 68, 68, 0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(gx + 1, gy + 1, gridW - 2, gridH - 2);
            ctx.restore();
          } else if (
            !modalOpenRef.current &&
            activeDef &&
            (activeDef.kind === 'dock_plank' ||
              activeDef.kind === 'shop_wall' ||
              activeDef.kind === 'mannequin' ||
              isDecorKind(activeDef.kind))
          ) {
            let previewCol: number;
            let previewRow: number;
            if (mouseHoverRef.current.active) {
              previewCol = Math.floor((mouseHoverRef.current.screenX / PIXEL_SCALE + camX) / TILE_SIZE);
              previewRow = Math.floor((mouseHoverRef.current.screenY / PIXEL_SCALE + camY) / TILE_SIZE);
            } else {
              const reach = 14;
              const fx = p.x + (p.dir === 'right' ? reach : p.dir === 'left' ? -reach : 0);
              const fy = p.y + (p.dir === 'down' ? reach : p.dir === 'up' ? -reach : 0);
              previewCol = Math.floor(fx / TILE_SIZE);
              previewRow = Math.floor(fy / TILE_SIZE);
            }

            if (previewCol >= 0 && previewCol < MAP_COLS && previewRow >= 0 && previewRow < MAP_ROWS) {
              const hasQty = inventoryRef.current[activeDef.kind as keyof InventoryCounts] > 0;
              const check = validatePlacement(activeDef.kind, previewCol, previewRow);
              const isGreen = hasQty && check.valid;

              const gx = (previewCol * TILE_SIZE - camX) * PIXEL_SCALE;
              const gy = (previewRow * TILE_SIZE - camY) * PIXEL_SCALE;
              const size = TILE_SIZE * PIXEL_SCALE;
              const spanCols = activeDef.kind === 'shop_wall' ? 4 : 1;
              const spanRows = activeDef.kind === 'shop_wall' ? 3 : 1;
              const gridW = size * spanCols;
              const gridH = size * spanRows;

              ctx.fillStyle = isGreen ? 'rgba(74, 222, 128, 0.18)' : 'rgba(248, 113, 113, 0.18)';
              ctx.fillRect(gx, gy, gridW, gridH);

              if (isGreen) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                if (activeDef.kind === 'dock_plank') {
                  ctx.drawImage(getTileSprite(TileType.DOCK, 0, 0), gx, gy, size, size);
                } else if (activeDef.kind === 'shop_wall') {
                  const floorSpr = getTileSprite(TileType.BOUTIQUE_FLOOR, 0, 0);
                  for (let fr = 1; fr <= 2; fr++) {
                    for (let fc = 0; fc < 4; fc++) {
                      ctx.drawImage(floorSpr, gx + fc * size, gy + fr * size, size, size);
                    }
                  }
                  const ghostBw = getPropSprite({
                    id: 'ghost_bw',
                    kind: 'boutique_backwall',
                    col: previewCol,
                    row: previewRow,
                    x: 0,
                    y: 0,
                    solid: false,
                    radius: 7,
                    variant: 0,
                    respawnTimer: 0,
                  });
                  ctx.drawImage(
                    ghostBw,
                    gx,
                    gy + (TILE_SIZE - ghostBw.height) * PIXEL_SCALE,
                    ghostBw.width * PIXEL_SCALE,
                    ghostBw.height * PIXEL_SCALE
                  );
                } else {
                  const ghostProp: PropObject = {
                    id: 'ghost',
                    kind: activeDef.kind as PropKind,
                    col: previewCol,
                    row: previewRow,
                    x: 0,
                    y: 0,
                    solid: false,
                    radius: isRugKind(activeDef.kind) ? 0 : 4.5,
                    variant: 0,
                    respawnTimer: 0,
                    listing: null,
                  };
                  const spr = getPropSprite(ghostProp, 0);
                  ctx.drawImage(
                    spr,
                    gx + ((TILE_SIZE - spr.width) / 2) * PIXEL_SCALE,
                    gy + (TILE_SIZE - spr.height) * PIXEL_SCALE,
                    spr.width * PIXEL_SCALE,
                    spr.height * PIXEL_SCALE
                  );
                }
                ctx.restore();
              }

              ctx.save();
              ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 0.72)' : 'rgba(239, 68, 68, 0.65)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.strokeRect(gx + 1, gy + 1, gridW - 2, gridH - 2);
              ctx.restore();
            }
          }

          if (bobberRef.current) {
            const bx = Math.round(bobberRef.current.x - camX) * PIXEL_SCALE;
            const by = Math.round(bobberRef.current.y - camY + Math.sin(globalTime * 6) * 1.2) * PIXEL_SCALE;
            ctx.fillStyle = '#b8f2fc';
            ctx.fillRect(bx - 6, by + 2, 12, 3);
            ctx.fillStyle = '#e34949';
            ctx.fillRect(bx - 3, by - 4, 6, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bx - 3, by, 6, 3);
          }

          type BoatPetRenderInfo = {
            kind: PetKind;
            dir: Direction;
            anim: number;
            heartUntil?: number;
          };
          type RenderItem =
            | { type: 'prop'; y: number; prop: PropObject }
            | { type: 'char'; y: number; char: CharacterEntity; boatPet?: BoatPetRenderInfo | null }
            | {
                type: 'pet';
                y: number;
                kind: PetKind;
                x: number;
                dir: Direction;
                anim: number;
                heartUntil?: number;
              };

          const activeTrendFrame = getCurrentFashionTrend(nowWall).trend;
          const rugProps: PropObject[] = [];
          const renderables: RenderItem[] = [];
          for (const prop of worldRef.current.props) {
            const cullPadX = prop.kind === 'boutique_backwall' ? 96 : 48;
            if (
              prop.x < camX - cullPadX ||
              prop.x > camX + viewLogicalW + cullPadX ||
              prop.y < camY - 48 ||
              prop.y > camY + viewLogicalH + 48
            ) {
              continue;
            }
            if (isRugKind(prop.kind)) {
              rugProps.push(prop);
              continue;
            }
            renderables.push({ type: 'prop', y: prop.y, prop });
          }

          // Walkable Woven Rugs rendered as ground overlay underneath players, pets & furniture
          for (const rug of rugProps) {
            const rugSpr = getPropSprite(rug, 0);
            const rx = Math.round(rug.x - rugSpr.width / 2 - camX) * PIXEL_SCALE;
            const ry = Math.round(rug.y - rugSpr.height + 2 - camY) * PIXEL_SCALE;
            ctx.drawImage(rugSpr, rx, ry, rugSpr.width * PIXEL_SCALE, rugSpr.height * PIXEL_SCALE);
          }

          const localChat =
            socialStateRef.current.chatText && nowWall - socialStateRef.current.chatAt < 5000
              ? socialStateRef.current.chatText
              : null;
          const localEmoteEmoji =
            socialStateRef.current.emoteEmoji && nowWall - socialStateRef.current.emoteAt < 5000
              ? socialStateRef.current.emoteEmoji
              : null;
          const localShowcasing =
            socialStateRef.current.runwayShowAt > 0 && nowWall - socialStateRef.current.runwayShowAt < 5000;

          for (const ch of npcsRef.current) {
            renderables.push({ type: 'char', y: ch.y, char: ch });
          }
          renderables.push({
            type: 'char',
            y: p.y,
            char: {
              ...p,
              isBoating: isBoatingRef.current,
              equippedBoat: equippedBoatRef.current,
              chatText: localChat,
              emoteEmoji: localEmoteEmoji,
              isShowcasing: localShowcasing,
            },
            boatPet:
              isBoatingRef.current && equippedPetRef.current
                ? {
                    kind: equippedPetRef.current,
                    dir: p.dir,
                    anim: localPetRef.current.anim,
                    heartUntil: localPetHeartUntilRef.current,
                  }
                : null,
          });
          if (equippedPetRef.current && !isBoatingRef.current) {
            renderables.push({
              type: 'pet',
              y: localPetRef.current.y,
              kind: equippedPetRef.current,
              x: localPetRef.current.x,
              dir: localPetRef.current.dir,
              anim: localPetRef.current.anim,
              heartUntil: localPetHeartUntilRef.current,
            });
          }

          for (const rp of remotePlayersRef.current.values()) {
            const rpChat = rp.chatText && rp.chatAt && nowWall - rp.chatAt < 5000 ? rp.chatText : null;
            const rpEmote = rp.emoteEmoji && rp.emoteAt && nowWall - rp.emoteAt < 5000 ? rp.emoteEmoji : null;
            const rpShow = Boolean(rp.runwayShowAt && nowWall - rp.runwayShowAt < 5000);
            renderables.push({
              type: 'char',
              y: rp.y,
              char: {
                id: rp.playerId,
                name: rp.name,
                x: rp.x,
                y: rp.y,
                vx: 0,
                vy: 0,
                dir: rp.dir,
                animTime: rp.animTime,
                isMoving: rp.isMoving,
                appearance: rp.appearance,
                isPlayer: false,
                isBoating: Boolean(rp.isBoating),
                equippedBoat: rp.equippedBoat ?? 'rowboat',
                chatText: rpChat,
                emoteEmoji: rpEmote,
                isShowcasing: rpShow,
              },
              boatPet:
                rp.isBoating && rp.equippedPet
                  ? {
                      kind: rp.equippedPet,
                      dir: rp.dir,
                      anim: rp.petAnim,
                      heartUntil: rp.petHeartUntil,
                    }
                  : null,
            });
            if (rp.equippedPet && !rp.isBoating) {
              renderables.push({
                type: 'pet',
                y: rp.petY,
                kind: rp.equippedPet,
                x: rp.petX,
                dir: rp.petDir,
                anim: rp.petAnim,
                heartUntil: rp.petHeartUntil,
              });
            }
          }

          renderables.sort((a, b) => a.y - b.y);

          const lanternPulse = 0.78 + 0.22 * Math.sin(globalTime * 4.2);
          const sunsetPhase = Math.floor(globalTime * 7) % 12;
          const nightAmount =
            timeOfDayModeRef.current === 'night'
              ? 1
              : timeOfDayModeRef.current === 'day'
                ? 0
                : Math.max(0, Math.min(1, (-Math.cos(globalTime * 0.045) + 0.15) * 0.85));
          const rainCycle = (globalTime % 110) / 110;
          const autoRainAmount =
            rainCycle > 0.72 && rainCycle < 0.94
              ? Math.min(1, Math.sin(((rainCycle - 0.72) / 0.22) * Math.PI) * 1.4)
              : 0;
          const rainAmount =
            weatherModeRef.current === 'rain'
              ? 1
              : weatherModeRef.current === 'sunny'
                ? 0
                : autoRainAmount;
          const postNightGlowDraws: Array<() => void> = [];
          const postNightLabelDraws: Array<() => void> = [];

          const drawSoftEllipticalShadow = (
            cx: number,
            cy: number,
            rx: number,
            ry: number,
            alpha = 0.28
          ) => {
            ctx.save();
            ctx.fillStyle = `rgba(22, 16, 10, ${(alpha * 0.45).toFixed(2)})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx * 1.18, ry * 1.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(22, 16, 10, ${alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          };

          const drawWarmLanternGlow = (gx: number, gy: number, radiusPx: number) => {
            const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, radiusPx);
            grad.addColorStop(0, `rgba(255, 232, 140, ${(0.34 * lanternPulse).toFixed(3)})`);
            grad.addColorStop(0.45, `rgba(255, 188, 78, ${(0.16 * lanternPulse).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(255, 165, 50, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(gx, gy, radiusPx, 0, Math.PI * 2);
            ctx.fill();
          };

          for (const item of renderables) {
            if (item.type === 'prop') {
              const pr = item.prop;
              const isDeepDyeNode =
                pr.kind === 'glowing_pearl_node' ||
                pr.kind === 'starlight_coral_node' ||
                pr.kind === 'seafoam_essence_node' ||
                pr.kind === 'sunset_amber_node';
              const nodeBobPx =
                isDeepDyeNode && pr.respawnTimer <= 0
                  ? Math.round(Math.sin(globalTime * 2.8 + pr.col) * 1.4)
                  : 0;
              const spr = getPropSprite(pr, (swayFrame + pr.variant) % 4, sunsetPhase);
              const sx =
                pr.kind === 'boutique_backwall'
                  ? Math.round(pr.col * TILE_SIZE - camX) * PIXEL_SCALE
                  : pr.kind === 'boutique_pillar_l' || pr.kind === 'boutique_pillar_r'
                    ? Math.round(pr.col * TILE_SIZE - camX) * PIXEL_SCALE
                    : Math.round(pr.x - spr.width / 2 - camX) * PIXEL_SCALE;
              const sy =
                pr.kind === 'boutique_backwall'
                  ? Math.round((pr.row + 1) * TILE_SIZE - spr.height - camY) * PIXEL_SCALE
                  : pr.kind === 'boutique_pillar_l' || pr.kind === 'boutique_pillar_r'
                    ? Math.round((pr.row + 1) * TILE_SIZE - spr.height - camY) * PIXEL_SCALE
                    : Math.round(pr.y - spr.height + 2 + nodeBobPx - camY) * PIXEL_SCALE;

              // Soft layered shadows for palm trees & mannequins, or subtle water ring under deep dye nodes
              if (pr.kind === 'palm' && pr.respawnTimer <= 0) {
                drawSoftEllipticalShadow((pr.x - camX) * PIXEL_SCALE, (pr.y - camY) * PIXEL_SCALE, 10 * PIXEL_SCALE, 3.6 * PIXEL_SCALE, 0.24);
              } else if (pr.kind === 'mannequin') {
                drawSoftEllipticalShadow((pr.x - camX) * PIXEL_SCALE, (pr.y - camY) * PIXEL_SCALE + PIXEL_SCALE, 5.5 * PIXEL_SCALE, 2.1 * PIXEL_SCALE, 0.24);
              } else if (isDeepDyeNode && pr.respawnTimer <= 0) {
                const ringPulse = 0.72 + 0.28 * Math.sin(globalTime * 3.4 + pr.row);
                const ringCol =
                  pr.kind === 'glowing_pearl_node'
                    ? `rgba(103, 232, 249, ${(0.35 * ringPulse).toFixed(2)})`
                    : pr.kind === 'starlight_coral_node'
                      ? `rgba(253, 224, 71, ${(0.32 * ringPulse).toFixed(2)})`
                      : pr.kind === 'seafoam_essence_node'
                        ? `rgba(94, 234, 212, ${(0.34 * ringPulse).toFixed(2)})`
                        : `rgba(251, 146, 60, ${(0.34 * ringPulse).toFixed(2)})`;
                ctx.fillStyle = ringCol;
                ctx.fillRect(
                  Math.round(pr.x - 6 - camX) * PIXEL_SCALE,
                  Math.round(pr.y - 1 - camY) * PIXEL_SCALE,
                  12 * PIXEL_SCALE,
                  3 * PIXEL_SCALE
                );
              }

              ctx.drawImage(spr, sx, sy, spr.width * PIXEL_SCALE, spr.height * PIXEL_SCALE);

              if (isDeepDyeNode && pr.respawnTimer <= 0) {
                const nodeCx = sx + (spr.width / 2) * PIXEL_SCALE;
                const nodeCy = sy + (spr.height / 2) * PIXEL_SCALE;
                const nodeGlowRgb =
                  pr.kind === 'glowing_pearl_node'
                    ? '103, 232, 249'
                    : pr.kind === 'starlight_coral_node'
                      ? '253, 224, 71'
                      : pr.kind === 'seafoam_essence_node'
                        ? '94, 234, 212'
                        : '251, 146, 60';
                postNightGlowDraws.push(() => {
                  const rad = 11 * PIXEL_SCALE;
                  const g = ctx.createRadialGradient(nodeCx, nodeCy, 1, nodeCx, nodeCy, rad);
                  g.addColorStop(0, `rgba(${nodeGlowRgb}, ${(0.28 + 0.16 * nightAmount).toFixed(3)})`);
                  g.addColorStop(1, `rgba(${nodeGlowRgb}, 0)`);
                  ctx.fillStyle = g;
                  ctx.beginPath();
                  ctx.arc(nodeCx, nodeCy, rad, 0, Math.PI * 2);
                  ctx.fill();
                });
              }

              // Warm layered radial golden glow halos on boutique back walls, side pillars & lantern posts
              if (pr.kind === 'boutique_backwall') {
                const bwTier = clampShopTier(pr.shopTier);
                const bwWallW = getShopTierSpec(bwTier).cols * TILE_SIZE;
                const haloYOffset = bwTier >= 3 ? 11 : 10;
                const lanternXs =
                  bwTier === 3
                    ? [1, Math.round(bwWallW * 0.34), Math.round(bwWallW * 0.66) - 4, bwWallW - 5]
                    : bwTier === 4
                      ? [
                          1,
                          Math.round(bwWallW * 0.25),
                          Math.round(bwWallW * 0.5) - 2,
                          Math.round(bwWallW * 0.75) - 4,
                          bwWallW - 5,
                        ]
                      : [1, bwWallW - 5];
                postNightGlowDraws.push(() => {
                  for (const lx of lanternXs) {
                    drawWarmLanternGlow(
                      sx + (lx + 2) * PIXEL_SCALE,
                      sy + haloYOffset * PIXEL_SCALE,
                      (bwTier >= 3 ? 15 : 13) * PIXEL_SCALE
                    );
                  }
                });
              } else if (pr.kind === 'boutique_pillar_l' || pr.kind === 'boutique_pillar_r') {
                const lxOffset = pr.kind === 'boutique_pillar_l' ? 6 : 9;
                postNightGlowDraws.push(() => {
                  drawWarmLanternGlow(sx + lxOffset * PIXEL_SCALE, sy + 12.5 * PIXEL_SCALE, 11 * PIXEL_SCALE);
                });
              } else if (pr.kind === 'lantern_post') {
                postNightGlowDraws.push(() => {
                  drawWarmLanternGlow(sx + (spr.width / 2) * PIXEL_SCALE, sy + 6 * PIXEL_SCALE, 17 * PIXEL_SCALE);
                });
              } else if (pr.kind === 'newsstand_kiosk') {
                postNightGlowDraws.push(() => {
                  drawWarmLanternGlow(sx + 43 * PIXEL_SCALE, sy + 15 * PIXEL_SCALE, 15 * PIXEL_SCALE);
                });
              }

              // Mannequin animated pixel effects + Weather/Night Reactive Secondary States
              if (pr.kind === 'mannequin' && pr.listing?.item) {
                const mItem = pr.listing.item;
                if (mItem.effect === 'glowing_pearls') {
                  postNightGlowDraws.push(() => {
                    drawGlowingPearlsMannequinOverlay(
                      ctx,
                      mItem,
                      sx,
                      sy,
                      PIXEL_SCALE,
                      globalTime,
                      nightAmount
                    );
                  });
                } else if (mItem.effect === 'starlight_coral' || mItem.effect === 'seafoam_essence') {
                  const mEff = mItem.effect;
                  postNightGlowDraws.push(() => {
                    drawOutfitAmbientEffects(
                      ctx,
                      [mEff],
                      sx + (spr.width / 2) * PIXEL_SCALE,
                      sy + (spr.height / 2) * PIXEL_SCALE,
                      PIXEL_SCALE,
                      globalTime,
                      'mannequin'
                    );
                  });
                }
                if (mItem.reactive?.nightNeon && nightAmount > 0.05) {
                  postNightGlowDraws.push(() => {
                    drawNightNeonMannequinOverlay(
                      ctx,
                      mItem,
                      sx,
                      sy,
                      PIXEL_SCALE,
                      globalTime,
                      nightAmount
                    );
                  });
                }
                if (mItem.reactive?.rainMode && rainAmount > 0.15) {
                  drawRainReactiveMannequinOverlay(
                    ctx,
                    mItem,
                    sx,
                    sy,
                    PIXEL_SCALE,
                    rainAmount
                  );
                }
              }

              // Crisp Price Tag underneath Listed Mannequins (+ 2x Trend Highlight!)
              if (pr.kind === 'mannequin' && pr.listing) {
                const centerScreenX = (pr.x - camX) * PIXEL_SCALE;
                const tagBottomY = sy + spr.height * PIXEL_SCALE + 13;
                const priceVal = pr.listing.price;
                const isRivalOwner = pr.ownerId ? pr.ownerId !== playerId : pr.owner === 'Sara' || pr.owner === 'Lina';
                const trendMatch = doesItemMatchTrend(pr.listing.item, activeTrendFrame);
                postNightLabelDraws.push(() => {
                  drawPriceTag(ctx, priceVal, centerScreenX, tagBottomY, isRivalOwner);
                  if (trendMatch) {
                    ctx.font = 'bold 9px "Silkscreen", monospace';
                    ctx.fillStyle = '#fef08a';
                    ctx.textAlign = 'center';
                    ctx.fillText('2x★', centerScreenX, tagBottomY - 19);
                  }
                });
              }

              if (pr.respawnTimer > 0 && pr.solid) {
                const ratio = 1 - pr.respawnTimer / RESOURCE_RESPAWN_SEC;
                const barW = 10 * PIXEL_SCALE;
                const barX = Math.round(pr.x - camX) * PIXEL_SCALE - barW / 2;
                const barY = Math.round(pr.y - camY) * PIXEL_SCALE + 4;
                ctx.fillStyle = 'rgba(42, 24, 12, 0.65)';
                ctx.fillRect(barX, barY, barW, 4);
                ctx.fillStyle = '#9be36d';
                ctx.fillRect(barX, barY, Math.round(barW * ratio), 4);
              }
            } else if (item.type === 'pet') {
              const petMeta = PET_CATALOG.find((pt) => pt.kind === item.kind);
              const animStyle = petMeta?.animationStyle || 'trot';
              const bobPx =
                animStyle === 'hop'
                  ? Math.abs(Math.sin(item.anim * 1.1)) * -2.2
                  : animStyle === 'flutter'
                    ? Math.sin(item.anim * 1.4) * 1.6 - 1.4
                    : animStyle === 'waddle'
                      ? Math.abs(Math.sin(item.anim * 1.2)) * -0.9
                      : Math.abs(Math.sin(item.anim * 1.3)) * -0.7;
              const petSpr = renderPetSprite(item.kind, item.dir, Math.floor(item.anim) % 2);
              const px = Math.round(item.x - petSpr.width / 2 - camX) * PIXEL_SCALE;
              const py = Math.round(item.y - petSpr.height + bobPx - camY) * PIXEL_SCALE;
              drawSoftEllipticalShadow(
                (item.x - camX) * PIXEL_SCALE,
                (item.y - camY) * PIXEL_SCALE - PIXEL_SCALE,
                5.2 * PIXEL_SCALE,
                2 * PIXEL_SCALE,
                0.24
              );
              ctx.drawImage(petSpr, px, py, petSpr.width * PIXEL_SCALE, petSpr.height * PIXEL_SCALE);
              if (item.heartUntil && item.heartUntil > nowWall) {
                const bobHeart = Math.sin(globalTime * 7) * 2;
                const heartX = (item.x - camX) * PIXEL_SCALE;
                postNightLabelDraws.push(() => {
                  drawFloatingEmoji(ctx, '❤️', heartX, py + 2, bobHeart);
                });
              }
            } else {
              const ch = item.char;
              const walkCycle = [0, 1, 2, 3];
              const frame = ch.isBoating ? 0 : ch.isMoving ? walkCycle[Math.floor(ch.animTime) % 4] : 0;
              const chPieces = [
                ch.appearance.hat,
                ch.appearance.top,
                ch.appearance.bottom,
                ch.appearance.dress,
                ch.appearance.shoes,
              ];
              const chEffects = getItemsActiveEffects(chPieces);
              const spr = renderCharacterSprite(
                ch.appearance,
                ch.dir,
                frame,
                chEffects.includes('sunset_amber') ? sunsetPhase : 0
              );

              const drawX = Math.round(ch.x - 8 - camX) * PIXEL_SCALE;
              const drawY = Math.round(ch.y - (ch.isBoating ? 24 : 22) - camY) * PIXEL_SCALE;

              if (ch.isShowcasing) {
                ctx.fillStyle = 'rgba(253, 224, 71, 0.34)';
                ctx.fillRect(drawX - 4 * PIXEL_SCALE, drawY + 18 * PIXEL_SCALE, 24 * PIXEL_SCALE, 7 * PIXEL_SCALE);
              }

              if (ch.isBoating) {
                const boatSpr = renderWatercraftSprite(
                  ch.equippedBoat || 'rowboat',
                  ch.dir,
                  ch.isMoving ? Math.floor(globalTime * 5) : 0
                );
                const bx = Math.round(ch.x - boatSpr.width / 2 - camX) * PIXEL_SCALE;
                const by = Math.round(ch.y - boatSpr.height / 2 - camY) * PIXEL_SCALE;
                if (item.boatPet) {
                  const bPet = item.boatPet;
                  const petSpr = renderPetSprite(bPet.kind, bPet.dir, Math.floor(bPet.anim) % 2);
                  const seatOffX = bPet.dir === 'right' ? -6 : bPet.dir === 'left' ? 6 : -5;
                  const seatOffY = bPet.dir === 'down' ? -4 : bPet.dir === 'up' ? 3 : 0;
                  const bpx = Math.round(ch.x + seatOffX - petSpr.width / 2 - camX) * PIXEL_SCALE;
                  const bpy = Math.round(ch.y + seatOffY - petSpr.height + 3 - camY) * PIXEL_SCALE;
                  ctx.drawImage(petSpr, bpx, bpy, petSpr.width * PIXEL_SCALE, petSpr.height * PIXEL_SCALE);
                  if (bPet.heartUntil && bPet.heartUntil > nowWall) {
                    const bobHeart = Math.sin(globalTime * 7) * 2;
                    const heartX = (ch.x + seatOffX - camX) * PIXEL_SCALE;
                    postNightLabelDraws.push(() => {
                      drawFloatingEmoji(ctx, '❤️', heartX, bpy + 2, bobHeart);
                    });
                  }
                }
                ctx.drawImage(spr, drawX, drawY, 16 * PIXEL_SCALE, 24 * PIXEL_SCALE);
                ctx.drawImage(boatSpr, bx, by + 2 * PIXEL_SCALE, boatSpr.width * PIXEL_SCALE, boatSpr.height * PIXEL_SCALE);
              } else {
                drawSoftEllipticalShadow(
                  (ch.x - camX) * PIXEL_SCALE,
                  drawY + 22 * PIXEL_SCALE,
                  5.8 * PIXEL_SCALE,
                  2.2 * PIXEL_SCALE,
                  0.26
                );
                ctx.drawImage(spr, drawX, drawY, 16 * PIXEL_SCALE, 24 * PIXEL_SCALE);
              }

              if (chEffects.includes('glowing_pearls')) {
                const chDir = ch.dir;
                postNightGlowDraws.push(() => {
                  drawGlowingPearlsSpriteOverlay(
                    ctx,
                    chPieces,
                    chDir,
                    frame,
                    drawX,
                    drawY,
                    PIXEL_SCALE,
                    globalTime,
                    nightAmount
                  );
                });
              }
              // Secondary State: Night Mode Bioluminescent Neon Overlay (local + remote players)
              if (hasNightNeonItems(chPieces) && nightAmount > 0.05) {
                const chDir = ch.dir;
                postNightGlowDraws.push(() => {
                  drawNightNeonSpriteOverlay(
                    ctx,
                    chPieces,
                    chDir,
                    frame,
                    drawX,
                    drawY,
                    PIXEL_SCALE,
                    globalTime,
                    nightAmount
                  );
                });
              }
              // Secondary State: Rain Mode Matching Pixel Umbrella or Rain Hood (local + remote players)
              if (rainAmount > 0.15 && getActiveRainConfig(chPieces)) {
                drawRainReactiveOverlay(
                  ctx,
                  chPieces,
                  ch.dir,
                  frame,
                  drawX,
                  drawY,
                  PIXEL_SCALE,
                  rainAmount
                );
              }
              const ambientCharEffs = chEffects.filter(
                (ef) => ef === 'seafoam_essence' || (ef === 'starlight_coral' && !ch.isMoving)
              );
              if (ambientCharEffs.length > 0) {
                const charCx = (ch.x - camX) * PIXEL_SCALE;
                const charCy = drawY + 13 * PIXEL_SCALE;
                postNightGlowDraws.push(() => {
                  drawOutfitAmbientEffects(
                    ctx,
                    ambientCharEffs,
                    charCx,
                    charCy,
                    PIXEL_SCALE,
                    globalTime,
                    'player'
                  );
                });
              }

              if (ch.swingTimer && ch.swingTimer > 0) {
                const prog = 1 - ch.swingTimer / 0.25;
                const sdir = ch.swingDir || ch.dir;
                const ox = sdir === 'right' ? 12 : sdir === 'left' ? -12 : 0;
                const oy = sdir === 'down' ? 10 : sdir === 'up' ? -14 : -4;
                const arcX = Math.round(ch.x + ox - camX) * PIXEL_SCALE;
                const arcY = Math.round(ch.y + oy - camY) * PIXEL_SCALE;
                ctx.strokeStyle = '#fff9d6';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(arcX, arcY, 16, prog * Math.PI - 0.8, prog * Math.PI + 0.9);
                ctx.stroke();
              }

              const centerScreenX = (ch.x - camX) * PIXEL_SCALE;
              const topScreenY = drawY - 4;
              const charName = ch.name;
              const isCharPlayer = ch.isPlayer;
              const charChatText = ch.chatText;
              const charEmoteEmoji = ch.emoteEmoji;
              const charEmote = ch.emote;
              const charEmoteTimer = ch.emoteTimer;
              postNightLabelDraws.push(() => {
                drawNameTag(ctx, charName, centerScreenX, topScreenY, isCharPlayer);
                let bubbleAnchorY = topScreenY - 22;
                if (charChatText) {
                  drawSpeechBubble(ctx, charChatText, centerScreenX, bubbleAnchorY);
                  bubbleAnchorY -= 38;
                }
                if (charEmoteEmoji) {
                  const bob = Math.sin(globalTime * 6) * 2.5;
                  drawFloatingEmoji(ctx, charEmoteEmoji, centerScreenX, bubbleAnchorY, bob);
                } else if (charEmote && charEmoteTimer && charEmoteTimer > 0) {
                  drawEmote(ctx, charEmote, centerScreenX, topScreenY - 18);
                }
              });
            }
          }

          if (rainAmount > 0.03) {
            ctx.fillStyle = `rgba(38, 66, 98, ${(rainAmount * 0.22).toFixed(3)})`;
            ctx.fillRect(0, 0, viewCssW, viewCssH);
          }

          if (nightAmount > 0.02) {
            ctx.fillStyle = `rgba(10, 20, 52, ${(nightAmount * 0.44).toFixed(3)})`;
            ctx.fillRect(0, 0, viewCssW, viewCssH);
          }

          for (const drawGlow of postNightGlowDraws) {
            drawGlow();
          }

          // Cozy Diagonal Tropical Pixel Rain Streaks & Splash Ripples
          if (rainAmount > 0.05) {
            const dropCount = Math.round(68 * rainAmount);
            ctx.save();
            ctx.strokeStyle = `rgba(210, 236, 255, ${(0.42 * rainAmount).toFixed(3)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < dropCount; i++) {
              const seed = i * 97.3;
              const rx = ((seed * 13.7 - globalTime * 115) % (viewCssW + 80) + (viewCssW + 80)) % (viewCssW + 80) - 40;
              const ry = ((seed * 19.1 + globalTime * 420) % (viewCssH + 60)) - 30;
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx - 4, ry + 13);
            }
            ctx.stroke();

            // Subtle puddle splash rings
            ctx.fillStyle = `rgba(224, 242, 254, ${(0.34 * rainAmount).toFixed(3)})`;
            const splashCount = Math.round(14 * rainAmount);
            for (let i = 0; i < splashCount; i++) {
              const phase = (globalTime * 2.4 + i * 0.37) % 1;
              if (phase > 0.45) continue;
              const sxp = (((i * 193 + Math.floor(globalTime * 1.3 + i) * 71) % viewCssW) + viewCssW) % viewCssW;
              const syp = (((i * 149 + Math.floor(globalTime * 1.1 + i) * 53) % viewCssH) + viewCssH) % viewCssH;
              const rPx = 2 + Math.floor(phase * 10);
              ctx.fillRect(sxp - rPx, syp, rPx * 2, 1.5);
            }
            ctx.restore();
          }

          for (const drawLbl of postNightLabelDraws) {
            drawLbl();
          }

          for (const pt of particlesRef.current) {
            const px = Math.round(pt.x - camX) * PIXEL_SCALE;
            const py = Math.round(pt.y - camY) * PIXEL_SCALE;
            const alpha = Math.max(0.15, Math.min(1, pt.life / pt.maxLife));
            ctx.save();
            ctx.globalAlpha = alpha;
            if (pt.shape === 'star') {
              const s = Math.max(2, pt.size * PIXEL_SCALE);
              ctx.fillStyle = pt.color;
              ctx.fillRect(px - s, py, s * 3, s);
              ctx.fillRect(px, py - s, s, s * 3);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(px, py, s, s);
            } else if (pt.shape === 'bubble') {
              const s = Math.max(3, pt.size * PIXEL_SCALE);
              ctx.fillStyle = pt.color;
              ctx.fillRect(px, py, s, s);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(px, py, Math.max(1, Math.floor(s * 0.45)), Math.max(1, Math.floor(s * 0.45)));
            } else {
              ctx.fillStyle = pt.color;
              ctx.fillRect(px, py, pt.size * PIXEL_SCALE, pt.size * PIXEL_SCALE);
            }
            ctx.restore();
          }

          ctx.font = 'bold 12px "Silkscreen", monospace';
          ctx.textAlign = 'center';
          for (const ft of floatingTextsRef.current) {
            const fx = Math.round((ft.x - camX) * PIXEL_SCALE);
            const fy = Math.round((ft.y - camY) * PIXEL_SCALE);
            ctx.fillStyle = '#381c0a';
            ctx.fillText(ft.text, fx + 1, fy + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, fx, fy);
          }
        }

        // 6. Minimap (cached terrain buffer for fast 160x120 rendering)
        const mini = minimapCanvasRef.current;
        if (mini) {
          const mctx = mini.getContext('2d');
          if (mctx) {
            mctx.imageSmoothingEnabled = false;
            if (!miniBaseCanvasRef.current) {
              const off = document.createElement('canvas');
              off.width = MAP_COLS;
              off.height = MAP_ROWS;
              miniBaseCanvasRef.current = off;
              miniBaseDirtyRef.current = true;
            }
            const miniBase = miniBaseCanvasRef.current;
            if (miniBaseDirtyRef.current) {
              const bctx = miniBase.getContext('2d');
              if (bctx) {
                const tiles = worldRef.current.tiles;
                for (let r = 0; r < MAP_ROWS; r++) {
                  for (let c = 0; c < MAP_COLS; c++) {
                    const t = tiles[r][c];
                    bctx.fillStyle =
                      t === TileType.GRASS || t === TileType.GRASS_FLOWER
                        ? '#52a344'
                        : t === TileType.DIRT_PATH
                          ? '#cfa86e'
                          : t === TileType.SAND
                            ? '#ebd08a'
                            : t === TileType.SHALLOW_WATER
                              ? '#48b1cc'
                              : t === TileType.DOCK
                                ? '#a86732'
                                : t === TileType.BOUTIQUE_FLOOR
                                  ? '#dfb074'
                                  : t === TileType.REEF_WATER
                                    ? '#185c80'
                                    : t === TileType.REEF_CORAL
                                      ? '#6ad4c8'
                                      : '#2473a8';
                    bctx.fillRect(c, r, 1, 1);
                  }
                }
              }
              miniBaseDirtyRef.current = false;
            }

            mctx.drawImage(miniBase, 0, 0);

            for (const pr of worldRef.current.props) {
              if (pr.kind === 'palm' && pr.respawnTimer <= 0) {
                mctx.fillStyle = '#265424';
                mctx.fillRect(pr.col, pr.row, 1, 1);
              } else if (pr.kind === 'boutique_backwall') {
                const spec = getShopTierSpec(pr.shopTier);
                mctx.fillStyle = clampShopTier(pr.shopTier) === 4 ? '#f5cb52' : '#e36464';
                mctx.fillRect(pr.col, pr.row, spec.cols, Math.max(2, Math.floor(spec.rows / 2)));
              } else if (pr.kind === 'shop_wall' || pr.kind === 'shop_wall_t2') {
                mctx.fillStyle = '#e36464';
                mctx.fillRect(pr.col, pr.row, 1, 1);
              } else if (pr.kind === 'mannequin' && pr.listing) {
                mctx.fillStyle = '#ffe566';
                mctx.fillRect(pr.col, pr.row, 1, 1);
              } else if (
                (pr.kind === 'glowing_pearl_node' ||
                  pr.kind === 'starlight_coral_node' ||
                  pr.kind === 'seafoam_essence_node' ||
                  pr.kind === 'sunset_amber_node') &&
                pr.respawnTimer <= 0
              ) {
                mctx.fillStyle =
                  pr.kind === 'glowing_pearl_node'
                    ? '#67e8f9'
                    : pr.kind === 'starlight_coral_node'
                      ? '#fde047'
                      : pr.kind === 'seafoam_essence_node'
                        ? '#5eead4'
                        : '#fb923c';
                mctx.fillRect(pr.col, pr.row, 2, 2);
              }
            }

            for (const npc of npcsRef.current) {
              const nx = Math.round(npc.x / TILE_SIZE);
              const ny = Math.round(npc.y / TILE_SIZE);
              mctx.fillStyle = '#45230d';
              mctx.fillRect(nx - 1, ny - 1, 3, 3);
              mctx.fillStyle = '#ff9eb5';
              mctx.fillRect(nx, ny, 2, 2);
            }

            for (const rp of remotePlayersRef.current.values()) {
              const rx = Math.round(rp.x / TILE_SIZE);
              const ry = Math.round(rp.y / TILE_SIZE);
              mctx.fillStyle = '#45230d';
              mctx.fillRect(rx - 1, ry - 1, 3, 3);
              mctx.fillStyle = '#4ade80';
              mctx.fillRect(rx, ry, 2, 2);
            }

            const px = Math.round(p.x / TILE_SIZE);
            const py = Math.round(p.y / TILE_SIZE);
            mctx.fillStyle = '#45230d';
            mctx.fillRect(px - 2, py - 2, 5, 5);
            mctx.fillStyle = '#ffe548';
            mctx.fillRect(px - 1, py - 1, 3, 3);

            mctx.strokeStyle = 'rgba(255, 248, 224, 0.55)';
            mctx.lineWidth = 1;
            mctx.strokeRect(
              camX / TILE_SIZE,
              camY / TILE_SIZE,
              viewLogicalW / TILE_SIZE,
              viewLogicalH / TILE_SIZE
            );
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    getShopStructId,
    isPositionWalkable,
    playerId,
    spawnFloatingText,
    spawnParticles,
    validatePlacement,
    validateShopRelocation,
  ]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseHoverRef.current = {
      active: true,
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modalOpenRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / PIXEL_SCALE + Math.round(cameraRef.current.x);
    const clickY = (e.clientY - rect.top) / PIXEL_SCALE + Math.round(cameraRef.current.y);

    // Clicking a companion pet displays a floating heart + sparkle & chime!
    if (equippedPetRef.current) {
      const lp = playerRef.current;
      const petHitX = isBoatingRef.current
        ? lp.x + (lp.dir === 'right' ? -6 : lp.dir === 'left' ? 6 : -5)
        : localPetRef.current.x;
      const petHitY = isBoatingRef.current ? lp.y - 2 : localPetRef.current.y - 5;
      if (Math.hypot(clickX - petHitX, clickY - petHitY) <= 13) {
        localPetHeartUntilRef.current = Date.now() + 2400;
        sfx.playChime();
        spawnParticles(petHitX, petHitY - 4, '#ff6b9d', 10);
        return;
      }
    }

    for (const rp of remotePlayersRef.current.values()) {
      if (!rp.equippedPet) continue;
      const rPetX = rp.isBoating
        ? rp.x + (rp.dir === 'right' ? -6 : rp.dir === 'left' ? 6 : -5)
        : rp.petX;
      const rPetY = rp.isBoating ? rp.y - 2 : rp.petY - 5;
      if (Math.hypot(clickX - rPetX, clickY - rPetY) <= 13) {
        rp.petHeartUntil = Date.now() + 2400;
        sfx.playChime();
        spawnParticles(rPetX, rPetY - 4, '#ff6b9d', 10);
        return;
      }
    }

    const col = Math.floor(clickX / TILE_SIZE);
    const row = Math.floor(clickY / TILE_SIZE);
    triggerActionAt(col, row);
  };

  const randomizeLook = () => {
    sfx.playClick();
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    setAppearance((prev) => ({
      ...prev,
      skinId: pick(SKIN_TONES).id,
      hairStyle: pick(HAIR_STYLES).id,
      hairColorId: pick(HAIR_COLORS).id,
    }));
  };

  const turnPreview = (delta: number) => {
    sfx.playClick();
    const dirs: Direction[] = ['down', 'left', 'up', 'right'];
    const idx = dirs.indexOf(previewDir);
    setPreviewDir(dirs[(idx + delta + 4) % 4]);
  };

  const toggleMute = () => {
    const next = !muted;
    sfx.muted = next;
    setMuted(next);
    if (!next) sfx.playClick();
  };

  // Current Stall / Boutique Prop objects for modals
  const activeStallProp = activeStallPropId
    ? worldRef.current.props.find((pr) => pr.id === activeStallPropId) || null
    : null;
  const buyPreviewProp = buyPreviewPropId
    ? worldRef.current.props.find((pr) => pr.id === buyPreviewPropId) || null
    : null;

  const stallSelectedItem = useMemo<ClothingItem | null>(() => {
    if (!stallSelectedUid) return null;
    if (activeStallProp?.listing?.item && activeStallProp.listing.item.uid === stallSelectedUid) {
      return activeStallProp.listing.item;
    }
    return ownedItems.find((i) => i.uid === stallSelectedUid) || null;
  }, [stallSelectedUid, activeStallProp, ownedItems]);

  const stallMarketGuide = useMemo(() => {
    if (!stallSelectedItem) return 200;
    if (stallSelectedItem.source === 'luxury') return 2600;
    if (stallSelectedItem.source === 'boutique') return 400;
    return (
      220 +
      stallSelectedItem.stats.speedPct * 6 +
      stallSelectedItem.stats.harvestBonus * 80 +
      stallSelectedItem.stats.seaRes * 90
    );
  }, [stallSelectedItem]);

  const trendInfo = getCurrentFashionTrend(trendTick);
  const activeTrend = trendInfo.trend;
  const isAuctionLive = Boolean(activeAuction && !activeAuction.settled && activeAuction.endsAtMs > trendTick);
  const auctionSecondsLeft = activeAuction
    ? Math.max(0, Math.ceil((activeAuction.endsAtMs - trendTick) / 1000))
    : 0;

  const updateJoystickFromClient = useCallback((clientX: number, clientY: number) => {
    const base = joystickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = 34;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const tx = Math.cos(angle) * clampedDist;
    const ty = Math.sin(angle) * clampedDist;
    const normMag = clampedDist / maxR;

    if (normMag < 0.12) {
      joystickVecRef.current = { x: 0, y: 0 };
    } else {
      joystickVecRef.current = {
        x: Math.cos(angle) * normMag,
        y: Math.sin(angle) * normMag,
      };
    }
    setJoystickThumb({ x: tx, y: ty, active: true });
  }, []);

  const releaseJoystick = useCallback(() => {
    joystickPointerIdRef.current = null;
    joystickVecRef.current = { x: 0, y: 0 };
    setJoystickThumb({ x: 0, y: 0, active: false });
  }, []);

  const getCurrentZoneName = useCallback((): string => {
    const p = playerRef.current;
    if (p.x >= REEF_BOUNDARY_X) return 'Deep-Sea Coral Reef';
    if (Math.hypot(p.x - RUNWAY_PODIUM_X, p.y - RUNWAY_PODIUM_Y) <= TILE_SIZE * 7) return 'Runway & Auction Stage';
    if (Math.hypot(p.x - NEWSSTAND_CENTER_X, p.y - NEWSSTAND_CENTER_Y) <= TILE_SIZE * 6) return 'Island Newsstand Plaza';
    if (Math.hypot(p.x - (BOAT_DOCK_COL + 2) * TILE_SIZE, p.y - BOAT_DOCK_ROW * TILE_SIZE) <= TILE_SIZE * 6) return 'Coral Boat Dock';
    if (Math.hypot(p.x - (LINA_BOUTIQUE_COL + 2) * TILE_SIZE, p.y - LINA_BOUTIQUE_ROW * TILE_SIZE) <= TILE_SIZE * 7) return "Lina's Mariner Boutique";
    if (Math.hypot(p.x - (SARA_BOUTIQUE_COL + 2) * TILE_SIZE, p.y - SARA_BOUTIQUE_ROW * TILE_SIZE) <= TILE_SIZE * 7) return "Sara's Sunlit Boutique";
    if (isBoatingRef.current) return 'Coral Cove Open Sea';
    return 'Coral Cove Island';
  }, []);

  const persistSnapshots = useCallback((next: LookbookSnapshot[]) => {
    setSnapshots(next);
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const handleCaptureSnapshot = useCallback(() => {
    const srcCanvas = mainCanvasRef.current;
    if (!srcCanvas) return;
    const outW = 280;
    const outH = 196;
    const off = document.createElement('canvas');
    off.width = outW;
    off.height = outH;
    const octx = off.getContext('2d');
    if (!octx) return;

    // Crop centered 10:7 viewfinder region around the player & nearby friends
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const targetAspect = outW / outH;
    const srcAspect = srcW / Math.max(1, srcH);
    let cropW = srcW * 0.72;
    let cropH = cropW / targetAspect;
    if (cropH > srcH * 0.8) {
      cropH = srcH * 0.8;
      cropW = cropH * targetAspect;
    }
    if (srcAspect < 1) {
      cropW = srcW * 0.88;
      cropH = Math.min(srcH * 0.82, cropW / targetAspect);
    }
    const sx = Math.max(0, (srcW - cropW) / 2);
    const sy = Math.max(0, (srcH - cropH) / 2);
    octx.imageSmoothingEnabled = false;
    octx.drawImage(srcCanvas, sx, sy, cropW, cropH, 0, 0, outW, outH);

    const dataUrl = off.toDataURL('image/jpeg', 0.74);
    const p = playerRef.current;
    let friendsCount = 0;
    for (const rp of remotePlayersRef.current.values()) {
      if (Math.hypot(rp.x - p.x, rp.y - p.y) <= TILE_SIZE * 10) friendsCount++;
    }
    const snap: LookbookSnapshot = {
      id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      dataUrl,
      takenAt: Date.now(),
      location: getCurrentZoneName(),
      friendsCount,
    };

    sfx.playChime();
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 220);
    persistSnapshots([snap, ...snapshots].slice(0, 18));
    spawnFloatingText(p.x, p.y - 24, '📸 Snapshot Saved!', '#fef08a');
  }, [getCurrentZoneName, persistSnapshots, snapshots, spawnFloatingText]);

  const handleDeleteSnapshot = useCallback(
    (snapId: string) => {
      persistSnapshots(snapshots.filter((s) => s.id !== snapId));
    },
    [persistSnapshots, snapshots]
  );

  const handlePublishMagazine = useCallback(
    async (payload: {
      title: string;
      subtitle: string;
      theme: MagazineTheme;
      price: number;
      pages: MagazinePage[];
    }) => {
      const res = await publishMagazine({
        ...payload,
        authorId: playerId,
        authorName: playerName.trim() || 'Islander',
      });
      setOwnedMagazineIds((prev) =>
        prev.includes(res.magazine.id) ? prev : [...prev, res.magazine.id]
      );
      sfx.playCoin();
      spawnParticles(playerRef.current.x, playerRef.current.y - 12, '#f43f5e', 14);
      spawnFloatingText(
        playerRef.current.x,
        playerRef.current.y - 26,
        `Published "${res.magazine.title}"!`,
        '#fde047'
      );
      setLookbookOpen(false);
      setNewsstandOpen(true);
    },
    [playerId, playerName, spawnFloatingText, spawnParticles]
  );

  const handleBuyMagazine = useCallback(
    async (mag: CloudMagazine): Promise<boolean> => {
      const res = await purchaseMagazine({
        magazine: mag,
        buyerId: playerId,
        buyerName: playerName.trim() || 'Islander',
      });
      setGold(res.newBuyerGold);
      setOwnedMagazineIds((prev) => (prev.includes(mag.id) ? prev : [...prev, mag.id]));
      sfx.playCoin();
      spawnParticles(playerRef.current.x, playerRef.current.y - 10, '#fde047', 12);
      spawnFloatingText(
        playerRef.current.x,
        playerRef.current.y - 24,
        `Bought "${mag.title}"!`,
        '#fef08a'
      );
      return true;
    },
    [playerId, playerName, spawnFloatingText, spawnParticles]
  );

  const handleLikeMagazine = useCallback((mag: CloudMagazine) => {
    void likeMagazine(mag);
  }, []);

  const anyModalBlockingHud =
    !joinedIsland ||
    wardrobeOpen ||
    craftingOpen ||
    designStudioOpen ||
    shopsModalOpen ||
    runwayModalOpen ||
    boatModalOpen ||
    newsstandOpen ||
    lookbookOpen ||
    manageShopId !== null ||
    activeStallPropId !== null ||
    buyPreviewPropId !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1e6292]">
      <OfflineIndicator />
      <canvas
        ref={mainCanvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => {
          mouseHoverRef.current.active = false;
        }}
        onClick={handleCanvasClick}
        className="pixelated block h-full w-full touch-none cursor-crosshair"
      />

      {/* TOP-LEFT HUD: COMPACT 6-SLOT WOODEN HOTBAR */}
      <div className="pointer-events-auto absolute top-2.5 left-2.5 z-20 flex flex-col items-start gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setHotbarMode('gather');
              setSelectedDecorKind(null);
              setSelectedSlot((s) => Math.min(s, HOTBAR_GATHER.length - 1));
            }}
            className={`cursor-pointer border px-2 py-0.5 text-[10px] font-bold transition-colors ${
              hotbarMode === 'gather'
                ? 'border-[#45230d] bg-[#f6e4bf] text-[#3d1e0b]'
                : 'border-[#45230d] bg-[#7d4720] text-[#f2d6a7] hover:bg-[#965729]'
            }`}
          >
            Bag &amp; Dock
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setHotbarMode('build');
            }}
            className={`cursor-pointer border px-2 py-0.5 text-[10px] font-bold transition-colors ${
              hotbarMode === 'build'
                ? 'border-[#45230d] bg-[#f6e4bf] text-[#3d1e0b]'
                : 'border-[#45230d] bg-[#7d4720] text-[#f2d6a7] hover:bg-[#965729]'
            }`}
          >
            Build &amp; Tools
          </button>
        </div>

        <div className="wood-frame flex items-center gap-1 p-1">
          {(hotbarMode === 'gather' ? HOTBAR_GATHER : HOTBAR_BUILD).map((slot, idx) => {
            const active = !(hotbarMode === 'build' && selectedDecorDef) && selectedSlot === idx;
            const count = slot.stackable ? inventory[slot.kind as keyof InventoryCounts] : undefined;
            return (
              <button
                key={`${hotbarMode}_${slot.kind}`}
                type="button"
                onClick={() => {
                  setSelectedDecorKind(null);
                  setSelectedSlot(idx);
                  sfx.playClick();
                }}
                title={`${slot.name} (${idx + 1})`}
                className={`relative flex h-8 w-8 cursor-pointer items-center justify-center transition-transform sm:h-9 sm:w-9 focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  active ? 'wood-slot-active -translate-y-0.5' : 'wood-slot hover:brightness-105'
                }`}
              >
                <span className="font-pixel absolute top-0.5 left-0.5 text-[8px] leading-none text-[#6b3c1b]">
                  {idx + 1}
                </span>
                <PixelItemIcon kind={slot.kind} size={21} />
                {count !== undefined && (
                  <span className="font-pixel tabular-nums absolute right-0.5 bottom-0.5 text-[9px] font-bold leading-none text-[#3d1e0b] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDecorDef ? (
          <div className="wood-panel flex items-center gap-1.5 border border-[#45230d] px-2 py-0.5 text-[10px] font-bold text-[#3d1e0b]">
            <PixelItemIcon kind={selectedDecorDef.kind} size={14} />
            <span className="tabular-nums">
              Placing: {selectedDecorDef.name} (×{inventory[selectedDecorDef.kind as keyof InventoryCounts]})
            </span>
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setSelectedDecorKind(null);
              }}
              className="cursor-pointer border border-[#7f1d1d] bg-[#fee2e2] px-1.5 py-0.2 text-[9px] font-bold text-[#991b1b] hover:brightness-105"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="wood-panel px-2 py-0.5 text-[10px] font-semibold text-[#3d1e0b]">
            {activeSlotDef.name}
          </div>
        )}
      </div>

      {/* TOP-CENTER HUD: SHOP RELOCATION BAR OR COMPACT DYNAMIC FASHION TREND PILL */}
      {movingShop ? (
        <div className="pointer-events-none fixed inset-x-0 top-2.5 z-30 flex justify-center px-3">
          <div className="wood-panel pointer-events-auto flex flex-wrap items-center gap-2 border-2 border-[#45230d] px-3 py-1.5 text-xs font-bold text-[#3d1e0b] shadow-lg">
            <Package className="h-4 w-4 text-[#9a3412]" />
            <span>
              Moving Tier {movingShop.tier} Boutique ({movingShop.spanCols}×{movingShop.spanRows}) ·{' '}
              <span className="font-semibold text-[#6b3c1b]">
                {movingShop.interiorItems.length} interior items attached
              </span>
            </span>
            <button
              type="button"
              onClick={() => triggerActionAt()}
              className="flex h-7 cursor-pointer items-center gap-1 border-2 border-[#14532d] bg-[#86efac] px-2.5 text-[11px] font-bold text-[#14532d] hover:brightness-105"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Place Here</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setMovingShop(null);
              }}
              className="flex h-7 cursor-pointer items-center gap-1 border-2 border-[#7f1d1d] bg-[#fee2e2] px-2 text-[11px] font-bold text-[#991b1b] hover:brightness-105"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-2.5 z-20 hidden justify-center md:flex">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div
              className="wood-panel flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#3d1e0b]"
              title={`Fashion Trend: ${activeTrend.label} — Matching mannequin sales earn 2x Gold!`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#b45309]" />
              <span>Trend:</span>
              <span
                className="border border-[#45230d]/40 px-1.5 py-0.2 text-[10px] font-bold"
                style={{ backgroundColor: activeTrend.accentBg, color: activeTrend.accentText }}
              >
                {activeTrend.shortLabel} · 2×
              </span>
              <span className="font-pixel tabular-nums text-[10px] text-[#6b3c1b]">
                {trendInfo.formattedTime}
              </span>
            </div>

            {isAuctionLive && activeAuction && (
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setRunwayModalOpen(true);
                }}
                className="flex cursor-pointer items-center gap-1 border-2 border-[#7f1d1d] bg-[#fee2e2] px-2 py-1 text-[10px] font-bold text-[#991b1b] shadow-sm hover:brightness-105"
              >
                <Gavel className="h-3 w-3" />
                <span className="tabular-nums">
                  Auction: {activeAuction.highestBid}G · {auctionSecondsLeft}s
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP-RIGHT HUD: COMPACT TOUCH TOGGLE, SHOPS TELEPORT, ONLINE COUNTER, GOLD & MINIMAP */}
      <div className="pointer-events-auto absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center justify-end gap-1">
          <PWAInstallButton variant="hud" onPlayClick={() => sfx.playClick()} />
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setTimeOfDayMode((m) => (m === 'auto' ? 'night' : m === 'night' ? 'day' : 'auto'));
            }}
            title={`Time of Day: ${timeOfDayMode === 'auto' ? 'Auto Cycle' : timeOfDayMode === 'night' ? 'Night (Glow)' : 'Daylight'}`}
            aria-label="Toggle Day/Night Lighting"
            className={`wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300 ${
              timeOfDayMode === 'night' ? 'ring-2 ring-[#67e8f9]' : ''
            }`}
          >
            {timeOfDayMode === 'night' ? (
              <Moon className="h-3.5 w-3.5 text-[#1e3a8a]" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-[#b45309]" />
            )}
            <span className="hidden sm:inline">
              {timeOfDayMode === 'auto' ? 'Auto' : timeOfDayMode === 'night' ? 'Night' : 'Day'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setWeatherMode((w) => (w === 'auto' ? 'rain' : w === 'rain' ? 'sunny' : 'auto'));
            }}
            title={`Island Weather: ${weatherMode === 'auto' ? 'Auto Showers' : weatherMode === 'rain' ? 'Tropical Rain (triggers Rain Outfits)' : 'Clear Sky'}`}
            aria-label="Toggle Island Weather"
            className={`wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300 ${
              weatherMode === 'rain' ? 'ring-2 ring-[#38bdf8]' : ''
            }`}
          >
            <CloudRain
              className={`h-3.5 w-3.5 ${weatherMode === 'rain' ? 'text-[#0284c7]' : 'text-[#5c361a]'}`}
            />
            <span className="hidden sm:inline">
              {weatherMode === 'auto' ? 'Sky' : weatherMode === 'rain' ? 'Rain' : 'Clear'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setShowTouchControls((v) => !v);
            }}
            title={showTouchControls ? 'Hide On-Screen Joystick' : 'Show On-Screen Joystick'}
            aria-label={showTouchControls ? 'Hide On-Screen Joystick' : 'Show On-Screen Joystick'}
            className={`wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300 ${
              showTouchControls ? 'ring-2 ring-[#fde047]' : 'opacity-85'
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Joy</span>
          </button>
          <button
            type="button"
            onClick={openShopsModal}
            title="Top Traders & Island Shops Teleport"
            className="wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Trophy className="h-3 w-3 text-[#b45309]" />
            <span>Shops</span>
          </button>
          <div className="wood-panel flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#3d1e0b]">
            <span className="h-2 w-2 rounded-full border border-[#14532d] bg-[#22c55e]" />
            <Users className="h-3 w-3 text-[#5c361a]" />
            <span className="tabular-nums">{onlineCount}</span>
          </div>
          <div className="wood-panel flex items-center gap-1.5 px-2 py-0.5">
            <GoldCoinIcon size={16} />
            <span className="font-pixel tabular-nums text-xs font-bold tracking-wide text-[#47250e]">
              {gold} G
            </span>
          </div>
        </div>

        <div className="wood-frame p-1">
          <canvas
            ref={minimapCanvasRef}
            width={MAP_COLS}
            height={MAP_ROWS}
            className="pixelated block h-[81px] w-[108px] border border-[#45230d]"
          />
          <div className="mt-0.5 flex items-center justify-between px-0.5 text-[9px] font-medium text-[#fae4bd]">
            <span>Coral Cove</span>
            <span className="opacity-85">Reef →</span>
          </div>
        </div>
      </div>

      {/* MOBILE / IPAD VIRTUAL 360° ANALOG JOYSTICK & CIRCULAR ACTION BUTTON */}
      {showTouchControls && !anyModalBlockingHud && (
        <>
          <div
            ref={joystickBaseRef}
            role="application"
            aria-label="Virtual Analog Joystick"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (joystickPointerIdRef.current !== null) return;
              joystickPointerIdRef.current = e.pointerId;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              updateJoystickFromClient(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (joystickPointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              e.stopPropagation();
              updateJoystickFromClient(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (joystickPointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              e.stopPropagation();
              releaseJoystick();
            }}
            onPointerCancel={(e) => {
              if (joystickPointerIdRef.current !== e.pointerId) return;
              releaseJoystick();
            }}
            className={`fixed bottom-13 left-3.5 z-20 flex h-[108px] w-[108px] touch-none select-none items-center justify-center rounded-full border-2 border-[#fff3d6]/85 bg-[#291508]/55 shadow-[0_4px_14px_rgba(0,0,0,0.3)] backdrop-blur-[2px] transition-opacity duration-150 ${
              joystickThumb.active ? 'opacity-90' : 'opacity-45'
            }`}
          >
            <div className="pointer-events-none h-14 w-14 rounded-full border border-[#fff3d6]/30" />
            <div
              className="pointer-events-none absolute h-11 w-11 rounded-full border-2 border-[#45230d] bg-[#f6e4bf] shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{
                transform: `translate3d(${joystickThumb.x}px, ${joystickThumb.y}px, 0)`,
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Interact or Use Action"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActionBtnPressed(true);
              triggerActionAt();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActionBtnPressed(false);
            }}
            onPointerCancel={() => setActionBtnPressed(false)}
            onPointerLeave={() => setActionBtnPressed(false)}
            className={`fixed bottom-13 right-3.5 z-20 flex h-14 w-14 touch-none select-none flex-col items-center justify-center gap-0.5 rounded-full border-2 border-[#fff3d6]/90 bg-[#b86f34] text-[#fff8e7] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-[opacity,transform] duration-100 ${
              actionBtnPressed ? 'scale-95 opacity-95' : 'opacity-45 hover:opacity-80'
            }`}
          >
            <Hand className="h-5 w-5" />
            <span className="font-pixel text-[8px] font-bold leading-none">ACT</span>
          </button>
        </>
      )}

      {/* BOTTOM HUD BAR: COMPACT CHAT/EMOTES (LEFT) + ACTION BUTTONS (RIGHT) */}
      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-2">
        {/* Bottom-Left Collapsible Chat & 4 Quick Emotes */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
          {nearOwnShopId && !movingShop && (
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setManageShopId(nearOwnShopId);
              }}
              className="wood-panel flex cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#3d1e0b] hover:brightness-105"
            >
              <Store className="h-3.5 w-3.5 text-[#9a3412]" />
              <span>Manage Boutique (Expand / Move)</span>
            </button>
          )}

          {nearLandmarkPrompt && (
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                if (nearLandmarkPrompt === 'runway') setRunwayModalOpen(true);
                else if (nearLandmarkPrompt === 'newsstand') setNewsstandOpen(true);
                else setBoatModalOpen(true);
              }}
              className="wood-panel flex cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#3d1e0b] hover:brightness-105"
            >
              {nearLandmarkPrompt === 'runway' ? (
                <>
                  <Gavel className="h-3.5 w-3.5 text-[#b91c1c]" />
                  <span>Press E: Runway &amp; Live Auction</span>
                </>
              ) : nearLandmarkPrompt === 'newsstand' ? (
                <>
                  <Newspaper className="h-3.5 w-3.5 text-[#be123c]" />
                  <span>Press E: Island Newsstand (Magazines)</span>
                </>
              ) : (
                <>
                  <Anchor className="h-3.5 w-3.5 text-[#0369a1]" />
                  <span>Press E: Boat Dock</span>
                </>
              )}
            </button>
          )}

          {chatBarOpen && (
            <form
              onSubmit={handleSendChat}
              className="wood-panel flex items-center gap-1 p-1 shadow-md"
            >
              <input
                ref={chatInputRef}
                dir="auto"
                type="text"
                maxLength={48}
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Say hi... (Enter)"
                className="w-40 border border-[#6b3c1b] bg-[#fff7e6] px-2 py-1 text-xs font-semibold text-[#3d1e0b] focus:outline-none sm:w-52"
              />
              <button
                type="submit"
                className="wood-btn h-7 cursor-pointer px-2.5 text-[11px] font-bold"
              >
                Send
              </button>
            </form>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setChatBarOpen((o) => {
                  const next = !o;
                  if (next) setTimeout(() => chatInputRef.current?.focus(), 20);
                  return next;
                });
              }}
              title="Toggle Chat (Enter)"
              className={`wood-btn flex h-8 cursor-pointer items-center gap-1 px-2 text-[11px] font-bold ${
                chatBarOpen ? 'ring-2 ring-[#fde047]' : ''
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <div className="wood-frame flex items-center gap-0.5 p-0.5">
              {QUICK_EMOTES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendEmote(emoji)}
                  title={`Emote ${emoji}`}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm bg-[#f5e1bc] text-sm transition-transform hover:scale-105 hover:bg-[#fff3d6]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-Right Compact Action Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          {hasBoat && (
            <button
              type="button"
              onClick={handleToggleBoardBoat}
              title={isBoating ? 'Return Rowboat to Dock' : 'Launch Rowboat'}
              className={`flex h-8 cursor-pointer items-center gap-1 border-2 border-[#45230d] px-2 text-xs font-bold shadow-[0_2px_0_#1e3a8a] ${
                isBoating ? 'bg-[#bae6fd] text-[#0c4a6e]' : 'bg-[#e0f2fe] text-[#0369a1]'
              }`}
            >
              <Anchor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isBoating ? 'Dock' : 'Boat'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => saveProgress(true)}
            title={saveNotice ? 'Saved!' : 'Save progress'}
            aria-label="Save progress"
            className={`wood-btn flex h-8 w-8 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-300 ${
              saveNotice ? 'ring-2 ring-[#22c55e]' : ''
            }`}
          >
            {saveNotice ? <Check className="h-3.5 w-3.5 text-[#1c5e32]" /> : <Save className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="wood-btn flex h-8 w-8 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setCameraModeOpen((c) => !c);
            }}
            title="Island Fashion Camera (Take Lookbook Snapshots)"
            className={`flex h-8 cursor-pointer items-center gap-1 border-2 border-[#45230d] px-2 text-xs font-bold shadow-[0_2px_0_#4c0519] hover:brightness-105 ${
              cameraModeOpen ? 'bg-[#e11d48] text-white' : 'bg-[#ffe4e6] text-[#881337]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setCameraModeOpen(false);
              setWardrobeOpen(false);
              setCraftingOpen(false);
              setDesignStudioOpen(false);
              setShopsModalOpen(false);
              setRunwayModalOpen(false);
              setBoatModalOpen(false);
              setLookbookOpen(false);
              setManageShopId(null);
              setActiveStallPropId(null);
              setBuyPreviewPropId(null);
              setNewsstandOpen(true);
            }}
            title="Island Newsstand — Browse, Buy & Publish Fashion Magazines"
            className="flex h-8 cursor-pointer items-center gap-1 border-2 border-[#45230d] bg-[#fef3c7] px-2 text-xs font-bold text-[#78350f] shadow-[0_2px_0_#92400e] hover:brightness-105"
          >
            <Newspaper className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mags</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setCameraModeOpen(false);
              setWardrobeOpen(false);
              setCraftingOpen(false);
              setShopsModalOpen(false);
              setRunwayModalOpen(false);
              setBoatModalOpen(false);
              setNewsstandOpen(false);
              setLookbookOpen(false);
              setManageShopId(null);
              setActiveStallPropId(null);
              setBuyPreviewPropId(null);
              setDesignStudioOpen(true);
            }}
            className="flex h-8 cursor-pointer items-center gap-1.5 border-2 border-[#45230d] bg-[#f58eb2] px-2.5 text-xs font-bold text-[#3d1222] shadow-[0_2px_0_#7d314d] transition-transform hover:brightness-105 active:translate-y-0.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Design</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setWardrobeOpen(false);
              setDesignStudioOpen(false);
              setShopsModalOpen(false);
              setRunwayModalOpen(false);
              setBoatModalOpen(false);
              setManageShopId(null);
              setActiveStallPropId(null);
              setBuyPreviewPropId(null);
              setCraftingOpen(true);
            }}
            className="wood-btn flex h-8 cursor-pointer items-center gap-1.5 px-2.5 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>Catalog &amp; Craft</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              setCraftingOpen(false);
              setDesignStudioOpen(false);
              setShopsModalOpen(false);
              setRunwayModalOpen(false);
              setBoatModalOpen(false);
              setManageShopId(null);
              setActiveStallPropId(null);
              setBuyPreviewPropId(null);
              setWardrobeOpen(true);
            }}
            className="wood-btn flex h-8 cursor-pointer items-center gap-1.5 px-2.5 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Shirt className="h-3.5 w-3.5" />
            <span>Wardrobe ({ownedItems.length})</span>
          </button>
        </div>
      </div>

      {/* DESIGN STUDIO MODAL (16x16 PIXEL ART CLOTHING DESIGNER) */}
      {designStudioOpen && (
        <DesignStudioModal
          playerName={playerName}
          fabricCount={inventory.fabric}
          rareIngredients={{
            glowing_pearls: inventory.glowing_pearls,
            starlight_coral: inventory.starlight_coral,
            seafoam_essence: inventory.seafoam_essence,
            sunset_amber: inventory.sunset_amber,
          }}
          baseAppearance={appearance}
          ownedCount={ownedItems.length}
          renderIngredientIcon={(kind, sz) => <PixelItemIcon kind={kind} size={sz ?? 18} />}
          renderCharacterPreview={renderCharacterSprite}
          onPlayClick={() => sfx.playClick()}
          onCreateItem={handleCraftDesignItem}
          onClose={() => setDesignStudioOpen(false)}
        />
      )}

      {/* SHOP STALL MANAGER MODAL (STOCK & PRICE ANY OWNED PIECE AT ANY GOLD PRICE) */}
      {activeStallProp && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sfx.playClick();
              setActiveStallPropId(null);
            }
          }}
        >
          <div className="wood-panel relative w-full max-w-[700px] p-5 text-[#3d1e0b]">
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
              <div className="flex items-center gap-2.5">
                <Tag className="h-5 w-5 text-[#8b4513]" />
                <div>
                  <h2 className="font-pixel text-lg font-bold text-[#45230d]">Shop Stall Manager</h2>
                  <p className="text-xs font-medium text-[#754623]">
                    Display any custom creation, luxury wholesale piece, or boutique find at your own custom Gold price.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setActiveStallPropId(null);
                }}
                aria-label="Close Shop Stall Manager"
                className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const currentListedItem = activeStallProp.listing?.item || null;
              const selectableItems: Array<{ item: ClothingItem; isAlreadyOnStall: boolean }> = [
                ...(currentListedItem ? [{ item: currentListedItem, isAlreadyOnStall: true }] : []),
                ...ownedItems.map((it) => ({ item: it, isAlreadyOnStall: false })),
              ];

              const previewApp: CharacterAppearance = stallSelectedItem
                ? {
                    ...appearance,
                    ...(stallSelectedItem.slot === 'dress'
                      ? { dress: stallSelectedItem, top: null, bottom: null }
                      : stallSelectedItem.slot === 'top'
                        ? { top: stallSelectedItem, dress: null }
                        : stallSelectedItem.slot === 'bottom'
                          ? { bottom: stallSelectedItem, dress: null }
                          : { [stallSelectedItem.slot]: stallSelectedItem }),
                  }
                : appearance;

              return (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[185px_1fr]">
                  {/* Live Mannequin Outfit Preview */}
                  <div className="flex flex-col items-center gap-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
                    <WardrobePreviewCanvas appearance={previewApp} dir="down" walking={false} />
                    <div className="font-pixel tabular-nums border-2 border-[#45230d] bg-[#d9f99d] px-3 py-1 text-sm font-bold text-[#2b3d0a]">
                      {stallPrice.toLocaleString()} G
                    </div>
                    {stallSelectedItem && (
                      <div className="space-y-1 text-center">
                        <div dir="auto" className="text-xs font-bold text-[#3d1e0b]">{stallSelectedItem.name}</div>
                        <div dir="auto" className="text-[10px] font-semibold text-[#6b3c1b]">
                          by {stallSelectedItem.creatorName}
                          {formatEditionBadge(stallSelectedItem) ? ` · ${formatEditionBadge(stallSelectedItem)}` : ''}
                        </div>
                        {getOutfitEffectMeta(stallSelectedItem.effect) && (
                          <div
                            className="inline-block border px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: getOutfitEffectMeta(stallSelectedItem.effect)!.badgeBg,
                              color: getOutfitEffectMeta(stallSelectedItem.effect)!.badgeText,
                              borderColor: getOutfitEffectMeta(stallSelectedItem.effect)!.badgeBorder,
                            }}
                          >
                            ✦ {getOutfitEffectMeta(stallSelectedItem.effect)!.label}
                          </div>
                        )}
                        {doesItemMatchTrend(stallSelectedItem, activeTrend) && (
                          <div className="inline-block border border-[#15803d] bg-[#dcfce7] px-1.5 py-0.5 text-[10px] font-bold text-[#15803d]">
                            2× Trend Bonus Active!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inventory Selection & Free-Market Price Controls */}
                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#522b14]">
                          <span>Choose Item from Closet ({selectableItems.length})</span>
                          <span className="text-[11px] font-medium text-[#754623]">
                            Escrowed onto mannequin while listed
                          </span>
                        </div>
                        {selectableItems.length === 0 ? (
                          <div className="border-2 border-[#c79963] bg-[#ebd2a4] p-4 text-center text-xs font-semibold text-[#6b3c1b]">
                            Your closet is empty! Design a piece in the Design Studio or buy wholesale items to sell.
                          </div>
                        ) : (
                          <div className="grid max-h-[165px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                            {selectableItems.map(({ item, isAlreadyOnStall }) => {
                              const selected = stallSelectedUid === item.uid;
                              return (
                                <button
                                  key={item.uid}
                                  type="button"
                                  onClick={() => {
                                    sfx.playClick();
                                    setStallSelectedUid(item.uid);
                                    if (!isAlreadyOnStall) {
                                      setStallPrice(
                                        item.source === 'luxury'
                                          ? 2400
                                          : item.source === 'boutique'
                                            ? 400
                                            : 220
                                      );
                                    }
                                  }}
                                  className={`flex cursor-pointer items-center gap-2 border-2 px-2 py-1.5 text-left text-xs ${
                                    selected
                                      ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                                      : 'border-[#966236] bg-[#edd5aa] hover:bg-[#f7e5c2]'
                                  }`}
                                >
                                  <div className="wood-slot flex h-9 w-9 shrink-0 items-center justify-center">
                                    <ClothingThumb item={item} size={28} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <span dir="auto" className="truncate font-bold text-[#3d1e0b]">{item.name}</span>
                                      {isAlreadyOnStall && (
                                        <span className="shrink-0 bg-[#d9f99d] px-1 text-[9px] font-bold text-[#1c5e32]">
                                          Listed
                                        </span>
                                      )}
                                    </div>
                                    <div dir="auto" className="truncate text-[10px] font-semibold text-[#6e4220]">
                                      {SLOT_LABELS[item.slot]} · by {item.creatorName}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Price Slider + Custom Number Input (50G - 50,000G) */}
                      <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                          <span>Set Asking Price (50 G – 50,000 G)</span>
                          <span className="tabular-nums text-[#6b3c1b]">
                            NPC Bot Cap: ~{stallMarketGuide.toLocaleString()} G
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={50}
                            max={10000}
                            step={50}
                            value={Math.min(10000, stallPrice)}
                            onChange={(e) => setStallPrice(Number(e.target.value))}
                            className="flex-1 accent-[#b86f34]"
                          />
                          <input
                            type="number"
                            min={50}
                            max={50000}
                            step={10}
                            value={stallPrice}
                            onChange={(e) =>
                              setStallPrice(Math.max(50, Math.min(50000, Number(e.target.value) || 50)))
                            }
                            className="font-pixel tabular-nums w-24 border-2 border-[#6b3c1b] bg-[#fff7e6] px-2 py-1 text-right text-xs font-bold"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {[200, 500, 1500, 3000, 6000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                sfx.playClick();
                                setStallPrice(preset);
                              }}
                              className="cursor-pointer border border-[#8c5828] bg-[#fff4d9] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#45230d] hover:bg-[#ffe8b3]"
                            >
                              {preset.toLocaleString()} G
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t-2 border-[#c79963] pt-3">
                      {activeStallProp.listing && (
                        <button
                          type="button"
                          onClick={handleRemoveListing}
                          className="cursor-pointer border-2 border-[#7a2e2e] bg-[#d97373] px-3.5 py-2 text-xs font-bold text-[#fff5f5] hover:bg-[#c95959]"
                        >
                          Unlist &amp; Return to Closet
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!stallSelectedItem}
                        onClick={handleListOnMannequin}
                        className="wood-btn flex h-10 cursor-pointer items-center gap-1.5 px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <Tag className="h-4 w-4" />
                        <span>{activeStallProp.listing ? 'Update Listing' : 'List on Stall'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* BUY & PREVIEW MODAL (RIVAL BOUTIQUES & LIVE PLAYER RESELL MARKET) */}
      {buyPreviewProp && buyPreviewProp.listing?.item && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !buyingBusy) {
              sfx.playClick();
              setBuyPreviewPropId(null);
            }
          }}
        >
          {(() => {
            const listing = buyPreviewProp.listing!;
            const item = listing.item;
            const isRealPlayerStall = Boolean(buyPreviewProp.ownerId && buyPreviewProp.ownerId !== playerId);
            const canAfford = gold >= listing.price;

            const previewAppearance: CharacterAppearance = {
              ...appearance,
              ...(item.slot === 'dress'
                ? { dress: item, top: null, bottom: null }
                : item.slot === 'top'
                  ? { top: item, dress: null }
                  : item.slot === 'bottom'
                    ? { bottom: item, dress: null }
                    : { [item.slot]: item }),
            };

            return (
              <div className="wood-panel relative w-full max-w-[560px] p-5 text-[#3d1e0b]">
                <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="h-5 w-5 text-[#8b4513]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-pixel text-lg font-bold text-[#45230d]">
                          {buyPreviewProp.owner}&apos;s Boutique
                        </h2>
                        {isRealPlayerStall && (
                          <span className="border border-[#1c5e32] bg-[#d9f99d] px-1.5 py-0.5 text-[10px] font-bold text-[#1c5e32]">
                            Player Market
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#754623]">
                        {isRealPlayerStall
                          ? 'Wear this piece yourself OR flip it on your own mannequin at any price!'
                          : 'Exclusive seaside boutique piece — wear it or resell it in your own stall!'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={buyingBusy}
                    onClick={() => {
                      sfx.playClick();
                      setBuyPreviewPropId(null);
                    }}
                    aria-label="Close Boutique Preview"
                    className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[170px_1fr]">
                  <div className="flex flex-col items-center gap-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
                    <WardrobePreviewCanvas
                      appearance={previewAppearance}
                      dir={previewDir}
                      walking={previewWalking}
                    />
                    <div className="flex w-full items-center justify-between gap-1.5">
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
                          sfx.playClick();
                          setPreviewWalking((w) => !w);
                        }}
                        className="wood-btn h-8 flex-1 cursor-pointer px-2 text-xs font-semibold"
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
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                            <span className="bg-[#d9b577] px-1.5 py-0.5 text-[#3d1e0b]">
                              {SLOT_LABELS[item.slot]}
                            </span>
                            <span className="bg-[#f5e1bc] px-1.5 py-0.5 text-[#754623]">
                              {item.source === 'custom'
                                ? 'Custom Design'
                                : item.source === 'luxury'
                                  ? 'Luxury Atelier'
                                  : 'Boutique Exclusive'}
                            </span>
                            {formatEditionBadge(item) && (
                              <span className="border border-[#6b21a8] bg-[#f3e8ff] px-1.5 py-0.5 text-[#6b21a8]">
                                {formatEditionBadge(item)}
                              </span>
                            )}
                            {getOutfitEffectMeta(item.effect) && (
                              <span
                                className="border px-1.5 py-0.5"
                                style={{
                                  backgroundColor: getOutfitEffectMeta(item.effect)!.badgeBg,
                                  color: getOutfitEffectMeta(item.effect)!.badgeText,
                                  borderColor: getOutfitEffectMeta(item.effect)!.badgeBorder,
                                }}
                              >
                                ✦ {getOutfitEffectMeta(item.effect)!.label}
                              </span>
                            )}
                            {doesItemMatchTrend(item, activeTrend) && (
                              <span className="border border-[#15803d] bg-[#dcfce7] px-1.5 py-0.5 text-[#15803d]">
                                2× Trend
                              </span>
                            )}
                          </div>
                          <h3 dir="auto" className="font-pixel mt-1 text-xl font-bold text-[#3d1e0b]">{item.name}</h3>
                          <div dir="auto" className="text-xs font-semibold text-[#6b3c1b]">
                            Designed by <span className="font-bold text-[#3d1e0b]">{item.creatorName}</span>
                          </div>
                        </div>
                        <div className="wood-slot flex h-12 w-12 shrink-0 items-center justify-center">
                          <ClothingThumb item={item} size={36} />
                        </div>
                      </div>

                      <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-2.5">
                        <div className="mb-0.5 text-xs font-bold text-[#522b14]">Tactical Outfit Stats</div>
                        <div className="text-sm font-bold text-[#1c5e32]">{formatStatsLine(item.stats)}</div>
                      </div>

                      <div className="flex items-center justify-between rounded-sm border-2 border-[#c79963] bg-[#edd5aa] px-3 py-2">
                        <span className="text-xs font-bold text-[#522b14]">Asking Price</span>
                        <span className="font-pixel tabular-nums text-base font-bold text-[#45230d]">
                          {listing.price.toLocaleString()} G
                        </span>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#522b14]">
                        <input
                          type="checkbox"
                          checked={equipOnBuy}
                          onChange={(e) => setEquipOnBuy(e.target.checked)}
                          className="h-4 w-4 accent-[#b86f34]"
                        />
                        <span>Equip immediately after buying (uncheck to store in bag)</span>
                      </label>

                      {buyError && (
                        <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                          {buyError}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t-2 border-[#c79963] pt-3">
                      <button
                        type="button"
                        disabled={buyingBusy || !canAfford}
                        onClick={() => void handleBuyFromBoutique(buyPreviewProp)}
                        className={`flex h-10 items-center gap-2 px-5 text-sm font-bold ${
                          !buyingBusy && canAfford
                            ? 'wood-btn cursor-pointer'
                            : 'cursor-not-allowed border-2 border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-75'
                        }`}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>
                          {buyingBusy
                            ? 'Processing...'
                            : canAfford
                              ? `Buy Item (${listing.price.toLocaleString()} G)`
                              : 'Not Enough Gold'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAILOR & LUXURY WHOLESALE SHOP MODAL */}
      {craftingOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sfx.playClick();
              setCraftingOpen(false);
            }
          }}
        >
          <div className="wood-panel relative max-h-[92vh] w-full max-w-[920px] overflow-y-auto p-5 text-[#3d1e0b]">
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
              <div>
                <h2 className="font-pixel text-lg font-bold text-[#45230d]">Tailor Table &amp; Luxury Catalog</h2>
                <p className="text-xs font-medium text-[#754623]">
                  Craft boardwalk boutique kits or invest Gold in {LUXURY_CATALOG.length} rare Luxury Wholesale items to wear or resell!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setCraftingOpen(false);
                }}
                aria-label="Close Tailor & Shop"
                className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-2.5 sm:grid-cols-5">
              {(
                [
                  { kind: 'wood', label: 'Wood' },
                  { kind: 'fabric', label: 'Fabric' },
                  { kind: 'pearls', label: 'Pearls' },
                  { kind: 'dyes', label: 'Dyes' },
                  { kind: 'golden_pearls', label: 'Gold Pearl' },
                  { kind: 'royal_silk', label: 'Royal Silk' },
                  { kind: 'glowing_pearls', label: 'Glow Pearl' },
                  { kind: 'starlight_coral', label: 'Star Coral' },
                  { kind: 'seafoam_essence', label: 'Seafoam' },
                  { kind: 'sunset_amber', label: 'Sun Amber' },
                ] as const
              ).map((mat) => (
                <div key={mat.kind} className="flex items-center gap-1.5 px-1">
                  <PixelItemIcon kind={mat.kind} size={22} />
                  <div className="leading-tight">
                    <div className="text-[10px] font-semibold text-[#6b3c1b]">{mat.label}</div>
                    <div className="font-pixel tabular-nums text-xs font-bold text-[#3d1e0b]">
                      {inventory[mat.kind]}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setCraftTab('luxury');
                }}
                className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  craftTab === 'luxury'
                    ? 'border-[#45230d] bg-[#6d28d9] text-[#fff8e7]'
                    : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Luxury Wholesale ({LUXURY_CATALOG.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setCraftTab('structures');
                }}
                className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  craftTab === 'structures'
                    ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                    : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                }`}
              >
                <Hammer className="h-3.5 w-3.5" />
                <span>Boardwalk &amp; Shops</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setCraftTab('decor');
                }}
                className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  craftTab === 'decor'
                    ? 'border-[#45230d] bg-[#0f766e] text-[#fff8e7]'
                    : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Shop Decor ({DECOR_RECIPES.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setCraftTab('pets');
                }}
                className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  craftTab === 'pets'
                    ? 'border-[#45230d] bg-[#be185d] text-[#fff8e7]'
                    : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                }`}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Pets ({PET_CATALOG.length})</span>
              </button>
            </div>

            {craftTab === 'luxury' ? (
              <div className="space-y-2.5">
                {/* Category Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `All (${LUXURY_CATALOG.length})` },
                      { id: 'hat', label: 'Hats & Crowns' },
                      { id: 'dress', label: 'Dresses & Gowns' },
                      { id: 'top', label: 'Tops & Jackets' },
                      { id: 'bottom', label: 'Bottoms' },
                      { id: 'shoes', label: 'Shoes & Wings' },
                    ] as const
                  ).map((cat) => {
                    const active = luxuryCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          sfx.playClick();
                          setLuxuryCategoryFilter(cat.id);
                        }}
                        className={`cursor-pointer border-2 px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'border-[#3b0764] bg-[#5b21b6] text-[#fff8e7]'
                            : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Rarity Tier Filter + Balance Summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c79963] pb-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    {(['all', 'Rare', 'Epic', 'Legendary', 'Mythic'] as const).map((tier) => {
                      const active = luxuryRarityFilter === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            sfx.playClick();
                            setLuxuryRarityFilter(tier);
                          }}
                          className={`cursor-pointer border px-2 py-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                            active
                              ? 'border-[#45230d] bg-[#45230d] text-[#fff8e7]'
                              : 'border-[#c79963] bg-[#f5e6c8] text-[#522b14] hover:bg-[#ebd2a4]'
                          }`}
                        >
                          {tier === 'all' ? 'All Tiers' : tier}
                        </button>
                      );
                    })}
                  </div>
                  <div className="font-bold tabular-nums text-[#522b14]">
                    Balance: {gold.toLocaleString()} G · Bag: {ownedItems.length}/50
                  </div>
                </div>

                {/* Filtered 2-Column Catalog Grid */}
                {(() => {
                  const filteredLuxury = LUXURY_CATALOG.filter(
                    (entry) =>
                      (luxuryCategoryFilter === 'all' || entry.item.slot === luxuryCategoryFilter) &&
                      (luxuryRarityFilter === 'all' || entry.rarity === luxuryRarityFilter)
                  );

                  const rarityStyles: Record<
                    LuxuryRarity,
                    { card: string; text: string; frame: string }
                  > = {
                    Rare: {
                      card: 'border-[#2563eb] bg-[#eff6ff]',
                      text: 'text-[#1d4ed8]',
                      frame: 'border-[#1e40af] bg-[#0f172a]',
                    },
                    Epic: {
                      card: 'border-[#7c3aed] bg-[#f5ecff]',
                      text: 'text-[#6d28d9]',
                      frame: 'border-[#4c1d95] bg-[#1e1b4b]',
                    },
                    Legendary: {
                      card: 'border-[#d97706] bg-[#fffbeb]',
                      text: 'text-[#b45309]',
                      frame: 'border-[#92400e] bg-[#291709]',
                    },
                    Mythic: {
                      card: 'border-[#db2777] bg-[#fdf2f8]',
                      text: 'text-[#be185d]',
                      frame: 'border-[#831843] bg-[#240a1e]',
                    },
                  };

                  if (filteredLuxury.length === 0) {
                    return (
                      <div className="border-2 border-[#c79963] bg-[#ebd2a4] p-6 text-center text-xs font-bold text-[#522b14]">
                        No items match this category &amp; tier combination.
                      </div>
                    );
                  }

                  return (
                    <div className="grid max-h-[360px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2">
                      {filteredLuxury.map((entry) => {
                        const canAfford = gold >= entry.wholesalePrice && ownedItems.length < 50;
                        const ownedCopies = ownedItems.filter(
                          (i) => i.name === entry.item.name && i.source === 'luxury'
                        ).length;
                        const rs = rarityStyles[entry.rarity];

                        return (
                          <div
                            key={entry.id}
                            className={`flex flex-col justify-between gap-2.5 border-2 p-3 ${rs.card}`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-13 w-13 shrink-0 items-center justify-center border-2 ${rs.frame}`}
                              >
                                <ClothingThumb item={{ ...entry.item, uid: entry.id }} size={40} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-[#2e1065]">
                                  {entry.item.name}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                  <span className={rs.text}>{entry.rarity}</span>
                                  <span aria-hidden="true" className="text-[#754623]">·</span>
                                  <span className="text-[#522b14]">{SLOT_LABELS[entry.item.slot]}</span>
                                  {ownedCopies > 0 && (
                                    <>
                                      <span aria-hidden="true" className="text-[#754623]">·</span>
                                      <span className="tabular-nums text-[#1c5e32]">
                                        Owned: {ownedCopies}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="mt-1 text-xs leading-snug text-[#4c1d95]">
                                  {entry.tagline}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t border-black/10 pt-2">
                              <div className="text-[11px] font-bold text-[#1c5e32]">
                                {formatStatsLine(entry.item.stats)}
                              </div>
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => handleBuyLuxuryWholesale(entry)}
                                className={`h-8 shrink-0 border-2 px-3 text-xs font-bold whitespace-nowrap tabular-nums transition-opacity ${
                                  canAfford
                                    ? 'cursor-pointer border-[#3b0764] bg-[#f59e0b] text-[#2e1065] shadow-[0_2px_0_#78350f] hover:brightness-105'
                                    : 'cursor-not-allowed border-[#7a5233] bg-[#d6c9e8] text-[#5b4d70] opacity-75'
                                }`}
                              >
                                Buy ({entry.wholesalePrice.toLocaleString()} G)
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : craftTab === 'pets' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#522b14]">
                  <span>Adopt a faithful pixel companion to trot behind you across Coral Cove!</span>
                  <span className="tabular-nums">Balance: {gold.toLocaleString()} G</span>
                </div>
                <div className="grid max-h-[360px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {PET_CATALOG.map((pet) => {
                    const isOwned = ownedPets.includes(pet.kind);
                    const isEquipped = equippedPet === pet.kind;
                    const canAfford = gold >= pet.price;
                    return (
                      <div
                        key={pet.kind}
                        className={`flex flex-col justify-between gap-2.5 border-2 p-3 ${
                          isEquipped
                            ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                            : 'border-[#966236] bg-[#edd5aa]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="wood-slot flex h-12 w-12 shrink-0 items-center justify-center">
                            <PetThumb kind={pet.kind} size={36} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-pixel text-sm font-bold text-[#3d1e0b]">{pet.name}</span>
                              {isEquipped && (
                                <span className="border border-[#1c5e32] bg-[#d9f99d] px-1.5 py-0.2 text-[9px] font-bold text-[#1c5e32]">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[#633818]">{pet.tagline}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#c79963] pt-2">
                          <span className="font-pixel tabular-nums text-xs font-bold text-[#522b14]">
                            {isOwned ? 'Adopted' : `${pet.price} G`}
                          </span>
                          <button
                            type="button"
                            disabled={!isOwned && !canAfford}
                            onClick={() => handleAdoptOrEquipPet(pet)}
                            className={`h-8 border-2 px-3.5 text-xs font-bold whitespace-nowrap ${
                              isEquipped
                                ? 'cursor-pointer border-[#1c5e32] bg-[#d9f99d] text-[#1c5e32]'
                                : isOwned || canAfford
                                  ? 'wood-btn cursor-pointer'
                                  : 'cursor-not-allowed border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-75'
                            }`}
                          >
                            {isEquipped ? 'Following (Unequip)' : isOwned ? 'Equip Pet' : `Adopt (${pet.price} G)`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : craftTab === 'decor' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#522b14]">
                  <span>Craft or buy boutique furniture &amp; rugs, then click Place to decorate your shop!</span>
                  <span className="tabular-nums">Balance: {gold.toLocaleString()} G</span>
                </div>
                <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                  {DECOR_RECIPES.map((recipe) => {
                    const canAffordCraft = Object.entries(recipe.cost).every(([k, amt]) => {
                      const key = k as keyof typeof recipe.cost;
                      return inventory[key] >= (amt || 0);
                    });
                    const ownedCount = inventory[recipe.outputItem];

                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#966236] bg-[#edd5aa] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="wood-slot flex h-12 w-12 shrink-0 items-center justify-center">
                            <PixelItemIcon kind={recipe.iconKind} size={32} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#3d1e0b]">{recipe.name}</span>
                              <span className="tabular-nums text-xs font-semibold text-[#1c5e32]">
                                · Owned: {ownedCount}
                              </span>
                            </div>
                            <p className="text-xs text-[#633818]">{recipe.description}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold">
                              {(Object.entries(recipe.cost) as Array<[keyof InventoryCounts, number]>).map(
                                ([matKey, req]) => {
                                  const have = inventory[matKey];
                                  const ok = have >= req;
                                  const label =
                                    matKey === 'wood'
                                      ? 'Wood'
                                      : matKey === 'fabric'
                                        ? 'Fabric'
                                        : matKey === 'pearls'
                                          ? 'Pearls'
                                          : matKey === 'dyes'
                                            ? 'Dyes'
                                            : matKey;
                                  return (
                                    <span
                                      key={matKey}
                                      className={`flex items-center gap-1 tabular-nums ${
                                        ok ? 'text-[#3d1e0b]' : 'text-[#a62b2b]'
                                      }`}
                                    >
                                      <PixelItemIcon kind={matKey} size={16} />
                                      <span>
                                        {have}/{req} {label}
                                      </span>
                                    </span>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!canAffordCraft}
                            onClick={() => handleCraftStructure(recipe)}
                            className={`h-9 border-2 px-3 text-xs font-bold whitespace-nowrap transition-opacity ${
                              canAffordCraft
                                ? 'wood-btn cursor-pointer'
                                : 'cursor-not-allowed border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-70'
                            }`}
                          >
                            Craft
                          </button>
                          {recipe.goldPrice !== undefined && (
                            <button
                              type="button"
                              disabled={gold < recipe.goldPrice}
                              onClick={() => handleBuyDecorGold(recipe)}
                              className={`h-9 border-2 px-3 text-xs font-bold whitespace-nowrap tabular-nums transition-opacity ${
                                gold >= recipe.goldPrice
                                  ? 'cursor-pointer border-[#45230d] bg-[#fde68a] text-[#3d1e0b] hover:brightness-105'
                                  : 'cursor-not-allowed border-[#7a5233] bg-[#d6c2a1] text-[#6b4d35] opacity-70'
                              }`}
                            >
                              Buy {recipe.goldPrice} G
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={ownedCount <= 0}
                            onClick={() => {
                              sfx.playClick();
                              selectDecorForPlacement(recipe.outputItem as DecorKind);
                            }}
                            className={`h-9 border-2 px-3.5 text-xs font-bold whitespace-nowrap transition-opacity ${
                              ownedCount > 0
                                ? 'cursor-pointer border-[#14532d] bg-[#86efac] text-[#14532d] shadow-[0_2px_0_#166534] hover:brightness-105'
                                : 'cursor-not-allowed border-[#7a5233] bg-[#d6c2a1] text-[#6b4d35] opacity-65'
                            }`}
                          >
                            Place
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                {STRUCTURE_RECIPES.map((recipe) => {
                  const canAfford = Object.entries(recipe.cost).every(([k, amt]) => {
                    const key = k as keyof typeof recipe.cost;
                    return inventory[key] >= (amt || 0);
                  });
                  const ownedCount = inventory[recipe.outputItem];

                  return (
                    <div
                      key={recipe.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#966236] bg-[#edd5aa] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="wood-slot flex h-12 w-12 shrink-0 items-center justify-center">
                          <PixelItemIcon kind={recipe.iconKind} size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#3d1e0b]">{recipe.name}</span>
                            <span className="tabular-nums text-xs font-semibold text-[#754623]">
                              · Owned: {ownedCount}
                            </span>
                          </div>
                          <p className="text-xs text-[#633818]">{recipe.description}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold">
                            {(Object.entries(recipe.cost) as Array<[keyof InventoryCounts, number]>).map(
                              ([matKey, req]) => {
                                const have = inventory[matKey];
                                const ok = have >= req;
                                const label =
                                  matKey === 'wood'
                                    ? 'Wood'
                                    : matKey === 'fabric'
                                      ? 'Fabric'
                                      : matKey === 'pearls'
                                        ? 'Pearls'
                                        : matKey === 'dyes'
                                          ? 'Dyes'
                                          : matKey;
                                return (
                                  <span
                                    key={matKey}
                                    className={`flex items-center gap-1 tabular-nums ${
                                      ok ? 'text-[#3d1e0b]' : 'text-[#a62b2b]'
                                    }`}
                                  >
                                    <PixelItemIcon kind={matKey} size={16} />
                                    <span>
                                      {have}/{req} {label}
                                    </span>
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleCraftStructure(recipe)}
                          className={`h-9 border-2 px-4 text-xs font-bold whitespace-nowrap transition-opacity ${
                            canAfford
                              ? 'wood-btn cursor-pointer'
                              : 'cursor-not-allowed border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-70'
                          }`}
                        >
                          Craft
                        </button>
                        <button
                          type="button"
                          disabled={ownedCount <= 0}
                          onClick={() => {
                            sfx.playClick();
                            selectStructureForPlacement(recipe.outputItem);
                          }}
                          className={`h-9 border-2 px-3.5 text-xs font-bold whitespace-nowrap transition-opacity ${
                            ownedCount > 0
                              ? 'cursor-pointer border-[#14532d] bg-[#86efac] text-[#14532d] shadow-[0_2px_0_#166534] hover:brightness-105'
                              : 'cursor-not-allowed border-[#7a5233] bg-[#d6c2a1] text-[#6b4d35] opacity-65'
                          }`}
                        >
                          Place
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WARDROBE & INVENTORY CLOSET MODAL */}
      {wardrobeOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sfx.playClick();
              setWardrobeOpen(false);
            }
          }}
        >
          <div className="wood-panel relative max-h-[92vh] w-full max-w-[820px] overflow-y-auto p-5 text-[#3d1e0b]">
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
              <div>
                <h2 className="font-pixel text-lg font-bold text-[#45230d]">Wardrobe &amp; Owned Closet</h2>
                <p className="text-xs font-medium text-[#754623]">
                  Gear Stats: Speed +{activeStats.speedPct}% · Harvest +{activeStats.harvestBonus} · Sea Breeze Res +{activeStats.seaRes}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setWardrobeOpen(false);
                }}
                aria-label="Close Wardrobe"
                className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
              {/* Left Column: Live Walking Preview & Equipped Slots */}
              <div className="flex flex-col items-center gap-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
                <WardrobePreviewCanvas appearance={appearance} dir={previewDir} walking={previewWalking} />

                <div className="flex w-full items-center justify-between gap-1.5">
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
                      sfx.playClick();
                      setPreviewWalking((w) => !w);
                    }}
                    className="wood-btn h-8 flex-1 cursor-pointer px-2 text-xs font-semibold whitespace-nowrap"
                  >
                    {previewWalking ? 'Walking' : 'Standing'}
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

                {/* Player Gear Stats & Reef Readiness inside Wardrobe Modal */}
                <div className="w-full space-y-1 border-t border-[#c79963] pt-2 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-[#522b14]">
                    <span>Islander Stats</span>
                    {activeStats.seaRes >= 2 && (
                      <span className="bg-[#d9f99d] px-1.5 py-0.2 text-[9px] font-bold text-[#1c5e32]">
                        Reef Ready
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="border border-[#c79963] bg-[#f7e7c8] px-1 py-0.5">
                      <div className="text-[9px] font-semibold text-[#754623]">Speed</div>
                      <div className="font-bold tabular-nums text-[#3d1e0b]">+{activeStats.speedPct}%</div>
                    </div>
                    <div className="border border-[#c79963] bg-[#f7e7c8] px-1 py-0.5">
                      <div className="text-[9px] font-semibold text-[#754623]">Yield</div>
                      <div className="font-bold tabular-nums text-[#3d1e0b]">+{activeStats.harvestBonus}</div>
                    </div>
                    <div className="border border-[#c79963] bg-[#f7e7c8] px-1 py-0.5">
                      <div className="text-[9px] font-semibold text-[#754623]">Sea Res</div>
                      <div
                        className={`font-bold tabular-nums ${
                          activeStats.seaRes >= 2 ? 'text-[#1c5e32]' : 'text-[#3d1e0b]'
                        }`}
                      >
                        {activeStats.seaRes}/2
                      </div>
                    </div>
                  </div>
                  {(inventory.golden_pearls > 0 || inventory.royal_silk > 0) && (
                    <div className="flex items-center justify-between border border-[#c79963] bg-[#f3e8ff] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#5a2875]">
                      <span>Golden Pearls: {inventory.golden_pearls}</span>
                      <span>Royal Silk: {inventory.royal_silk}</span>
                    </div>
                  )}
                  {(inventory.glowing_pearls > 0 ||
                    inventory.starlight_coral > 0 ||
                    inventory.seafoam_essence > 0 ||
                    inventory.sunset_amber > 0) && (
                    <div className="grid grid-cols-2 gap-1 border border-[#0e7490] bg-[#ecfeff] px-1.5 py-1 text-[10px] font-bold tabular-nums text-[#155e75]">
                      <span>Glow Pearl: {inventory.glowing_pearls}</span>
                      <span>Star Coral: {inventory.starlight_coral}</span>
                      <span>Seafoam: {inventory.seafoam_essence}</span>
                      <span>Sun Amber: {inventory.sunset_amber}</span>
                    </div>
                  )}
                </div>

                {/* Currently Equipped Slots Summary */}
                <div className="w-full space-y-1 border-t border-[#c79963] pt-2 text-[11px]">
                  <div className="font-bold text-[#522b14]">Equipped Layers</div>
                  {(['hat', 'top', 'bottom', 'dress', 'shoes'] as ClothingSlot[]).map((sl) => {
                    const equipped = appearance[sl];
                    return (
                      <div
                        key={sl}
                        className="flex items-center justify-between gap-1 border border-[#c79963] bg-[#f7e7c8] px-1.5 py-0.5"
                      >
                        <span className="truncate font-semibold text-[#522b14]">
                          {SLOT_LABELS[sl].split(' ')[0]}: {equipped ? equipped.name : '—'}
                        </span>
                        {equipped && (
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playClick();
                              unequipSlot(sl);
                            }}
                            title={`Unequip ${equipped.name}`}
                            className="cursor-pointer text-[10px] font-bold text-[#a62b2b] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="w-full">
                  <label htmlFor="player-name-input" className="mb-1 block text-xs font-bold text-[#522b14]">
                    Name Tag
                  </label>
                  <input
                    id="player-name-input"
                    dir="auto"
                    type="text"
                    maxLength={14}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Islander"
                    className="w-full border-2 border-[#6b3c1b] bg-[#fff7e6] px-2.5 py-1 text-sm font-semibold text-[#3d1e0b] focus:border-[#b86f34] focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Closet Inventory + Skin + Hair */}
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'closet', label: `Closet (${ownedItems.length})` },
                        { id: 'skin', label: 'Skin Tone' },
                        { id: 'hair', label: 'Hair & Color' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          sfx.playClick();
                          setWardrobeTab(tab.id);
                        }}
                        className={`cursor-pointer border-2 px-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                          wardrobeTab === tab.id
                            ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                            : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {wardrobeTab === 'closet' && (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {(
                            [
                              { id: 'all', label: 'All' },
                              { id: 'hat', label: 'Hats' },
                              { id: 'top', label: 'Tops' },
                              { id: 'bottom', label: 'Bottoms' },
                              { id: 'dress', label: 'Dresses' },
                              { id: 'shoes', label: 'Shoes' },
                            ] as const
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                sfx.playClick();
                                setWardrobeSlotFilter(f.id);
                              }}
                              className={`cursor-pointer border px-2 py-0.5 text-[11px] font-bold ${
                                wardrobeSlotFilter === f.id
                                  ? 'border-[#45230d] bg-[#3d1e0b] text-[#fff7e6]'
                                  : 'border-[#966236] bg-[#edd5aa] text-[#4d2912]'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sfx.playClick();
                            setWardrobeOpen(false);
                            setDesignStudioOpen(true);
                          }}
                          className="flex cursor-pointer items-center gap-1 border-2 border-[#7d314d] bg-[#f58eb2] px-2.5 py-1 text-[11px] font-bold text-[#3d1222]"
                        >
                          <Palette className="h-3 w-3" />
                          <span>Draw New</span>
                        </button>
                      </div>

                      <div className="grid max-h-[265px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {ownedItems
                          .filter((it) => wardrobeSlotFilter === 'all' || it.slot === wardrobeSlotFilter)
                          .map((item) => {
                            const isEquipped = appearance[item.slot]?.uid === item.uid;
                            const badge = formatEditionBadge(item);
                            const mintedSoFar = item.editionId ? editionMintCounts[item.editionId] : undefined;
                            const mintFabricCost = DESIGN_FABRIC_COST[item.slot];
                            const showMintRow = Boolean(
                              item.editionId &&
                                mintedSoFar &&
                                item.editionTotal &&
                                item.editionTotal > 1 &&
                                mintedSoFar < item.editionTotal
                            );
                            const canMintNext = Boolean(
                              showMintRow && inventory.fabric >= mintFabricCost && ownedItems.length < 50
                            );
                            return (
                              <div
                                key={item.uid}
                                className={`flex flex-col gap-1.5 border-2 p-2 ${
                                  isEquipped
                                    ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                                    : 'border-[#966236] bg-[#edd5aa]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="wood-slot flex h-10 w-10 shrink-0 items-center justify-center">
                                      <ClothingThumb item={item} size={30} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span dir="auto" className="truncate text-xs font-bold text-[#3d1e0b]">
                                          {item.name}
                                        </span>
                                        {badge && (
                                          <span className="shrink-0 border border-[#6b21a8] bg-[#f3e8ff] px-1 text-[9px] font-bold text-[#6b21a8]">
                                            {badge}
                                          </span>
                                        )}
                                        {getOutfitEffectMeta(item.effect) && (
                                          <span
                                            className="shrink-0 border px-1 text-[9px] font-bold"
                                            style={{
                                              backgroundColor: getOutfitEffectMeta(item.effect)!.badgeBg,
                                              color: getOutfitEffectMeta(item.effect)!.badgeText,
                                              borderColor: getOutfitEffectMeta(item.effect)!.badgeBorder,
                                            }}
                                          >
                                            ✦ {getOutfitEffectMeta(item.effect)!.label}
                                          </span>
                                        )}
                                        {getReactiveBadges(item.reactive).map((rb) => (
                                          <span
                                            key={rb.label}
                                            className="shrink-0 border px-1 text-[9px] font-bold"
                                            style={{
                                              backgroundColor: rb.bg,
                                              color: rb.text,
                                              borderColor: rb.border,
                                            }}
                                          >
                                            {rb.label}
                                          </span>
                                        ))}
                                      </div>
                                      <div dir="auto" className="truncate text-[10px] font-semibold text-[#6e4220]">
                                        {SLOT_LABELS[item.slot]} · by {item.creatorName}
                                      </div>
                                      <div className="truncate text-[10px] font-bold text-[#1c5e32]">
                                        {formatStatsLine(item.stats)}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      sfx.playClick();
                                      if (isEquipped) {
                                        unequipSlot(item.slot);
                                      } else {
                                        equipItem(item);
                                      }
                                    }}
                                    className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 border-2 px-2.5 text-[11px] font-bold ${
                                      isEquipped
                                        ? 'border-[#1c5e32] bg-[#d9f99d] text-[#1c5e32]'
                                        : 'wood-btn'
                                    }`}
                                  >
                                    {isEquipped && <Check className="h-3 w-3" />}
                                    <span>{isEquipped ? 'Wearing' : 'Wear'}</span>
                                  </button>
                                </div>

                                {showMintRow && mintedSoFar !== undefined && (
                                  <button
                                    type="button"
                                    disabled={!canMintNext}
                                    onClick={() => handleMintEditionCopy(item)}
                                    className={`flex items-center justify-center gap-1 border px-2 py-0.5 text-[10px] font-bold ${
                                      canMintNext
                                        ? 'cursor-pointer border-[#6b21a8] bg-[#f3e8ff] text-[#6b21a8] hover:bg-[#e9d5ff]'
                                        : 'cursor-not-allowed border-[#966236] bg-[#e2ccb0] text-[#754623] opacity-70'
                                    }`}
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>
                                      Mint #{mintedSoFar + 1}/{item.editionTotal} ({mintFabricCost} Fabric)
                                    </span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {wardrobeTab === 'skin' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-[#522b14]">Skin Tone</div>
                      <div className="grid grid-cols-3 gap-2">
                        {SKIN_TONES.map((tone) => {
                          const selected = appearance.skinId === tone.id;
                          return (
                            <button
                              key={tone.id}
                              type="button"
                              onClick={() => {
                                sfx.playClick();
                                setAppearance((a) => ({ ...a, skinId: tone.id }));
                              }}
                              className={`flex cursor-pointer items-center gap-2.5 border-2 px-2.5 py-2 text-left text-xs font-semibold ${
                                selected
                                  ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                                  : 'border-[#966236] bg-[#edd5aa] hover:bg-[#f7e5c2]'
                              }`}
                            >
                              <span
                                className="h-5 w-5 shrink-0 border border-[#45230d]"
                                style={{ backgroundColor: tone.base }}
                              />
                              <span className="truncate">{tone.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={randomizeLook}
                        className="wood-btn flex h-9 cursor-pointer items-center justify-center gap-1.5 px-4 text-xs font-bold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Randomize Skin &amp; Hair</span>
                      </button>
                    </div>
                  )}

                  {wardrobeTab === 'hair' && (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 text-xs font-bold text-[#522b14]">Hairstyle</div>
                        <div className="grid grid-cols-3 gap-2">
                          {HAIR_STYLES.map((st) => {
                            const selected = appearance.hairStyle === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  sfx.playClick();
                                  setAppearance((a) => ({ ...a, hairStyle: st.id }));
                                }}
                                className={`cursor-pointer border-2 px-2.5 py-2 text-xs font-semibold whitespace-nowrap ${
                                  selected
                                    ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                                    : 'border-[#966236] bg-[#edd5aa] hover:bg-[#f7e5c2]'
                                }`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs font-bold text-[#522b14]">Hair Color</div>
                        <div className="grid grid-cols-4 gap-2">
                          {HAIR_COLORS.map((col) => {
                            const selected = appearance.hairColorId === col.id;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => {
                                  sfx.playClick();
                                  setAppearance((a) => ({ ...a, hairColorId: col.id }));
                                }}
                                className={`flex cursor-pointer items-center gap-2 border-2 px-2 py-1.5 text-xs font-semibold ${
                                  selected
                                    ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                                    : 'border-[#966236] bg-[#edd5aa] hover:bg-[#f7e5c2]'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 border border-[#45230d]"
                                  style={{ backgroundColor: col.main }}
                                />
                                <span className="truncate">{col.name.split(' ')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t-2 border-[#c79963] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playClick();
                      setWardrobeOpen(false);
                    }}
                    className="wood-btn flex h-10 cursor-pointer items-center gap-1.5 px-5 text-sm font-bold"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOIN ISLAND MULTIPLAYER STARTUP OVERLAY */}
      {!joinedIsland && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f293d]/55 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={(e) => void handleJoinIsland(e)}
            className="wood-panel relative w-full max-w-[540px] p-6 text-[#3d1e0b]"
          >
            <div className="mb-4 border-b-2 border-[#c79963] pb-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="font-pixel text-2xl font-bold text-[#45230d]">Coral Cove</h1>
                <div className="flex items-center gap-1.5 border-2 border-[#6b3c1b] bg-[#ebd2a4] px-2.5 py-0.5 text-xs font-bold text-[#1c5e32]">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  <span>{onlineCount} Online Now</span>
                </div>
              </div>
              <p className="mt-1 text-xs font-medium text-[#754623]">
                Draw your own pixel-art fashion, invest in Luxury Wholesale pieces, and run an ocean boardwalk boutique!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[164px_1fr]">
              <div className="flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
                <WardrobePreviewCanvas
                  appearance={(cloudPreviewProfile?.appearance as CharacterAppearance) || appearance}
                  dir="down"
                  walking={true}
                />
                <span className="text-[11px] font-bold text-[#6b3c1b]">Your Islander</span>
              </div>

              <div className="flex flex-col justify-between gap-3.5">
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="join-nickname-input"
                      className="mb-1.5 block text-xs font-bold text-[#522b14]"
                    >
                      Choose Your Nickname
                    </label>
                    <input
                      id="join-nickname-input"
                      dir="auto"
                      type="text"
                      maxLength={20}
                      autoFocus
                      value={joinInputName}
                      onChange={(e) => setJoinInputName(e.target.value)}
                      placeholder="Enter nickname..."
                      className="w-full border-2 border-[#6b3c1b] bg-[#fff7e6] px-3 py-2 text-sm font-bold text-[#3d1e0b] focus:border-[#b86f34] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-2.5 text-xs">
                    {checkingProfile ? (
                      <div className="font-semibold text-[#754623]">Checking cloud island profile...</div>
                    ) : cloudPreviewProfile ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#1c5e32]">Welcome back, {cloudPreviewProfile.playerName}!</div>
                        <div className="tabular-nums font-semibold text-[#522b14]">
                          Cloud Save Found: {cloudPreviewProfile.gold.toLocaleString()} G · {cloudPreviewProfile.ownedItems.length} Wardrobe Items
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#45230d]">New Cloud Islander Profile</div>
                        <div className="font-semibold text-[#6b3c1b]">
                          Starts with 1,000 G, starter outfit pieces, and dock boutique kit.
                        </div>
                      </div>
                    )}
                  </div>

                  {joinError && (
                    <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                      {joinError}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={joiningBusy}
                    className="wood-btn flex h-11 w-full cursor-pointer items-center justify-center gap-2 text-sm font-bold disabled:cursor-wait disabled:opacity-75"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{joiningBusy ? 'Connecting to Coral Cove...' : 'Join Island'}</span>
                  </button>
                  <PWAInstallButton variant="join" onPlayClick={() => sfx.playClick()} />
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* LEADERBOARD & SHOP TELEPORT MODAL */}
      {shopsModalOpen && (
        <LeaderboardShopsModal
          traders={tradersList}
          loadingTraders={loadingTraders}
          onlineDirectory={onlineShopDirectory}
          currentPlayerId={playerId}
          onPlayClick={() => sfx.playClick()}
          onVisitTarget={handleVisitTarget}
          onClose={() => setShopsModalOpen(false)}
        />
      )}

      {/* CENTRAL RUNWAY & LIVE AUCTION MODAL */}
      {runwayModalOpen && (
        <RunwayAuctionModal
          playerId={playerId}
          gold={gold}
          ownedItems={ownedItems}
          activeAuction={activeAuction}
          activeTrend={activeTrend}
          onPlayClick={() => sfx.playClick()}
          onShowcaseOutfit={handleShowcaseOutfit}
          onStartAuction={handleStartAuction}
          onPlaceBid={handlePlaceBid}
          onClose={() => setRunwayModalOpen(false)}
        />
      )}

      {/* CORAL COVE BOAT DOCK MODAL */}
      {boatModalOpen && (
        <BoatDockModal
          ownedBoats={ownedBoats}
          equippedBoat={equippedBoat}
          isBoating={isBoating}
          gold={gold}
          onPlayClick={() => sfx.playClick()}
          onBuyOrEquipBoat={handleBuyOrEquipBoat}
          onToggleBoard={handleToggleBoardBoat}
          onClose={() => setBoatModalOpen(false)}
        />
      )}

      {/* SHOP EXPANSION & RELOCATION MANAGEMENT MODAL */}
      {manageShopId &&
        (() => {
          const shopProp = worldRef.current.props.find(
            (pr) => pr.kind === 'boutique_backwall' && getShopStructId(pr) === manageShopId
          );
          if (!shopProp) return null;
          const curTier = clampShopTier(shopProp.shopTier);
          const interior = getShopInteriorProps(shopProp);
          const mannequinCount = interior.filter((pr) => pr.kind === 'mannequin').length;
          const decorCount = interior.length - mannequinCount;
          const canExpandCheck =
            curTier < 4
              ? canExpandShopAt(shopProp, (curTier + 1) as ShopTier)
              : { valid: false };
          const shopDecorItems: ShopDecorCatalogItem[] = DECOR_RECIPES.map((recipe) => {
            const canCraft = Object.entries(recipe.cost).every(([k, amt]) => {
              const key = k as keyof typeof recipe.cost;
              return inventory[key] >= (amt || 0);
            });
            const costItems = (Object.entries(recipe.cost) as Array<[keyof InventoryCounts, number]>).map(
              ([matKey, req]) => ({
                key: matKey,
                label:
                  matKey === 'wood'
                    ? 'Wood'
                    : matKey === 'fabric'
                      ? 'Fabric'
                      : matKey === 'pearls'
                        ? 'Pearls'
                        : matKey === 'dyes'
                          ? 'Dyes'
                          : matKey,
                have: inventory[matKey],
                req,
              })
            );
            return {
              id: recipe.id,
              kind: recipe.outputItem,
              name: recipe.name,
              description: recipe.description,
              goldPrice: recipe.goldPrice || 100,
              outputQty: recipe.outputQty,
              ownedCount: inventory[recipe.outputItem],
              canCraft,
              costItems,
            };
          });
          return (
            <ShopManagementModal
              shopName={`${shopProp.owner || playerName}'s Boutique`}
              currentTier={curTier}
              gold={gold}
              mannequinCount={mannequinCount}
              decorCount={decorCount}
              canExpandCheck={canExpandCheck}
              decorItems={shopDecorItems}
              renderDecorIcon={(k, sz) => <PixelItemIcon kind={k as ItemKind} size={sz ?? 30} />}
              renderMaterialIcon={(m, sz) => <PixelItemIcon kind={m as ItemKind} size={sz ?? 14} />}
              onPlayClick={() => sfx.playClick()}
              onExpandShop={() => handleExpandShop(manageShopId)}
              onStartMoveShop={() => startMoveShop(manageShopId)}
              onBuyDecorGold={(decorId) => {
                const recipe = DECOR_RECIPES.find((r) => r.id === decorId);
                if (recipe) handleBuyDecorGold(recipe);
              }}
              onCraftDecor={(decorId) => {
                const recipe = DECOR_RECIPES.find((r) => r.id === decorId);
                if (recipe) handleCraftStructure(recipe);
              }}
              onSelectDecorToPlace={(decorKind) => selectDecorForPlacement(decorKind as DecorKind)}
              onClose={() => setManageShopId(null)}
            />
          );
        })()}

      {/* LIVE IN-GAME ISLAND CAMERA VIEWFINDER OVERLAY */}
      {cameraModeOpen && !anyModalBlockingHud && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between p-4">
          {cameraFlash && <div className="fixed inset-0 bg-white/80 transition-opacity" />}

          {/* Top Viewfinder Status Bar */}
          <div className="wood-panel pointer-events-auto flex items-center gap-2 border-2 border-[#45230d] px-3 py-1.5 text-xs font-bold text-[#3d1e0b] shadow-lg">
            <Camera className="h-4 w-4 text-[#e11d48]" />
            <span>Fashion Camera · {getCurrentZoneName()}</span>
            <span className="border border-[#c79963] bg-[#fff7e6] px-1.5 py-0.5 text-[10px] tabular-nums">
              {snapshots.length} saved
            </span>
          </div>

          {/* Translucent 10:7 Viewfinder Framing Corners */}
          <div className="relative aspect-[10/7] w-[72vw] max-w-[540px] rounded-xs border-2 border-dashed border-white/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]">
            <span className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-[#fde047]" />
            <span className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-[#fde047]" />
            <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-[#fde047]" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-[#fde047]" />
          </div>

          {/* Bottom Shutter & Lookbook Studio Controls */}
          <div className="wood-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 border-2 border-[#45230d] px-3.5 py-2 shadow-xl">
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="flex h-10 cursor-pointer items-center gap-1.5 border-2 border-[#881337] bg-[#e11d48] px-4 text-xs font-bold text-white shadow-[0_2px_0_#4c0519] hover:brightness-105 active:translate-y-0.5"
            >
              <Camera className="h-4 w-4" />
              <span>Snap Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setCameraModeOpen(false);
                setLookbookOpen(true);
              }}
              className="flex h-10 cursor-pointer items-center gap-1.5 border-2 border-[#45230d] bg-[#fde047] px-3.5 text-xs font-bold text-[#3d1e0b] shadow-[0_2px_0_#a16207] hover:brightness-105"
            >
              <BookOpen className="h-4 w-4" />
              <span>Lookbook Studio ({snapshots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                setCameraModeOpen(false);
              }}
              className="wood-btn flex h-10 cursor-pointer items-center gap-1 px-3 text-xs font-bold"
            >
              <X className="h-4 w-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      )}

      {/* LOOKBOOK & FASHION MAGAZINE CREATOR MODAL */}
      {lookbookOpen && (
        <LookbookCreatorModal
          playerName={playerName}
          snapshots={snapshots}
          onPlayClick={() => sfx.playClick()}
          onOpenCamera={() => {
            setLookbookOpen(false);
            setCameraModeOpen(true);
          }}
          onDeleteSnapshot={handleDeleteSnapshot}
          onPublishMagazine={handlePublishMagazine}
          onClose={() => setLookbookOpen(false)}
        />
      )}

      {/* PUBLIC ISLAND NEWSSTAND & MAGAZINE READER MODAL */}
      {newsstandOpen && (
        <NewsstandModal
          magazines={magazines}
          ownedMagazineIds={ownedMagazineIds}
          playerId={playerId}
          gold={gold}
          onPlayClick={() => sfx.playClick()}
          onOpenLookbookStudio={() => {
            setNewsstandOpen(false);
            setLookbookOpen(true);
          }}
          onBuyMagazine={handleBuyMagazine}
          onLikeMagazine={handleLikeMagazine}
          onClose={() => setNewsstandOpen(false)}
        />
      )}
    </div>
  );
}
