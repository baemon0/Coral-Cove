import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Lock,
  Check,
  Ship,
  Award,
  Palette,
  Store,
  Gift,
  Star,
  MapPin,
} from 'lucide-react';
import { PALETTE_CODES, type ClothingItem } from './constants';
import type { CloudAppearance } from './firebase';
import {
  VIP_REWARDS,
  VIP_REWARD_COUNTS,
  VIP_RARITY_META,
  evaluateVipSubmission,
  isItemMatchingVipTheme,
  renderVipRewardIconCanvas,
  renderVipStylistNpcSprite,
  type VipEventState,
  type VipJudgeResult,
  type VipRarity,
  type VipRewardCategory,
  type VipRewardDef,
} from './vipStylist';

const VipRewardThumbnail: React.FC<{
  rewardId: string;
  locked?: boolean;
  size?: number;
}> = ({ rewardId, locked = false, size = 48 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const src = renderVipRewardIconCanvas(rewardId);
    ctx.drawImage(src, 0, 0, c.width, c.height);
  }, [rewardId]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={`pixelated shrink-0 ${locked ? 'brightness-[0.18] contrast-125 opacity-60' : ''}`}
      style={{ width: size, height: size }}
    />
  );
};

const VipStylistPortrait: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const sprite = renderVipStylistNpcSprite('down', 0);
    ctx.drawImage(sprite, 4, 2, 48, 72);
  }, []);
  return <canvas ref={ref} width={56} height={74} className="pixelated h-[74px] w-[56px] shrink-0" />;
};

const ClothingPixelThumb: React.FC<{ item: ClothingItem; size?: number }> = ({ item, size = 28 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);
    const px = item.pixels || '';
    for (let i = 0; i < Math.min(256, px.length); i++) {
      const ch = px[i];
      if (ch === '.') continue;
      const idx = PALETTE_CODES.indexOf(ch);
      if (idx < 0 || idx >= item.palette.length) continue;
      ctx.fillStyle = item.palette[idx];
      ctx.fillRect(i % 16, Math.floor(i / 16), 1, 1);
    }
  }, [item]);

  return (
    <canvas
      ref={ref}
      width={16}
      height={16}
      className="pixelated shrink-0"
      style={{ width: size, height: size }}
    />
  );
};

// ============================================================================
// 1. VIP MYSTERY STYLIST EVENT & JUDGING MODAL
// ============================================================================

export interface VipEventModalProps {
  eventState: VipEventState;
  appearance: CloudAppearance;
  ownedItems: ClothingItem[];
  mannequinItems: ClothingItem[];
  unlockedIds: string[];
  alreadyJudgedVisitIds: string[];
  vipWinsCount: number;
  onPlayClick: () => void;
  onSummonVipYacht: () => void;
  onClaimJudgeResult: (visitId: string, result: VipJudgeResult) => void;
  onOpenVipCatalog: () => void;
  onOpenDesignStudio: () => void;
  onPlaceVipReward: (rewardId: string) => void;
  onEquipVipReward: (reward: VipRewardDef) => void;
  onClose: () => void;
}

