import { createClient } from '@supabase/supabase-js';

const url  = (import.meta.env.VITE_SUPABASE_URL  as string | undefined) ?? '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

/**
 * True when real Supabase credentials are present in .env.local.
 * When false, all sync functions are no-ops and the auth gate is skipped —
 * the app runs in pure localStorage mode (dev / offline).
 */
export const SUPABASE_CONFIGURED = Boolean(url && !url.includes('your-project'));

/**
 * Supabase client. Always created (avoids null-checking everywhere) but only
 * safe to call when SUPABASE_CONFIGURED is true.
 */
export const supabase = createClient(
  url  || 'https://placeholder.supabase.co',
  anon || 'placeholder-anon-key',
);
