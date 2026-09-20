/**
 * "Did she actually get the time?" — the week at a glance.
 *
 * Dima, 2026-09-20: she stopped practising on 7 September not because it was too
 * hard but because life got in the way, "we should verify that she allocates
 * enough time for the practice". Content cannot fix a week with no practice in
 * it, and a parent should not have to reconstruct that from a list of sessions.
 *
 * Counts DAYS, not sessions or questions: three short sittings on one day is
 * one day of practice, and the habit is what is being tracked. Any session with
 * a question answered counts, finished or not — she often runs out of time, and
 * a session that was interrupted was still practice.
 */

import { useMemo } from 'react';
import type { SessionRecord } from '../../types';
import { summariseRhythm, WEEKLY_GOAL_DAYS } from '../../lib/practiceRhythm';

export function PracticeRhythmCard({ records, now = new Date().toISOString() }: {
  records: SessionRecord[];
  now?:    string;
}) {
  const { days, questions, daysSince } = useMemo(() => summariseRhythm(records, now), [records, now]);

  const met   = days >= WEEKLY_GOAL_DAYS;
  const color = met ? '#16A34A' : days >= 2 ? '#D97706' : '#DC2626';

  const lastLine =
    daysSince === null ? 'עוד לא תרגלה'
    : daysSince === 0  ? 'תרגלה היום'
    : daysSince === 1  ? 'תרגלה אתמול'
    :                    `${daysSince} ימים מאז התרגול האחרון`;

  return (
    <div className="bg-white card-shadow rounded-3xl p-5" style={{ borderTop: `4px solid ${color}` }}>
      <div className="text-sm font-bold text-[#2D3047]">🗓️ כמה זמן היא קיבלה השבוע?</div>

      <div className="flex items-baseline gap-2 mt-3">
        <span className="text-4xl font-bold" style={{ color }}>{days}</span>
        <span className="text-lg text-gray-500">מתוך {WEEKLY_GOAL_DAYS} ימי תרגול</span>
      </div>

      <div className="flex gap-1.5 mt-3">
        {Array.from({ length: WEEKLY_GOAL_DAYS }, (_, i) => (
          <div key={i} className="h-2.5 flex-1 rounded-full"
               style={{ background: i < days ? color : '#E5E0D8' }} />
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-3 leading-relaxed">
        {lastLine} · {questions} שאלות ב-7 הימים האחרונים.
        {!met && ' 10 דקות ביום מספיקות — קצר וקבוע עדיף על ארוך ונדיר.'}
      </div>

      <div className="text-[11px] text-gray-400 mt-2 leading-relaxed">
        נספרים גם תרגולים שלא הסתיימו — אם נגמר הזמן באמצע, מה שהיא כן פתרה נשמר.
      </div>
    </div>
  );
}
