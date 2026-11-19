import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth, type User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  createStarterClothingItems,
  generateItemUid,
  type ClothingItem,
  type ClothingSlot,
  type ClothingSource,
} from './clothing';
import {
  clampShopTier,
  normalizeShimmerPixels,
  sanitizeReactiveConfig,
  VALID_OUTFIT_EFFECTS,
  type BoatKind,
  type EditionTier,
  type OutfitEffectType,
  type PetKind,
  type ShopTier,
} from './constants';

function hasValidConfig(cfg: Record<string, unknown>): boolean {
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
  const projectId = typeof cfg.projectId === 'string' ? cfg.projectId.trim() : '';
  return (
    apiKey.length > 5 &&
    projectId.length > 2 &&
    !apiKey.includes('YOUR_') &&
    !projectId.includes('YOUR_')
  );
}

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;

try {
  if (hasValidConfig(firebaseConfig as Record<string, unknown>)) {
    app = initializeApp(firebaseConfig);
    db = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    auth = getAuth(app);
  } else {
    console.error('[Coral Cove Firebase Init] Missing or placeholder Firebase config:', firebaseConfig);
  }
} catch (error) {
  console.error('[Coral Cove Firebase Init Error]', error);
  app = null;
  db = null;
  auth = null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function extractErrorDetails(error: unknown): { code?: string; message: string } {
  if (error && typeof error === 'object') {
    const rec = error as { code?: unknown; message?: unknown };
    return {
      code: typeof rec.code === 'string' ? rec.code : undefined,
      message: typeof rec.message === 'string' ? rec.message : String(error),
    };
  }
  return { message: String(error) };
}

function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const { message } = extractErrorDetails(error);
  return {
    error: message,
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const details = extractErrorDetails(error);
  console.error('[Coral Cove Firestore Error]', {
    operationType,
    path,
    code: details.code || 'unknown',
    message: details.message,
    rawError: error,
  });
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const loggedFallbackKeys = new Set<string>();
let loggedMissingDb = false;
let loggedAuthFallback = false;

function logCloudFallbackError(
  context: string,
  operationType: OperationType,
  path: string | null,
  error: unknown
): void {
  const details = extractErrorDetails(error);
  const dedupeKey = `${context}:${details.code || 'unknown'}`;
  if (loggedFallbackKeys.has(dedupeKey)) {
    return;
  }
  loggedFallbackKeys.add(dedupeKey);
  console.warn(`[Coral Cove Cloud Fallback: ${context}]`, {
    operationType,
    path,
    code: details.code || 'unknown',
    message: details.message,
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

let authInitPromise: Promise<User | null> | null = null;

export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  if (authInitPromise) return authInitPromise;

  const activeAuth = auth;
  authInitPromise = (async () => {
    try {
      const existing = await withTimeout(
        new Promise<User | null>((resolve) => {
          let settled = false;
          const unsub = onAuthStateChanged(
            activeAuth,
            (user) => {
              if (!settled) {
                settled = true;
                unsub();
                resolve(user);
              }
            },
            (err) => {
              console.error('[Coral Cove Auth State Error]', err);
              if (!settled) {
                settled = true;
                unsub();
                resolve(null);
              }
            }
          );
        }),
        2500,
        'onAuthStateChanged'
      );
      if (existing) return existing;

      const cred = await withTimeout(signInAnonymously(activeAuth), 3500, 'signInAnonymously');
      return cred.user;
    } catch (error) {
      if (!loggedAuthFallback) {
        loggedAuthFallback = true;
        const details = extractErrorDetails(error);
        console.warn('[Coral Cove Anonymous Auth Fallback]', {
          code: details.code || 'unknown',
          message: details.message,
        });
      }
      return null;
    } finally {
      authInitPromise = null;
    }
  })();

  return authInitPromise;
}

let cloudHealthy = false;
const cloudHealthListeners = new Set<(healthy: boolean) => void>();
let recoveryIntervalId: ReturnType<typeof setInterval> | null = null;
let flushingPending = false;

function setCloudHealthy(next: boolean): void {
  const changed = cloudHealthy !== next;
  cloudHealthy = next;
  if (next) {
    loggedFallbackKeys.clear();
    loggedAuthFallback = false;
    void flushPendingSyncToCloud();
  } else {
    ensureRecoveryProbe();
  }
  if (changed) {
    cloudHealthListeners.forEach((cb) => {
      try {
        cb(next);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export function isCloudHealthy(): boolean {
  return cloudHealthy;
}

export function subscribeCloudHealth(cb: (healthy: boolean) => void): () => void {
  cloudHealthListeners.add(cb);
  return () => {
    cloudHealthListeners.delete(cb);
  };
}

function ensureRecoveryProbe(): void {
  if (typeof window === 'undefined' || recoveryIntervalId !== null || !db) return;
  recoveryIntervalId = setInterval(() => {
    if (cloudHealthy) return;
    void testFirestoreConnection();
  }, 15000);
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) {
    if (!loggedMissingDb) {
      loggedMissingDb = true;
      console.warn('[Coral Cove Firestore] Firestore instance is not initialized. Running in Local/Session mode.');
    }
    setCloudHealthy(false);
    return false;
  }

  await ensureAnonymousAuth();

  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 4000, 'testFirestoreConnection');
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError('testFirestoreConnection', OperationType.GET, 'test/connection', error);
    setCloudHealthy(false);
    return false;
  }
}

export interface CloudAppearance {
  skinId: string;
  hairStyle: string;
  hairColorId: string;
  hat: ClothingItem | null;
  top: ClothingItem | null;
  bottom: ClothingItem | null;
  dress: ClothingItem | null;
  shoes: ClothingItem | null;
}

export interface CloudInventory {
  wood: number;
  fabric: number;
  pearls: number;
  dyes: number;
  golden_pearls: number;
  royal_silk: number;
  glowing_pearls: number;
  starlight_coral: number;
  seafoam_essence: number;
  sunset_amber: number;
  dock_plank: number;
  shop_wall: number;
  mannequin: number;
  changing_booth: number;
  vanity_mirror: number;
  clothing_rack: number;
  cash_counter: number;
  potted_plant: number;
  lantern_post: number;
  rug_pink: number;
  rug_teal: number;
  rug_gold: number;
}

export interface CloudListing {
  item: ClothingItem;
  price: number;
}

export interface CloudLastSale {
  amount: number;
  itemLabel: string;
  buyerName: string;
  at: number;
}

export interface CloudPlayerProfile {
  playerId: string;
  playerName: string;
  gold: number;
  x: number;
  y: number;
  dir: 'down' | 'up' | 'left' | 'right';
  appearance: CloudAppearance;
  ownedItems: ClothingItem[];
  inventory: CloudInventory;
  hasBoat?: boolean;
  ownedBoats?: BoatKind[];
  equippedBoat?: BoatKind | null;
  ownedPets?: PetKind[];
  equippedPet?: PetKind | null;
  ownedMagazineIds?: string[];
  vipUnlockedIds?: string[];
  vipDecorCounts?: Record<string, number>;
  equippedVipTitle?: string | null;
  equippedPetAccessory?: string | null;
  equippedBoatSkin?: string | null;
  vipWinsCount?: number;
  totalSales?: number;
  editionMintCounts?: Record<string, number>;
  lastSale?: CloudLastSale | null;
  updatedAt?: Timestamp;
  _migratedFromLegacy?: boolean;
}

export interface CloudOnlinePlayer {
  playerId: string;
  name: string;
  x: number;
  y: number;
  dir: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  appearance: CloudAppearance;
  chatText?: string | null;
  chatAt?: number | null;
  emoteEmoji?: string | null;
  emoteAt?: number | null;
  isBoating?: boolean;
  equippedBoat?: BoatKind | null;
  equippedPet?: PetKind | null;
  vipTitle?: string | null;
  petAccessory?: string | null;
  boatSkin?: string | null;
  runwayShowAt?: number | null;
  updatedAt?: Timestamp;
}

export interface CloudAuction {
  id: string;
  item: ClothingItem;
  sellerId: string;
  sellerName: string;
  startingPrice: number;
  highestBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  startedAtMs: number;
  endsAtMs: number;
  settled: boolean;
}

export interface LeaderboardTrader {
  playerId: string;
  playerName: string;
  gold: number;
  totalSales: number;
  ownedCount: number;
}

export type WorldStructureKind =
  | 'dock_plank'
  | 'boutique_shop'
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
  | 'vip_decor'
  | 'vip_trophy';

export interface CloudWorldStructure {
  id: string;
  kind: WorldStructureKind;
  col: number;
  row: number;
  ownerId: string;
  ownerName: string;
  tier?: ShopTier;
  vipRewardId?: string | null;
  listing?: CloudListing | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type MagazineTheme = 'coral_vogue' | 'midnight_neon' | 'seaside_pastel' | 'royal_gold';

export interface MagazineSticker {
  id: string;
  stickerId: string;
  x: number; // 0..100 (% of page photo)
  y: number; // 0..100 (% of page photo)
}

export interface MagazinePage {
  photoDataUrl: string;
  caption: string;
  location?: string;
  stickers: MagazineSticker[];
}

export interface CloudMagazine {
  id: string;
  title: string;
  subtitle: string;
  authorId: string;
  authorName: string;
  theme: MagazineTheme;
  price: number;
  salesCount: number;
  likesCount: number;
  pages: MagazinePage[];
  createdAtMs: number;
}

const PLAYER_ID_KEY = 'coral_cove_player_id';
const PLAYER_NAME_KEY = 'coral_cove_player_name';

// Local/Session Fallback & Cross-Tab BroadcastChannel Store
const LOCAL_PLAYERS_KEY = 'coral_cove_local_players_v1';
const LOCAL_ONLINE_KEY = 'coral_cove_local_online_v1';
const LOCAL_STRUCTURES_KEY = 'coral_cove_local_structures_v1';
const LOCAL_AUCTION_KEY = 'coral_cove_local_auction_v1';
const LOCAL_MAGAZINES_KEY = 'coral_cove_local_magazines_v1';
const PENDING_SYNC_KEY = 'coral_cove_pending_sync_v1';
const SESSION_CHANNEL_NAME = 'coral_cove_session_sync_v1';

type SessionTopic = 'players' | 'online_players' | 'world_structures' | 'auctions' | 'magazines';

interface LocalOnlineRecord extends Omit<CloudOnlinePlayer, 'updatedAt'> {
  updatedAtMs: number;
}

interface LocalStructureRecord extends Omit<CloudWorldStructure, 'createdAt' | 'updatedAt'> {
  createdAtMs: number;
  updatedAtMs: number;
}

interface LocalProfileRecord extends Omit<CloudPlayerProfile, 'updatedAt'> {
  updatedAtMs: number;
}

interface PendingSyncQueue {
  playerIds: string[];
  structureIds: string[];
}

function makeLocalTimestamp(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1000000,
    toMillis: () => ms,
    toDate: () => new Date(ms),
    isEqual: (other: Timestamp) => other?.toMillis?.() === ms,
    valueOf: () => String(ms),
    toJSON: () => ({ seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1000000 }),
  } as unknown as Timestamp;
}

function readJsonRecord<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonRecord(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

const localTopicListeners: Record<SessionTopic, Set<() => void>> = {
  players: new Set(),
  online_players: new Set(),
  world_structures: new Set(),
  auctions: new Set(),
  magazines: new Set(),
};

let sessionChannel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== 'undefined') {
  try {
    sessionChannel = new BroadcastChannel(SESSION_CHANNEL_NAME);
    sessionChannel.onmessage = (event) => {
      const topic = (event.data as { topic?: SessionTopic } | null)?.topic;
      if (topic && localTopicListeners[topic]) {
        localTopicListeners[topic].forEach((cb) => cb());
      }
    };
  } catch {
    sessionChannel = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === LOCAL_PLAYERS_KEY) {
      localTopicListeners.players.forEach((cb) => cb());
    } else if (event.key === LOCAL_ONLINE_KEY) {
      localTopicListeners.online_players.forEach((cb) => cb());
    } else if (event.key === LOCAL_STRUCTURES_KEY) {
      localTopicListeners.world_structures.forEach((cb) => cb());
    } else if (event.key === LOCAL_AUCTION_KEY) {
      localTopicListeners.auctions.forEach((cb) => cb());
    } else if (event.key === LOCAL_MAGAZINES_KEY) {
      localTopicListeners.magazines.forEach((cb) => cb());
    }
  });
}

function notifyTopic(topic: SessionTopic): void {
  localTopicListeners[topic].forEach((cb) => cb());
  if (sessionChannel) {
    try {
      sessionChannel.postMessage({ topic, at: Date.now() });
    } catch {
      // ignore broadcast errors
    }
  }
}

function subscribeTopic(topic: SessionTopic, cb: () => void): () => void {
  localTopicListeners[topic].add(cb);
  return () => {
    localTopicListeners[topic].delete(cb);
  };
}

function readPendingSync(): PendingSyncQueue {
  const data = readJsonRecord<PendingSyncQueue>(PENDING_SYNC_KEY, { playerIds: [], structureIds: [] });
  return {
    playerIds: Array.isArray(data.playerIds) ? data.playerIds : [],
    structureIds: Array.isArray(data.structureIds) ? data.structureIds : [],
  };
}

function markPendingPlayer(playerId: string): void {
  const q = readPendingSync();
  if (!q.playerIds.includes(playerId)) {
    q.playerIds.push(playerId);
    writeJsonRecord(PENDING_SYNC_KEY, q);
  }
}

function clearPendingPlayer(playerId: string): void {
  const q = readPendingSync();
  if (q.playerIds.includes(playerId)) {
    q.playerIds = q.playerIds.filter((id) => id !== playerId);
    writeJsonRecord(PENDING_SYNC_KEY, q);
  }
}

function markPendingStructure(structureId: string): void {
  const q = readPendingSync();
  if (!q.structureIds.includes(structureId)) {
    q.structureIds.push(structureId);
    writeJsonRecord(PENDING_SYNC_KEY, q);
  }
}

function clearPendingStructure(structureId: string): void {
  const q = readPendingSync();
  if (q.structureIds.includes(structureId)) {
    q.structureIds = q.structureIds.filter((id) => id !== structureId);
    writeJsonRecord(PENDING_SYNC_KEY, q);
  }
}

const VALID_PETS: PetKind[] = [
  'calico',
  'tabby',
  'puppy',
  'bunny',
  'fox',
  'panda',
  'parrot',
  'otter',
  'axolotl',
  'dragon',
];

const VALID_BOATS: BoatKind[] = ['rowboat', 'sailboat', 'swan', 'skiff'];

function normalizeLegacyPet(pet: unknown): PetKind | null {
  if (typeof pet !== 'string') return null;
  if (pet === 'cat') return 'tabby';
  if (pet === 'seagull') return 'parrot';
  if (pet === 'crab') return 'otter';
  return VALID_PETS.includes(pet as PetKind) ? (pet as PetKind) : null;
}

function sanitizePetList(pets: unknown): PetKind[] {
  if (!Array.isArray(pets)) return [];
  const out: PetKind[] = [];
  for (const p of pets) {
    const norm = normalizeLegacyPet(p);
    if (norm && !out.includes(norm)) {
      out.push(norm);
    }
  }
  return out;
}

function sanitizeEquippedPet(pet: unknown): PetKind | null {
  return normalizeLegacyPet(pet);
}

function sanitizeBoatList(boats: unknown, hasLegacyBoat?: boolean): BoatKind[] {
  const out: BoatKind[] = [];
  if (Array.isArray(boats)) {
    for (const b of boats) {
      if (typeof b === 'string' && VALID_BOATS.includes(b as BoatKind) && !out.includes(b as BoatKind)) {
        out.push(b as BoatKind);
      }
    }
  }
  if (hasLegacyBoat && out.length === 0) {
    out.push('rowboat');
  }
  return out;
}

function sanitizeEquippedBoat(boat: unknown, hasLegacyBoat?: boolean): BoatKind | null {
  if (typeof boat === 'string' && VALID_BOATS.includes(boat as BoatKind)) {
    return boat as BoatKind;
  }
  return hasLegacyBoat ? 'rowboat' : null;
}

function sanitizeMintCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(v));
    if (k && Number.isFinite(n) && n > 0) {
      out[k.slice(0, 64)] = Math.min(99, n);
    }
  }
  return out;
}

function sanitizeMagazineIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id === 'string') {
      const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      if (cleaned.length >= 2 && !out.includes(cleaned)) {
        out.push(cleaned);
      }
    }
  }
  return out.slice(0, 120);
}

