/**
 * Daily summary Edge Function
 *
 * Called once per day by the GitHub Actions cron (see .github/workflows/daily-summary.yml).
 * For every auth user who has a profile, it looks at the last 7 days of sessions.
 * If there was at least one session today it sends a summary email via Resend.
 *
 * Required Supabase secrets (set via Supabase dashboard → Project Settings → Edge Functions):
 *   RESEND_API_KEY      — from resend.com (free tier: 3 000 emails/month)
 *   SUMMARY_FROM_EMAIL  — e.g. "Mia Math <noreply@yourdomain.com>"
 *                          For testing you can use "onboarding@resend.dev" and
 *                          set SUMMARY_FROM_EMAIL to that; Resend will only
 *                          deliver to the address you verified during signup.
 *
 * Built-in secrets available automatically in every Edge Function:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Hebrew helpers ───────────────────────────────────────────────────────────

const SKILL_NAMES: Record<string, string> = {
  REGROUP_ZERO:   'חיסור עם אפס',
  MULT_FACT:      'לוח הכפל',
  FRACTION_BASIC: 'שברים בסיסיים',
  FRACTION_OF:    'שבר של כמות',
  PLACE_VALUE:    'ערך מקומי',
  MEASUREMENT:    'מידות וזמן',
  GEOMETRY:       'גיאומטריה',
  DATA:           'נתונים וסטטיסטיקה',
};

function skillName(code: string): string {
  return SKILL_NAMES[code] ?? code;
}

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayStr(): string {
  return toLocalDate(new Date().toISOString());
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(
  childName:      string,
  sessions7d:     any[],
  sessionsToday:  any[],
  masteredCount:  number,
  inProgressCount: number,
): { subject: string; html: string } {
  const total7d     = sessions7d.reduce((s, r) => s + r.items_attempted, 0);
  const correct7d   = sessions7d.reduce((s, r) => s + r.items_correct,   0);
  const accuracy7d  = total7d > 0 ? Math.round(correct7d / total7d * 100) : 0;
  const todayCount  = sessionsToday.length;
  const todayItems  = sessionsToday.reduce((s, r) => s + r.items_attempted, 0);

  const subject = todayCount > 0
    ? `✅ ${childName} תרגלה היום — סיכום יומי`
    : `📊 סיכום שבועי — ${childName}`;

  const todaySection = todayCount > 0 ? `
    <div style="background:#F0FDF4;border-radius:12px;padding:16px;margin-bottom:16px;">
      <strong style="color:#166534;">היום:</strong>
      ${todayCount} מפגש${todayCount > 1 ? 'ים' : ''},
      ${todayItems} שאלות
    </div>` : `
    <div style="background:#FEF9C3;border-radius:12px;padding:16px;margin-bottom:16px;">
      לא תרגלה היום עדיין ☀️
    </div>`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#F8F4ED;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:20px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <h2 style="margin:0 0 4px;color:#2D3047;">📚 סיכום — ${childName}</h2>
    <p style="color:#9CA3AF;margin:0 0 20px;font-size:14px;">${new Date().toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' })}</p>

    ${todaySection}

    <div style="margin-bottom:16px;">
      <div style="font-size:13px;color:#6B7280;margin-bottom:8px;font-weight:600;">7 הימים האחרונים</div>
      <div style="display:flex;gap:12px;">
        <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#2D3047;">${sessions7d.length}</div>
          <div style="font-size:12px;color:#6B7280;">מפגשים</div>
        </div>
        <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#2D3047;">${total7d}</div>
          <div style="font-size:12px;color:#6B7280;">שאלות</div>
        </div>
        <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#2D3047;">${accuracy7d}%</div>
          <div style="font-size:12px;color:#6B7280;">דיוק</div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;background:#DCFCE7;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:bold;color:#166534;">✅ ${masteredCount}</div>
        <div style="font-size:12px;color:#15803D;">מיומנויות שלמדה</div>
      </div>
      <div style="flex:1;background:#FEF3C7;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:bold;color:#92400E;">🌱 ${inProgressCount}</div>
        <div style="font-size:12px;color:#B45309;">בתהליך למידה</div>
      </div>
    </div>

    <div style="text-align:center;padding-top:16px;border-top:1px solid #F3F4F6;">
      <a href="https://disos1.github.io/mia-math/"
         style="display:inline-block;background:#C4A7E7;color:white;text-decoration:none;
                border-radius:12px;padding:10px 24px;font-weight:bold;font-size:15px;">
        פתח דאשבורד הורים
      </a>
    </div>

  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey      = Deno.env.get('RESEND_API_KEY');
  const fromEmail      = Deno.env.get('SUMMARY_FROM_EMAIL') ?? 'onboarding@resend.dev';

  if (!resendKey) {
    return new Response('RESEND_API_KEY not set', { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // List all auth users
  const { data: { users }, error: usersErr } = await db.auth.admin.listUsers();
  if (usersErr) return new Response(usersErr.message, { status: 500 });

  const today     = todayStr();
  const sevenAgo  = toLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const sent: string[] = [];

  for (const user of users) {
    if (!user.email) continue;

    // Find their profile
    const { data: profile } = await db
      .from('profiles')
      .select('profile_id, display_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) continue;

    // Sessions in last 7 days
    const { data: sessions7d } = await db
      .from('session_records')
      .select('items_attempted, items_correct, completed_at, primary_skill_code')
      .eq('profile_id', profile.profile_id)
      .gte('completed_at', sevenAgo + 'T00:00:00Z');

    // Sessions today
    const sessionsToday = (sessions7d ?? []).filter(
      s => s.completed_at && toLocalDate(s.completed_at) === today
    );

    // Mastery counts
    const { data: mastery } = await db
      .from('mastery_records')
      .select('status')
      .eq('profile_id', profile.profile_id);

    const masteredCount   = (mastery ?? []).filter(r => r.status === 'שליטה').length;
    const inProgressCount = (mastery ?? []).filter(r => r.status === 'בתהליך').length;

    if ((sessions7d ?? []).length === 0) continue; // nothing to report

    const { subject, html } = buildEmail(
      profile.display_name,
      sessions7d ?? [],
      sessionsToday,
      masteredCount,
      inProgressCount,
    );

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: user.email, subject, html }),
    });

    if (res.ok) sent.push(user.email);
    else console.error('[summary] Resend error:', await res.text());
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
