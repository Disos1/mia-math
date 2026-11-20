/**
 * english-report — receives the Mia English app's one-way daily summary.
 *
 * POST body (sent as text/plain so the browser needs no CORS preflight and
 * `keepalive` works when the tab closes): JSON { key, summary }.
 * `key` is the tablet's pairing key; its SHA-256 must exist in
 * public.english_report_keys, which maps it to a profile. The summary is
 * whitelisted by sanitizeSummary() and upserted per (profile, day) into
 * public.english_reports. The daily-summary email reads it from there.
 *
 * Deployed with verify_jwt = false: the pairing key is the authentication.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { dayInWindow, sanitizeSummary, sha256Hex } from './sanitize.ts';

const ALLOWED_ORIGINS = ['https://disos1.github.io', 'http://localhost:5187', 'http://127.0.0.1:5187'];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return ALLOWED_ORIGINS.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' }
    : {};
}

function reply(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method' });

  const text = await req.text();
  if (text.length > 16384) return reply(req, 413, { error: 'too large' });
  let body: any;
  try { body = JSON.parse(text); } catch { return reply(req, 400, { error: 'json' }); }

  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  if (key.length < 16 || key.length > 100) return reply(req, 401, { error: 'key' });

  const summary = sanitizeSummary(body?.summary);
  if (!summary) return reply(req, 400, { error: 'summary' });
  if (!dayInWindow(summary.day)) return reply(req, 400, { error: 'day' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: keyRow, error: keyErr } = await db
    .from('english_report_keys')
    .select('profile_id')
    .eq('key_sha256', await sha256Hex(key))
    .maybeSingle();
  if (keyErr) return reply(req, 500, { error: 'auth unavailable' });
  if (!keyRow) return reply(req, 401, { error: 'key' });

  const { error } = await db.from('english_reports').upsert({
    profile_id: keyRow.profile_id,
    report_day: summary.day,
    summary,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[english-report] upsert failed:', error.message);
    return reply(req, 500, { error: 'store' });
  }
  return reply(req, 200, { ok: true, day: summary.day });
});
