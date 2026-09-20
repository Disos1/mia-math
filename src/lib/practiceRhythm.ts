/**
 * How much practice time she actually got — days, not sessions.
 *
 * Kept apart from the card so the rule can be tested on its own, and so the
 * component file exports only a component.
 */

import type { SessionRecord } from '../types';

/** Days a week the app is built around. Four leaves room for a real life. */
export const WEEKLY_GOAL_DAYS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface RhythmSummary {
  /** Distinct days with practice in the last 7 days. */
  days:      number;
  /** Questions answered in those 7 days. */
  questions: number;
  /** Days since her last practice, null if she has never practised. */
  daysSince: number | null;
}

export function summariseRhythm(records: SessionRecord[], nowIso: string): RhythmSummary {
  const now   = new Date(nowIso).getTime();
  const real  = records.filter(r => (r.itemsAttempted ?? 0) > 0);
  const week  = real.filter(r => now - new Date(r.startedAt).getTime() <= 7 * DAY_MS);

  const days      = new Set(week.map(r => localDay(r.startedAt))).size;
  const questions = week.reduce((s, r) => s + (r.itemsAttempted ?? 0), 0);

  const last = real
    .map(r => new Date(r.startedAt).getTime())
    .sort((a, b) => b - a)[0];
  const daysSince = last === undefined
    ? null
    : Math.floor((new Date(localDay(nowIso)).getTime() - new Date(localDay(new Date(last).toISOString())).getTime()) / DAY_MS);

  return { days, questions, daysSince };
}

