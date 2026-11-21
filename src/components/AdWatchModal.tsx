import { useEffect, useState } from 'react';
import { Film, ShieldCheck, X } from 'lucide-react';

interface AdWatchModalProps {
  isOpen: boolean;
  durationSeconds?: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function AdWatchModal({
  isOpen,
  durationSeconds = 5,
  onComplete,
  onCancel,
}: AdWatchModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(durationSeconds);
      setCompleted(false);
      return;
    }

    setSecondsLeft(durationSeconds);
    setCompleted(false);

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
    if (!isOpen || !completed) return;
    const timeout = window.setTimeout(() => {
      onComplete();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [isOpen, completed, onComplete]);

  if (!isOpen) return null;

  const progressPercent = Math.min(
    100,
    Math.round(((durationSeconds - secondsLeft) / durationSeconds) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#111827] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Film className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 id="ad-modal-title" className="font-display text-base font-semibold text-slate-100">
              Watching Ad...
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close ad player"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-[#090D16] px-6 py-10 text-center">
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Sponsored Preview · Demo Placement
            </p>
            <div className="mt-4 font-mono text-4xl font-bold tabular-nums text-emerald-400">
              {completed ? '00s' : `0${secondsLeft}s`}
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {completed
                ? 'Impression verified. Crediting progress...'
                : 'Keep this window open until the timer completes.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Verification progress</span>
              <span className="font-mono tabular-nums text-slate-200">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Demo mode active</span>
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:underline"
            >
              Cancel view
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
