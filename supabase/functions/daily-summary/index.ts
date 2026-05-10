/**
 * Daily summary Edge Function
 *
 * Called once per day by the GitHub Actions cron (see .github/workflows/daily-summary.yml).
 * For every auth user who has a profile and at least one session in the last 7 days,
 * it sends a dashboard-style summary email via Resend.
 *
 * Required Supabase secrets (set via Supabase dashboard → Project Settings → Edge Functions):
 *   RESEND_API_KEY      — from resend.com
 *   SUMMARY_FROM_EMAIL  — e.g. "Mia Math <noreply@yourdomain.com>"
 *
 * Built-in secrets available automatically in every Edge Function:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Hebrew display maps ──────────────────────────────────────────────────────

const SKILL_NAMES: Record<string, string> = {
  ARITH_MULT_6_9:         'לוח הכפל — הטורים הקשים (6–9)',
  ARITH_SUB_REGROUP_ZERO: 'חיסור עם המרה מעבר לאפס',
  ARITH_WORD_2STEP:       'שאלות מילוליות דו-שלביות',
  ARITH_WORD_3STEP:       'שאלות מילוליות תלת-שלביות',
  FRAC_COMPARE_UNIT:      'השוואת שברי יסוד',
  FRAC_OF_QUANTITY:       'שבר מתוך כמות',
  MEAS_TIME_CROSS_HOUR:   'חישוב זמן חולף מעבר לשעה',
  MEAS_UNIT_CONVERT_CM:   'המרה בין מטרים לסנטימטרים',
  MEAS_UNIT_CONVERT_M:    'המרה בין קילומטרים למטרים',
};

const STRAND_NAMES: Record<string, string> = {
  ARITH:       'חשבון',
  FRAC:        'שברים',
  PLACE_VALUE: 'ערך מקומי',
  MEAS:        'מדידה',
  GEOM:        'גאומטריה',
  DATA:        'נתונים',
  PROPS:       'תכונות',
};

const ERROR_NAMES: Record<string, string> = {
  ERR_REGROUP_ZERO:       'חיסור מעבר לאפס',
  ERR_MULT_FACT:          'עובדות כפל (6–9)',
  ERR_MULT_FACT_SLOW:     'כפל איטי — חישוב במקום זכירה',
  ERR_FRACTION_BIAS:      'השוואת שברים — הטיית המכנה',
  ERR_FRAC_QUANTITY_BIAS: 'שבר מתוך כמות — כפל במקום חילוק',
  ERR_NUMBER_GRAB:        'חטיפת מספרים בבעיה מילולית',
  ERR_UNIT_MISMATCH:      'חוסר התאמה ביחידות',
};

function skillName(code: string): string  { return SKILL_NAMES[code]  ?? code; }
function strandName(code: string): string { return STRAND_NAMES[code] ?? code; }
function errorName(code: string): string  { return ERROR_NAMES[code]  ?? code; }

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayStr(): string {
  return toLocalDate(new Date().toISOString());
}

// ─── 7-day strip (table-based for email-client compatibility) ─────────────────

function buildDayStrip(sessions: any[]): string {
  const today = new Date();

  const byDate = new Map<string, { answered: number; correct: number; hasPartial: boolean; hasComplete: boolean }>();
  for (const s of sessions) {
    const ts  = s.completed_at ?? s.started_at;
    const day = toLocalDate(ts);
    const cur = byDate.get(day) ?? { answered: 0, correct: 0, hasPartial: false, hasComplete: false };
    byDate.set(day, {
      answered:    cur.answered    + (s.items_answered ?? 0),
      correct:     cur.correct     + (s.items_correct  ?? 0),
      hasPartial:  cur.hasPartial  || !s.completed_at,
      hasComplete: cur.hasComplete || !!s.completed_at,
    });
  }

  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = toLocalDate(d.toISOString());
    const dayName = d.toLocaleDateString('he-IL', { weekday: 'short' }).replace(/[׳']/g, '');
    const data    = byDate.get(dateStr);

    if (!data || data.answered === 0) {
      return `<td style="width:14%;text-align:center;vertical-align:top;padding:0 2px;">
        <div style="background:#F9F8F6;border-radius:8px;padding:8px 4px;">
          <div style="font-size:11px;font-weight:600;color:#9CA3AF;margin-bottom:4px;">${dayName}</div>
          <div style="font-size:16px;color:#D1D5DB;line-height:1;">·</div>
        </div>
      </td>`;
    }

    const acc      = data.correct > 0 ? Math.round(data.correct / data.answered * 100) : null;
    const accColor = acc === null ? '#9CA3AF' : acc >= 80 ? '#16A34A' : acc >= 60 ? '#D97706' : '#DC2626';
    const bg       = data.hasComplete ? '#F3EEFF' : '#FFF9EF';
    const lblColor = data.hasComplete ? '#7C3AED'  : '#D97706';

    return `<td style="width:14%;text-align:center;vertical-align:top;padding:0 2px;">
      <div style="background:${bg};border-radius:8px;padding:8px 4px;">
        <div style="font-size:11px;font-weight:600;color:${lblColor};margin-bottom:4px;">${dayName}</div>
        <div style="font-size:16px;font-weight:bold;color:#2D3047;line-height:1;margin-bottom:2px;">${data.answered}</div>
        ${acc !== null ? `<div style="font-size:11px;font-weight:600;color:${accColor};line-height:1;">${acc}%</div>` : ''}
        ${data.hasPartial && !data.hasComplete ? '<div style="font-size:9px;color:#D97706;margin-top:2px;">(חלקי)</div>' : ''}
      </div>
    </td>`;
  });

  return `<table width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>${cells.join('')}</tr>
  </table>`;
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(
  childName:      string,
  sessions7d:     any[],
  sessionsToday:  any[],
  masteryRecords: any[],
  gapProfile:     any | null,
): { subject: string; html: string } {

  const total7d    = sessions7d.reduce((s, r) => s + (r.items_answered ?? 0), 0);
  const correct7d  = sessions7d.reduce((s, r) => s + (r.items_correct  ?? 0), 0);
  const accuracy7d = total7d > 0 && correct7d > 0 ? Math.round(correct7d / total7d * 100) : null;
  const todayCount = sessionsToday.length;
  const todayItems = sessionsToday.reduce((s, r) => s + (r.items_answered ?? 0), 0);

  const masteredCount   = masteryRecords.filter(r => r.status === 'שליטה').length;
  const inProgressCount = masteryRecords.filter(r => r.status === 'בתהליך').length;

  const activeSkills = masteryRecords
    .filter(r => r.status === 'בתהליך')
    .sort((a, b) => (b.last_practiced_at ?? '').localeCompare(a.last_practiced_at ?? ''))
    .slice(0, 5);

  const subject = todayCount > 0
    ? `✅ ${childName} תרגלה היום — סיכום יומי`
    : `📊 סיכום יומי — ${childName}`;

  const accColor7d = accuracy7d === null ? '#6B7280'
    : accuracy7d >= 80 ? '#16A34A'
    : accuracy7d >= 60 ? '#D97706'
    : '#DC2626';

  // ── Today section ──────────────────────────────────────────────────────────
  const todaySection = todayCount > 0 ? `
    <div style="background:#F0FDF4;border-radius:12px;padding:14px;margin-bottom:14px;">
      <strong style="color:#166534;">✅ היום:</strong>&nbsp;
      ${todayCount} מפגש${todayCount > 1 ? 'ים' : ''},&nbsp;${todayItems} שאלות
    </div>` : `
    <div style="background:#FEF9C3;border-radius:12px;padding:14px;margin-bottom:14px;">
      ☀️ לא תרגלה היום עדיין
    </div>`;

  // ── Active skills section ──────────────────────────────────────────────────
  const activeSkillsHtml = activeSkills.length > 0 ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:13px;color:#6B7280;margin-bottom:8px;font-weight:600;">מיומנויות בתרגול פעיל</div>
      ${activeSkills.map(r => {
        const acc = r.first_attempt_accuracy > 0
          ? `${Math.round(r.first_attempt_accuracy * 100)}%`
          : null;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:14px;color:#2D3047;">🌱 ${skillName(r.skill_code)}</span>
          ${acc ? `<span style="font-size:12px;color:#9CA3AF;">${acc}</span>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  // ── Strand status section (from diagnostic gap profile) ────────────────────
  let strandHtml = '';
  if (gapProfile?.strands) {
    const entries = (Object.entries(gapProfile.strands) as [string, any][])
      .sort(([, a], [, b]) => (a?.priority ?? 99) - (b?.priority ?? 99));

    if (entries.length > 0) {
      strandHtml = `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#6B7280;margin-bottom:8px;font-weight:600;">מצב לפי נושא</div>
          ${entries.map(([code, strand]) => {
            const isGap = strand?.status === 'בתהליך';
            const errors: string[] = (strand?.activeErrors ?? []).map((e: string) => errorName(e));
            return `<div style="margin-bottom:8px;padding:10px 12px;background:${isGap ? '#FFF7ED' : '#F0FDF4'};border-radius:10px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span>${isGap ? '🌱' : '✅'}</span>
                <span style="font-weight:bold;font-size:14px;color:#2D3047;">${strandName(code)}</span>
                <span style="font-size:12px;color:#9CA3AF;margin-right:auto;">${strand?.status ?? ''}</span>
              </div>
              ${errors.length > 0 ? `<div style="margin-top:5px;padding-right:22px;">
                ${errors.map(e => `<div style="font-size:12px;color:#D97706;">· ${e}</div>`).join('')}
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>`;
    }
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body dir="rtl" style="font-family:Arial,sans-serif;background:#F8F4ED;margin:0;padding:24px;direction:rtl;text-align:right;">
<div dir="rtl" style="max-width:480px;margin:0 auto;background:white;border-radius:20px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08);direction:rtl;text-align:right;">

  <h2 style="margin:0 0 4px;color:#2D3047;">📚 סיכום — ${childName}</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:14px;">${new Date().toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' })}</p>

  ${todaySection}

  <!-- 7-day activity strip -->
  <div style="margin-bottom:16px;">
    <div style="font-size:13px;color:#6B7280;margin-bottom:8px;font-weight:600;">7 הימים האחרונים</div>
    ${buildDayStrip(sessions7d)}
    <div style="font-size:11px;color:#9CA3AF;margin-top:4px;text-align:right;">שאלות / דיוק</div>
  </div>

  <!-- Aggregate stats -->
  <div style="display:flex;gap:8px;margin-bottom:16px;">
    <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:10px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;color:#2D3047;">${sessions7d.length}</div>
      <div style="font-size:11px;color:#6B7280;">מפגשים</div>
    </div>
    <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:10px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;color:#2D3047;">${total7d}</div>
      <div style="font-size:11px;color:#6B7280;">שאלות</div>
    </div>
    <div style="flex:1;background:#F3F4F6;border-radius:10px;padding:10px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;color:${accColor7d};">${accuracy7d !== null ? `${accuracy7d}%` : '—'}</div>
      <div style="font-size:11px;color:#6B7280;">דיוק</div>
    </div>
  </div>

  <!-- Mastered / in progress -->
  <div style="display:flex;gap:8px;margin-bottom:16px;">
    <div style="flex:1;background:#DCFCE7;border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;color:#166534;">✅ ${masteredCount}</div>
      <div style="font-size:11px;color:#15803D;">מיומנויות שנלמדו</div>
    </div>
    <div style="flex:1;background:#FEF3C7;border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:22px;font-weight:bold;color:#92400E;">🌱 ${inProgressCount}</div>
      <div style="font-size:11px;color:#B45309;">בתהליך למידה</div>
    </div>
  </div>

  ${activeSkillsHtml}
  ${strandHtml}

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey   = Deno.env.get('RESEND_API_KEY');
  const fromEmail   = Deno.env.get('SUMMARY_FROM_EMAIL') ?? 'onboarding@resend.dev';

  if (!resendKey) {
    return new Response('RESEND_API_KEY not set', { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { users }, error: usersErr } = await db.auth.admin.listUsers();
  if (usersErr) return new Response(usersErr.message, { status: 500 });

  const sevenAgo = toLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const today    = todayStr();
  const sent: string[] = [];

  for (const user of users) {
    if (!user.email) continue;

    const { data: profile } = await db
      .from('profiles')
      .select('profile_id, display_name, gap_profile_json')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) continue;

    // Use started_at for the 7-day window so partial sessions are included
    const { data: sessions7d } = await db
      .from('session_records')
      .select('items_answered, items_correct, completed_at, started_at')
      .eq('profile_id', profile.profile_id)
      .gte('started_at', sevenAgo + 'T00:00:00Z');

    const countable = (sessions7d ?? []).filter(s => (s.items_answered ?? 0) > 0);
    if (countable.length === 0) continue;

    const sessionsToday = countable.filter(
      s => toLocalDate(s.completed_at ?? s.started_at) === today
    );

    const { data: masteryRecords } = await db
      .from('mastery_records')
      .select('skill_code, status, first_attempt_accuracy, last_practiced_at')
      .eq('profile_id', profile.profile_id);

    const { subject, html } = buildEmail(
      profile.display_name,
      countable,
      sessionsToday,
      masteryRecords ?? [],
      profile.gap_profile_json,
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
