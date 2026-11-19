import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  Newspaper,
  Plus,
  Send,
  Sparkles,
  Sticker,
  Trash2,
  X,
} from 'lucide-react';
import type { CloudMagazine, MagazinePage, MagazineSticker, MagazineTheme } from './firebase';

export interface LookbookSnapshot {
  id: string;
  dataUrl: string;
  takenAt: number;
  location: string;
  friendsCount: number;
}

export interface MagazineThemeMeta {
  id: MagazineTheme;
  label: string;
  coverBg: string;
  coverBorder: string;
  accent: string;
  text: string;
  subText: string;
  pageBg: string;
}

export const MAGAZINE_THEMES: MagazineThemeMeta[] = [
  {
    id: 'coral_vogue',
    label: 'Coral Vogue',
    coverBg: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 55%, #fda4af 100%)',
    coverBorder: '#9f1239',
    accent: '#be123c',
    text: '#4c0519',
    subText: '#881337',
    pageBg: '#fff5f7',
  },
  {
    id: 'midnight_neon',
    label: 'Midnight Neon',
    coverBg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)',
    coverBorder: '#22d3ee',
    accent: '#f472b6',
    text: '#f8fafc',
    subText: '#a5f3fc',
    pageBg: '#111827',
  },
  {
    id: 'seaside_pastel',
    label: 'Seaside Pastel',
    coverBg: 'linear-gradient(135deg, #ecfeff 0%, #bae6fd 55%, #fef3c7 100%)',
    coverBorder: '#0369a1',
    accent: '#0284c7',
    text: '#0c4a6e',
    subText: '#075985',
    pageBg: '#f0f9ff',
  },
  {
    id: 'royal_gold',
    label: 'Royal Gold',
    coverBg: 'linear-gradient(135deg, #fefce8 0%, #fde68a 55%, #f59e0b 100%)',
    coverBorder: '#78350f',
    accent: '#b45309',
    text: '#451a03',
    subText: '#78350f',
    pageBg: '#fffbeb',
  },
];

export interface MagazineStickerOption {
  id: string;
  emoji: string;
  label: string;
  badgeText?: string;
  bg?: string;
}

