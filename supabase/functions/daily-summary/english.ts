/**
 * English exam-prep section of the daily email (Mia English app, Nov 2026).
 * Renders the latest row of public.english_reports, already sanitized by the
 * english-report function; values are escaped again here anyway.
 * Pure so it is unit-tested in src/lib/englishReport.test.ts.
 */

export interface EnglishRow {
  report_day: string;
  summary: any;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Empty string when there is no recent English report — the email is unchanged. */
export function englishSection(row: EnglishRow | null | undefined, reportDate: string): string {
  const s = row?.summary;
  if (!row || !s?.words?.total) return '';
  const isToday = row.report_day === reportDate;
  const t = s.today ?? {};
  const practisedToday = isToday && ((t.scored ?? 0) > 0 || (t.minutes ?? 0) > 0);
  const w = s.words;
  const known = (w.sure ?? 0) + (w.once ?? 0);
  const pct = t.scored > 0 ? Math.round((t.correct / t.scored) * 100) : null;

  const todayLine = practisedToday
    ? `היום: ${esc(t.minutes)} דק׳${pct !== null ? ` · ${esc(t.scored)} תשובות · דיוק ${pct}%` : ''}${t.stars ? ` · ⭐ ${esc(t.stars)}` : ''}`
    : `לא נרשם תרגול באנגלית בתאריך ${esc(reportDate)} (אחרון: ${esc(row.report_day)})`;

  const rest = [(w.learning ?? 0) > 0 ? `${esc(w.learning)} בלמידה` : '', (w.unseen ?? 0) > 0 ? `${esc(w.unseen)} עוד לא נבדקו` : '']
    .filter(Boolean).join(' · ');

  const bank = (label: string, p: unknown) =>
    Array.isArray(p) && p[1] > 0 ? `${label} ${esc(p[0])}/${esc(p[1])}` : '';
  const banks = [bank('משפטים', s.banks?.sentences), bank('כללי קריאה', s.banks?.rules), bank('קריאה ושמיעה', s.banks?.decode)]
    .filter(Boolean).join(' · ');

  const hard = Array.isArray(s.hard) && s.hard.length
    ? `<div style="font-size:13px;color:#2D3047;margin-top:6px;">🗣️ לתרגל יחד (שתקרא בקול ותגיד מה הפירוש): <span dir="ltr" style="font-weight:bold;">${s.hard.map(esc).join(', ')}</span></div>`
    : '';

  const mock = s.mock
    ? `<div style="font-size:13px;color:#2D3047;margin-top:4px;">📝 מבחן ניסיון אחרון (${esc(s.mock.day)}): <strong>${esc(s.mock.score)}</strong></div>`
    : '';

  return `
    <div style="background:#EEF5FF;border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="font-size:14px;font-weight:bold;color:#1E3A8A;margin-bottom:6px;">🇬🇧 אנגלית — הכנה למבחן</div>
      <div style="font-size:13px;color:#2D3047;">${todayLine}</div>
      <div style="font-size:13px;color:#2D3047;margin-top:4px;">📚 מילים: <strong>${known}/${esc(w.total)}</strong> ידועות · ${esc(w.sure)} בטוח (נכון ביומיים שונים)${rest ? ` · ${rest}` : ''}</div>
      ${banks ? `<div style="font-size:13px;color:#2D3047;margin-top:4px;">${banks}</div>` : ''}
      ${mock}
      ${hard}
    </div>`;
}
