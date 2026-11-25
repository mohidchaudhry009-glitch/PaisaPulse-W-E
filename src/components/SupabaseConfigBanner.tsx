import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-amber-900">Service configuration required</p>
          <p className="text-xs leading-relaxed text-amber-800">
            Backend connection settings are not configured for this environment yet.
          </p>
        </div>
      </div>
    </div>
  );
}
