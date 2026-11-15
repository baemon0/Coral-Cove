import React, { useEffect, useRef, useState } from 'react';
import { Anchor, ArrowUpRight, Check, Gavel, Hammer, MapPin, Package, Palette, Sparkles, Store, Trophy, Users, X } from 'lucide-react';
import { renderClothingThumbnail, SLOT_LABELS } from './clothing';
import { BOAT_CATALOG, doesItemMatchTrend, renderWatercraftSprite, type FashionTrend } from './community';
import {
  formatEditionBadge,
  getShopTierSpec,
  SHOP_TIER_CONFIGS,
  type BoatCatalogEntry,
  type BoatKind,
  type ClothingItem,
  type ShopTier,
} from './constants';
import type { CloudAuction, LeaderboardTrader } from './firebase';

const ModalItemThumb: React.FC<{ item: ClothingItem; size?: number }> = ({ item, size = 32 }) => {
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

export interface OnlineShopDirectoryEntry {
  id: string;
  name: string;
  isSelf: boolean;
  isNpc?: boolean;
  shopCount: number;
  listedCount: number;
}

export const LeaderboardShopsModal: React.FC<{
  traders: LeaderboardTrader[];
  loadingTraders: boolean;
  onlineDirectory: OnlineShopDirectoryEntry[];
  currentPlayerId: string;
  onPlayClick: () => void;
  onVisitTarget: (targetId: string) => void;
  onClose: () => void;
}> = ({
  traders,
  loadingTraders,
  onlineDirectory,
  currentPlayerId,
  onPlayClick,
  onVisitTarget,
  onClose,
}) => {
  const top5 = traders.slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[88vh] w-full max-w-[660px] overflow-y-auto p-5 text-[#3d1e0b]">
        <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#b45309]" />
            <div>
              <h2 className="font-pixel text-lg font-bold text-[#45230d]">Top Traders &amp; Island Shops</h2>
              <p className="text-xs font-medium text-[#754623]">
                Instant teleport to any player&apos;s boutique or coastal shop!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onClose();
            }}
            aria-label="Close Top & Shops"
            className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Top 5 Richest Traders */}
          <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#45230d]">
              <Trophy className="h-3.5 w-3.5 text-[#b45309]" />
              <span>Top 5 Richest Traders</span>
            </div>

            {loadingTraders && top5.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-[#754623]">Loading leaderboard...</div>
            ) : top5.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-[#754623]">No traders recorded yet.</div>
            ) : (
              <div className="space-y-1.5">
                {top5.map((tr, idx) => {
                  const isMe = tr.playerId === currentPlayerId;
                  const rankColors = [
                    'bg-[#fde047] text-[#713f12] border-[#a16207]',
                    'bg-[#e2e8f0] text-[#1e293b] border-[#64748b]',
                    'bg-[#fed7aa] text-[#7c2d12] border-[#c2410c]',
                  ];
                  return (
                    <div
                      key={tr.playerId}
                      className={`flex items-center justify-between gap-2 border-2 px-2.5 py-1.5 text-xs ${
                        isMe ? 'border-[#45230d] bg-[#fff3d6]' : 'border-[#966236] bg-[#f7e7c8]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`font-pixel flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-bold ${
                            rankColors[idx] || 'border-[#8c5828] bg-[#e9cf9f] text-[#45230d]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div dir="auto" className="truncate font-bold text-[#3d1e0b]">
                            {tr.playerName} {isMe && <span className="text-[10px] text-[#1c5e32]">(You)</span>}
                          </div>
                          <div className="text-[10px] font-semibold tabular-nums text-[#754623]">
                            Sales: {tr.totalSales.toLocaleString()} G · {tr.ownedCount} pcs
                          </div>
                        </div>
                      </div>
                      <div className="font-pixel shrink-0 tabular-nums text-xs font-bold text-[#854d0e]">
                        {tr.gold.toLocaleString()} G
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Online Players & Shops with Visit Teleport */}
          <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#45230d]">
              <Users className="h-3.5 w-3.5 text-[#1c5e32]" />
              <span>Online Players &amp; Boutiques ({onlineDirectory.length})</span>
            </div>

            <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
              {onlineDirectory.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 border-2 px-2.5 py-1.5 text-xs ${
                    entry.isSelf ? 'border-[#45230d] bg-[#fff3d6]' : 'border-[#966236] bg-[#f7e7c8]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          entry.isNpc ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'
                        }`}
                      />
                      <span dir="auto" className="truncate font-bold text-[#3d1e0b]">{entry.name}</span>
                      {entry.isSelf && <span className="text-[10px] font-bold text-[#1c5e32]">(You)</span>}
                      {entry.isNpc && <span className="text-[10px] font-bold text-[#9a3412]">(NPC)</span>}
                    </div>
                    <div className="pl-3.5 text-[10px] font-semibold tabular-nums text-[#754623]">
                      {entry.shopCount > 0 ? `${entry.shopCount} shop` : 'Island Explorer'}
                      {entry.listedCount > 0 ? ` · ${entry.listedCount} for sale` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      onVisitTarget(entry.id);
                    }}
                    className="wood-btn flex h-7 shrink-0 cursor-pointer items-center gap-1 px-2 text-[11px] font-bold"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>Visit</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RunwayAuctionModal: React.FC<{
  playerId: string;
  gold: number;
  ownedItems: ClothingItem[];
  activeAuction: CloudAuction | null;
  activeTrend: FashionTrend;
  onPlayClick: () => void;
  onShowcaseOutfit: () => void;
  onStartAuction: (item: ClothingItem, startingPrice: number) => Promise<void>;
  onPlaceBid: (amount: number) => Promise<void>;
  onClose: () => void;
}> = ({
  playerId,
  gold,
  ownedItems,
  activeAuction,
  activeTrend,
  onPlayClick,
  onShowcaseOutfit,
  onStartAuction,
  onPlaceBid,
  onClose,
}) => {
  const [selectedUid, setSelectedUid] = useState<string>(() => ownedItems[0]?.uid || '');
  const [startPrice, setStartPrice] = useState<number>(300);
  const [bidInput, setBidInput] = useState<number>(350);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const isLive = Boolean(activeAuction && !activeAuction.settled && activeAuction.endsAtMs > nowMs);
  const secondsLeft = activeAuction ? Math.max(0, Math.ceil((activeAuction.endsAtMs - nowMs) / 1000)) : 0;

  useEffect(() => {
    if (activeAuction && isLive) {
      const nextMin = activeAuction.highestBidderId
        ? activeAuction.highestBid + 50
        : activeAuction.startingPrice;
      setBidInput((prev) => (prev < nextMin ? nextMin : prev));
    }
  }, [activeAuction, isLive]);

  const selectedItem = ownedItems.find((i) => i.uid === selectedUid) || ownedItems[0] || null;
  const minBid = activeAuction
    ? activeAuction.highestBidderId
      ? activeAuction.highestBid + 25
      : activeAuction.startingPrice
    : 50;

  const handleStart = async () => {
    if (!selectedItem || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onStartAuction(selectedItem, startPrice);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not start auction.');
    } finally {
      setBusy(false);
    }
  };

  const handleBid = async () => {
    if (!activeAuction || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onPlaceBid(bidInput);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bid failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[90vh] w-full max-w-[640px] overflow-y-auto p-5 text-[#3d1e0b]">
        <div className="mb-4 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#b91c1c]" />
            <div>
              <h2 className="font-pixel text-lg font-bold text-[#45230d]">Central Runway &amp; Live Auction</h2>
              <p className="text-xs font-medium text-[#754623]">
                Strut your outfit under the spotlights or host a live 60-second bidding auction!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onClose();
            }}
            aria-label="Close Runway"
            className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Showcase Outfit Action */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
          <div>
            <div className="text-xs font-bold text-[#45230d]">Runway Spotlight Pose</div>
            <div className="text-[11px] font-medium text-[#6b3c1b]">
              Light up the stage beams &amp; sparkles for everyone nearby!
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onShowcaseOutfit();
              onClose();
            }}
            className="flex h-9 cursor-pointer items-center gap-1.5 border-2 border-[#45230d] bg-[#fde047] px-3.5 text-xs font-bold text-[#3d1e0b] shadow-[0_2px_0_#a16207] hover:brightness-105"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Showcase Outfit</span>
          </button>
        </div>

        {/* Active Live 60s Auction OR Start Auction Panel */}
        {isLive && activeAuction ? (
          <div className="space-y-3 rounded-sm border-2 border-[#7f1d1d] bg-[#fff5eb] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="border border-[#991b1b] bg-[#fee2e2] px-2 py-0.5 text-[11px] font-bold text-[#991b1b]">
                LIVE AUCTION
              </span>
              <span className="font-pixel tabular-nums text-base font-bold text-[#991b1b]">
                {secondsLeft}s left
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-sm border-2 border-[#c79963] bg-[#f7e7c8] p-3">
              <div className="wood-slot flex h-12 w-12 shrink-0 items-center justify-center">
                <ModalItemThumb item={activeAuction.item} size={36} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span dir="auto" className="font-pixel text-sm font-bold text-[#3d1e0b]">{activeAuction.item.name}</span>
                  {formatEditionBadge(activeAuction.item) && (
                    <span className="border border-[#6b21a8] bg-[#f3e8ff] px-1.5 py-0.5 text-[10px] font-bold text-[#6b21a8]">
                      {formatEditionBadge(activeAuction.item)}
                    </span>
                  )}
                  {doesItemMatchTrend(activeAuction.item, activeTrend) && (
                    <span className="border border-[#15803d] bg-[#dcfce7] px-1.5 py-0.5 text-[10px] font-bold text-[#15803d]">
                      TREND MATCH
                    </span>
                  )}
                </div>
                <div dir="auto" className="text-[11px] font-semibold text-[#6b3c1b]">
                  {SLOT_LABELS[activeAuction.item.slot]} · Designed by {activeAuction.item.creatorName} · Seller: {activeAuction.sellerName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border border-[#c79963] bg-[#ebd2a4] p-2">
                <div className="text-[10px] font-semibold text-[#6b3c1b]">Current Highest Bid</div>
                <div className="font-pixel tabular-nums text-base font-bold text-[#3d1e0b]">
                  {activeAuction.highestBid.toLocaleString()} G
                </div>
              </div>
              <div className="border border-[#c79963] bg-[#ebd2a4] p-2">
                <div className="text-[10px] font-semibold text-[#6b3c1b]">Highest Bidder</div>
                <div dir="auto" className="truncate text-sm font-bold text-[#1c5e32]">
                  {activeAuction.highestBidderName || 'No bids yet'}
                </div>
              </div>
            </div>

            {activeAuction.sellerId === playerId ? (
              <div className="border border-[#c79963] bg-[#f5e6c8] px-3 py-2 text-center text-xs font-bold text-[#6b3c1b]">
                Your item is on the auction block! Wait for bidders or timer to finish.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="number"
                  min={minBid}
                  max={gold}
                  step={25}
                  value={bidInput}
                  onChange={(e) => setBidInput(Math.max(minBid, Number(e.target.value) || minBid))}
                  className="font-pixel tabular-nums w-28 border-2 border-[#6b3c1b] bg-[#fff7e6] px-2.5 py-1.5 text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    setBidInput(minBid);
                  }}
                  className="cursor-pointer border border-[#8c5828] bg-[#fff3d6] px-2 py-1.5 text-[11px] font-bold"
                >
                  Min ({minBid} G)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    setBidInput(minBid + 100);
                  }}
                  className="cursor-pointer border border-[#8c5828] bg-[#fff3d6] px-2 py-1.5 text-[11px] font-bold"
                >
                  +100 G
                </button>
                <button
                  type="button"
                  disabled={busy || gold < bidInput || bidInput < minBid}
                  onClick={() => void handleBid()}
                  className="wood-btn ml-auto flex h-9 cursor-pointer items-center gap-1.5 px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Gavel className="h-3.5 w-3.5" />
                  <span>{busy ? 'Bidding...' : `Place Bid (${bidInput.toLocaleString()} G)`}</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#45230d]">
              <span>Start a 60-Second Live Auction</span>
              <span className="text-[11px] font-semibold text-[#6b3c1b]">Escrows piece for 60s</span>
            </div>

            {ownedItems.length === 0 ? (
              <div className="border border-[#c79963] bg-[#f7e7c8] p-4 text-center text-xs font-semibold text-[#6b3c1b]">
                No items in your closet to auction right now.
              </div>
            ) : (
              <>
                <div className="grid max-h-[155px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {ownedItems.map((it) => {
                    const selected = selectedItem?.uid === it.uid;
                    const badge = formatEditionBadge(it);
                    return (
                      <button
                        key={it.uid}
                        type="button"
                        onClick={() => {
                          onPlayClick();
                          setSelectedUid(it.uid);
                        }}
                        className={`flex cursor-pointer items-center gap-2 border-2 px-2 py-1.5 text-left text-xs ${
                          selected
                            ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                            : 'border-[#966236] bg-[#f7e7c8] hover:bg-[#fff7e6]'
                        }`}
                      >
                        <div className="wood-slot flex h-8 w-8 shrink-0 items-center justify-center">
                          <ModalItemThumb item={it} size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span dir="auto" className="truncate font-bold text-[#3d1e0b]">{it.name}</span>
                            {badge && (
                              <span className="shrink-0 bg-[#f3e8ff] px-1 text-[9px] font-bold text-[#6b21a8]">
                                {badge}
                              </span>
                            )}
                          </div>
                          <div dir="auto" className="truncate text-[10px] font-semibold text-[#6b3c1b]">
                            by {it.creatorName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#45230d]">
                    <span>Starting Bid:</span>
                    <input
                      type="number"
                      min={50}
                      max={50000}
                      step={50}
                      value={startPrice}
                      onChange={(e) => setStartPrice(Math.max(50, Math.min(50000, Number(e.target.value) || 50)))}
                      className="font-pixel tabular-nums w-24 border-2 border-[#6b3c1b] bg-[#fff7e6] px-2 py-1 text-right text-xs font-bold"
                    />
                    <span>G</span>
                  </label>

                  <button
                    type="button"
                    disabled={busy || !selectedItem}
                    onClick={() => void handleStart()}
                    className="wood-btn flex h-9 cursor-pointer items-center gap-1.5 px-4 text-xs font-bold disabled:opacity-55"
                  >
                    <Gavel className="h-3.5 w-3.5" />
                    <span>{busy ? 'Starting...' : 'Start 60s Auction'}</span>
                  </button>
                </div>
              </>
            )}

            {errorMsg && (
              <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                {errorMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const BoatPreviewCanvas: React.FC<{ kind: BoatKind }> = ({ kind }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let raf = 0;
    let tick = 0;
    const renderFrame = () => {
      tick++;
      const c = ref.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, c.width, c.height);
          // Cozy water backdrop
          ctx.fillStyle = '#48b1cc';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = '#6ad4e6';
          ctx.fillRect(0, 26, c.width, c.height - 26);
          const spr = renderWatercraftSprite(kind, 'right', Math.floor(tick / 22) % 2);
          ctx.drawImage(spr, 6, 8, 52, 44);
        }
      }
      raf = requestAnimationFrame(renderFrame);
    };
    raf = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(raf);
  }, [kind]);

  return (
    <canvas
      ref={ref}
      width={64}
      height={56}
      className="pixelated h-14 w-16 shrink-0 border-2 border-[#45230d] bg-[#48b1cc]"
    />
  );
};

export const BoatDockModal: React.FC<{
  ownedBoats: BoatKind[];
  equippedBoat: BoatKind | null;
  isBoating: boolean;
  gold: number;
  onPlayClick: () => void;
  onBuyOrEquipBoat: (boat: BoatCatalogEntry) => void;
  onToggleBoard: () => void;
  onClose: () => void;
}> = ({
  ownedBoats,
  equippedBoat,
  isBoating,
  gold,
  onPlayClick,
  onBuyOrEquipBoat,
  onToggleBoard,
  onClose,
}) => {
  const hasAnyBoat = ownedBoats.length > 0;
  const activeEntry = BOAT_CATALOG.find((b) => b.kind === equippedBoat) || null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[90vh] w-full max-w-[660px] overflow-y-auto p-5 text-[#3d1e0b]">
        <div className="mb-3 flex items-center justify-between border-b-2 border-[#c79963] pb-2.5">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-[#0369a1]" />
            <div>
              <h2 className="font-pixel text-base font-bold text-[#45230d]">Coral Cove Boat Fleet &amp; Dock</h2>
              <p className="text-[11px] font-medium text-[#754623]">
                Unlock &amp; switch watercraft anytime! Companion pets hop right into the boat with you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-pixel tabular-nums border border-[#c79963] bg-[#ebd2a4] px-2 py-1 text-xs font-bold text-[#45230d]">
              {gold.toLocaleString()} G
            </span>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close Boat Dock"
              className="wood-btn flex h-8 w-8 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {BOAT_CATALOG.map((boat) => {
            const isOwned = ownedBoats.includes(boat.kind);
            const isEquipped = equippedBoat === boat.kind;
            const canAfford = gold >= boat.price;

            return (
              <div
                key={boat.kind}
                className={`flex flex-col justify-between gap-2.5 border-2 p-3 ${
                  isEquipped
                    ? 'border-[#0369a1] bg-[#e0f2fe] ring-2 ring-[#38bdf8]'
                    : 'border-[#966236] bg-[#edd5aa]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <BoatPreviewCanvas kind={boat.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-pixel text-xs font-bold text-[#3d1e0b]">{boat.name}</span>
                      {isEquipped && (
                        <span className="border border-[#0369a1] bg-[#bae6fd] px-1.5 py-0.2 text-[9px] font-bold text-[#0c4a6e]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#0369a1]">{boat.perkLabel}</div>
                    <p className="mt-1 text-[11px] leading-snug text-[#633818]">{boat.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/10 pt-2">
                  <span className="font-pixel tabular-nums text-xs font-bold text-[#522b14]">
                    {isOwned ? 'Owned' : `${boat.price.toLocaleString()} G`}
                  </span>
                  <button
                    type="button"
                    disabled={!isOwned && !canAfford}
                    onClick={() => onBuyOrEquipBoat(boat)}
                    className={`h-8 border-2 px-3 text-xs font-bold whitespace-nowrap ${
                      isEquipped
                        ? 'border-[#0369a1] bg-[#bae6fd] text-[#0c4a6e]'
                        : isOwned || canAfford
                          ? 'wood-btn cursor-pointer'
                          : 'cursor-not-allowed border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-75'
                    }`}
                  >
                    {isEquipped
                      ? 'Equipped'
                      : isOwned
                        ? 'Select Boat'
                        : `Buy (${boat.price.toLocaleString()} G)`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#c79963] pt-3">
          <div className="text-xs font-semibold text-[#522b14]">
            {activeEntry
              ? `Active Craft: ${activeEntry.name} (${activeEntry.perkLabel})`
              : 'Purchase a watercraft above to sail out onto Coral Cove & the Deep-Sea Reef!'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              className="wood-btn h-9 cursor-pointer px-3.5 text-xs font-bold"
            >
              Close
            </button>
            {hasAnyBoat && (
              <button
                type="button"
                onClick={() => {
                  onToggleBoard();
                  onClose();
                }}
                className="flex h-9 cursor-pointer items-center gap-1.5 border-2 border-[#0c4a6e] bg-[#0284c7] px-4 text-xs font-bold text-white shadow-[0_2px_0_#082f49] hover:brightness-105"
              >
                <Anchor className="h-3.5 w-3.5" />
                <span>{isBoating ? 'Return & Dock Boat' : `Launch ${activeEntry?.name.split(' ').pop() || 'Boat'}`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface ShopDecorCatalogItem {
  id: string;
  kind: string;
  name: string;
  description: string;
  goldPrice: number;
  outputQty: number;
  ownedCount: number;
  canCraft: boolean;
  costItems: Array<{ key: string; label: string; have: number; req: number }>;
}

export const ShopManagementModal: React.FC<{
  shopName: string;
  currentTier: ShopTier;
  gold: number;
  mannequinCount: number;
  decorCount: number;
  canExpandCheck: { valid: boolean; reason?: string };
  decorItems: ShopDecorCatalogItem[];
  renderDecorIcon: (kind: string, size?: number) => React.ReactNode;
  renderMaterialIcon: (matKey: string, size?: number) => React.ReactNode;
  onPlayClick: () => void;
  onExpandShop: () => void;
  onStartMoveShop: () => void;
  onBuyDecorGold: (decorId: string) => void;
  onCraftDecor: (decorId: string) => void;
  onSelectDecorToPlace: (decorKind: string) => void;
  onClose: () => void;
}> = ({
  shopName,
  currentTier,
  gold,
  mannequinCount,
  decorCount,
  canExpandCheck,
  decorItems,
  renderDecorIcon,
  renderMaterialIcon,
  onPlayClick,
  onExpandShop,
  onStartMoveShop,
  onBuyDecorGold,
  onCraftDecor,
  onSelectDecorToPlace,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrade' | 'decor'>('upgrade');
  const curSpec = getShopTierSpec(currentTier);
  const nextSpec = currentTier < 4 ? getShopTierSpec(currentTier + 1) : null;
  const canAffordNext = nextSpec ? gold >= nextSpec.upgradeCost : false;
  const canUpgrade = Boolean(nextSpec && canAffordNext && canExpandCheck.valid);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[90vh] w-full max-w-[660px] overflow-y-auto p-5 text-[#3d1e0b]">
        <div className="mb-3.5 flex items-center justify-between border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="wood-slot flex h-10 w-10 shrink-0 items-center justify-center">
              <Store className="h-5 w-5 text-[#8a4518]" />
            </div>
            <div>
              <h2 dir="auto" className="font-pixel text-base font-bold text-[#45230d]">
                {shopName} · Management
              </h2>
              <p className="text-xs font-semibold text-[#754623]">
                Tier {curSpec.tier}: {curSpec.name} · {curSpec.cols}×{curSpec.rows} tiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-pixel tabular-nums border border-[#c79963] bg-[#ebd2a4] px-2.5 py-1 text-xs font-bold text-[#45230d]">
              {gold.toLocaleString()} G
            </span>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close Shop Management"
              className="wood-btn flex h-8 w-8 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Management Tabs: Upgrade & Move | Shop Decor */}
        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              setActiveTab('upgrade');
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'upgrade'
                ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Upgrade &amp; Move</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              setActiveTab('decor');
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 border-2 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'decor'
                ? 'border-[#45230d] bg-[#0f766e] text-[#fff8e7]'
                : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Shop Decor ({decorItems.length})</span>
          </button>
        </div>

        {activeTab === 'upgrade' ? (
          <>
            {/* 4-Tier Boutique Roadmap */}
            <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHOP_TIER_CONFIGS.map((spec) => {
                const isCurrent = spec.tier === currentTier;
                const isUnlocked = spec.tier < currentTier;
                const isNext = nextSpec?.tier === spec.tier;
                return (
                  <div
                    key={spec.tier}
                    className={`border-2 p-2 text-xs ${
                      isCurrent
                        ? 'border-[#45230d] bg-[#fff3d6] ring-2 ring-[#e6b23c]'
                        : isUnlocked
                          ? 'border-[#1c5e32] bg-[#dcfce7]'
                          : isNext
                            ? 'border-[#966236] bg-[#f7e7c8]'
                            : 'border-[#b88b58] bg-[#e9d2aa] opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-pixel text-[10px] font-bold text-[#45230d]">Tier {spec.tier}</span>
                      {isUnlocked ? (
                        <Check className="h-3.5 w-3.5 text-[#1c5e32]" />
                      ) : isCurrent ? (
                        <span className="text-[9px] font-bold text-[#9a3412]">Active</span>
                      ) : (
                        <span className="font-pixel tabular-nums text-[9px] font-bold text-[#6b3c1b]">
                          {spec.upgradeCost.toLocaleString()}G
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-bold text-[#3d1e0b]">{spec.name}</div>
                    <div className="font-pixel tabular-nums text-[10px] font-semibold text-[#6b3c1b]">
                      {spec.cols}×{spec.rows} tiles
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interior Contents Summary */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] px-3 py-2 text-xs">
              <div className="font-semibold text-[#522b14]">
                Interior Preserved: <span className="font-bold tabular-nums">{mannequinCount}</span> Mannequins ·{' '}
                <span className="font-bold tabular-nums">{decorCount}</span> Furniture &amp; Rugs
              </div>
              <span className="text-[11px] text-[#754623]">
                Upgrading &amp; moving keep all displays and prices intact.
              </span>
            </div>

            {/* Next Upgrade Details + Warning if Blocked */}
            {nextSpec ? (
              <div className="mb-4 rounded-sm border-2 border-[#966236] bg-[#f7e7c8] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#3d1e0b]">
                    Next Upgrade: Tier {nextSpec.tier} · {nextSpec.name} ({nextSpec.cols}×{nextSpec.rows})
                  </span>
                  <span className="font-pixel tabular-nums font-bold text-[#854d0e]">
                    Cost: {nextSpec.upgradeCost.toLocaleString()} G
                  </span>
                </div>
                <p className="mt-1 text-[#633818]">{nextSpec.perkSummary}</p>
                {!canExpandCheck.valid && canExpandCheck.reason && (
                  <div className="mt-2 border border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 font-semibold text-[#991b1b]">
                    {canExpandCheck.reason}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 rounded-sm border-2 border-[#a16207] bg-[#fef3c7] p-3 text-xs font-bold text-[#78350f]">
                Royal Fashion Palace unlocked! Your boutique is at maximum 10×6 flagship size with VIP sign, red carpet, and luxury pillars.
              </div>
            )}

            {/* Primary Action Row: Expand Shop + Move Shop */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t-2 border-[#c79963] pt-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                {nextSpec ? (
                  <button
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => {
                      onPlayClick();
                      onExpandShop();
                    }}
                    className={`flex h-10 flex-1 min-w-[200px] items-center justify-center gap-1.5 border-2 px-4 text-xs font-bold whitespace-nowrap ${
                      canUpgrade
                        ? 'cursor-pointer border-[#45230d] bg-[#fde047] text-[#3d1e0b] shadow-[0_2px_0_#a16207] hover:brightness-105'
                        : 'cursor-not-allowed border-[#7a5233] bg-[#d6c2a1] text-[#6b4d35] opacity-75'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>
                      Expand Shop ({nextSpec.cols}×{nextSpec.rows} · {nextSpec.upgradeCost.toLocaleString()} G)
                    </span>
                  </button>
                ) : (
                  <div className="flex h-10 flex-1 min-w-[200px] items-center justify-center gap-1.5 border-2 border-[#a16207] bg-[#fef3c7] px-4 text-xs font-bold text-[#78350f]">
                    <Sparkles className="h-4 w-4" />
                    <span>Max Palace Size (10×6)</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    onStartMoveShop();
                  }}
                  className="wood-btn flex h-10 cursor-pointer items-center justify-center gap-1.5 px-4 text-xs font-bold whitespace-nowrap"
                >
                  <Package className="h-4 w-4" />
                  <span>Move Shop</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#522b14]">
              <span>Buy or craft boutique furniture &amp; rugs, then click Place to set them inside your shop.</span>
              <span className="tabular-nums font-bold">Owned items stay in your bag</span>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {decorItems.map((item) => {
                const canAffordGold = gold >= item.goldPrice;
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2.5 border-2 border-[#966236] bg-[#edd5aa] p-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="wood-slot flex h-11 w-11 shrink-0 items-center justify-center">
                        {renderDecorIcon(item.kind, 30)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#3d1e0b]">{item.name}</span>
                          <span className="tabular-nums text-xs font-semibold text-[#1c5e32]">
                            Owned: {item.ownedCount}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-[#633818]">{item.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] font-semibold">
                          {item.costItems.map((mat) => {
                            const ok = mat.have >= mat.req;
                            return (
                              <span
                                key={mat.key}
                                className={`flex items-center gap-1 tabular-nums ${
                                  ok ? 'text-[#3d1e0b]' : 'text-[#a62b2b]'
                                }`}
                              >
                                {renderMaterialIcon(mat.key, 14)}
                                <span>
                                  {mat.have}/{mat.req} {mat.label}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!item.canCraft}
                        onClick={() => {
                          onPlayClick();
                          onCraftDecor(item.id);
                        }}
                        title="Craft using island materials"
                        className={`flex h-8 items-center gap-1 border-2 px-2.5 text-xs font-bold whitespace-nowrap ${
                          item.canCraft
                            ? 'wood-btn cursor-pointer'
                            : 'cursor-not-allowed border-[#7a5233] bg-[#c7aa82] text-[#6b4d35] opacity-70'
                        }`}
                      >
                        <Hammer className="h-3 w-3" />
                        <span>Craft</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canAffordGold}
                        onClick={() => onBuyDecorGold(item.id)}
                        className={`h-8 border-2 px-2.5 text-xs font-bold whitespace-nowrap tabular-nums ${
                          canAffordGold
                            ? 'cursor-pointer border-[#45230d] bg-[#fde68a] text-[#3d1e0b] hover:brightness-105'
                            : 'cursor-not-allowed border-[#7a5233] bg-[#d6c2a1] text-[#6b4d35] opacity-70'
                        }`}
                      >
                        Buy {item.goldPrice} G
                      </button>

                      <button
                        type="button"
                        disabled={item.ownedCount <= 0}
                        onClick={() => {
                          onPlayClick();
                          onSelectDecorToPlace(item.kind);
                        }}
                        className={`h-8 border-2 px-3 text-xs font-bold whitespace-nowrap ${
                          item.ownedCount > 0
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
        )}
      </div>
    </div>
  );
};