function sanitizeVipId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  return cleaned.length >= 3 ? cleaned : null;
}

function sanitizeVipUnlockedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    const clean = sanitizeVipId(id);
    if (clean && !out.includes(clean)) {
      out.push(clean);
    }
  }
  return out.slice(0, 140);
}

function sanitizeVipDecorCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const clean = sanitizeVipId(k);
    const n = Math.floor(Number(v));
    if (clean && Number.isFinite(n) && n > 0) {
      out[clean] = Math.min(99, n);
    }
  }
  return out;
}

function saveLocalPlayerRecord(profile: Omit<CloudPlayerProfile, 'updatedAt' | '_migratedFromLegacy'>): void {
  const map = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
  const existing = map[profile.playerId];
  const mergedHasBoat = Boolean(profile.hasBoat ?? existing?.hasBoat ?? (profile.ownedBoats && profile.ownedBoats.length > 0));
  const ownedBoats = sanitizeBoatList(profile.ownedBoats ?? existing?.ownedBoats, mergedHasBoat);
  const equippedBoat = sanitizeEquippedBoat(
    profile.equippedBoat !== undefined ? profile.equippedBoat : existing?.equippedBoat,
    mergedHasBoat
  );
  map[profile.playerId] = {
    playerId: profile.playerId,
    playerName: sanitizeName(profile.playerName, 20),
    gold: Math.max(0, Math.min(9999999, Math.round(profile.gold))),
    x: Math.max(0, Math.min(4000, Math.round(profile.x * 10) / 10)),
    y: Math.max(0, Math.min(4000, Math.round(profile.y * 10) / 10)),
    dir: profile.dir,
    appearance: sanitizeAppearance(profile.appearance),
    ownedItems: profile.ownedItems.slice(0, 50).map(sanitizeClothingItem),
    inventory: sanitizeInventory(profile.inventory),
    hasBoat: mergedHasBoat || ownedBoats.length > 0,
    ownedBoats,
    equippedBoat,
    ownedPets: sanitizePetList(profile.ownedPets ?? existing?.ownedPets),
    equippedPet: sanitizeEquippedPet(profile.equippedPet !== undefined ? profile.equippedPet : existing?.equippedPet),
    ownedMagazineIds: sanitizeMagazineIds(profile.ownedMagazineIds ?? existing?.ownedMagazineIds),
    vipUnlockedIds: sanitizeVipUnlockedIds(profile.vipUnlockedIds ?? existing?.vipUnlockedIds),
    vipDecorCounts: sanitizeVipDecorCounts(profile.vipDecorCounts ?? existing?.vipDecorCounts),
    equippedVipTitle: sanitizeVipId(
      profile.equippedVipTitle !== undefined ? profile.equippedVipTitle : existing?.equippedVipTitle
    ),
    equippedPetAccessory: sanitizeVipId(
      profile.equippedPetAccessory !== undefined ? profile.equippedPetAccessory : existing?.equippedPetAccessory
    ),
    equippedBoatSkin: sanitizeVipId(
      profile.equippedBoatSkin !== undefined ? profile.equippedBoatSkin : existing?.equippedBoatSkin
    ),
    vipWinsCount: Math.max(0, Math.round(Number(profile.vipWinsCount ?? existing?.vipWinsCount ?? 0))),
    totalSales: Math.max(0, Math.round(Number(profile.totalSales ?? existing?.totalSales ?? 0))),
    editionMintCounts: sanitizeMintCounts(profile.editionMintCounts ?? existing?.editionMintCounts),
    lastSale: profile.lastSale ?? existing?.lastSale ?? null,
    updatedAtMs: Date.now(),
  };
  writeJsonRecord(LOCAL_PLAYERS_KEY, map);
  notifyTopic('players');
}

function readLocalPlayerProfile(playerId: string): CloudPlayerProfile | null {
  const map = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
  const rec = map[playerId];
  if (!rec) return null;
  return {
    ...rec,
    inventory: sanitizeInventory(rec.inventory),
    ownedBoats: sanitizeBoatList(rec.ownedBoats, rec.hasBoat),
    equippedBoat: sanitizeEquippedBoat(rec.equippedBoat, rec.hasBoat),
    ownedPets: sanitizePetList(rec.ownedPets),
    equippedPet: sanitizeEquippedPet(rec.equippedPet),
    ownedMagazineIds: sanitizeMagazineIds(rec.ownedMagazineIds),
    vipUnlockedIds: sanitizeVipUnlockedIds(rec.vipUnlockedIds),
    vipDecorCounts: sanitizeVipDecorCounts(rec.vipDecorCounts),
    equippedVipTitle: sanitizeVipId(rec.equippedVipTitle),
    equippedPetAccessory: sanitizeVipId(rec.equippedPetAccessory),
    equippedBoatSkin: sanitizeVipId(rec.equippedBoatSkin),
    vipWinsCount: Math.max(0, Math.round(Number(rec.vipWinsCount || 0))),
    updatedAt: makeLocalTimestamp(rec.updatedAtMs || Date.now()),
  };
}

