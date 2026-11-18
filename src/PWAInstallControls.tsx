import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{
  variant?: 'join' | 'hud';
  onPlayClick?: () => void;
}> = ({ variant = 'join', onPlayClick }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'hud') {
      return (
        <button
          type="button"
          onClick={() => {
            onPlayClick?.();
            void install();
          }}
          title="Install Coral Cove App"
          aria-label="Install Coral Cove App"
          className="wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Download className="h-3.5 w-3.5 text-[#1c5e32]" />
          <span className="hidden sm:inline">Install</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          onPlayClick?.();
          void install();
        }}
        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-[#45230d] bg-[#FFD6E0] px-3 text-xs font-bold text-[#3d1e0b] shadow-[0_2px_0_#9d4b66] transition-transform hover:brightness-105 active:translate-y-0.5"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install Coral Cove App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        {variant === 'hud' ? (
          <button
            type="button"
            onClick={() => {
              onPlayClick?.();
              setShowIOSGuide(true);
            }}
            title="Install on iPhone / iPad"
            aria-label="Install on iPhone / iPad"
            className="wood-btn flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <Smartphone className="h-3.5 w-3.5 text-[#1c5e32]" />
            <span className="hidden sm:inline">Install</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onPlayClick?.();
              setShowIOSGuide(true);
            }}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-[#45230d] bg-[#FFD6E0] px-3 text-xs font-bold text-[#3d1e0b] shadow-[0_2px_0_#9d4b66] transition-transform hover:brightness-105 active:translate-y-0.5"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Install on iPhone / iPad</span>
          </button>
        )}

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onPlayClick?.();
                setShowIOSGuide(false);
              }
            }}
          >
            <div className="wood-panel w-full max-w-sm p-5 text-[#3d1e0b]">
              <div className="mb-3 flex items-center justify-between border-b-2 border-[#c79963] pb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#8a4518]" />
                  <h3 className="font-pixel text-sm font-bold text-[#45230d]">
                    Install Coral Cove
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick?.();
                    setShowIOSGuide(false);
                  }}
                  aria-label="Close install guide"
                  className="wood-btn flex h-7 w-7 cursor-pointer items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ol className="space-y-2 text-xs font-medium text-[#522b14]">
                <li className="flex items-start gap-2">
                  <span className="font-pixel font-bold text-[#45230d]">1.</span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-0.5"><Share className="inline h-3 w-3" /> Share</strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-pixel font-bold text-[#45230d]">2.</span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-pixel font-bold text-[#45230d]">3.</span>
                  <span>Launch Coral Cove fullscreen right from your Home Screen!</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  onPlayClick?.();
                  setShowIOSGuide(false);
                }}
                className="wood-btn mt-4 h-9 w-full cursor-pointer text-xs font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2.5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 border-2 border-[#78350f] bg-[#fef3c7] px-3 py-1 text-[11px] font-bold text-[#78350f] shadow-md">
      <WifiOff className="h-3.5 w-3.5 text-[#b45309]" />
      <span>Offline Mode — Local island save active</span>
    </div>
  );
};
