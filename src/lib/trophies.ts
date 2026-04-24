/**
 * Trophy / reward computation.
 *
 * Pure, derived-from-SessionRecord. No separate persistence — the trophy room
 * reads session records on the fly and recomputes stars + badges. This keeps
 * the data model simple (one source of truth) and means past sessions "earn"
 * newly-added trophy criteria automatically.
 *
 * Star rule: 1 base star per completed session (shows up), +1 bonus star if
 * accuracy ≥ 80 %. Zero-item sessions (crashed / abandoned) score 0.
 *
 * Badges are all-time milestones; once earned they stay earned even if later
 * sessions pull accuracy down.
 */

import type { SessionRecord } from '../types';

// ─── Star rule ───────────────────────────────────────────────────────────────

export const HIGH_ACCURACY_THRESHOLD = 0.8;

export function starsForSession(r: SessionRecord): number {
  if (r.itemsAttempted === 0) return 0;
  const acc = r.itemsCorrect / r.itemsAttempted;
  return acc >= HIGH_ACCURACY_THRESHOLD ? 2 : 1;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionStar {
  sessionId: string;
  stars:     number;            // 0, 1, or 2
  pct:       number;            // rounded accuracy 0–100
  date:      string | null;     // ISO completedAt
}

export interface Trophy {
  id:        string;
  labelKey:  string;   // i18n key — resolve via t(labelKey as LocaleKey, {gender})
  emoji:     string;
  earned:    boolean;
  progress:  number;   // current value toward target
  target:    number;   // threshold to earn
}

export interface TrophyState {
  totalStars:    number;
  sessionStars:  SessionStar[];
  trophies:      Trophy[];
  earnedCount:   number;
  totalTrophies: number;
  currentStreak: number;   // consecutive days ending today (or yesterday)
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function computeTrophyState(records: SessionRecord[]): TrophyState {
  // Only count sessions that actually completed — abandoned ones don't earn.
  const completed = records.filter(r => r.completedAt);

  const sessionStars: SessionStar[] = completed.map(r => ({
    sessionId: r.sessionId,
    stars:     starsForSession(r),
    pct:       r.itemsAttempted > 0
      ? Math.round((r.itemsCorrect / r.itemsAttempted) * 100)
      : 0,
    date:      r.completedAt,
  }));

  const totalStars   = sessionStars.reduce((s, x) => s + x.stars, 0);
  const sessionCount = completed.length;

  const highAccCount = completed.filter(
    r => r.itemsAttempted > 0
      && r.itemsCorrect / r.itemsAttempted >= HIGH_ACCURACY_THRESHOLD,
  ).length;

  const perfectCount = completed.filter(
    r => r.itemsAttempted > 0 && r.itemsCorrect === r.itemsAttempted,
  ).length;

  const maxStreak = computeMaxDayStreak(completed);

  const currentStreak = computeCurrentStreak(completed);

  const trophies: Trophy[] = [
    {
      id: 'first_session',
      labelKey: 'trophy.first_session',
      emoji: '🌱',
      earned: sessionCount >= 1,
      progress: Math.min(sessionCount, 1),
      target: 1,
    },
    {
      id: 'three_sessions',
      labelKey: 'trophy.three_sessions',
      emoji: '🔥',
      earned: sessionCount >= 3,
      progress: Math.min(sessionCount, 3),
      target: 3,
    },
    {
      id: 'five_sessions',
      labelKey: 'trophy.five_sessions',
      emoji: '🌟',
      earned: sessionCount >= 5,
      progress: Math.min(sessionCount, 5),
      target: 5,
    },
    {
      id: 'ten_sessions',
      labelKey: 'trophy.ten_sessions',
      emoji: '🏆',
      earned: sessionCount >= 10,
      progress: Math.min(sessionCount, 10),
      target: 10,
    },
    {
      id: 'perfect_session',
      labelKey: 'trophy.perfect_session',
      emoji: '🎯',
      earned: perfectCount >= 1,
      progress: Math.min(perfectCount, 1),
      target: 1,
    },
    {
      id: 'five_high_acc',
      labelKey: 'trophy.five_high_acc',
      emoji: '⚡',
      earned: highAccCount >= 5,
      progress: Math.min(highAccCount, 5),
      target: 5,
    },
    {
      id: 'three_day_streak',
      labelKey: 'trophy.three_day_streak',
      emoji: '📅',
      earned: maxStreak >= 3,
      progress: Math.min(maxStreak, 3),
      target: 3,
    },
    {
      id: 'twenty_stars',
      labelKey: 'trophy.twenty_stars',
      emoji: '✨',
      earned: totalStars >= 20,
      progress: Math.min(totalStars, 20),
      target: 20,
    },
  ];

  const earnedCount = trophies.filter(tr => tr.earned).length;

  return {
    totalStars,
    sessionStars,
    trophies,
    earnedCount,
    totalTrophies: trophies.length,
    currentStreak,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Longest run of consecutive calendar days on which at least one completed
 * session is recorded. Uses local YYYY-MM-DD so timezone flips don't double-
 * count a midnight boundary.
 */
function computeMaxDayStreak(records: SessionRecord[]): number {
  const days = Array.from(new Set(
    records
      .filter(r => r.completedAt)
      .map(r => toLocalDate(r.completedAt!)),
  )).sort();   // lexicographic order == chronological for YYYY-MM-DD

  let max      = 0;
  let cur      = 0;
  let prevTime = -Infinity;
  for (const day of days) {
    const t = new Date(day).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    // Allow slack (±12 h) for DST transitions so a 23 h gap still counts.
    if (t - prevTime > oneDay * 1.5) {
      cur = 1;
    } else {
      cur += 1;
    }
    if (cur > max) max = cur;
    prevTime = t;
  }
  return max;
}

/**
 * Days in the streak that ends today (or yesterday, to survive past-midnight
 * practice). Returns 0 if the most-recent practice was 2+ days ago.
 */
function computeCurrentStreak(records: SessionRecord[]): number {
  const days = new Set(
    records.filter(r => r.completedAt).map(r => toLocalDate(r.completedAt!)),
  );

  const today = toLocalDate(new Date().toISOString());
  const yesterday = toLocalDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );

  // Must have practiced today or yesterday to have an active streak
  if (!days.has(today) && !days.has(yesterday)) return 0;

  let streak = 0;
  let cursor = new Date();
  while (true) {
    const dayStr = toLocalDate(cursor.toISOString());
    if (days.has(dayStr)) {
      streak++;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }
  return streak;
}

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