function saveLocalOnlineRecord(presence: Omit<CloudOnlinePlayer, 'updatedAt'>): void {
  const map = readJsonRecord<Record<string, LocalOnlineRecord>>(LOCAL_ONLINE_KEY, {});
  const now = Date.now();
  // Prune stale local records older than 12s while saving
  for (const [id, entry] of Object.entries(map)) {
    if (now - (entry.updatedAtMs || 0) > 12000) {
      delete map[id];
    }
  }
  map[presence.playerId] = {
    playerId: presence.playerId,
    name: sanitizeName(presence.name, 20),
    x: Math.max(0, Math.min(4000, Math.round(presence.x * 10) / 10)),
    y: Math.max(0, Math.min(4000, Math.round(presence.y * 10) / 10)),
    dir: presence.dir,
    isMoving: Boolean(presence.isMoving),
    appearance: sanitizeAppearance(presence.appearance),
    chatText: presence.chatText ? String(presence.chatText).slice(0, 48) : null,
    chatAt: presence.chatAt || null,
    emoteEmoji: presence.emoteEmoji ? String(presence.emoteEmoji).slice(0, 8) : null,
    emoteAt: presence.emoteAt || null,
    isBoating: Boolean(presence.isBoating),
    equippedBoat: sanitizeEquippedBoat(presence.equippedBoat, presence.isBoating),
    equippedPet: sanitizeEquippedPet(presence.equippedPet),
    vipTitle: sanitizeVipId(presence.vipTitle),
    petAccessory: sanitizeVipId(presence.petAccessory),
    boatSkin: sanitizeVipId(presence.boatSkin),
    runwayShowAt: presence.runwayShowAt || null,
    updatedAtMs: now,
  };
  writeJsonRecord(LOCAL_ONLINE_KEY, map);
  notifyTopic('online_players');
}

function readLocalOnlinePlayers(): CloudOnlinePlayer[] {
  const map = readJsonRecord<Record<string, LocalOnlineRecord>>(LOCAL_ONLINE_KEY, {});
  const now = Date.now();
  const list: CloudOnlinePlayer[] = [];
  let pruned = false;
  for (const [id, entry] of Object.entries(map)) {
    if (now - (entry.updatedAtMs || 0) > 12000) {
      delete map[id];
      pruned = true;
      continue;
    }
    list.push({
      playerId: entry.playerId,
      name: entry.name,
      x: entry.x,
      y: entry.y,
      dir: entry.dir,
      isMoving: entry.isMoving,
      appearance: entry.appearance,
      chatText: entry.chatText ?? null,
      chatAt: entry.chatAt ?? null,
      emoteEmoji: entry.emoteEmoji ?? null,
      emoteAt: entry.emoteAt ?? null,
      isBoating: Boolean(entry.isBoating),
      equippedBoat: sanitizeEquippedBoat(entry.equippedBoat, entry.isBoating),
      equippedPet: sanitizeEquippedPet(entry.equippedPet),
      vipTitle: sanitizeVipId(entry.vipTitle),
      petAccessory: sanitizeVipId(entry.petAccessory),
      boatSkin: sanitizeVipId(entry.boatSkin),
      runwayShowAt: entry.runwayShowAt ?? null,
      updatedAt: makeLocalTimestamp(entry.updatedAtMs),
    });
  }
  if (pruned) {
    writeJsonRecord(LOCAL_ONLINE_KEY, map);
  }
  return list;
}

function saveLocalStructureRecord(
  structure: Omit<CloudWorldStructure, 'createdAt' | 'updatedAt'>
): void {
  const map = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  const existing = map[structure.id];
  const now = Date.now();
  const cleanListing = structure.listing
    ? {
        item: sanitizeClothingItem(structure.listing.item),
        price: Math.max(50, Math.min(50000, Math.round(structure.listing.price))),
      }
    : null;
  map[structure.id] = {
    id: structure.id,
    kind: structure.kind,
    col: structure.col,
    row: structure.row,
    ownerId: structure.ownerId,
    ownerName: sanitizeName(structure.ownerName, 20),
    tier: structure.kind === 'boutique_shop' ? clampShopTier(structure.tier) : undefined,
    vipRewardId: sanitizeVipId(structure.vipRewardId ?? existing?.vipRewardId),
    listing: cleanListing,
    createdAtMs: existing?.createdAtMs || now,
    updatedAtMs: now,
  };
  writeJsonRecord(LOCAL_STRUCTURES_KEY, map);
  notifyTopic('world_structures');
}

function readLocalStructures(): CloudWorldStructure[] {
  const map = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  return Object.values(map).map((s) => ({
    id: s.id,
    kind: s.kind,
    col: s.col,
    row: s.row,
    ownerId: s.ownerId,
    ownerName: s.ownerName,
    tier: s.kind === 'boutique_shop' ? clampShopTier(s.tier) : undefined,
    vipRewardId: sanitizeVipId(s.vipRewardId),
    listing: s.listing ?? null,
    createdAt: makeLocalTimestamp(s.createdAtMs || Date.now()),
    updatedAt: makeLocalTimestamp(s.updatedAtMs || Date.now()),
  }));
}

