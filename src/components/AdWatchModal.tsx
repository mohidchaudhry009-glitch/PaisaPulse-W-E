import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Film, PlayCircle, ShieldCheck, Volume2, VolumeX, X } from 'lucide-react';

interface AdWatchModalProps {
  isOpen: boolean;
  durationSeconds?: number;
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
}

const AD_SCENES = [
  {
    brand: 'CashView Rewards Partner',
    headline: 'Instant Mobile Wallet Payouts Across Pakistan',
    caption: 'Complete 10 verified ad views to unlock Rs. 50 directly in your wallet.',
    accent: 'from-emerald-600 to-teal-700',
  },
  {
    brand: 'JazzCash & Easypaisa Ready',
    headline: 'Withdraw Starting From Rs. 500',
    caption: 'Fast payout verification with transparent tracking in your dashboard.',
    accent: 'from-slate-800 to-emerald-800',
  },
  {
    brand: 'Daily Streak Boost',
    headline: 'Verified Impressions · Zero Clutter',
    caption: 'Stay on this screen until the 20-second timer finishes to claim credit.',
    accent: 'from-emerald-700 to-slate-900',
  },
  {
    brand: 'CashView Verified Session',
    headline: 'Almost Done — Verifying Completion',
    caption: 'Your reward progress is about to be credited automatically.',
    accent: 'from-teal-700 to-emerald-900',
  },
];

export function AdWatchModal({
  isOpen,
  durationSeconds = 20,
  onComplete,
  onCancel,
}: AdWatchModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [completed, setCompleted] = useState(false);
  const [muted, setMuted] = useState(true);

  const onCompleteRef = useRef(onComplete);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(durationSeconds);
      setCompleted(false);
      completedFiredRef.current = false;
      return;
    }

    setSecondsLeft(durationSeconds);
    setCompleted(false);
    completedFiredRef.current = false;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (!isOpen || !completed || completedFiredRef.current) return;
    completedFiredRef.current = true;
    const timeout = window.setTimeout(() => {
      void onCompleteRef.current();
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [isOpen, completed]);

  if (!isOpen) return null;

  const elapsed = durationSeconds - secondsLeft;
  const progressPercent = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
  const sceneIndex = Math.min(
    AD_SCENES.length - 1,
    Math.floor((elapsed / durationSeconds) * AD_SCENES.length)
  );
  const currentScene = AD_SCENES[sceneIndex];
  const formattedSeconds = `${String(secondsLeft).padStart(2, '0')}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Film className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h2 id="ad-modal-title" className="font-display text-base font-semibold text-slate-900">
              Watching Ad...
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700">
              {completed ? 'Completed' : `Reward in ${formattedSeconds}`}
            </span>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close ad player"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Rewarded Video Stage */}
          <div
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${currentScene.accent} p-6 text-white shadow-inner transition-colors duration-500`}
          >
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="font-medium tracking-wide">
                Sponsored Preview · CashView
              </span>
              <button
                type="button"
                onClick={() => setMuted((prev) => !prev)}
                aria-label={muted ? 'Unmute ad preview' : 'Mute ad preview'}
                className="rounded-md bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="my-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <PlayCircle className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs font-medium tracking-wide text-emerald-200">
                {currentScene.brand}
              </p>
              <h3 className="mt-1.5 max-w-sm font-display text-lg font-bold leading-snug text-white">
                {currentScene.headline}
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/80">
                {currentScene.caption}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/15 pt-3 text-xs">
              <span className="font-mono text-2xl font-bold tabular-nums text-white">
                {completed ? '00s' : formattedSeconds}
              </span>
              <span className="inline-flex items-center gap-1 text-white/85">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sponsored Ad Unit</span>
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {completed
                  ? 'Ad view verified. Crediting progress...'
                  : 'Keep this window open until the 20s timer completes.'}
              </span>
              <span className="font-mono font-medium tabular-nums text-slate-900">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Verified ad playback</span>
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
            >
              Cancel view
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
