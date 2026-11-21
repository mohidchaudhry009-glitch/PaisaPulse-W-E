import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-500/30 bg-[#17130C] px-4 py-3.5 text-sm text-amber-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-amber-200">Supabase environment variables not configured</p>
          <p className="text-xs leading-relaxed text-amber-200/80">
            Set <code className="font-mono text-amber-100">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono text-amber-100">VITE_SUPABASE_ANON_KEY</code> in your environment
            (or Railway service variables) to enable authentication and live database sync.
          </p>
        </div>
      </div>
    </div>
  );
}