export async function flushPendingSyncToCloud(): Promise<void> {
  if (!db || flushingPending) return;
  const queue = readPendingSync();
  if (queue.playerIds.length === 0 && queue.structureIds.length === 0) return;

  flushingPending = true;
  try {
    const activeDb = db;
    await ensureAnonymousAuth();

    for (const pid of queue.playerIds) {
      const localProfile = readLocalPlayerProfile(pid);
      if (!localProfile) {
        clearPendingPlayer(pid);
        continue;
      }
      try {
        await withTimeout(
          setDoc(
            doc(activeDb, 'players', pid),
            {
              playerId: localProfile.playerId,
              playerName: sanitizeName(localProfile.playerName, 20),
              gold: Math.max(0, Math.min(9999999, Math.round(localProfile.gold))),
              x: Math.max(0, Math.min(4000, Math.round(localProfile.x * 10) / 10)),
              y: Math.max(0, Math.min(4000, Math.round(localProfile.y * 10) / 10)),
              dir: localProfile.dir,
              appearance: sanitizeAppearance(localProfile.appearance),
              ownedItems: localProfile.ownedItems.slice(0, 50).map(sanitizeClothingItem),
              inventory: sanitizeInventory(localProfile.inventory),
              hasBoat: Boolean(localProfile.hasBoat || (localProfile.ownedBoats && localProfile.ownedBoats.length > 0)),
              ownedBoats: sanitizeBoatList(localProfile.ownedBoats, localProfile.hasBoat),
              equippedBoat: sanitizeEquippedBoat(localProfile.equippedBoat, localProfile.hasBoat),
              ownedPets: sanitizePetList(localProfile.ownedPets),
              equippedPet: sanitizeEquippedPet(localProfile.equippedPet),
              ownedMagazineIds: sanitizeMagazineIds(localProfile.ownedMagazineIds),
              vipUnlockedIds: sanitizeVipUnlockedIds(localProfile.vipUnlockedIds),
              vipDecorCounts: sanitizeVipDecorCounts(localProfile.vipDecorCounts),
              equippedVipTitle: sanitizeVipId(localProfile.equippedVipTitle),
              equippedPetAccessory: sanitizeVipId(localProfile.equippedPetAccessory),
              equippedBoatSkin: sanitizeVipId(localProfile.equippedBoatSkin),
              vipWinsCount: Math.max(0, Math.round(Number(localProfile.vipWinsCount || 0))),
              totalSales: Math.max(0, Math.round(Number(localProfile.totalSales || 0))),
              editionMintCounts: sanitizeMintCounts(localProfile.editionMintCounts),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ),
          4000,
          'flushPendingPlayer'
        );
        clearPendingPlayer(pid);
      } catch (err) {
        logCloudFallbackError('flushPendingPlayer', OperationType.WRITE, `players/${pid}`, err);
        setCloudHealthy(false);
        return;
      }
    }

    const localStructs = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
    for (const sid of queue.structureIds) {
      const st = localStructs[sid];
      if (!st) {
        clearPendingStructure(sid);
        continue;
      }
      try {
        await withTimeout(
          setDoc(
            doc(activeDb, 'world_structures', sid),
            {
              id: st.id,
              kind: st.kind,
              col: st.col,
              row: st.row,
              ownerId: st.ownerId,
              ownerName: sanitizeName(st.ownerName, 20),
              ...(st.kind === 'boutique_shop' ? { tier: clampShopTier(st.tier) } : {}),
              ...(st.vipRewardId ? { vipRewardId: sanitizeVipId(st.vipRewardId) } : {}),
              listing: st.listing ?? null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ),
          4000,
          'flushPendingStructure'
        );
        clearPendingStructure(sid);
      } catch (err) {
        logCloudFallbackError('flushPendingStructure', OperationType.WRITE, `world_structures/${sid}`, err);
        setCloudHealthy(false);
        return;
      }
    }
  } finally {
    flushingPending = false;
  }
}

export function getOrCreatePlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{3,64}$/.test(existing)) {
      return existing;
    }
    const generated = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PLAYER_ID_KEY, generated);
    return generated;
  } catch {
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function getStoredNickname(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function storeNickname(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // ignore storage errors
  }
}

function sanitizeName(name: string, maxLen = 20): string {
  const trimmed = String(name || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : 'Islander';
}

function sanitizeUid(uid: string): string {
  const cleaned = String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return cleaned.length >= 3 ? cleaned : generateItemUid('itm');
}

const VALID_SLOTS: ClothingSlot[] = ['hat', 'top', 'bottom', 'dress', 'shoes'];
const VALID_SOURCES: ClothingSource[] = ['starter', 'custom', 'luxury', 'boutique'];
const VALID_TIERS: EditionTier[] = ['unique', 'limited', 'standard'];

export function sanitizeClothingItem(item: ClothingItem): ClothingItem {
  const slot: ClothingSlot = VALID_SLOTS.includes(item.slot) ? item.slot : 'dress';
  const source: ClothingSource = VALID_SOURCES.includes(item.source) ? item.source : 'custom';
  const palette =
    Array.isArray(item.palette) && item.palette.length > 0
      ? item.palette.slice(0, 32).map((c) => String(c || '#26140e').slice(0, 16))
      : ['#26140e'];
  const pixels = String(item.pixels || '').padEnd(256, '.').slice(0, 256);

  const sanitized: ClothingItem = {
    uid: sanitizeUid(item.uid),
    name: sanitizeName(item.name || 'Custom Piece', 32),
    slot,
    creatorName: sanitizeName(item.creatorName || 'Islander', 20),
    source,
    palette,
    pixels,
    stats: {
      speedPct: Math.max(0, Math.min(100, Math.floor(Number(item.stats?.speedPct) || 0))),
      harvestBonus: Math.max(0, Math.min(10, Math.floor(Number(item.stats?.harvestBonus) || 0))),
      seaRes: Math.max(0, Math.min(10, Math.floor(Number(item.stats?.seaRes) || 0))),
    },
  };

  if (item.effect && VALID_OUTFIT_EFFECTS.includes(item.effect as OutfitEffectType)) {
    sanitized.effect = item.effect as OutfitEffectType;
  }
  const cleanShimmer = normalizeShimmerPixels(item.shimmerPixels);
  if (cleanShimmer) {
    sanitized.shimmerPixels = cleanShimmer;
  }
  if (typeof item.editionId === 'string' && item.editionId.trim().length > 0) {
    sanitized.editionId = item.editionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  }
  if (typeof item.editionSerial === 'number' && Number.isFinite(item.editionSerial) && item.editionSerial >= 1) {
    sanitized.editionSerial = Math.floor(item.editionSerial);
  }
  if (typeof item.editionTotal === 'number' && Number.isFinite(item.editionTotal) && item.editionTotal >= 1) {
    sanitized.editionTotal = Math.floor(item.editionTotal);
  }
  if (item.editionTier && VALID_TIERS.includes(item.editionTier)) {
    sanitized.editionTier = item.editionTier;
  }
  const cleanReactive = sanitizeReactiveConfig(item.reactive);
  if (cleanReactive) {
    sanitized.reactive = cleanReactive;
  }

  return sanitized;
}

function sanitizeSlotItem(item: ClothingItem | null | undefined): ClothingItem | null {
  if (!item || typeof item !== 'object' || typeof item.pixels !== 'string') return null;
  return sanitizeClothingItem(item);
}

function sanitizeAppearance(appData: CloudAppearance): CloudAppearance {
  return {
    skinId: String(appData.skinId || 'peach').slice(0, 32),
    hairStyle: String(appData.hairStyle || 'long_wavy').slice(0, 32),
    hairColorId: String(appData.hairColorId || 'chestnut').slice(0, 32),
    hat: sanitizeSlotItem(appData.hat),
    top: sanitizeSlotItem(appData.top),
    bottom: sanitizeSlotItem(appData.bottom),
    dress: sanitizeSlotItem(appData.dress),
    shoes: sanitizeSlotItem(appData.shoes),
  };
}

function sanitizeInventory(inv: Partial<CloudInventory> | CloudInventory): CloudInventory {
  const clamp = (n: unknown) => Math.max(0, Math.min(999999, Math.floor(Number(n) || 0)));
  return {
    wood: clamp(inv.wood),
    fabric: clamp(inv.fabric),
    pearls: clamp(inv.pearls),
    dyes: clamp(inv.dyes),
    golden_pearls: clamp(inv.golden_pearls),
    royal_silk: clamp(inv.royal_silk),
    glowing_pearls: clamp(inv.glowing_pearls),
    starlight_coral: clamp(inv.starlight_coral),
    seafoam_essence: clamp(inv.seafoam_essence),
    sunset_amber: clamp(inv.sunset_amber),
    dock_plank: clamp(inv.dock_plank),
    shop_wall: clamp(inv.shop_wall),
    mannequin: clamp(inv.mannequin),
    changing_booth: clamp(inv.changing_booth),
    vanity_mirror: clamp(inv.vanity_mirror),
    clothing_rack: clamp(inv.clothing_rack),
    cash_counter: clamp(inv.cash_counter),
    potted_plant: clamp(inv.potted_plant),
    lantern_post: clamp(inv.lantern_post),
    rug_pink: clamp(inv.rug_pink),
    rug_teal: clamp(inv.rug_teal),
    rug_gold: clamp(inv.rug_gold),
  };
}

export async function fetchPlayerProfile(playerId: string): Promise<CloudPlayerProfile | null> {
  const path = `players/${playerId}`;
  const localCached = readLocalPlayerProfile(playerId);

  if (!db) {
    return localCached;
  }

  await ensureAnonymousAuth();

  try {
    const snap = await withTimeout(getDoc(doc(db, 'players', playerId)), 4000, 'fetchPlayerProfile');
    setCloudHealthy(true);

    if (!snap.exists()) {
      return localCached;
    }

    const raw = snap.data() as Record<string, unknown>;

    // Graceful migration if existing player document uses legacy Phase 4 schema
    if (!Array.isArray(raw.ownedItems) || !raw.appearance || 'outfitStyle' in (raw.appearance as object)) {
      const starter = createStarterClothingItems();
      const oldApp = (raw.appearance || {}) as Record<string, string>;
      const migrated: CloudPlayerProfile = {
        playerId: String(raw.playerId || playerId),
        playerName: sanitizeName(String(raw.playerName || 'Islander'), 20),
        gold: Math.max(0, Math.min(9999999, Math.round(Number(raw.gold) || 1000))),
        x: Number(raw.x) || 68 * 16 + 8,
        y: Number(raw.y) || 58 * 16 + 8,
        dir: (['down', 'up', 'left', 'right'].includes(String(raw.dir))
          ? raw.dir
          : 'down') as CloudPlayerProfile['dir'],
        appearance: {
          skinId: oldApp.skinId || 'peach',
          hairStyle: oldApp.hairStyle || 'long_wavy',
          hairColorId: oldApp.hairColorId || 'chestnut',
          hat: starter.hat,
          top: null,
          bottom: null,
          dress: starter.dress,
          shoes: starter.shoes,
        },
        ownedItems: [starter.dress, starter.hat, starter.shoes, starter.top, starter.bottom],
        inventory: sanitizeInventory((raw.inventory || {}) as CloudInventory),
        lastSale: (raw.lastSale as CloudLastSale | null | undefined) || null,
        _migratedFromLegacy: true,
      };
      saveLocalPlayerRecord(migrated);
      return migrated;
    }

    const rawProfile = raw as unknown as CloudPlayerProfile;
    saveLocalPlayerRecord(rawProfile);
    return readLocalPlayerProfile(playerId) || {
      ...rawProfile,
      inventory: sanitizeInventory(rawProfile.inventory || {}),
      ownedBoats: sanitizeBoatList(rawProfile.ownedBoats, rawProfile.hasBoat),
      equippedBoat: sanitizeEquippedBoat(rawProfile.equippedBoat, rawProfile.hasBoat),
      ownedPets: sanitizePetList(rawProfile.ownedPets),
      equippedPet: sanitizeEquippedPet(rawProfile.equippedPet),
    };
  } catch (error) {
    logCloudFallbackError('fetchPlayerProfile', OperationType.GET, path, error);
    setCloudHealthy(false);
    return localCached;
  }
}

export async function savePlayerProfile(
  profile: Omit<CloudPlayerProfile, 'updatedAt' | '_migratedFromLegacy'>,
  mode: 'create' | 'update' | 'migrate' = 'update'
): Promise<boolean> {
  const path = `players/${profile.playerId}`;
  saveLocalPlayerRecord(profile);

  if (!db) {
    markPendingPlayer(profile.playerId);
    setCloudHealthy(false);
    return false;
  }

  const ownedBoats = sanitizeBoatList(profile.ownedBoats, profile.hasBoat);
  const equippedBoat = sanitizeEquippedBoat(profile.equippedBoat, profile.hasBoat);
  const payload = {
    playerId: profile.playerId,
    playerName: sanitizeName(profile.playerName, 20),
    gold: Math.max(0, Math.min(9999999, Math.round(profile.gold))),
    x: Math.max(0, Math.min(4000, Math.round(profile.x * 10) / 10)),
    y: Math.max(0, Math.min(4000, Math.round(profile.y * 10) / 10)),
    dir: profile.dir,
    appearance: sanitizeAppearance(profile.appearance),
    ownedItems: profile.ownedItems.slice(0, 50).map(sanitizeClothingItem),
    inventory: sanitizeInventory(profile.inventory),
    hasBoat: Boolean(profile.hasBoat || ownedBoats.length > 0),
    ownedBoats,
    equippedBoat,
    ownedPets: sanitizePetList(profile.ownedPets),
    equippedPet: sanitizeEquippedPet(profile.equippedPet),
    ownedMagazineIds: sanitizeMagazineIds(profile.ownedMagazineIds),
    vipUnlockedIds: sanitizeVipUnlockedIds(profile.vipUnlockedIds),
    vipDecorCounts: sanitizeVipDecorCounts(profile.vipDecorCounts),
    equippedVipTitle: sanitizeVipId(profile.equippedVipTitle),
    equippedPetAccessory: sanitizeVipId(profile.equippedPetAccessory),
    equippedBoatSkin: sanitizeVipId(profile.equippedBoatSkin),
    vipWinsCount: Math.max(0, Math.round(Number(profile.vipWinsCount || 0))),
    totalSales: Math.max(0, Math.round(Number(profile.totalSales || 0))),
    editionMintCounts: sanitizeMintCounts(profile.editionMintCounts),
    updatedAt: serverTimestamp(),
  };

  try {
    if (mode === 'create' || mode === 'migrate') {
      await withTimeout(setDoc(doc(db, 'players', profile.playerId), payload), 4000, 'savePlayerProfile');
    } else {
      try {
        await withTimeout(updateDoc(doc(db, 'players', profile.playerId), payload), 4000, 'savePlayerProfile');
      } catch (updateErr) {
        const { code } = extractErrorDetails(updateErr);
        if (code === 'not-found') {
          await withTimeout(setDoc(doc(db, 'players', profile.playerId), payload), 4000, 'savePlayerProfileCreate');
        } else {
          throw updateErr;
        }
      }
    }
    clearPendingPlayer(profile.playerId);
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError(
      'savePlayerProfile',
      mode === 'create' ? OperationType.CREATE : OperationType.UPDATE,
      path,
      error
    );
    markPendingPlayer(profile.playerId);
    setCloudHealthy(false);
    return false;
  }
}

export function subscribePlayerProfile(
  playerId: string,
  onData: (profile: CloudPlayerProfile) => void
): Unsubscribe {
  const path = `players/${playerId}`;
  const unsubLocal = subscribeTopic('players', () => {
    const localProfile = readLocalPlayerProfile(playerId);
    if (localProfile) onData(localProfile);
  });

  if (!db) {
    return unsubLocal;
  }

  const unsubCloud = onSnapshot(
    doc(db, 'players', playerId),
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Record<string, unknown>;
        if (Array.isArray(raw.ownedItems)) {
          const profile = raw as unknown as CloudPlayerProfile;
          saveLocalPlayerRecord(profile);
          onData(profile);
        }
      }
    },
    (error) => {
      logCloudFallbackError('subscribePlayerProfile', OperationType.GET, path, error);
      setCloudHealthy(false);
    }
  );

  return () => {
    unsubLocal();
    unsubCloud();
  };
}

export async function syncOnlinePlayer(presence: Omit<CloudOnlinePlayer, 'updatedAt'>): Promise<boolean> {
  const path = `online_players/${presence.playerId}`;
  saveLocalOnlineRecord(presence);

  if (!db) {
    setCloudHealthy(false);
    return false;
  }

  try {
    await withTimeout(
      setDoc(doc(db, 'online_players', presence.playerId), {
        playerId: presence.playerId,
        name: sanitizeName(presence.name, 20),
        x: Math.max(0, Math.min(4000, Math.round(presence.x * 10) / 10)),
        y: Math.max(0, Math.min(4000, Math.round(presence.y * 10) / 10)),
        dir: presence.dir,
        isMoving: Boolean(presence.isMoving),
        appearance: sanitizeAppearance(presence.appearance),
        chatText: presence.chatText ? String(presence.chatText).slice(0, 48) : null,
        chatAt: presence.chatAt || null,
        emoteEmoji: presence.emoteEmoji ? String(presence.emoteEmoji).slice(0, 8) : null,
        emoteAt: presence.emoteAt || null,
        isBoating: Boolean(presence.isBoating),
        equippedBoat: sanitizeEquippedBoat(presence.equippedBoat, presence.isBoating),
        equippedPet: sanitizeEquippedPet(presence.equippedPet),
        vipTitle: sanitizeVipId(presence.vipTitle),
        petAccessory: sanitizeVipId(presence.petAccessory),
        boatSkin: sanitizeVipId(presence.boatSkin),
        runwayShowAt: presence.runwayShowAt || null,
        updatedAt: serverTimestamp(),
      }),
      3500,
      'syncOnlinePlayer'
    );
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError('syncOnlinePlayer', OperationType.WRITE, path, error);
    setCloudHealthy(false);
    return false;
  }
}