export const MAGAZINE_STICKERS: MagazineStickerOption[] = [
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
  { id: 'heart', emoji: '💖', label: 'Heart' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'hibiscus', emoji: '🌺', label: 'Hibiscus' },
  { id: 'shell', emoji: '🐚', label: 'Shell' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly' },
  { id: 'camera', emoji: '📸', label: 'Snap' },
  { id: 'umbrella', emoji: '☂️', label: 'Rain Chic' },
  { id: 'moon', emoji: '🌙', label: 'Night Glow' },
  { id: 'ribbon', emoji: '🎀', label: 'Ribbon' },
  { id: 'gem', emoji: '💎', label: 'Luxury' },
  { id: 'new_tag', emoji: '🔥', label: 'HOT!', badgeText: 'HOT!', bg: '#ef4444' },
  { id: 'chic_ar', emoji: '✦', label: 'أنيق', badgeText: 'أنيق ✨', bg: '#7c3aed' },
];

export function getMagazineThemeMeta(theme: MagazineTheme): MagazineThemeMeta {
  return MAGAZINE_THEMES.find((t) => t.id === theme) || MAGAZINE_THEMES[0];
}

function renderStickerBadge(stickerId: string): React.ReactNode {
  const meta = MAGAZINE_STICKERS.find((s) => s.id === stickerId);
  if (!meta) return <span className="text-lg">✨</span>;
  if (meta.badgeText) {
    return (
      <span
        dir="auto"
        className="inline-flex items-center gap-0.5 rounded-xs border-2 border-white px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-md"
        style={{ backgroundColor: meta.bg || '#be123c' }}
      >
        {meta.badgeText}
      </span>
    );
  }
  return (
    <span className="text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]" aria-label={meta.label}>
      {meta.emoji}
    </span>
  );
}

// ============================================================================
// LOOKBOOK & FASHION MAGAZINE CREATOR MODAL (UP TO 6 PAGES)
// ============================================================================

interface LookbookCreatorModalProps {
  playerName: string;
  snapshots: LookbookSnapshot[];
  onPlayClick: () => void;
  onOpenCamera: () => void;
  onDeleteSnapshot: (snapId: string) => void;
  onPublishMagazine: (payload: {
    title: string;
    subtitle: string;
    theme: MagazineTheme;
    price: number;
    pages: MagazinePage[];
  }) => Promise<void>;
  onClose: () => void;
}

export const LookbookCreatorModal: React.FC<LookbookCreatorModalProps> = ({
  playerName,
  snapshots,
  onPlayClick,
  onOpenCamera,
  onDeleteSnapshot,
  onPublishMagazine,
  onClose,
}) => {
  const [title, setTitle] = useState<string>(`${playerName || 'Coral'} Lookbook`);
  const [subtitle, setSubtitle] = useState<string>('Island Style · صيف كورال كوف');
  const [theme, setTheme] = useState<MagazineTheme>('coral_vogue');
  const [price, setPrice] = useState<number>(50);
  const [pages, setPages] = useState<MagazinePage[]>(() =>
    snapshots.slice(0, 2).map((s) => ({
      photoDataUrl: s.dataUrl,
      caption: s.location ? `Look at ${s.location}` : '',
      location: s.location,
      stickers: [],
    }))
  );
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>('sparkle');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const themeMeta = getMagazineThemeMeta(theme);
  const currentPage = pages[activePageIdx] || null;

  const handleAddSnapshotPage = (snap: LookbookSnapshot) => {
    onPlayClick();
    setErrorMsg(null);
    if (pages.length >= 6) {
      setErrorMsg('Magazines hold up to 6 pages! Remove a page to add another.');
      return;
    }
    const nextPages: MagazinePage[] = [
      ...pages,
      {
        photoDataUrl: snap.dataUrl,
        caption: snap.friendsCount > 0 ? `Style Squad at ${snap.location}` : `Spotted at ${snap.location}`,
        location: snap.location,
        stickers: [],
      },
    ];
    setPages(nextPages);
    setActivePageIdx(nextPages.length - 1);
  };

  const handleRemovePage = (idx: number) => {
    onPlayClick();
    const next = pages.filter((_, i) => i !== idx);
    setPages(next);
    setActivePageIdx((prev) => Math.max(0, Math.min(prev, next.length - 1)));
  };

  const handleMovePage = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= pages.length) return;
    onPlayClick();
    const next = [...pages];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setPages(next);
    setActivePageIdx(target);
  };

  const handleUpdateCaption = (val: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === activePageIdx ? { ...p, caption: val.slice(0, 140) } : p))
    );
  };

  const handlePlaceStickerOnPage = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentPage || !selectedStickerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(6, Math.min(94, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(10, Math.min(90, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    onPlayClick();
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== activePageIdx) return p;
        const nextSticker: MagazineSticker = {
          id: `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
          stickerId: selectedStickerId,
          x,
          y,
        };
        const trimmed = p.stickers.length >= 6 ? p.stickers.slice(1) : p.stickers;
        return { ...p, stickers: [...trimmed, nextSticker] };
      })
    );
  };

  const handleRemoveSticker = (stickerUid: string) => {
    onPlayClick();
    setPages((prev) =>
      prev.map((p, i) =>
        i === activePageIdx
          ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerUid) }
          : p
      )
    );
  };

  const handlePublish = async () => {
    if (publishing) return;
    if (pages.length === 0) {
      setErrorMsg('Add at least 1 snapshot page before publishing your magazine!');
      return;
    }
    setPublishing(true);
    setErrorMsg(null);
    try {
      await onPublishMagazine({
        title: title.trim() || `${playerName || 'Islander'} Lookbook`,
        subtitle: subtitle.trim(),
        theme,
        price,
        pages,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not publish magazine.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !publishing) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[94vh] w-full max-w-[920px] overflow-y-auto p-4 text-[#3d1e0b] sm:p-5">
        {/* Header */}
        <div className="mb-3.5 flex items-center justify-between gap-2 border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="wood-slot flex h-10 w-10 shrink-0 items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#be123c]" />
            </div>
            <div>
              <h2 className="font-pixel text-base font-bold text-[#45230d] sm:text-lg">
                Lookbook &amp; Magazine Studio
              </h2>
              <p className="text-xs font-medium text-[#754623]">
                Snap island looks, arrange up to 6 pages with Arabic/English captions &amp; stickers, and publish to the Island Newsstand!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onOpenCamera();
              }}
              className="flex h-9 cursor-pointer items-center gap-1.5 border-2 border-[#881337] bg-[#e11d48] px-3 text-xs font-bold text-white shadow-[0_2px_0_#4c0519] hover:brightness-105"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Take Snapshot</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close Lookbook Studio"
              className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
          {/* Left: Snapshot Camera Roll & Magazine Metadata */}
          <div className="space-y-3">
            {/* Cover Metadata */}
            <div className="space-y-2 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
              <div className="text-xs font-bold text-[#45230d]">Magazine Cover</div>
              <input
                type="text"
                dir="auto"
                maxLength={42}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Magazine Title / عنوان المجلة"
                className="w-full border-2 border-[#6b3c1b] bg-[#fff7e6] px-2.5 py-1.5 text-xs font-bold text-[#3d1e0b] focus:border-[#b86f34] focus:outline-none"
              />
              <input
                type="text"
                dir="auto"
                maxLength={72}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Issue Subtitle / وصف العدد"
                className="w-full border-2 border-[#6b3c1b] bg-[#fff7e6] px-2.5 py-1 text-[11px] font-semibold text-[#522b14] focus:border-[#b86f34] focus:outline-none"
              />

              {/* Theme Picker */}
              <div>
                <div className="mb-1 text-[10px] font-bold text-[#6b3c1b]">Cover Style</div>
                <div className="grid grid-cols-2 gap-1">
                  {MAGAZINE_THEMES.map((t) => {
                    const active = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onPlayClick();
                          setTheme(t.id);
                        }}
                        className={`cursor-pointer border-2 px-2 py-1 text-[10px] font-bold ${
                          active
                            ? 'border-[#45230d] ring-2 ring-[#e6b23c]'
                            : 'border-[#966236] opacity-85 hover:opacity-100'
                        }`}
                        style={{ background: t.coverBg, color: t.text }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Newsstand Price */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#6b3c1b]">
                  <span>Newsstand Price</span>
                  <span className="font-pixel text-[#45230d]">{price === 0 ? 'FREE' : `${price} G`}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 50, 150, 300].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        setPrice(p);
                      }}
                      className={`cursor-pointer border py-1 text-[10px] font-bold ${
                        price === p
                          ? 'border-[#45230d] bg-[#fde047] text-[#3d1e0b]'
                          : 'border-[#966236] bg-[#fff7e6] text-[#522b14]'
                      }`}
                    >
                      {p === 0 ? 'Free' : `${p}G`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Island Snapshot Roll */}
            <div className="rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#45230d]">
                  Snapshot Roll ({snapshots.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    onOpenCamera();
                  }}
                  className="flex cursor-pointer items-center gap-1 border border-[#881337] bg-[#ffe4e6] px-1.5 py-0.5 text-[10px] font-bold text-[#9f1239] hover:bg-[#fecdd3]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Snap</span>
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="rounded-xs border border-dashed border-[#966236] bg-[#f7e7c8] p-4 text-center">
                  <Camera className="mx-auto mb-1.5 h-6 w-6 text-[#8c5828]" />
                  <p className="text-[11px] font-semibold text-[#522b14]">
                    No snapshots yet! Click <strong>Take Snapshot</strong> to photograph your outfit &amp; friends on the island.
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[250px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="group relative overflow-hidden border-2 border-[#6b3c1b] bg-[#26140e]"
                    >
                      <img
                        src={snap.dataUrl}
                        alt={snap.location}
                        className="pixelated h-20 w-full object-cover"
                      />
                      <div className="flex items-center justify-between bg-[#fff7e6] px-1 py-0.5">
                        <span className="truncate text-[9px] font-bold text-[#522b14]">
                          {snap.location}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            title="Add snapshot as a magazine page"
                            onClick={() => handleAddSnapshotPage(snap)}
                            className="flex h-5 w-5 cursor-pointer items-center justify-center border border-[#15803d] bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0]"
                          >
                            <ImagePlus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete snapshot"
                            onClick={() => {
                              onPlayClick();
                              onDeleteSnapshot(snap.id);
                            }}
                            className="flex h-5 w-5 cursor-pointer items-center justify-center border border-[#b91c1c] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive 6-Page Designer */}
          <div className="flex flex-col justify-between gap-3 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-3">
            {/* Page Strip (1..6) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#45230d]">
                <span>Magazine Pages ({pages.length} / 6)</span>
                {currentPage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={activePageIdx === 0}
                      onClick={() => handleMovePage(activePageIdx, -1)}
                      className="cursor-pointer border border-[#8c5828] bg-[#fff3d6] px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-40"
                    >
                      ◀ Move
                    </button>
                    <button
                      type="button"
                      disabled={activePageIdx >= pages.length - 1}
                      onClick={() => handleMovePage(activePageIdx, 1)}
                      className="cursor-pointer border border-[#8c5828] bg-[#fff3d6] px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-40"
                    >
                      Move ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(activePageIdx)}
                      className="cursor-pointer border border-[#991b1b] bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-bold text-[#991b1b]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 6 }, (_, idx) => {
                  const p = pages[idx];
                  const active = idx === activePageIdx && Boolean(p);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!p}
                      onClick={() => {
                        onPlayClick();
                        setActivePageIdx(idx);
                      }}
                      className={`relative flex h-12 flex-col items-center justify-center overflow-hidden border-2 text-[10px] font-bold ${
                        active
                          ? 'border-[#45230d] ring-2 ring-[#e6b23c]'
                          : p
                            ? 'cursor-pointer border-[#966236] bg-[#fff7e6]'
                            : 'cursor-default border-dashed border-[#b88b58] bg-[#e2c693] text-[#8c5828]'
                      }`}
                    >
                      {p ? (
                        <>
                          <img src={p.photoDataUrl} alt={`Page ${idx + 1}`} className="pixelated h-full w-full object-cover" />
                          <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[9px] text-white">
                            P{idx + 1}
                          </span>
                        </>
                      ) : (
                        <span>P{idx + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Page Canvas with Click-to-Place Stickers & Caption */}
            {currentPage ? (
              <div
                className="rounded-sm border-2 p-3"
                style={{
                  backgroundColor: themeMeta.pageBg,
                  borderColor: themeMeta.coverBorder,
                  color: themeMeta.text,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
                  <span dir="auto" className="truncate uppercase tracking-wider" style={{ color: themeMeta.accent }}>
                    {title || 'Coral Cove'} · Page {activePageIdx + 1}
                  </span>
                  <span style={{ color: themeMeta.subText }}>
                    {selectedStickerId ? 'Click photo to place sticker (tap sticker to remove)' : 'Pick a sticker below'}
                  </span>
                </div>

                {/* Interactive Photo Area */}
                <div
                  onClick={handlePlaceStickerOnPage}
                  className="relative mx-auto aspect-[10/7] w-full max-w-[440px] cursor-crosshair overflow-hidden border-2 border-black/40 bg-[#1e293b] select-none"
                >
                  <img
                    src={currentPage.photoDataUrl}
                    alt={`Page ${activePageIdx + 1}`}
                    className="pixelated pointer-events-none h-full w-full object-cover"
                  />
                  {currentPage.stickers.map((stk) => (
                    <button
                      key={stk.id}
                      type="button"
                      title="Click to remove sticker"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSticker(stk.id);
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
                      style={{ left: `${stk.x}%`, top: `${stk.y}%` }}
                    >
                      {renderStickerBadge(stk.stickerId)}
                    </button>
                  ))}
                  {currentPage.location && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-xs bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      📍 {currentPage.location}
                    </span>
                  )}
                </div>

                {/* Arabic / English Caption Input */}
                <div className="mt-2.5">
                  <label className="mb-1 flex items-center justify-between text-[10px] font-bold" style={{ color: themeMeta.subText }}>
                    <span>Page Caption (Arabic / English)</span>
                    <span className="tabular-nums">{currentPage.caption.length}/140</span>
                  </label>
                  <textarea
                    dir="auto"
                    rows={2}
                    maxLength={140}
                    value={currentPage.caption}
                    onChange={(e) => handleUpdateCaption(e.target.value)}
                    placeholder="Write an editorial caption in English or العربية..."
                    className="w-full resize-none border-2 border-[#6b3c1b] bg-[#fff7e6] px-2.5 py-1.5 text-xs font-semibold text-[#3d1e0b] focus:border-[#b86f34] focus:outline-none"
                  />
                </div>

                {/* Sticker Tray */}
                <div className="mt-2">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: themeMeta.subText }}>
                    <Sticker className="h-3 w-3" />
                    <span>Stickers (select then tap photo · max 6/page):</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {MAGAZINE_STICKERS.map((stk) => {
                      const active = selectedStickerId === stk.id;
                      return (
                        <button
                          key={stk.id}
                          type="button"
                          title={stk.label}
                          onClick={() => {
                            onPlayClick();
                            setSelectedStickerId((cur) => (cur === stk.id ? null : stk.id));
                          }}
                          className={`flex h-7 cursor-pointer items-center justify-center border px-1.5 text-xs font-bold ${
                            active
                              ? 'border-[#45230d] bg-[#fde047] text-[#3d1e0b] ring-1 ring-[#a16207]'
                              : 'border-[#966236] bg-[#fff7e6] text-[#3d1e0b] hover:bg-[#fef3c7]'
                          }`}
                        >
                          {stk.badgeText ? (
                            <span dir="auto" className="text-[10px] font-extrabold">
                              {stk.badgeText}
                            </span>
                          ) : (
                            <span>{stk.emoji}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-[#966236] bg-[#f7e7c8] p-6 text-center">
                <Sparkles className="h-8 w-8 text-[#be123c]" />
                <div className="font-pixel text-sm font-bold text-[#45230d]">Build Your Fashion Issue</div>
                <p className="max-w-xs text-xs font-medium text-[#6b3c1b]">
                  Tap the green <strong>+</strong> button on any snapshot in your roll (or take a fresh photo) to start designing pages!
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="border-2 border-[#a62b2b] bg-[#fee2e2] px-2.5 py-1.5 text-xs font-bold text-[#991b1b]">
                {errorMsg}
              </div>
            )}

            {/* Footer Publish Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#c79963] pt-2.5">
              <span className="text-[11px] font-semibold text-[#522b14]">
                Published magazines appear immediately at the <strong>Island Newsstand</strong> for all players!
              </span>
              <button
                type="button"
                disabled={publishing || pages.length === 0}
                onClick={() => void handlePublish()}
                className="flex h-10 cursor-pointer items-center gap-1.5 border-2 border-[#45230d] bg-[#fde047] px-4 text-xs font-bold text-[#3d1e0b] shadow-[0_2px_0_#a16207] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {publishing
                    ? 'Publishing...'
                    : `Publish Magazine (${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'} · ${
                        price === 0 ? 'Free' : `${price} G`
                      })`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PUBLIC ISLAND NEWSSTAND & INTERACTIVE MAGAZINE READER MODAL
// ============================================================================

interface NewsstandModalProps {
  magazines: CloudMagazine[];
  ownedMagazineIds: string[];
  playerId: string;
  gold: number;
  onPlayClick: () => void;
  onOpenLookbookStudio: () => void;
  onBuyMagazine: (mag: CloudMagazine) => Promise<boolean>;
  onLikeMagazine: (mag: CloudMagazine) => void;
  onClose: () => void;
}

export const NewsstandModal: React.FC<NewsstandModalProps> = ({
  magazines,
  ownedMagazineIds,
  playerId,
  gold,
  onPlayClick,
  onOpenLookbookStudio,
  onBuyMagazine,
  onLikeMagazine,
  onClose,
}) => {
  const [readingId, setReadingId] = useState<string | null>(null);
  const [spreadIdx, setSpreadIdx] = useState<number>(0); // 0 = Cover, 1..N = pages
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const readingMag = useMemo(
    () => (readingId ? magazines.find((m) => m.id === readingId) || null : null),
    [magazines, readingId]
  );

  const isOwnedOrFree = (mag: CloudMagazine) =>
    mag.price <= 0 || mag.authorId === playerId || ownedMagazineIds.includes(mag.id);

  const handleOpenOrBuy = async (mag: CloudMagazine) => {
    setErrorMsg(null);
    if (isOwnedOrFree(mag)) {
      onPlayClick();
      setReadingId(mag.id);
      setSpreadIdx(0);
      return;
    }
    if (gold < mag.price) {
      setErrorMsg(`Need ${mag.price.toLocaleString()} G to buy "${mag.title}".`);
      return;
    }
    setBuyingId(mag.id);
    try {
      const ok = await onBuyMagazine(mag);
      if (ok) {
        setReadingId(mag.id);
        setSpreadIdx(0);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onPlayClick();
          onClose();
        }
      }}
    >
      <div className="wood-panel relative max-h-[92vh] w-full max-w-[820px] overflow-y-auto p-4 text-[#3d1e0b] sm:p-5">
        {/* Header */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#c79963] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="wood-slot flex h-10 w-10 shrink-0 items-center justify-center">
              <Newspaper className="h-5 w-5 text-[#b45309]" />
            </div>
            <div>
              <h2 className="font-pixel text-base font-bold text-[#45230d] sm:text-lg">
                Island Newsstand · Fashion Magazines
              </h2>
              <p className="text-xs font-medium text-[#754623]">
                Browse, collect, and flip through player-made Coral Cove Lookbooks!
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
                onOpenLookbookStudio();
              }}
              className="flex h-9 cursor-pointer items-center gap-1.5 border-2 border-[#881337] bg-[#e11d48] px-3 text-xs font-bold text-white shadow-[0_2px_0_#4c0519] hover:brightness-105"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Create Issue</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onClose();
              }}
              aria-label="Close Newsstand"
              className="wood-btn flex h-9 w-9 cursor-pointer items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 border-2 border-[#a62b2b] bg-[#fee2e2] px-3 py-1.5 text-xs font-bold text-[#991b1b]">
            {errorMsg}
          </div>
        )}

        {/* Interactive Flip-Through Reader OR Newsstand Shelf */}
        {readingMag ? (
          (() => {
            const themeMeta = getMagazineThemeMeta(readingMag.theme);
            const totalViews = readingMag.pages.length + 1; // 0 = Cover, 1..N = pages
            const pageData = spreadIdx > 0 ? readingMag.pages[spreadIdx - 1] : null;
            const hasLiked = Boolean(likedIds[readingMag.id]);

            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      setReadingId(null);
                    }}
                    className="wood-btn flex h-8 cursor-pointer items-center gap-1 px-3 text-xs font-bold"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back to Newsstand</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs font-bold text-[#522b14]">
                      {spreadIdx === 0 ? 'Cover' : `Page ${spreadIdx} of ${readingMag.pages.length}`}
                    </span>
                    <button
                      type="button"
                      disabled={hasLiked}
                      onClick={() => {
                        if (hasLiked) return;
                        onPlayClick();
                        setLikedIds((prev) => ({ ...prev, [readingMag.id]: true }));
                        onLikeMagazine(readingMag);
                      }}
                      className={`flex h-8 cursor-pointer items-center gap-1 border-2 px-2.5 text-xs font-bold ${
                        hasLiked
                          ? 'border-[#be123c] bg-[#ffe4e6] text-[#be123c]'
                          : 'border-[#966236] bg-[#fff7e6] text-[#45230d] hover:bg-[#ffe4e6]'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${hasLiked ? 'fill-[#be123c]' : ''}`} />
                      <span className="tabular-nums">{readingMag.likesCount}</span>
                    </button>
                  </div>
                </div>

                {/* Magazine Spread Frame */}
                <div
                  className="mx-auto max-w-[540px] rounded-sm border-4 p-4 shadow-[0_8px_24px_rgba(38,20,14,0.28)]"
                  style={{
                    background: spreadIdx === 0 ? themeMeta.coverBg : themeMeta.pageBg,
                    borderColor: themeMeta.coverBorder,
                    color: themeMeta.text,
                  }}
                >
                  {spreadIdx === 0 ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div
                        className="text-[10px] font-extrabold tracking-[0.22em] uppercase"
                        style={{ color: themeMeta.accent }}
                      >
                        CORAL COVE FASHION PRESS
                      </div>
                      <h3 dir="auto" className="font-pixel text-xl font-extrabold leading-tight sm:text-2xl">
                        {readingMag.title}
                      </h3>
                      {readingMag.subtitle && (
                        <p dir="auto" className="text-xs font-bold" style={{ color: themeMeta.subText }}>
                          {readingMag.subtitle}
                        </p>
                      )}
                      {readingMag.pages[0] && (
                        <div className="relative aspect-[10/7] w-full overflow-hidden border-2 border-black/40 bg-[#1e293b]">
                          <img
                            src={readingMag.pages[0].photoDataUrl}
                            alt={readingMag.title}
                            className="pixelated h-full w-full object-cover"
                          />
                          {readingMag.pages[0].stickers.map((stk) => (
                            <span
                              key={stk.id}
                              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${stk.x}%`, top: `${stk.y}%` }}
                            >
                              {renderStickerBadge(stk.stickerId)}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex w-full items-center justify-between border-t border-black/15 pt-2 text-[11px] font-bold">
                        <span dir="auto">By {readingMag.authorName}</span>
                        <span>{readingMag.pages.length} Pages · Flip Inside ▶</span>
                      </div>
                    </div>
                  ) : pageData ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
                        <span dir="auto" style={{ color: themeMeta.accent }}>
                          {readingMag.title}
                        </span>
                        <span style={{ color: themeMeta.subText }}>Page {spreadIdx}</span>
                      </div>
                      <div className="relative aspect-[10/7] w-full overflow-hidden border-2 border-black/40 bg-[#1e293b]">
                        <img
                          src={pageData.photoDataUrl}
                          alt={`Page ${spreadIdx}`}
                          className="pixelated h-full w-full object-cover"
                        />
                        {pageData.stickers.map((stk) => (
                          <span
                            key={stk.id}
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${stk.x}%`, top: `${stk.y}%` }}
                          >
                            {renderStickerBadge(stk.stickerId)}
                          </span>
                        ))}
                        {pageData.location && (
                          <span className="absolute bottom-1.5 left-1.5 rounded-xs bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            📍 {pageData.location}
                          </span>
                        )}
                      </div>
                      {pageData.caption && (
                        <div
                          dir="auto"
                          className="rounded-xs border border-black/15 bg-white/85 px-3 py-2 text-sm font-bold text-[#2b1508]"
                        >
                          {pageData.caption}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Page Flip Navigation */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={spreadIdx === 0}
                    onClick={() => {
                      onPlayClick();
                      setSpreadIdx((i) => Math.max(0, i - 1));
                    }}
                    className="wood-btn flex h-9 cursor-pointer items-center gap-1 px-3.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev Page</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalViews }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={i === 0 ? 'Cover' : `Page ${i}`}
                        onClick={() => {
                          onPlayClick();
                          setSpreadIdx(i);
                        }}
                        className={`h-2.5 w-2.5 cursor-pointer rounded-full border border-[#45230d] ${
                          i === spreadIdx ? 'bg-[#e11d48]' : 'bg-[#ebd2a4]'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={spreadIdx >= totalViews - 1}
                    onClick={() => {
                      onPlayClick();
                      setSpreadIdx((i) => Math.min(totalViews - 1, i + 1));
                    }}
                    className="wood-btn flex h-9 cursor-pointer items-center gap-1 px-3.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span>Next Page</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })()
        ) : magazines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-sm border-2 border-[#c79963] bg-[#ebd2a4] p-8 text-center">
            <Newspaper className="h-10 w-10 text-[#966236]" />
            <div className="font-pixel text-sm font-bold text-[#45230d]">
              The Newsstand Rack Is Fresh &amp; Ready!
            </div>
            <p className="max-w-md text-xs font-medium text-[#6b3c1b]">
              Be the first Coral Cove fashion editor! Snap island photos with your camera, add Arabic or English captions &amp; stickers, and publish your magazine here.
            </p>
            <button
              type="button"
              onClick={() => {
                onPlayClick();
                onOpenLookbookStudio();
              }}
              className="mt-1 flex h-10 cursor-pointer items-center gap-1.5 border-2 border-[#881337] bg-[#e11d48] px-4 text-xs font-bold text-white shadow-[0_2px_0_#4c0519]"
            >
              <Camera className="h-4 w-4" />
              <span>Start Your First Magazine</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {magazines.map((mag) => {
              const themeMeta = getMagazineThemeMeta(mag.theme);
              const unlocked = isOwnedOrFree(mag);
              const isMine = mag.authorId === playerId;
              const isBuying = buyingId === mag.id;
              return (
                <div
                  key={mag.id}
                  className="flex flex-col justify-between overflow-hidden rounded-sm border-2 shadow-sm"
                  style={{
                    background: themeMeta.coverBg,
                    borderColor: themeMeta.coverBorder,
                    color: themeMeta.text,
                  }}
                >
                  <div className="p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-1 text-[9px] font-extrabold uppercase tracking-wider">
                      <span style={{ color: themeMeta.accent }}>CORAL PRESS</span>
                      <span className="rounded-xs bg-black/20 px-1.5 py-0.5 text-[9px] font-bold">
                        {mag.pages.length} {mag.pages.length === 1 ? 'pg' : 'pgs'}
                      </span>
                    </div>
                    <div dir="auto" className="font-pixel truncate text-sm font-bold">
                      {mag.title}
                    </div>
                    {mag.subtitle && (
                      <div dir="auto" className="truncate text-[10px] font-semibold" style={{ color: themeMeta.subText }}>
                        {mag.subtitle}
                      </div>
                    )}
                    {mag.pages[0] && (
                      <div className="mt-2 aspect-[10/7] w-full overflow-hidden border border-black/35 bg-[#1e293b]">
                        <img
                          src={mag.pages[0].photoDataUrl}
                          alt={mag.title}
                          className="pixelated h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-black/15 bg-[#fff7e6]/95 px-2.5 py-2 text-[#3d1e0b]">
                    <div className="min-w-0">
                      <div dir="auto" className="truncate text-[11px] font-bold">
                        {mag.authorName} {isMine && <span className="text-[9px] text-[#1c5e32]">(You)</span>}
                      </div>
                      <div className="text-[10px] font-semibold tabular-nums text-[#754623]">
                        ❤️ {mag.likesCount} · {mag.salesCount} sold
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isBuying}
                      onClick={() => void handleOpenOrBuy(mag)}
                      className={`h-8 shrink-0 cursor-pointer border-2 px-2.5 text-[11px] font-bold whitespace-nowrap ${
                        unlocked
                          ? 'border-[#15803d] bg-[#dcfce7] text-[#14532d] hover:bg-[#bbf7d0]'
                          : 'border-[#45230d] bg-[#fde047] text-[#3d1e0b] hover:brightness-105'
                      }`}
                    >
                      {isBuying
                        ? 'Buying...'
                        : unlocked
                          ? 'Read'
                          : `Buy (${mag.price} G)`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
