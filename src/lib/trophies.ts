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
  earnedAt:  string | null;  // ISO completedAt of the session that crossed the threshold
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

/**
 * @param records       All stored session records for this profile.
 * @param masteredCount How many skills the student has fully mastered (from MasteryMap).
 */
export function computeTrophyState(records: SessionRecord[], masteredCount = 0): TrophyState {
  // Only count sessions that actually completed — abandoned ones don't earn.
  // Sort chronologically so all downstream logic is stable regardless of
  // the order records were written / merged from Supabase.
  const completed = records
    .filter(r => r.completedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

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

  const maxStreak     = computeMaxDayStreak(completed);
  const currentStreak = computeCurrentStreak(completed);

  // ── earnedAt helpers ──────────────────────────────────────────────────────

  /** Date of the Nth completed session (1-indexed), or null if not yet reached. */
  function nthSessionDate(n: number): string | null {
    return completed.length >= n ? (completed[n - 1].completedAt ?? null) : null;
  }

  /** Date of the Nth high-accuracy session, or null. */
  function nthHighAccDate(n: number): string | null {
    let count = 0;
    for (const r of completed) {
      if (r.itemsAttempted > 0 && r.itemsCorrect / r.itemsAttempted >= HIGH_ACCURACY_THRESHOLD) {
        count++;
        if (count >= n) return r.completedAt ?? null;
      }
    }
    return null;
  }

  /** Date of the Nth perfect session (1-indexed), or null. */
  function nthPerfectDate(n: number): string | null {
    let count = 0;
    for (const r of completed) {
      if (r.itemsAttempted > 0 && r.itemsCorrect === r.itemsAttempted) {
        count++;
        if (count >= n) return r.completedAt ?? null;
      }
    }
    return null;
  }

  /** Date the 3-day streak was first achieved, or null. */
  function firstStreakDate(streakLen: number): string | null {
    const days = Array.from(new Set(
      completed.map(r => toLocalDate(r.completedAt!)),
    )).sort();
    let cur  = 1;
    for (let i = 1; i < days.length; i++) {
      const gap = new Date(days[i]).getTime() - new Date(days[i - 1]).getTime();
      if (gap <= 24 * 60 * 60 * 1000 * 1.5) {
        cur++;
      } else {
        cur = 1;
      }
      if (cur >= streakLen) {
        // Return the completedAt of the last session on this day
        const last = [...completed]
          .reverse()
          .find(r => toLocalDate(r.completedAt!) === days[i]);
        return last?.completedAt ?? null;
      }
    }
    return null;
  }

  /** Date the running star total first crossed a threshold. */
  function firstStarThresholdDate(threshold: number): string | null {
    let running = 0;
    for (const s of sessionStars) {
      running += s.stars;
      if (running >= threshold) return s.date;
    }
    return null;
  }

  // ── Trophy definitions ────────────────────────────────────────────────────

  const highAccCount = completed.filter(
    r => r.itemsAttempted > 0
      && r.itemsCorrect / r.itemsAttempted >= HIGH_ACCURACY_THRESHOLD,
  ).length;

  const perfectCount = completed.filter(
    r => r.itemsAttempted > 0 && r.itemsCorrect === r.itemsAttempted,
  ).length;

  // Ordered: session milestones → star milestones → accuracy → streaks → mastery
  const trophies: Trophy[] = [
    // ── Session milestones ──────────────────────────────────────────────────
    {
      id:       'first_session',
      labelKey: 'trophy.first_session',
      emoji:    '🌱',
      earned:   sessionCount >= 1,
      earnedAt: nthSessionDate(1),
      progress: Math.min(sessionCount, 1),
      target:   1,
    },
    {
      id:       'three_sessions',
      labelKey: 'trophy.three_sessions',
      emoji:    '🔥',
      earned:   sessionCount >= 3,
      earnedAt: nthSessionDate(3),
      progress: Math.min(sessionCount, 3),
      target:   3,
    },
    {
      id:       'five_sessions',
      labelKey: 'trophy.five_sessions',
      emoji:    '🌟',
      earned:   sessionCount >= 5,
      earnedAt: nthSessionDate(5),
      progress: Math.min(sessionCount, 5),
      target:   5,
    },
    {
      id:       'ten_sessions',
      labelKey: 'trophy.ten_sessions',
      emoji:    '🏆',
      earned:   sessionCount >= 10,
      earnedAt: nthSessionDate(10),
      progress: Math.min(sessionCount, 10),
      target:   10,
    },
    {
      id:       'twenty_sessions',
      labelKey: 'trophy.twenty_sessions',
      emoji:    '🚀',
      earned:   sessionCount >= 20,
      earnedAt: nthSessionDate(20),
      progress: Math.min(sessionCount, 20),
      target:   20,
    },
    {
      id:       'fifty_sessions',
      labelKey: 'trophy.fifty_sessions',
      emoji:    '💎',
      earned:   sessionCount >= 50,
      earnedAt: nthSessionDate(50),
      progress: Math.min(sessionCount, 50),
      target:   50,
    },
    // ── Star milestones ─────────────────────────────────────────────────────
    {
      id:       'twenty_stars',
      labelKey: 'trophy.twenty_stars',
      emoji:    '✨',
      earned:   totalStars >= 20,
      earnedAt: firstStarThresholdDate(20),
      progress: Math.min(totalStars, 20),
      target:   20,
    },
    {
      id:       'fifty_stars',
      labelKey: 'trophy.fifty_stars',
      emoji:    '🌠',
      earned:   totalStars >= 50,
      earnedAt: firstStarThresholdDate(50),
      progress: Math.min(totalStars, 50),
      target:   50,
    },
    {
      id:       'hundred_stars',
      labelKey: 'trophy.hundred_stars',
      emoji:    '💫',
      earned:   totalStars >= 100,
      earnedAt: firstStarThresholdDate(100),
      progress: Math.min(totalStars, 100),
      target:   100,
    },
    // ── Accuracy ────────────────────────────────────────────────────────────
    {
      id:       'perfect_session',
      labelKey: 'trophy.perfect_session',
      emoji:    '🎯',
      earned:   perfectCount >= 1,
      earnedAt: nthPerfectDate(1),
      progress: Math.min(perfectCount, 1),
      target:   1,
    },
    {
      id:       'three_perfect',
      labelKey: 'trophy.three_perfect',
      emoji:    '🏅',
      earned:   perfectCount >= 3,
      earnedAt: nthPerfectDate(3),
      progress: Math.min(perfectCount, 3),
      target:   3,
    },
    {
      id:       'five_high_acc',
      labelKey: 'trophy.five_high_acc',
      emoji:    '⚡',
      earned:   highAccCount >= 5,
      earnedAt: nthHighAccDate(5),
      progress: Math.min(highAccCount, 5),
      target:   5,
    },
    {
      id:       'ten_high_acc',
      labelKey: 'trophy.ten_high_acc',
      emoji:    '🔟',
      earned:   highAccCount >= 10,
      earnedAt: nthHighAccDate(10),
      progress: Math.min(highAccCount, 10),
      target:   10,
    },
    // ── Streaks ─────────────────────────────────────────────────────────────
    {
      id:       'three_day_streak',
      labelKey: 'trophy.three_day_streak',
      emoji:    '📅',
      earned:   maxStreak >= 3,
      earnedAt: firstStreakDate(3),
      progress: Math.min(maxStreak, 3),
      target:   3,
    },
    {
      id:       'seven_day_streak',
      labelKey: 'trophy.seven_day_streak',
      emoji:    '📆',
      earned:   maxStreak >= 7,
      earnedAt: firstStreakDate(7),
      progress: Math.min(maxStreak, 7),
      target:   7,
    },
    // ── Mastery ─────────────────────────────────────────────────────────────
    {
      id:       'first_mastery',
      labelKey: 'trophy.first_mastery',
      emoji:    '🎓',
      earned:   masteredCount >= 1,
      earnedAt: null,   // mastery timestamps not tracked per-session; shown as unlocked only
      progress: Math.min(masteredCount, 1),
      target:   1,
    },
  ];

  const earnedCount = trophies.filter(tr => tr.earned).length;

  // Display order = the order Mia actually earned them, so the badge wall reads
  // as a timeline of her achievements:
  //   1. Earned badges, oldest earnedAt first (null dates — e.g. mastery — last
  //      within the earned group, keeping their relative definition order).
  //   2. Locked badges after, closest-to-earning first, so the next goals surface.
  const ordered = trophies
    .map((tr, idx) => ({ tr, idx }))
    .sort((a, b) => {
      if (a.tr.earned !== b.tr.earned) return a.tr.earned ? -1 : 1;
      if (a.tr.earned) {
        // both earned — sort by earnedAt ascending, nulls last, ties by definition order
        const da = a.tr.earnedAt, db = b.tr.earnedAt;
        if (da && db) {
          const cmp = da.localeCompare(db);
          return cmp !== 0 ? cmp : a.idx - b.idx;
        }
        if (da) return -1;
        if (db) return 1;
        return a.idx - b.idx;
      }
      // both locked — sort by progress ratio descending, ties by definition order
      const ra = a.tr.target > 0 ? a.tr.progress / a.tr.target : 0;
      const rb = b.tr.target > 0 ? b.tr.progress / b.tr.target : 0;
      return rb !== ra ? rb - ra : a.idx - b.idx;
    })
    .map(x => x.tr);

  return {
    totalStars,
    sessionStars,
    trophies: ordered,
    earnedCount,
    totalTrophies: ordered.length,
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