export async function removeOnlinePlayer(playerId: string): Promise<void> {
  try {
    const map = readJsonRecord<Record<string, LocalOnlineRecord>>(LOCAL_ONLINE_KEY, {});
    if (map[playerId]) {
      delete map[playerId];
      writeJsonRecord(LOCAL_ONLINE_KEY, map);
      notifyTopic('online_players');
    }
  } catch {
    // ignore local cleanup failures
  }

  if (!db) return;

  try {
    await deleteDoc(doc(db, 'online_players', playerId));
  } catch {
    // ignore cleanup failures during tab unload
  }
}

export function subscribeOnlinePlayers(
  onUpdate: (players: CloudOnlinePlayer[]) => void
): Unsubscribe {
  const path = 'online_players';
  let latestCloudPlayers: CloudOnlinePlayer[] = [];

  const emitMerged = () => {
    const merged = new Map<string, CloudOnlinePlayer>();
    for (const lp of readLocalOnlinePlayers()) {
      merged.set(lp.playerId, lp);
    }
    for (const cp of latestCloudPlayers) {
      const existing = merged.get(cp.playerId);
      const cpMs = cp.updatedAt?.toMillis?.() ?? 0;
      const exMs = existing?.updatedAt?.toMillis?.() ?? 0;
      if (!existing || cpMs >= exMs) {
        merged.set(cp.playerId, cp);
      }
    }
    onUpdate(Array.from(merged.values()));
  };

  // Emit initial local session peers immediately
  emitMerged();

  const unsubLocal = subscribeTopic('online_players', emitMerged);

  if (!db) {
    return unsubLocal;
  }

  const unsubCloud = onSnapshot(
    collection(db, 'online_players'),
    (snap) => {
      const list: CloudOnlinePlayer[] = [];
      snap.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const appData = raw.appearance as Record<string, unknown> | undefined;
        // Skip legacy presence docs missing slot fields
        if (!appData || !('hat' in appData)) return;
        list.push(raw as unknown as CloudOnlinePlayer);
      });
      latestCloudPlayers = list;
      setCloudHealthy(true);
      emitMerged();
    },
    (error) => {
      logCloudFallbackError('subscribeOnlinePlayers', OperationType.LIST, path, error);
      setCloudHealthy(false);
      emitMerged();
    }
  );

  return () => {
    unsubLocal();
    unsubCloud();
  };
}