export const VipEventModal: React.FC<VipEventModalProps> = ({
  eventState,
  appearance,
  ownedItems,
  mannequinItems,
  unlockedIds,
  alreadyJudgedVisitIds,
  vipWinsCount,
  onPlayClick,
  onSummonVipYacht,
  onClaimJudgeResult,
  onOpenVipCatalog,
  onOpenDesignStudio,
  onPlaceVipReward,
  onEquipVipReward,
  onClose,
}) => {
  const [submitTab, setSubmitTab] = useState<'outfit' | 'mannequins'>('outfit');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'custom' | 'matching'>('all');
  const [judgeResult, setJudgeResult] = useState<VipJudgeResult | null>(null);

  const equippedItems = useMemo(() => {
    return [appearance.hat, appearance.top, appearance.bottom, appearance.dress, appearance.shoes].filter(
      (x): x is ClothingItem => Boolean(x)
    );
  }, [appearance]);

  // Combined deduplicated wardrobe inventory (all owned items + currently worn pieces)
  const allInventoryItems = useMemo(() => {
    const map = new Map<string, ClothingItem>();
    for (const it of equippedItems) map.set(it.uid, it);
    for (const it of ownedItems) {
      if (!map.has(it.uid)) map.set(it.uid, it);
    }
    return Array.from(map.values());
  }, [equippedItems, ownedItems]);

  // Multi-select outfit inventory UIDs (defaults to currently worn outfit so players can submit right away or swap pieces)
  const [selectedInventoryUids, setSelectedInventoryUids] = useState<string[]>(() =>
    equippedItems.map((i) => i.uid)
  );

  // Keep valid UIDs synced if inventory changes
  const selectedInventoryItems = useMemo(() => {
    const uidSet = new Set(selectedInventoryUids);
    return allInventoryItems.filter((it) => uidSet.has(it.uid));
  }, [allInventoryItems, selectedInventoryUids]);

  const itemsToEvaluate = useMemo(() => {
    if (submitTab === 'mannequins') return mannequinItems;
    return selectedInventoryItems;
  }, [submitTab, mannequinItems, selectedInventoryItems]);

  const hasJudgedThisVisit = alreadyJudgedVisitIds.includes(eventState.visitId);
  const { theme } = eventState;

  const filteredInventoryItems = useMemo(() => {
    const base = allInventoryItems.filter((it) => {
      if (inventoryFilter === 'custom') return it.source === 'custom';
      if (inventoryFilter === 'matching') return isItemMatchingVipTheme(it, theme);
      return true;
    });
    // Sort custom & theme-matching items first so player's creations are immediately visible
    return [...base].sort((a, b) => {
      const aMatch = isItemMatchingVipTheme(a, theme) ? 2 : 0;
      const bMatch = isItemMatchingVipTheme(b, theme) ? 2 : 0;
      const aCustom = a.source === 'custom' ? 1 : 0;
      const bCustom = b.source === 'custom' ? 1 : 0;
      return bMatch + bCustom - (aMatch + aCustom);
    });
  }, [allInventoryItems, inventoryFilter, theme]);

  const toggleInventoryItem = (uid: string) => {
    onPlayClick();
    setSelectedInventoryUids((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 5) return [...prev.slice(1), uid];
      return [...prev, uid];
    });
  };

  const handleAutoPickBest = () => {
    onPlayClick();
    const scored = [...allInventoryItems].sort((a, b) => {
      const scoreOf = (it: ClothingItem) =>
        (isItemMatchingVipTheme(it, theme) ? 30 : 0) +
        (it.source === 'custom' ? 20 : 0) +
        (it.effect ? 12 : 0) +
        (it.reactive?.nightNeon || it.reactive?.rainMode ? 10 : 0) +
        (theme.preferredSlots.includes(it.slot) ? 8 : 0);
      return scoreOf(b) - scoreOf(a);
    });
    const picked: string[] = [];
    const usedSlots = new Set<string>();
    for (const it of scored) {
      if (picked.length >= 5) break;
      if (!usedSlots.has(it.slot)) {
        usedSlots.add(it.slot);
        picked.push(it.uid);
      }
    }
    if (picked.length === 0 && scored.length > 0) {
      picked.push(scored[0].uid);
    }
    setSelectedInventoryUids(picked);
  };

  const handleJudgeNow = () => {
    onPlayClick();
    const res = evaluateVipSubmission(itemsToEvaluate, theme, unlockedIds, submitTab);
    setJudgeResult(res);
    if (res.evaluatedCount > 0) {
      onClaimJudgeResult(eventState.visitId, res);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[92vh] w-full max-w-[780px] overflow-y-auto p-4 text-[#3d1e0b] sm:p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3 border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-sm border-2 border-[#78350f] bg-gradient-to-b from-[#3b0764] to-[#1e1b4b]">
              <VipStylistPortrait />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-pixel text-base font-bold text-[#45230d] sm:text-lg">
                  VIP Mystery Stylist
                </h2>
                <span className="rounded-sm border border-[#d97706] bg-[#fef3c7] px-2 py-0.5 text-[10px] font-extrabold text-[#92400e]">
                  Madame Lumière · مدام لوميير
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-[#6b3c1b]" dir="auto">
                Luxury Yacht Fashion Evaluation · {unlockedIds.length}/{VIP_REWARD_COUNTS.total} Exclusive VIP Rewards Unlocked ({vipWinsCount} Wins)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onOpenVipCatalog();
              }}
              className="wood-btn flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold"
            >
              <Crown className="h-3.5 w-3.5 text-[#b45309]" />
              <span>Catalog ({unlockedIds.length}/{VIP_REWARD_COUNTS.total})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close VIP Event"
              className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Yacht Status & Active Bilingual Theme Card */}
        <div
          className="mb-4 rounded-sm border-2 p-3.5"
          style={{
            backgroundColor: theme.accentBg,
            borderColor: theme.accentBorder,
            color: theme.accentText,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 shrink-0" />
              <span className="text-xs font-extrabold uppercase tracking-wide">
                {eventState.isDocked
                  ? `Luxury Yacht Docked at Pier · Leaves in ${eventState.formattedTime}`
                  : `Yacht Sailing at Sea · Arrives in ${eventState.formattedTime}`}
              </span>
            </div>
            {!eventState.isDocked && (
              <button
                type="button"
                onClick={() => {
                  onPlayClick();
                  onSummonVipYacht();
                }}
                className="cursor-pointer rounded-sm border-2 border-[#78350f] bg-[#f59e0b] px-2.5 py-1 text-[11px] font-extrabold text-[#291709] hover:bg-[#fbbf24]"
              >
                ✦ Invite VIP Yacht Now / استدعاء اليخت
              </button>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-bold uppercase opacity-75">Theme Request (EN)</div>
              <div className="font-pixel text-sm font-bold">{theme.titleEn}</div>
              <p className="mt-0.5 text-xs font-medium opacity-90">{theme.promptEn}</p>
            </div>
            <div dir="rtl" className="text-right">
              <div className="text-[10px] font-bold opacity-75">طلب الأزياء الحصري (AR)</div>
              <div className="text-base font-extrabold">{theme.titleAr}</div>
              <p className="mt-0.5 text-xs font-semibold opacity-90">{theme.promptAr}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold">Target Palette:</span>
              {theme.swatchHexes.map((hex) => (
                <span
                  key={hex}
                  className="inline-block h-4 w-4 rounded-sm border border-black/30"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span>Preferred: {theme.preferredSlots.map((s) => s.toUpperCase()).join(' / ')}</span>
              {theme.bonusEffect && (
                <span className="rounded-sm bg-white/75 px-1.5 py-0.5 text-[10px]">
                  +Effect Bonus
                </span>
              )}
              {theme.bonusNightNeon && (
                <span className="rounded-sm bg-[#0f172a] px-1.5 py-0.5 text-[10px] text-[#00f5d4]">
                  +Night Neon Bonus
                </span>
              )}
              {theme.bonusRainMode && (
                <span className="rounded-sm bg-[#e0f2fe] px-1.5 py-0.5 text-[10px] text-[#0369a1]">
                  +Rain Reactive Bonus
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Judging Result Reveal */}
        {judgeResult && (
          <div className="mb-4 rounded-sm border-2 border-[#d97706] bg-[#fffbeb] p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f59e0b]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#d97706]" />
                <span className="font-pixel text-base font-bold text-[#78350f]">
                  {judgeResult.rank} · {judgeResult.totalScore}/100
                </span>
              </div>
              {judgeResult.bonusGold > 0 && (
                <span className="rounded-sm border border-[#d97706] bg-[#fef3c7] px-2 py-0.5 text-xs font-extrabold text-[#92400e]">
                  +{judgeResult.bonusGold} G Bonus
                </span>
              )}
            </div>

            {/* Score Breakdown */}
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm border border-[#e6c999] bg-white/80 p-2">
                <div className="text-[10px] font-bold text-[#754623]">Color Palette</div>
                <div className="font-pixel text-sm font-bold text-[#45230d]">{judgeResult.paletteScore}/35</div>
              </div>
              <div className="rounded-sm border border-[#e6c999] bg-white/80 p-2">
                <div className="text-[10px] font-bold text-[#754623]">Theme & Style</div>
                <div className="font-pixel text-sm font-bold text-[#45230d]">{judgeResult.themeScore}/25</div>
              </div>
              <div className="rounded-sm border border-[#e6c999] bg-white/80 p-2">
                <div className="text-[10px] font-bold text-[#754623]">Creativity</div>
                <div className="font-pixel text-sm font-bold text-[#45230d]">{judgeResult.creativityScore}/40</div>
              </div>
            </div>

            <div className="mt-2.5 space-y-1 rounded-sm bg-[#fef3c7]/70 p-2.5 text-xs">
              <p className="font-bold text-[#45230d]">“{judgeResult.feedbackEn}”</p>
              <p className="font-bold text-[#78350f]" dir="rtl">
                «{judgeResult.feedbackAr}»
              </p>
            </div>

            {/* Exclusive VIP Rewards Won */}
            {judgeResult.rewards.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#78350f]">
                  <Gift className="h-4 w-4 text-[#db2777]" />
                  <span>Exclusive VIP Mystery Drops Won ({judgeResult.rewards.length}):</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {judgeResult.rewards.map((rew) => {
                    const rm = VIP_RARITY_META[rew.rarity];
                    const isNew = judgeResult.newlyUnlockedIds.includes(rew.id);
                    const isPlaceable = rew.subkind === 'shop_decor' || rew.subkind === 'golden_trophy';
                    const isEquippable =
                      rew.subkind === 'pet_accessory' ||
                      rew.subkind === 'boat_skin' ||
                      rew.subkind === 'prestige_title';
                    return (
                      <div
                        key={rew.id}
                        className="flex flex-col justify-between rounded-sm border-2 bg-white p-2.5"
                        style={{ borderColor: rm.border }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="rounded-sm border border-[#e6c999] bg-[#fdf6e6] p-1">
                            <VipRewardThumbnail rewardId={rew.id} size={40} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className="rounded-sm px-1.5 py-0.5 text-[9px] font-extrabold"
                                style={{ backgroundColor: rm.bg, color: rm.text }}
                              >
                                {rm.label}
                              </span>
                              {isNew && (
                                <span className="rounded-sm bg-[#10b981] px-1 py-0.5 text-[9px] font-extrabold text-white">
                                  NEW!
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-xs font-extrabold text-[#3d1e0b]">
                              {rew.name}
                            </div>
                            <div className="truncate text-[11px] font-bold text-[#754623]" dir="rtl">
                              {rew.nameAr}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-1">
                          {isPlaceable && (
                            <button
                              type="button"
                              onClick={() => {
                                onPlayClick();
                                onPlaceVipReward(rew.id);
                              }}
                              className="w-full cursor-pointer rounded-sm border border-[#78350f] bg-[#f59e0b] px-2 py-1 text-[10px] font-extrabold text-[#291709] hover:bg-[#fbbf24]"
                            >
                              Place in Shop
                            </button>
                          )}
                          {isEquippable && (
                            <button
                              type="button"
                              onClick={() => {
                                onPlayClick();
                                onEquipVipReward(rew);
                              }}
                              className="w-full cursor-pointer rounded-sm border border-[#4c1d95] bg-[#7c3aed] px-2 py-1 text-[10px] font-extrabold text-white hover:bg-[#6d28d9]"
                            >
                              Equip Now
                            </button>
                          )}
                          {rew.category === 'studio_tool' && (
                            <button
                              type="button"
                              onClick={() => {
                                onPlayClick();
                                onOpenDesignStudio();
                              }}
                              className="w-full cursor-pointer rounded-sm border border-[#0e7490] bg-[#06b6d4] px-2 py-1 text-[10px] font-extrabold text-white hover:bg-[#0891b2]"
                            >
                              Use in Studio
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clear Bilingual Arabic / English Submission Hint Banner */}
        <div className="mb-3 rounded-sm border-2 border-[#d97706] bg-[#fffbeb] px-3 py-2 text-[#451a03]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] font-bold">
              <span className="mr-1 text-[#b45309]">✦ How to Submit:</span>
              Pick any custom or wardrobe outfits below (up to 5 pieces) to submit directly, OR switch to{' '}
              <span className="underline">Shop Mannequins</span> so Madame Lumière inspects your boutique displays!
            </div>
            <div dir="rtl" className="text-right text-[11px] font-bold text-[#78350f]">
              <span className="ml-1 text-[#b45309]">✦ طريقة التقديم:</span>
              اختر أي تصميم من خزانتك بالأسفل لتقديمه مباشرة، أو اختر تبويب <span className="underline">مانيكانات المتجر</span> لتقييم المعروضات في متجرك!
            </div>
          </div>
        </div>

        {/* Submission Tabs */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              setSubmitTab('outfit');
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 border-2 px-3 py-2 text-xs font-bold ${
              submitTab === 'outfit'
                ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>Pick from Outfit Inventory ({selectedInventoryItems.length}/5)</span>
            </span>
            <span dir="rtl" className="text-[10px] opacity-90">
              اختر من خزانة الملابس ({allInventoryItems.length} قطعة)
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              setSubmitTab('mannequins');
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 border-2 px-3 py-2 text-xs font-bold ${
              submitTab === 'mannequins'
                ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              <span>Inspect Shop Mannequins ({mannequinItems.length})</span>
            </span>
            <span dir="rtl" className="text-[10px] opacity-90">
              تقييم مانيكانات متجرك
            </span>
          </button>
        </div>

        {/* Submission Preview & Interactive Outfit Inventory Picker */}
        <div className="mb-4 rounded-sm border-2 border-[#c79963] bg-[#f5e6c8] p-3">
          {submitTab === 'outfit' ? (
            <>
              {/* Selected Pieces Summary + Quick Actions */}
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#c79963]/70 pb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#45230d]">
                    Selected ({selectedInventoryItems.length}/5):
                  </span>
                  {selectedInventoryItems.length === 0 ? (
                    <span className="text-[11px] font-semibold text-[#9a3412]">
                      Tap any outfit below to select!
                    </span>
                  ) : (
                    selectedInventoryItems.map((it) => {
                      const matched = isItemMatchingVipTheme(it, theme);
                      return (
                        <button
                          key={it.uid}
                          type="button"
                          onClick={() => toggleInventoryItem(it.uid)}
                          title="Click to remove from submission"
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-bold hover:brightness-95 ${
                            matched
                              ? 'border-[#16a34a] bg-[#dcfce7] text-[#14532d]'
                              : 'border-[#78350f] bg-white text-[#45230d]'
                          }`}
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-xs border border-black/30"
                            style={{ backgroundColor: it.palette[0] || '#f58eb2' }}
                          />
                          <span>{it.name}</span>
                          {matched && <Star className="h-2.5 w-2.5 fill-[#eab308] text-[#ca8a04]" />}
                          <X className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAutoPickBest}
                    className="cursor-pointer rounded-sm border border-[#15803d] bg-[#dcfce7] px-2 py-1 text-[10px] font-extrabold text-[#14532d] hover:bg-[#bbf7d0]"
                  >
                    ✦ Auto-Pick Best Match
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setSelectedInventoryUids(equippedItems.map((i) => i.uid));
                    }}
                    className="cursor-pointer rounded-sm border border-[#966236] bg-[#fffaf0] px-2 py-1 text-[10px] font-bold text-[#4d2912] hover:bg-[#fef3c7]"
                  >
                    Use Worn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      onOpenDesignStudio();
                    }}
                    className="cursor-pointer rounded-sm border border-[#be185d] bg-[#fce7f3] px-2 py-1 text-[10px] font-extrabold text-[#9d174d] hover:bg-[#fbcfe8]"
                  >
                    + Design Custom
                  </button>
                </div>
              </div>

              {/* Filter Tabs for Outfit Inventory */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      ['all', `All Outfits (${allInventoryItems.length})`],
                      [
                        'custom',
                        `Custom Designs (${allInventoryItems.filter((i) => i.source === 'custom').length})`,
                      ],
                      [
                        'matching',
                        `Matches Theme (${allInventoryItems.filter((i) => isItemMatchingVipTheme(i, theme)).length})`,
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        setInventoryFilter(key);
                      }}
                      className={`cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] font-bold ${
                        inventoryFilter === key
                          ? 'border-[#45230d] bg-[#45230d] text-[#fef3c7]'
                          : 'border-[#c79963] bg-[#fffaf0] text-[#522b14] hover:bg-[#fef3c7]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {selectedInventoryUids.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setSelectedInventoryUids([]);
                    }}
                    className="cursor-pointer text-[10px] font-bold text-[#9a3412] underline hover:text-[#7c2d12]"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Scrollable Visual Outfit Inventory Grid */}
              {filteredInventoryItems.length === 0 ? (
                <div className="rounded-sm border border-dashed border-[#c79963] bg-[#fffaf0] p-3 text-center text-xs font-semibold text-[#754623]">
                  No outfits in this filter yet — try “All Outfits” or craft a custom look in the Fashion Studio!
                </div>
              ) : (
                <div className="grid max-h-[168px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-3">
                  {filteredInventoryItems.map((it) => {
                    const isSelected = selectedInventoryUids.includes(it.uid);
                    const matched = isItemMatchingVipTheme(it, theme);
                    const isWorn = equippedItems.some((e) => e.uid === it.uid);
                    return (
                      <button
                        key={it.uid}
                        type="button"
                        onClick={() => toggleInventoryItem(it.uid)}
                        className={`flex cursor-pointer items-center gap-2 rounded-sm border-2 p-1.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#b45309] bg-[#fef3c7] shadow-xs'
                            : matched
                              ? 'border-[#86efac] bg-[#f0fdf4] hover:bg-[#dcfce7]'
                              : 'border-[#d6b384] bg-[#fffaf0] hover:bg-[#fef3c7]/60'
                        }`}
                      >
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[#45230d]/40 bg-white">
                          <ClothingPixelThumb item={it} size={30} />
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#b45309] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-extrabold text-[#3d1e0b]">
                            {it.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] font-bold">
                            <span className="uppercase text-[#754623]">{it.slot}</span>
                            {it.source === 'custom' && (
                              <span className="rounded-xs bg-[#fce7f3] px-1 text-[#9d174d]">Custom</span>
                            )}
                            {isWorn && (
                              <span className="rounded-xs bg-[#e0f2fe] px-1 text-[#0369a1]">Worn</span>
                            )}
                            {matched && (
                              <span className="rounded-xs bg-[#dcfce7] px-1 text-[#15803d]">★ Match</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#522b14]">
                <span>Outfits Displayed on Your Shop Mannequins ({mannequinItems.length})</span>
                <span dir="rtl" className="text-[11px] text-[#78350f]">
                  المعروضات على مانيكانات متجرك
                </span>
              </div>
              {mannequinItems.length === 0 ? (
                <div className="space-y-1 rounded-sm border border-dashed border-[#c79963] bg-[#fffaf0] p-3 text-xs font-medium text-[#754623]">
                  <p>
                    You haven’t displayed any outfits on your shop mannequins yet! Place a mannequin inside your boutique and stock an outfit on it so Madame Lumière can inspect your shop — or switch to <strong>Pick from Outfit Inventory</strong> to submit directly!
                  </p>
                  <p dir="rtl" className="text-right font-bold text-[#78350f]">
                    لم تعرض أي ملابس على مانيكانات متجرك بعد! ضع مانيكان داخل متجرك واعرض عليه تصميماً، أو اختر «خزانة الملابس» للتقديم المباشر.
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[168px] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                  {mannequinItems.map((it, i) => {
                    const matched = isItemMatchingVipTheme(it, theme);
                    return (
                      <div
                        key={`${it.uid}_${i}`}
                        className={`flex items-center gap-2 rounded-sm border-2 p-1.5 ${
                          matched
                            ? 'border-[#16a34a] bg-[#dcfce7] text-[#14532d]'
                            : 'border-[#c79963] bg-white text-[#45230d]'
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[#45230d]/35 bg-[#fffdf7]">
                          <ClothingPixelThumb item={it} size={26} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-extrabold">{it.name}</div>
                          <div className="flex items-center gap-1 text-[9px] font-bold">
                            <span className="uppercase opacity-75">{it.slot}</span>
                            {it.source === 'custom' && (
                              <span className="rounded-xs bg-[#fce7f3] px-1 text-[#9d174d]">Custom</span>
                            )}
                            {matched && (
                              <span className="inline-flex items-center gap-0.5 text-[#15803d]">
                                <Star className="h-2.5 w-2.5 fill-[#eab308] text-[#ca8a04]" /> Match
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold text-[#6b3c1b]">
            {hasJudgedThisVisit
              ? '✓ Already judged this yacht visit — you can summon a fresh VIP visit for a new theme!'
              : 'Tip: Custom pixel art, theme colors, Deep Sea effects & Night/Rain modes earn Diamond VIP (3 drops)!'}
          </div>
          <div className="flex items-center gap-2">
            {hasJudgedThisVisit && (
              <button
                type="button"
                onClick={() => {
                  onPlayClick();
                  setJudgeResult(null);
                  onSummonVipYacht();
                }}
                className="wood-btn cursor-pointer px-3 py-2 text-xs font-bold"
              >
                Next VIP Theme
              </button>
            )}
            <button
              type="button"
              disabled={!eventState.isDocked || itemsToEvaluate.length === 0 || hasJudgedThisVisit}
              onClick={handleJudgeNow}
              className="cursor-pointer rounded-sm border-2 border-[#78350f] bg-gradient-to-b from-[#facc15] to-[#d97706] px-4 py-2 text-xs font-extrabold text-[#291709] shadow-sm hover:from-[#fde047] hover:to-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!eventState.isDocked
                ? 'Wait for Yacht or Invite Now'
                : hasJudgedThisVisit
                  ? 'Judged ✓'
                  : '✦ Submit for VIP Judging / تقييم الأزياء'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. VIP COLLECTION CATALOG MODAL (TRACK ALL 92 EXCLUSIVE UNBUYABLE REWARDS)
// ============================================================================

export interface VipCollectionCatalogModalProps {
  unlockedIds: string[];
  vipDecorCounts: Record<string, number>;
  equippedVipTitle: string | null;
  equippedPetAccessory: string | null;
  equippedBoatSkin: string | null;
  vipWinsCount: number;
  eventState: VipEventState;
  onPlayClick: () => void;
  onOpenVipEvent: () => void;
  onOpenDesignStudio: () => void;
  onPlaceVipReward: (rewardId: string) => void;
  onEquipVipReward: (reward: VipRewardDef) => void;
  onUnequipKind: (kind: 'title' | 'pet_accessory' | 'boat_skin') => void;
  onClose: () => void;
}

export const VipCollectionCatalogModal: React.FC<VipCollectionCatalogModalProps> = ({
  unlockedIds,
  vipDecorCounts,
  equippedVipTitle,
  equippedPetAccessory,
  equippedBoatSkin,
  vipWinsCount,
  eventState,
  onPlayClick,
  onOpenVipEvent,
  onOpenDesignStudio,
  onPlaceVipReward,
  onEquipVipReward,
  onUnequipKind,
  onClose,
}) => {
  const [catTab, setCatTab] = useState<'all' | VipRewardCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | VipRarity>('all');
  const [lockFilter, setLockFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const filteredRewards = useMemo(() => {
    return VIP_REWARDS.filter((r) => {
      if (catTab !== 'all' && r.category !== catTab) return false;
      if (rarityFilter !== 'all' && r.rarity !== rarityFilter) return false;
      const isUnlocked = unlockedSet.has(r.id);
      if (lockFilter === 'unlocked' && !isUnlocked) return false;
      if (lockFilter === 'locked' && isUnlocked) return false;
      return true;
    });
  }, [catTab, rarityFilter, lockFilter, unlockedSet]);

  const pct = Math.round((unlockedIds.length / Math.max(1, VIP_REWARD_COUNTS.total)) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative flex max-h-[92vh] w-full max-w-[960px] flex-col p-4 text-[#3d1e0b] sm:p-5">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#c79963] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#d97706]" />
              <h2 className="font-pixel text-base font-bold text-[#45230d] sm:text-lg">
                VIP Collection Catalog · كتالوج جوائز VIP
              </h2>
            </div>
            <p className="mt-0.5 text-xs font-medium text-[#754623]">
              {VIP_REWARD_COUNTS.total} Exclusive Unbuyable Rewards — Earned Only from Madame Lumière’s Luxury Yacht Visits!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onOpenVipEvent();
              }}
              className="cursor-pointer rounded-sm border-2 border-[#78350f] bg-[#f59e0b] px-3 py-1.5 text-xs font-extrabold text-[#291709] hover:bg-[#fbbf24]"
            >
              {eventState.isDocked ? '✦ Visit VIP Stylist Now' : '✦ Invite VIP Yacht'}
            </button>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close VIP Catalog"
              className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Stats */}
        <div className="mb-3 rounded-sm border-2 border-[#d97706] bg-[#fffbeb] p-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-[#78350f]">
            <span>
              Collection Progress: {unlockedIds.length} / {VIP_REWARD_COUNTS.total} Unlocked ({pct}%)
            </span>
            <span>VIP Fashion Wins: {vipWinsCount}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-sm border border-[#b45309] bg-[#fef3c7]">
            <div
              className="h-full bg-gradient-to-r from-[#f59e0b] via-[#ec4899] to-[#8b5cf6] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {[
            { id: 'all' as const, label: `All (${VIP_REWARD_COUNTS.total})` },
            { id: 'shop_decor' as const, label: `Shop Decor (${VIP_REWARD_COUNTS.shop_decor})` },
            { id: 'studio_tool' as const, label: `Studio Kit (${VIP_REWARD_COUNTS.studio_tool})` },
            { id: 'pet_boat' as const, label: `Pets & Boats (${VIP_REWARD_COUNTS.pet_boat})` },
            { id: 'title_trophy' as const, label: `Titles & Trophies (${VIP_REWARD_COUNTS.title_trophy})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onPlayClick();
                setCatTab(tab.id);
              }}
              className={`cursor-pointer border-2 px-2 py-1.5 text-[11px] font-bold ${
                catTab === tab.id
                  ? 'border-[#45230d] bg-[#b86f34] text-[#fff8e7]'
                  : 'border-[#966236] bg-[#ebd2a4] text-[#4d2912] hover:bg-[#f2deb8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rarity & Lock Filters */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'rare', 'epic', 'mythic', 'legendary'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  onPlayClick();
                  setRarityFilter(r);
                }}
                className={`cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] font-extrabold ${
                  rarityFilter === r
                    ? 'border-[#45230d] bg-[#45230d] text-[#fff8e7]'
                    : 'border-[#c79963] bg-[#f5e6c8] text-[#522b14]'
                }`}
              >
                {r === 'all' ? 'All Tiers' : VIP_RARITY_META[r].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'unlocked', 'locked'] as const).map((lf) => (
              <button
                key={lf}
                type="button"
                onClick={() => {
                  onPlayClick();
                  setLockFilter(lf);
                }}
                className={`cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] font-bold capitalize ${
                  lockFilter === lf
                    ? 'border-[#78350f] bg-[#f59e0b] text-[#291709]'
                    : 'border-[#c79963] bg-[#f5e6c8] text-[#522b14]'
                }`}
              >
                {lf}
              </button>
            ))}
          </div>
        </div>

        {/* Reward Cards Grid */}
        <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map((rew) => {
            const unlocked = unlockedSet.has(rew.id);
            const rm = VIP_RARITY_META[rew.rarity];
            const ownedCount = vipDecorCounts[rew.id] || 0;
            const isPlaceable = rew.subkind === 'shop_decor' || rew.subkind === 'golden_trophy';
            const isEquipped =
              (rew.subkind === 'prestige_title' && equippedVipTitle === rew.id) ||
              (rew.subkind === 'pet_accessory' && equippedPetAccessory === rew.id) ||
              (rew.subkind === 'boat_skin' && equippedBoatSkin === rew.id);

            return (
              <div
                key={rew.id}
                className={`flex flex-col justify-between rounded-sm border-2 p-2.5 transition-colors ${
                  unlocked ? 'bg-[#fffaf0]' : 'border-[#bfa27a] bg-[#e6d5b8]/70 opacity-85'
                }`}
                style={unlocked ? { borderColor: rm.border } : undefined}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-[#c79963] bg-[#f5e6c8]">
                    <VipRewardThumbnail rewardId={rew.id} locked={!unlocked} size={46} />
                    {!unlocked && (
                      <Lock className="absolute h-4 w-4 text-[#45230d] drop-shadow" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className="rounded-sm px-1.5 py-0.5 text-[9px] font-extrabold"
                        style={{ backgroundColor: rm.bg, color: rm.text }}
                      >
                        {rm.label}
                      </span>
                      {unlocked && isPlaceable && (
                        <span className="rounded-sm bg-[#fef3c7] px-1.5 py-0.5 text-[9px] font-extrabold text-[#92400e]">
                          Bag: x{ownedCount}
                        </span>
                      )}
                      {isEquipped && (
                        <span className="inline-flex items-center gap-0.5 rounded-sm bg-[#16a34a] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                          <Check className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs font-extrabold text-[#3d1e0b]">
                      {unlocked ? rew.name : `??? (${rew.subkind.replace('_', ' ')})`}
                    </div>
                    <div className="truncate text-[11px] font-bold text-[#754623]" dir="rtl">
                      {unlocked ? rew.nameAr : 'جائزة VIP حصرية مغلقة'}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-[#6b3c1b]">
                      {unlocked ? rew.description : 'Win Madame Lumière’s Luxury Yacht challenges to unlock. Not sold in stores.'}
                    </p>
                  </div>
                </div>

                {/* Action Footer for Unlocked Rewards */}
                {unlocked && (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-[#e6c999] pt-2">
                    {isPlaceable && (
                      <button
                        type="button"
                        disabled={ownedCount <= 0}
                        onClick={() => {
                          onPlayClick();
                          onPlaceVipReward(rew.id);
                        }}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm border border-[#78350f] bg-[#f59e0b] px-2 py-1 text-[10px] font-extrabold text-[#291709] hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <MapPin className="h-3 w-3" />
                        <span>{ownedCount > 0 ? 'Place in World / Shop' : 'Placed (Win more copies!)'}</span>
                      </button>
                    )}

                    {rew.category === 'studio_tool' && (
                      <button
                        type="button"
                        onClick={() => {
                          onPlayClick();
                          onOpenDesignStudio();
                        }}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm border border-[#0e7490] bg-[#06b6d4] px-2 py-1 text-[10px] font-extrabold text-white hover:bg-[#0891b2]"
                      >
                        <Palette className="h-3 w-3" />
                        <span>Use in Design Studio</span>
                      </button>
                    )}

                    {(rew.subkind === 'pet_accessory' ||
                      rew.subkind === 'boat_skin' ||
                      rew.subkind === 'prestige_title') && (
                      <button
                        type="button"
                        onClick={() => {
                          onPlayClick();
                          if (isEquipped) {
                            onUnequipKind(
                              rew.subkind === 'prestige_title'
                                ? 'title'
                                : rew.subkind === 'pet_accessory'
                                  ? 'pet_accessory'
                                  : 'boat_skin'
                            );
                          } else {
                            onEquipVipReward(rew);
                          }
                        }}
                        className={`w-full cursor-pointer rounded-sm border px-2 py-1 text-[10px] font-extrabold ${
                          isEquipped
                            ? 'border-[#966236] bg-[#ebd2a4] text-[#45230d]'
                            : 'border-[#4c1d95] bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                        }`}
                      >
                        {isEquipped ? 'Unequip' : 'Equip Now'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