export async function createWorldStructure(
  structure: Omit<CloudWorldStructure, 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  const path = `world_structures/${structure.id}`;
  saveLocalStructureRecord(structure);

  if (!db) {
    markPendingStructure(structure.id);
    setCloudHealthy(false);
    return false;
  }

  const cleanListing = structure.listing
    ? {
        item: sanitizeClothingItem(structure.listing.item),
        price: Math.max(50, Math.min(50000, Math.round(structure.listing.price))),
      }
    : null;

  try {
    await withTimeout(
      setDoc(doc(db, 'world_structures', structure.id), {
        id: structure.id,
        kind: structure.kind,
        col: structure.col,
        row: structure.row,
        ownerId: structure.ownerId,
        ownerName: sanitizeName(structure.ownerName, 20),
        ...(structure.kind === 'boutique_shop' ? { tier: clampShopTier(structure.tier) } : {}),
        ...(structure.vipRewardId ? { vipRewardId: sanitizeVipId(structure.vipRewardId) } : {}),
        listing: cleanListing,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      4000,
      'createWorldStructure'
    );
    clearPendingStructure(structure.id);
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError('createWorldStructure', OperationType.CREATE, path, error);
    markPendingStructure(structure.id);
    setCloudHealthy(false);
    return false;
  }
}

export async function upgradeWorldShopTier(structureId: string, newTier: ShopTier): Promise<boolean> {
  const path = `world_structures/${structureId}`;
  const cleanTier = clampShopTier(newTier);
  const localMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  if (localMap[structureId]) {
    localMap[structureId] = {
      ...localMap[structureId],
      tier: cleanTier,
      updatedAtMs: Date.now(),
    };
    writeJsonRecord(LOCAL_STRUCTURES_KEY, localMap);
    notifyTopic('world_structures');
  }

  if (!db) {
    markPendingStructure(structureId);
    setCloudHealthy(false);
    return false;
  }

  try {
    try {
      await withTimeout(
        updateDoc(doc(db, 'world_structures', structureId), {
          tier: cleanTier,
          updatedAt: serverTimestamp(),
        }),
        4000,
        'upgradeWorldShopTier'
      );
    } catch (updateErr) {
      const { code } = extractErrorDetails(updateErr);
      const localStruct = localMap[structureId];
      if (code === 'not-found' && localStruct) {
        await withTimeout(
          setDoc(doc(db, 'world_structures', structureId), {
            id: localStruct.id,
            kind: localStruct.kind,
            col: localStruct.col,
            row: localStruct.row,
            ownerId: localStruct.ownerId,
            ownerName: sanitizeName(localStruct.ownerName, 20),
            tier: cleanTier,
            listing: localStruct.listing ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          4000,
          'upgradeWorldShopTierCreate'
        );
      } else {
        throw updateErr;
      }
    }
    clearPendingStructure(structureId);
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError('upgradeWorldShopTier', OperationType.UPDATE, path, error);
    markPendingStructure(structureId);
    setCloudHealthy(false);
    return false;
  }
}

export async function relocateWorldShopAndContents(
  updates: Array<{
    id: string;
    kind: WorldStructureKind;
    col: number;
    row: number;
    ownerId: string;
    ownerName: string;
    tier?: ShopTier;
    vipRewardId?: string | null;
    listing?: CloudListing | null;
  }>
): Promise<boolean> {
  if (updates.length === 0) return true;
  const now = Date.now();
  const localMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  for (const u of updates) {
    const prev = localMap[u.id];
    const cleanListing = u.listing
      ? {
          item: sanitizeClothingItem(u.listing.item),
          price: Math.max(50, Math.min(50000, Math.round(u.listing.price))),
        }
      : prev?.listing ?? null;
    localMap[u.id] = {
      id: u.id,
      kind: u.kind,
      col: u.col,
      row: u.row,
      ownerId: u.ownerId,
      ownerName: sanitizeName(u.ownerName, 20),
      tier: u.kind === 'boutique_shop' ? clampShopTier(u.tier ?? prev?.tier) : undefined,
      vipRewardId: sanitizeVipId(u.vipRewardId ?? prev?.vipRewardId),
      listing: cleanListing,
      createdAtMs: prev?.createdAtMs || now,
      updatedAtMs: now,
    };
  }
  writeJsonRecord(LOCAL_STRUCTURES_KEY, localMap);
  notifyTopic('world_structures');

  if (!db) {
    updates.forEach((u) => markPendingStructure(u.id));
    setCloudHealthy(false);
    return false;
  }

  try {
    const activeDb = db;
    const batch = writeBatch(activeDb);
    for (const u of updates) {
      const rec = localMap[u.id];
      batch.set(
        doc(activeDb, 'world_structures', u.id),
        {
          id: rec.id,
          kind: rec.kind,
          col: rec.col,
          row: rec.row,
          ownerId: rec.ownerId,
          ownerName: rec.ownerName,
          ...(rec.kind === 'boutique_shop' ? { tier: clampShopTier(rec.tier) } : {}),
          ...(rec.vipRewardId ? { vipRewardId: sanitizeVipId(rec.vipRewardId) } : {}),
          listing: rec.listing ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    await withTimeout(batch.commit(), 5000, 'relocateWorldShopAndContents');
    updates.forEach((u) => clearPendingStructure(u.id));
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError(
      'relocateWorldShopAndContents',
      OperationType.WRITE,
      `world_structures/${updates[0].id}`,
      error
    );
    updates.forEach((u) => markPendingStructure(u.id));
    setCloudHealthy(false);
    return false;
  }
}

export async function updateMannequinListing(
  structureId: string,
  listing: CloudListing | null
): Promise<boolean> {
  const path = `world_structures/${structureId}`;
  const cleanListing = listing
    ? {
        item: sanitizeClothingItem(listing.item),
        price: Math.max(50, Math.min(50000, Math.round(listing.price))),
      }
    : null;

  const localMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  if (localMap[structureId]) {
    localMap[structureId] = {
      ...localMap[structureId],
      listing: cleanListing,
      updatedAtMs: Date.now(),
    };
    writeJsonRecord(LOCAL_STRUCTURES_KEY, localMap);
    notifyTopic('world_structures');
  }

  if (!db) {
    markPendingStructure(structureId);
    setCloudHealthy(false);
    return false;
  }

  try {
    try {
      await withTimeout(
        updateDoc(doc(db, 'world_structures', structureId), {
          listing: cleanListing,
          updatedAt: serverTimestamp(),
        }),
        4000,
        'updateMannequinListing'
      );
    } catch (updateErr) {
      const { code } = extractErrorDetails(updateErr);
      const localStruct = localMap[structureId];
      if (code === 'not-found' && localStruct) {
        await withTimeout(
          setDoc(doc(db, 'world_structures', structureId), {
            id: localStruct.id,
            kind: localStruct.kind,
            col: localStruct.col,
            row: localStruct.row,
            ownerId: localStruct.ownerId,
            ownerName: sanitizeName(localStruct.ownerName, 20),
            listing: cleanListing,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          4000,
          'updateMannequinListingCreate'
        );
      } else {
        throw updateErr;
      }
    }
    clearPendingStructure(structureId);
    setCloudHealthy(true);
    return true;
  } catch (error) {
    logCloudFallbackError('updateMannequinListing', OperationType.UPDATE, path, error);
    markPendingStructure(structureId);
    setCloudHealthy(false);
    return false;
  }
}

export function subscribeWorldStructures(
  onUpdate: (structures: CloudWorldStructure[]) => void
): Unsubscribe {
  const path = 'world_structures';
  let latestCloudStructures: CloudWorldStructure[] = [];

  const emitMerged = () => {
    const merged = new Map<string, CloudWorldStructure>();
    for (const cs of latestCloudStructures) {
      merged.set(cs.id, cs);
    }
    const pending = readPendingSync();
    for (const ls of readLocalStructures()) {
      // Keep locally created/edited pending structures or all local structures when cloud is empty
      if (latestCloudStructures.length === 0 || pending.structureIds.includes(ls.id) || !merged.has(ls.id)) {
        merged.set(ls.id, ls);
      }
    }
    onUpdate(Array.from(merged.values()));
  };

  // Emit local cached structures immediately so world renders right away
  emitMerged();

  const unsubLocal = subscribeTopic('world_structures', emitMerged);

  if (!db) {
    return unsubLocal;
  }

  const unsubCloud = onSnapshot(
    collection(db, 'world_structures'),
    (snap) => {
      const list: CloudWorldStructure[] = [];
      const localMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
      const pending = readPendingSync();

      snap.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const rawListing = raw.listing as Record<string, unknown> | null | undefined;
        let normalizedListing: CloudListing | null = null;
        if (rawListing && typeof rawListing === 'object' && 'item' in rawListing && rawListing.item) {
          normalizedListing = {
            item: sanitizeClothingItem(rawListing.item as ClothingItem),
            price: Number(rawListing.price) || 100,
          };
        }
        const structObj: CloudWorldStructure = {
          ...(raw as unknown as CloudWorldStructure),
          tier: raw.kind === 'boutique_shop' ? clampShopTier(raw.tier) : undefined,
          vipRewardId: sanitizeVipId(raw.vipRewardId),
          listing: normalizedListing,
        };
        list.push(structObj);

        if (!pending.structureIds.includes(structObj.id)) {
          localMap[structObj.id] = {
            id: structObj.id,
            kind: structObj.kind,
            col: structObj.col,
            row: structObj.row,
            ownerId: structObj.ownerId,
            ownerName: structObj.ownerName,
            tier: structObj.kind === 'boutique_shop' ? clampShopTier(structObj.tier) : undefined,
            vipRewardId: sanitizeVipId(structObj.vipRewardId),
            listing: normalizedListing,
            createdAtMs: structObj.createdAt?.toMillis?.() || Date.now(),
            updatedAtMs: structObj.updatedAt?.toMillis?.() || Date.now(),
          };
        }
      });
      writeJsonRecord(LOCAL_STRUCTURES_KEY, localMap);
      latestCloudStructures = list;
      setCloudHealthy(true);
      emitMerged();
    },
    (error) => {
      logCloudFallbackError('subscribeWorldStructures', OperationType.LIST, path, error);
      setCloudHealthy(false);
      emitMerged();
    }
  );

  return () => {
    unsubLocal();
    unsubCloud();
  };
}

function isBusinessValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes('no longer available') ||
    msg.includes('just sold') ||
    msg.includes('Not enough Gold') ||
    msg.includes('wardrobe bag is full')
  );
}

function executeLocalMannequinPurchase(params: {
  structureId: string;
  buyerId: string;
  buyerName: string;
  trendMatched?: boolean;
}): { purchasedItem: ClothingItem; newBuyerGold: number; pricePaid: number; sellerPayout: number; syncedToCloud: boolean } {
  const { structureId, buyerId, buyerName, trendMatched } = params;
  const structMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
  const structData = structMap[structureId];
  if (!structData) {
    throw new Error('This stall is no longer available.');
  }
  if (!structData.listing || !structData.listing.item) {
    throw new Error('This item was just sold!');
  }

  const listing = structData.listing;
  const sellerPayout = trendMatched ? listing.price * 2 : listing.price;
  const playerMap = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
  const buyerData = playerMap[buyerId];
  if (!buyerData) {
    throw new Error('Buyer profile not ready yet.');
  }
  if (buyerData.gold < listing.price) {
    throw new Error('Not enough Gold.');
  }
  const currentOwned = Array.isArray(buyerData.ownedItems) ? buyerData.ownedItems : [];
  if (currentOwned.length >= 50) {
    throw new Error('Your wardrobe bag is full (50 items max).');
  }

  const newBuyerGold = buyerData.gold - listing.price;
  const purchasedItem = sanitizeClothingItem({
    ...listing.item,
    uid: currentOwned.some((i) => i.uid === listing.item.uid)
      ? generateItemUid('buy')
      : listing.item.uid,
  });

  playerMap[buyerId] = {
    ...buyerData,
    gold: newBuyerGold,
    ownedItems: [purchasedItem, ...currentOwned].slice(0, 50),
    updatedAtMs: Date.now(),
  };
  markPendingPlayer(buyerId);

  const sellerData = playerMap[structData.ownerId];
  if (sellerData && structData.ownerId !== buyerId) {
    playerMap[structData.ownerId] = {
      ...sellerData,
      gold: Math.min(9999999, sellerData.gold + sellerPayout),
      totalSales: (sellerData.totalSales || 0) + sellerPayout,
      lastSale: {
        amount: sellerPayout,
        itemLabel: purchasedItem.name.slice(0, 40),
        buyerName: sanitizeName(buyerName, 20),
        at: Date.now(),
      },
      updatedAtMs: Date.now(),
    };
    markPendingPlayer(structData.ownerId);
  }

  structMap[structureId] = {
    ...structData,
    listing: null,
    updatedAtMs: Date.now(),
  };
  markPendingStructure(structureId);

  writeJsonRecord(LOCAL_PLAYERS_KEY, playerMap);
  writeJsonRecord(LOCAL_STRUCTURES_KEY, structMap);
  notifyTopic('players');
  notifyTopic('world_structures');

  return {
    purchasedItem,
    newBuyerGold,
    pricePaid: listing.price,
    sellerPayout,
    syncedToCloud: false,
  };
}

export async function purchaseFromPlayerMannequin(params: {
  structureId: string;
  buyerId: string;
  buyerName: string;
  trendMatched?: boolean;
}): Promise<{ purchasedItem: ClothingItem; newBuyerGold: number; pricePaid: number; sellerPayout: number; syncedToCloud: boolean }> {
  const { structureId, buyerId, buyerName, trendMatched } = params;

  if (!db) {
    setCloudHealthy(false);
    return executeLocalMannequinPurchase(params);
  }

  const activeDb = db;
  const structRef = doc(activeDb, 'world_structures', structureId);
  const buyerRef = doc(activeDb, 'players', buyerId);

  try {
    const res = await withTimeout(
      runTransaction(activeDb, async (tx) => {
        const structSnap = await tx.get(structRef);
        if (!structSnap.exists()) {
          throw new Error('This stall is no longer available.');
        }
        const structData = structSnap.data() as CloudWorldStructure;
        if (!structData.listing || !structData.listing.item) {
          throw new Error('This item was just sold!');
        }
        const listing = structData.listing;
        const sellerPayout = trendMatched ? listing.price * 2 : listing.price;

        const buyerSnap = await tx.get(buyerRef);
        if (!buyerSnap.exists()) {
          throw new Error('Buyer profile not synced yet.');
        }
        const buyerData = buyerSnap.data() as CloudPlayerProfile;
        if (buyerData.gold < listing.price) {
          throw new Error('Not enough Gold.');
        }
        const currentOwned = Array.isArray(buyerData.ownedItems) ? buyerData.ownedItems : [];
        if (currentOwned.length >= 50) {
          throw new Error('Your wardrobe bag is full (50 items max).');
        }

        const sellerRef = doc(activeDb, 'players', structData.ownerId);
        const sellerSnap = await tx.get(sellerRef);

        const newBuyerGold = buyerData.gold - listing.price;
        const purchasedItem = sanitizeClothingItem({
          ...listing.item,
          uid: currentOwned.some((i) => i.uid === listing.item.uid)
            ? generateItemUid('buy')
            : listing.item.uid,
        });

        // 1. Deduct Gold & transfer exact ClothingItem directly into Buyer's inventory
        tx.update(buyerRef, {
          gold: newBuyerGold,
          ownedItems: [...currentOwned, purchasedItem],
          updatedAt: serverTimestamp(),
        });

        // 2. Credit Gold directly to Seller (with 2x Trend Bonus if matching!)
        if (sellerSnap.exists() && structData.ownerId !== buyerId) {
          const sellerData = sellerSnap.data() as CloudPlayerProfile;
          tx.update(sellerRef, {
            gold: Math.min(9999999, sellerData.gold + sellerPayout),
            totalSales: (sellerData.totalSales || 0) + sellerPayout,
            lastSale: {
              amount: sellerPayout,
              itemLabel: purchasedItem.name.slice(0, 40),
              buyerName: sanitizeName(buyerName, 20),
              at: Date.now(),
            },
            updatedAt: serverTimestamp(),
          });
        }

        // 3. Clear mannequin listing
        tx.update(structRef, {
          listing: null,
          updatedAt: serverTimestamp(),
        });

        return { purchasedItem, newBuyerGold, pricePaid: listing.price, sellerPayout, syncedToCloud: true };
      }),
      4500,
      'purchaseFromPlayerMannequin'
    );

    // Mirror successful purchase locally as well
    const structMap = readJsonRecord<Record<string, LocalStructureRecord>>(LOCAL_STRUCTURES_KEY, {});
    if (structMap[structureId]) {
      structMap[structureId] = { ...structMap[structureId], listing: null, updatedAtMs: Date.now() };
      writeJsonRecord(LOCAL_STRUCTURES_KEY, structMap);
      notifyTopic('world_structures');
    }
    setCloudHealthy(true);
    return res;
  } catch (error) {
    if (isBusinessValidationError(error)) {
      throw error;
    }
    logCloudFallbackError(
      'purchaseFromPlayerMannequin',
      OperationType.WRITE,
      `world_structures/${structureId}`,
      error
    );
    setCloudHealthy(false);
    return executeLocalMannequinPurchase(params);
  }
}

// ============================================================================
// LEADERBOARD TRADERS QUERY
// ============================================================================

export async function fetchLeaderboardTraders(): Promise<LeaderboardTrader[]> {
  const byId = new Map<string, LeaderboardTrader>();
  const localMap = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
  for (const rec of Object.values(localMap)) {
    byId.set(rec.playerId, {
      playerId: rec.playerId,
      playerName: sanitizeName(rec.playerName, 20),
      gold: Math.max(0, Math.round(Number(rec.gold) || 0)),
      totalSales: Math.max(0, Math.round(Number(rec.totalSales) || 0)),
      ownedCount: Array.isArray(rec.ownedItems) ? rec.ownedItems.length : 0,
    });
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'players')), 4000, 'fetchLeaderboardTraders');
      snap.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const pid = String(raw.playerId || d.id);
        const entry: LeaderboardTrader = {
          playerId: pid,
          playerName: sanitizeName(String(raw.playerName || 'Islander'), 20),
          gold: Math.max(0, Math.round(Number(raw.gold) || 0)),
          totalSales: Math.max(0, Math.round(Number(raw.totalSales) || 0)),
          ownedCount: Array.isArray(raw.ownedItems) ? raw.ownedItems.length : 0,
        };
        const prev = byId.get(pid);
        if (!prev || entry.gold >= prev.gold) {
          byId.set(pid, entry);
        }
      });
      setCloudHealthy(true);
    } catch (error) {
      logCloudFallbackError('fetchLeaderboardTraders', OperationType.LIST, 'players', error);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.gold + b.totalSales - (a.gold + a.totalSales));
}

// ============================================================================
// CENTRAL RUNWAY LIVE 60-SECOND AUCTION SYSTEM
// ============================================================================

function readLocalAuction(): CloudAuction | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUCTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudAuction;
    if (!parsed || !parsed.item) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalAuction(auction: CloudAuction | null): void {
  try {
    if (!auction) {
      localStorage.removeItem(LOCAL_AUCTION_KEY);
    } else {
      localStorage.setItem(LOCAL_AUCTION_KEY, JSON.stringify(auction));
    }
    notifyTopic('auctions');
  } catch {
    // ignore storage errors
  }
}

export function subscribeCurrentAuction(onUpdate: (auction: CloudAuction | null) => void): Unsubscribe {
  onUpdate(readLocalAuction());
  const unsubLocal = subscribeTopic('auctions', () => {
    onUpdate(readLocalAuction());
  });

  if (!db) {
    return unsubLocal;
  }

  const unsubCloud = onSnapshot(
    doc(db, 'auctions', 'current'),
    (snap) => {
      if (!snap.exists()) {
        writeLocalAuction(null);
        onUpdate(null);
        return;
      }
      const data = snap.data() as CloudAuction;
      if (data && data.item) {
        const normalized: CloudAuction = {
          ...data,
          item: sanitizeClothingItem(data.item),
        };
        writeLocalAuction(normalized);
        onUpdate(normalized);
      }
      setCloudHealthy(true);
    },
    (error) => {
      logCloudFallbackError('subscribeCurrentAuction', OperationType.GET, 'auctions/current', error);
    }
  );

  return () => {
    unsubLocal();
    unsubCloud();
  };
}

export async function startRunwayAuction(params: {
  item: ClothingItem;
  sellerId: string;
  sellerName: string;
  startingPrice: number;
}): Promise<CloudAuction> {
  const now = Date.now();
  const cleanPrice = Math.max(50, Math.min(50000, Math.round(params.startingPrice)));
  const auction: CloudAuction = {
    id: `auc_${now.toString(36)}`,
    item: sanitizeClothingItem(params.item),
    sellerId: params.sellerId,
    sellerName: sanitizeName(params.sellerName, 20),
    startingPrice: cleanPrice,
    highestBid: cleanPrice,
    highestBidderId: null,
    highestBidderName: null,
    startedAtMs: now,
    endsAtMs: now + 60000,
    settled: false,
  };

  const existingLocal = readLocalAuction();
  if (existingLocal && !existingLocal.settled && existingLocal.endsAtMs > now) {
    throw new Error('An auction is already live on the Runway Stage!');
  }

  if (db) {
    try {
      const ref = doc(db, 'auctions', 'current');
      await withTimeout(
        runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists()) {
            const cur = snap.data() as CloudAuction;
            if (!cur.settled && cur.endsAtMs > Date.now()) {
              throw new Error('An auction is already live on the Runway Stage!');
            }
          }
          tx.set(ref, auction);
        }),
        4000,
        'startRunwayAuction'
      );
      setCloudHealthy(true);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already live')) throw err;
      logCloudFallbackError('startRunwayAuction', OperationType.WRITE, 'auctions/current', err);
    }
  }

  writeLocalAuction(auction);
  return auction;
}

export async function placeAuctionBid(params: {
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidAmount: number;
  bidderGold: number;
}): Promise<CloudAuction> {
  const { auctionId, bidderId, bidderName, bidAmount, bidderGold } = params;
  const cleanBid = Math.round(bidAmount);
  if (bidderGold < cleanBid) {
    throw new Error('Not enough Gold for this bid.');
  }

  const updateLocal = (cur: CloudAuction | null): CloudAuction => {
    if (!cur || cur.id !== auctionId) throw new Error('Auction has ended.');
    if (cur.settled || Date.now() >= cur.endsAtMs) throw new Error('Bidding time has expired!');
    if (cur.sellerId === bidderId) throw new Error('You cannot bid on your own auction.');
    const minRequired = cur.highestBidderId ? cur.highestBid + 25 : cur.startingPrice;
    if (cleanBid < minRequired) {
      throw new Error(`Bid must be at least ${minRequired.toLocaleString()} G.`);
    }
    const next: CloudAuction = {
      ...cur,
      highestBid: cleanBid,
      highestBidderId: bidderId,
      highestBidderName: sanitizeName(bidderName, 20),
    };
    writeLocalAuction(next);
    return next;
  };

  if (db) {
    try {
      const ref = doc(db, 'auctions', 'current');
      const result = await withTimeout(
        runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('Auction has ended.');
          const cur = snap.data() as CloudAuction;
          if (cur.id !== auctionId || cur.settled || Date.now() >= cur.endsAtMs) {
            throw new Error('Bidding time has expired!');
          }
          if (cur.sellerId === bidderId) {
            throw new Error('You cannot bid on your own auction.');
          }
          const minRequired = cur.highestBidderId ? cur.highestBid + 25 : cur.startingPrice;
          if (cleanBid < minRequired) {
            throw new Error(`Bid must be at least ${minRequired.toLocaleString()} G.`);
          }
          const next: CloudAuction = {
            ...cur,
            highestBid: cleanBid,
            highestBidderId: bidderId,
            highestBidderName: sanitizeName(bidderName, 20),
          };
          tx.set(ref, next);
          return next;
        }),
        4000,
        'placeAuctionBid'
      );
      writeLocalAuction(result);
      setCloudHealthy(true);
      return result;
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('expired') ||
          err.message.includes('at least') ||
          err.message.includes('own auction') ||
          err.message.includes('ended'))
      ) {
        throw err;
      }
      logCloudFallbackError('placeAuctionBid', OperationType.WRITE, 'auctions/current', err);
    }
  }

  return updateLocal(readLocalAuction());
}

export async function settleCurrentAuction(auctionId: string): Promise<CloudAuction | null> {
  const settleLocal = (): CloudAuction | null => {
    const cur = readLocalAuction();
    if (!cur || cur.id !== auctionId || cur.settled) return null;
    if (Date.now() < cur.endsAtMs) return null;

    const settled: CloudAuction = { ...cur, settled: true };
    writeLocalAuction(settled);

    const playerMap = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
    if (cur.highestBidderId) {
      const buyer = playerMap[cur.highestBidderId];
      if (buyer && buyer.gold >= cur.highestBid) {
        const wonItem = sanitizeClothingItem({ ...cur.item, uid: generateItemUid('auc') });
        playerMap[cur.highestBidderId] = {
          ...buyer,
          gold: buyer.gold - cur.highestBid,
          ownedItems: [wonItem, ...(buyer.ownedItems || [])].slice(0, 50),
          updatedAtMs: Date.now(),
        };
      }
      const seller = playerMap[cur.sellerId];
      if (seller) {
        playerMap[cur.sellerId] = {
          ...seller,
          gold: Math.min(9999999, seller.gold + cur.highestBid),
          totalSales: (seller.totalSales || 0) + cur.highestBid,
          lastSale: {
            amount: cur.highestBid,
            itemLabel: `Auction: ${cur.item.name}`.slice(0, 40),
            buyerName: cur.highestBidderName || 'Winner',
            at: Date.now(),
          },
          updatedAtMs: Date.now(),
        };
      }
    } else {
      // No bids: return item to seller
      const seller = playerMap[cur.sellerId];
      if (seller) {
        const returnedItem = sanitizeClothingItem(cur.item);
        const alreadyHas = (seller.ownedItems || []).some((i) => i.uid === returnedItem.uid);
        playerMap[cur.sellerId] = {
          ...seller,
          ownedItems: alreadyHas ? seller.ownedItems : [returnedItem, ...(seller.ownedItems || [])].slice(0, 50),
          updatedAtMs: Date.now(),
        };
      }
    }
    writeJsonRecord(LOCAL_PLAYERS_KEY, playerMap);
    notifyTopic('players');
    return settled;
  };

  if (db) {
    try {
      const activeDb = db;
      const aucRef = doc(activeDb, 'auctions', 'current');
      const settled = await withTimeout(
        runTransaction(activeDb, async (tx) => {
          const snap = await tx.get(aucRef);
          if (!snap.exists()) return null;
          const cur = snap.data() as CloudAuction;
          if (cur.id !== auctionId || cur.settled || Date.now() < cur.endsAtMs) return null;

          const sellerRef = doc(activeDb, 'players', cur.sellerId);
          const sellerSnap = await tx.get(sellerRef);
          const buyerRef = cur.highestBidderId ? doc(activeDb, 'players', cur.highestBidderId) : null;
          const buyerSnap = buyerRef ? await tx.get(buyerRef) : null;

          if (cur.highestBidderId && buyerSnap?.exists()) {
            const buyerData = buyerSnap.data() as CloudPlayerProfile;
            if (buyerData.gold >= cur.highestBid) {
              const wonItem = sanitizeClothingItem({ ...cur.item, uid: generateItemUid('auc') });
              tx.update(buyerRef!, {
                gold: buyerData.gold - cur.highestBid,
                ownedItems: [wonItem, ...(buyerData.ownedItems || [])].slice(0, 50),
                updatedAt: serverTimestamp(),
              });
              if (sellerSnap.exists()) {
                const sellerData = sellerSnap.data() as CloudPlayerProfile;
                tx.update(sellerRef, {
                  gold: Math.min(9999999, sellerData.gold + cur.highestBid),
                  totalSales: (sellerData.totalSales || 0) + cur.highestBid,
                  lastSale: {
                    amount: cur.highestBid,
                    itemLabel: `Auction: ${cur.item.name}`.slice(0, 40),
                    buyerName: cur.highestBidderName || 'Winner',
                    at: Date.now(),
                  },
                  updatedAt: serverTimestamp(),
                });
              }
            }
          } else if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data() as CloudPlayerProfile;
            const returnedItem = sanitizeClothingItem(cur.item);
            const alreadyHas = (sellerData.ownedItems || []).some((i) => i.uid === returnedItem.uid);
            if (!alreadyHas) {
              tx.update(sellerRef, {
                ownedItems: [returnedItem, ...(sellerData.ownedItems || [])].slice(0, 50),
                updatedAt: serverTimestamp(),
              });
            }
          }

          const next: CloudAuction = { ...cur, settled: true };
          tx.set(aucRef, next);
          return next;
        }),
        4500,
        'settleCurrentAuction'
      );
      if (settled) {
        writeLocalAuction(settled);
        setCloudHealthy(true);
        return settled;
      }
    } catch (error) {
      logCloudFallbackError('settleCurrentAuction', OperationType.WRITE, 'auctions/current', error);
    }
  }

  return settleLocal();
}

// ============================================================================
// INTERACTIVE LOOKBOOK & ISLAND NEWSSTAND MAGAZINES
// ============================================================================

const VALID_MAGAZINE_THEMES: MagazineTheme[] = [
  'coral_vogue',
  'midnight_neon',
  'seaside_pastel',
  'royal_gold',
];

function sanitizeMagazineSticker(raw: unknown): MagazineSticker | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const stickerId = String(r.stickerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  if (!stickerId) return null;
  const id = String(r.id || `stk_${Math.random().toString(36).slice(2, 8)}`).slice(0, 48);
  const x = Math.max(5, Math.min(95, Math.round((Number(r.x) || 50) * 10) / 10));
  const y = Math.max(8, Math.min(92, Math.round((Number(r.y) || 50) * 10) / 10));
  return { id, stickerId, x, y };
}

function sanitizeMagazinePage(raw: unknown): MagazinePage | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const photoDataUrl = typeof r.photoDataUrl === 'string' ? r.photoDataUrl : '';
  if (!photoDataUrl.startsWith('data:image/') || photoDataUrl.length > 90000) return null;
  const caption = String(r.caption || '').trim().slice(0, 140);
  const location = typeof r.location === 'string' ? r.location.trim().slice(0, 40) : undefined;
  const stickersRaw = Array.isArray(r.stickers) ? r.stickers : [];
  const stickers = stickersRaw
    .map(sanitizeMagazineSticker)
    .filter((s): s is MagazineSticker => Boolean(s))
    .slice(0, 6);
  return {
    photoDataUrl,
    caption,
    ...(location ? { location } : {}),
    stickers,
  };
}

export function sanitizeCloudMagazine(raw: Partial<CloudMagazine> | Record<string, unknown>): CloudMagazine | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pagesRaw = Array.isArray(r.pages) ? r.pages : [];
  const pages = pagesRaw
    .map(sanitizeMagazinePage)
    .filter((p): p is MagazinePage => Boolean(p))
    .slice(0, 6);
  if (pages.length === 0) return null;
  const theme: MagazineTheme = VALID_MAGAZINE_THEMES.includes(r.theme as MagazineTheme)
    ? (r.theme as MagazineTheme)
    : 'coral_vogue';
  const id = sanitizeUid(String(r.id || `mag_${Date.now().toString(36)}`));
  return {
    id,
    title: sanitizeName(String(r.title || 'Coral Cove Issue'), 42),
    subtitle: String(r.subtitle || '').trim().slice(0, 72),
    authorId: sanitizeUid(String(r.authorId || 'island_press')),
    authorName: sanitizeName(String(r.authorName || 'Islander'), 20),
    theme,
    price: Math.max(0, Math.min(500, Math.round(Number(r.price) || 0))),
    salesCount: Math.max(0, Math.floor(Number(r.salesCount) || 0)),
    likesCount: Math.max(0, Math.floor(Number(r.likesCount) || 0)),
    pages,
    createdAtMs: Number(r.createdAtMs) > 0 ? Number(r.createdAtMs) : Date.now(),
  };
}

function readLocalMagazines(): CloudMagazine[] {
  const map = readJsonRecord<Record<string, CloudMagazine>>(LOCAL_MAGAZINES_KEY, {});
  const out: CloudMagazine[] = [];
  for (const item of Object.values(map)) {
    const clean = sanitizeCloudMagazine(item);
    if (clean) out.push(clean);
  }
  return out.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

function saveLocalMagazine(mag: CloudMagazine): void {
  const map = readJsonRecord<Record<string, CloudMagazine>>(LOCAL_MAGAZINES_KEY, {});
  map[mag.id] = mag;
  // Cap local cache to 24 newest issues to stay safe with localStorage quota
  const entries = Object.values(map).sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 24);
  const trimmed: Record<string, CloudMagazine> = {};
  for (const e of entries) trimmed[e.id] = e;
  writeJsonRecord(LOCAL_MAGAZINES_KEY, trimmed);
  notifyTopic('magazines');
}

export function subscribeMagazines(onUpdate: (magazines: CloudMagazine[]) => void): Unsubscribe {
  let latestCloud: CloudMagazine[] = [];

  const emitMerged = () => {
    const merged = new Map<string, CloudMagazine>();
    for (const lm of readLocalMagazines()) {
      merged.set(lm.id, lm);
    }
    for (const cm of latestCloud) {
      merged.set(cm.id, cm);
    }
    onUpdate(Array.from(merged.values()).sort((a, b) => b.createdAtMs - a.createdAtMs));
  };

  emitMerged();
  const unsubLocal = subscribeTopic('magazines', emitMerged);

  if (!db) {
    return unsubLocal;
  }

  const unsubCloud = onSnapshot(
    collection(db, 'magazines'),
    (snap) => {
      const list: CloudMagazine[] = [];
      snap.forEach((d) => {
        const clean = sanitizeCloudMagazine({ ...(d.data() as Record<string, unknown>), id: d.id });
        if (clean) list.push(clean);
      });
      latestCloud = list;
      setCloudHealthy(true);
      emitMerged();
    },
    (error) => {
      logCloudFallbackError('subscribeMagazines', OperationType.LIST, 'magazines', error);
      setCloudHealthy(false);
      emitMerged();
    }
  );

  return () => {
    unsubLocal();
    unsubCloud();
  };
}

export async function publishMagazine(params: {
  title: string;
  subtitle: string;
  authorId: string;
  authorName: string;
  theme: MagazineTheme;
  price: number;
  pages: MagazinePage[];
}): Promise<{ magazine: CloudMagazine; syncedToCloud: boolean }> {
  const now = Date.now();
  const id = `mag_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const clean = sanitizeCloudMagazine({
    id,
    title: params.title,
    subtitle: params.subtitle,
    authorId: params.authorId,
    authorName: params.authorName,
    theme: params.theme,
    price: params.price,
    salesCount: 0,
    likesCount: 0,
    pages: params.pages,
    createdAtMs: now,
  });
  if (!clean) {
    throw new Error('Add at least 1 snapshot page before publishing your magazine.');
  }

  saveLocalMagazine(clean);

  if (!db) {
    return { magazine: clean, syncedToCloud: false };
  }

  try {
    await ensureAnonymousAuth();
    await withTimeout(setDoc(doc(db, 'magazines', clean.id), clean), 5000, 'publishMagazine');
    setCloudHealthy(true);
    return { magazine: clean, syncedToCloud: true };
  } catch (error) {
    logCloudFallbackError('publishMagazine', OperationType.CREATE, `magazines/${clean.id}`, error);
    setCloudHealthy(false);
    return { magazine: clean, syncedToCloud: false };
  }
}

export async function purchaseMagazine(params: {
  magazine: CloudMagazine;
  buyerId: string;
  buyerName: string;
}): Promise<{ newBuyerGold: number; pricePaid: number; syncedToCloud: boolean }> {
  const { magazine, buyerId, buyerName } = params;
  const price = Math.max(0, Math.round(magazine.price || 0));

  const executeLocal = (): { newBuyerGold: number; pricePaid: number; syncedToCloud: boolean } => {
    const playerMap = readJsonRecord<Record<string, LocalProfileRecord>>(LOCAL_PLAYERS_KEY, {});
    const buyer = playerMap[buyerId];
    if (!buyer) throw new Error('Player profile not ready yet.');
    const alreadyOwned =
      magazine.authorId === buyerId ||
      (Array.isArray(buyer.ownedMagazineIds) && buyer.ownedMagazineIds.includes(magazine.id));
    if (alreadyOwned) {
      return { newBuyerGold: buyer.gold, pricePaid: 0, syncedToCloud: false };
    }
    if (buyer.gold < price) {
      throw new Error('Not enough Gold to buy this magazine.');
    }
    const newBuyerGold = buyer.gold - price;
    playerMap[buyerId] = {
      ...buyer,
      gold: newBuyerGold,
      ownedMagazineIds: sanitizeMagazineIds([...(buyer.ownedMagazineIds || []), magazine.id]),
      updatedAtMs: Date.now(),
    };
    const author = playerMap[magazine.authorId];
    if (author && magazine.authorId !== buyerId && price > 0) {
      playerMap[magazine.authorId] = {
        ...author,
        gold: Math.min(9999999, author.gold + price),
        totalSales: (author.totalSales || 0) + price,
        lastSale: {
          amount: price,
          itemLabel: `Magazine: ${magazine.title}`.slice(0, 40),
          buyerName: sanitizeName(buyerName, 20),
          at: Date.now(),
        },
        updatedAtMs: Date.now(),
      };
    }
    writeJsonRecord(LOCAL_PLAYERS_KEY, playerMap);
    notifyTopic('players');

    saveLocalMagazine({ ...magazine, salesCount: (magazine.salesCount || 0) + 1 });
    return { newBuyerGold, pricePaid: price, syncedToCloud: false };
  };

  if (!db) {
    return executeLocal();
  }

  try {
    const activeDb = db;
    const magRef = doc(activeDb, 'magazines', magazine.id);
    const buyerRef = doc(activeDb, 'players', buyerId);
    const authorRef = doc(activeDb, 'players', magazine.authorId);

    const res = await withTimeout(
      runTransaction(activeDb, async (tx) => {
        const magSnap = await tx.get(magRef);
        const curMag = magSnap.exists()
          ? sanitizeCloudMagazine({ ...(magSnap.data() as Record<string, unknown>), id: magazine.id }) || magazine
          : magazine;
        const actualPrice = Math.max(0, Math.round(curMag.price || 0));

        const buyerSnap = await tx.get(buyerRef);
        if (!buyerSnap.exists()) {
          throw new Error('Buyer profile not synced yet.');
        }
        const buyerData = buyerSnap.data() as CloudPlayerProfile;
        const ownedIds = sanitizeMagazineIds(buyerData.ownedMagazineIds);
        if (curMag.authorId === buyerId || ownedIds.includes(curMag.id)) {
          return { newBuyerGold: buyerData.gold, pricePaid: 0, syncedToCloud: true };
        }
        if (buyerData.gold < actualPrice) {
          throw new Error('Not enough Gold to buy this magazine.');
        }

        const authorSnap = curMag.authorId !== buyerId ? await tx.get(authorRef) : null;
        const newBuyerGold = buyerData.gold - actualPrice;

        tx.update(buyerRef, {
          gold: newBuyerGold,
          ownedMagazineIds: sanitizeMagazineIds([...ownedIds, curMag.id]),
          updatedAt: serverTimestamp(),
        });

        if (authorSnap?.exists() && curMag.authorId !== buyerId && actualPrice > 0) {
          const authorData = authorSnap.data() as CloudPlayerProfile;
          tx.update(authorRef, {
            gold: Math.min(9999999, authorData.gold + actualPrice),
            totalSales: (authorData.totalSales || 0) + actualPrice,
            lastSale: {
              amount: actualPrice,
              itemLabel: `Magazine: ${curMag.title}`.slice(0, 40),
              buyerName: sanitizeName(buyerName, 20),
              at: Date.now(),
            },
            updatedAt: serverTimestamp(),
          });
        }

        if (magSnap.exists()) {
          tx.update(magRef, {
            salesCount: (curMag.salesCount || 0) + 1,
          });
        }

        return { newBuyerGold, pricePaid: actualPrice, syncedToCloud: true };
      }),
      4500,
      'purchaseMagazine'
    );

    saveLocalMagazine({ ...magazine, salesCount: (magazine.salesCount || 0) + (res.pricePaid > 0 ? 1 : 0) });
    setCloudHealthy(true);
    return res;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not enough Gold')) {
      throw error;
    }
    logCloudFallbackError('purchaseMagazine', OperationType.WRITE, `magazines/${magazine.id}`, error);
    return executeLocal();
  }
}

export async function likeMagazine(magazine: CloudMagazine): Promise<void> {
  const nextLikes = (magazine.likesCount || 0) + 1;
  saveLocalMagazine({ ...magazine, likesCount: nextLikes });
  if (!db) return;
  try {
    const magRef = doc(db, 'magazines', magazine.id);
    await withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(magRef);
        if (!snap.exists()) return;
        const cur = snap.data() as Partial<CloudMagazine>;
        tx.update(magRef, {
          likesCount: Math.max(0, Math.floor(Number(cur.likesCount) || 0)) + 1,
        });
      }),
      3500,
      'likeMagazine'
    );
    setCloudHealthy(true);
  } catch (error) {
    logCloudFallbackError('likeMagazine', OperationType.UPDATE, `magazines/${magazine.id}`, error);
  }
}


