/**
 * Mastery tracker — Opus task.
 *
 * Updates a MasteryMap after each first-attempt answer in a practice session.
 * Graduation rule (hardened 2026-07-12 after the false-mastery audit):
 *
 *   status = 'שליטה' iff
 *     window accuracy ≥ 0.80 over the last 10 ABSTRACT-layer first attempts
 *     AND ≥ 10 abstract first attempts recorded
 *     AND those attempts span ≥ 2 distinct calendar days
 *     AND session_count ≥ 2
 *
 * Why abstract-only + 2 days: the previous window mixed pictorial successes
 * into "abstract mastery" and, at hundreds of items/day, a same-day lucky
 * streak of 10 was statistically guaranteed. Both were confirmed live
 * (mult-facts labelled שליטה at "100%" against 68% true accuracy).
 *
 * Retention probes (previously specced, never implemented — now live):
 *   graduation schedules a probe at +7 days; passing it schedules +30 days;
 *   passing that confirms retention. A failed probe demotes to 'בתהליך' and
 *   returns the skill to active practice. Pre-existing שליטה records with no
 *   probe date are scheduled immediately (self-healing of old false mastery).
 *
 * Pure functions, no side effects. Persistence lives in sessionStore.ts.
 */

import type {
  MasteryMap,
  MasteryRecord,
  PracticeAttempt,
  CPALayer,
} from '../types';
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_ITEM_MINIMUM,
  MASTERY_SESSION_MINIMUM,
  RETENTION_PROBE_SHORT_DAYS,
  RETENTION_PROBE_LONG_DAYS,
  RETENTION_DEMOTION_ACCURACY,
} from '../constants/config';

const WINDOW = MASTERY_ITEM_MINIMUM; // 10
const DAY_MS = 24 * 60 * 60 * 1000;

/** One rolling-ledger entry: correctness, CPA layer, local calendar day. */
export interface LedgerEntry {
  c: boolean;
  l: CPALayer;
  d: string;   // YYYY-MM-DD, local
}

/** Per-skill rolling ledger. Outer key: skillCode. */
export type AttemptLedger = Record<string, LedgerEntry[]>;

function toLocalDay(iso: string): string {
  const dt = new Date(iso);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Append a first-attempt result; keep the last WINDOW *abstract* entries
 *  (non-abstract attempts are tracked for struggle detection but never enter
 *  the mastery window). */
export function appendToLedger(
  ledger: AttemptLedger,
  skillCode: string,
  entry: LedgerEntry,
): AttemptLedger {
  if (entry.l !== 'abstract') return ledger;  // mastery evidence is abstract-only
  const prior = ledger[skillCode] ?? [];
  const next = [...prior, entry].slice(-WINDOW);
  return { ...ledger, [skillCode]: next };
}

/** Accuracy over the abstract rolling window (0 if no attempts yet). */
export function windowAccuracy(ledger: AttemptLedger, skillCode: string): number {
  const window = ledger[skillCode];
  if (!window || window.length === 0) return 0;
  const correctCount = window.filter(e => e.c).length;
  return correctCount / window.length;
}

/** Number of abstract first attempts currently in the window. */
export function windowSize(ledger: AttemptLedger, skillCode: string): number {
  return ledger[skillCode]?.length ?? 0;
}

/** Do the window's entries span at least `minDays` distinct calendar days? */
function windowSpansDays(ledger: AttemptLedger, skillCode: string, minDays: number): boolean {
  const window = ledger[skillCode];
  if (!window) return false;
  return new Set(window.map(e => e.d)).size >= minDays;
}

// ─── Mastery update ────────────────────────────────────────────────────────────

/**
 * Apply one practice attempt to the mastery map + ledger.
 *
 * Side-effect free: returns new map/ledger. Caller persists.
 *
 * Rules:
 *  - Only first-attempt answers (attempt.firstAttempt === true) affect the ledger.
 *  - Only abstract-layer attempts enter the mastery window.
 *  - itemCount increments per first-attempt (any layer).
 *  - sessionCount increments once per (skill, session) pair — tracked by
 *    the caller via `isNewSessionForSkill` flag.
 *  - Graduation additionally requires the window to span ≥ 2 distinct days.
 *  - Graduation schedules the 7-day retention probe.
 *  - Demotion from שליטה → בתהליך when window accuracy drops below threshold.
 */
export function applyAttemptToMastery(args: {
  profileId:            string;
  attempt:              PracticeAttempt;
  masteryMap:           MasteryMap;
  ledger:               AttemptLedger;
  /** True if this attempt is the first item for this skill in this session. */
  isNewSessionForSkill: boolean;
}): { masteryMap: MasteryMap; ledger: AttemptLedger } {
  const { attempt, profileId, isNewSessionForSkill } = args;
  let { masteryMap, ledger } = args;

  // Second- and third-attempt items don't count toward mastery; only log & return.
  if (!attempt.firstAttempt) {
    return { masteryMap, ledger };
  }

  ledger = appendToLedger(ledger, attempt.skillCode, {
    c: attempt.correct,
    l: attempt.cpaLayer,
    d: toLocalDay(attempt.createdAt),
  });

  const prior: MasteryRecord = masteryMap[attempt.skillCode] ?? {
    profileId,
    skillCode:            attempt.skillCode,
    status:               'בתהליך',
    firstAttemptAccuracy: 0,
    itemCount:            0,
    sessionCount:         0,
    lastPracticedAt:      attempt.createdAt,
    needsRetentionProbe:  false,
    retentionProbeDueAt:  null,
  };

  const itemCount    = prior.itemCount + 1;
  const sessionCount = prior.sessionCount + (isNewSessionForSkill ? 1 : 0);
  const accuracy     = windowAccuracy(ledger, attempt.skillCode);
  const size         = windowSize(ledger, attempt.skillCode);

  // Note: the ledger is abstract-only by construction (`appendToLedger` drops
  // non-abstract entries), so `accuracy` and `size` already describe abstract
  // evidence. Graduation therefore needs no separate layer test.
  const graduates =
    prior.status !== 'שליטה' &&
    accuracy     >= MASTERY_ACCURACY_THRESHOLD &&
    size         >= MASTERY_ITEM_MINIMUM &&
    sessionCount >= MASTERY_SESSION_MINIMUM &&
    windowSpansDays(ledger, attempt.skillCode, 2);

  const demotes =
    prior.status === 'שליטה' &&
    size     >= MASTERY_ITEM_MINIMUM &&
    accuracy <  MASTERY_ACCURACY_THRESHOLD;

  const nextStatus: MasteryRecord['status'] =
    graduates ? 'שליטה' :
    demotes   ? 'בתהליך' :
                prior.status;

  const next: MasteryRecord = {
    ...prior,
    status:               nextStatus,
    firstAttemptAccuracy: accuracy,
    itemCount,
    sessionCount,
    lastPracticedAt:      attempt.createdAt,
  };

  if (graduates) {
    next.probesPassed        = 0;
    next.needsRetentionProbe = false;
    next.retentionProbeDueAt = new Date(
      new Date(attempt.createdAt).getTime() + RETENTION_PROBE_SHORT_DAYS * DAY_MS,
    ).toISOString();
  } else if (demotes) {
    next.probesPassed        = undefined;
    next.needsRetentionProbe = false;
    next.retentionProbeDueAt = null;
  }

  return {
    masteryMap: { ...masteryMap, [attempt.skillCode]: next },
    ledger,
  };
}

// ─── Retention probes ─────────────────────────────────────────────────────────

/** Mastered skills whose retention probe is due at `now`. */
export function probesDue(masteryMap: MasteryMap, nowIso: string): string[] {
  return Object.values(masteryMap)
    .filter(r =>
      r.status === 'שליטה' &&
      r.retentionProbeDueAt !== null &&
      r.retentionProbeDueAt <= nowIso)
    .map(r => r.skillCode);
}

/**
 * Apply the first-attempt outcome of a retention-probe item.
 *
 * Pass → advance the probe schedule (7d → 30d → confirmed).
 * Fail → demote to בתהליך; the skill re-enters active practice and must
 * re-graduate (which schedules fresh probes).
 */
export function applyProbeResult(
  masteryMap: MasteryMap,
  skillCode:  string,
  correct:    boolean,
  nowIso:     string,
  /**
   * Rolling-window accuracy for this skill. Optional so existing callers keep
   * compiling; when omitted the old single-miss behaviour is preserved.
   */
  windowAcc?: number,
): MasteryMap {
  const prior = masteryMap[skillCode];
  if (!prior || prior.status !== 'שליטה') return masteryMap;

  let next: MasteryRecord;
  if (!correct) {
    // A single missed probe must NOT erase mastery on its own.
    //
    // The PRD rule is explicit: mastery is lost when retrieval accuracy "drops
    // below 70%" — RETENTION_DEMOTION_ACCURACY, a constant that existed in
    // config and was never referenced. The implementation demoted on one wrong
    // item instead, so MEAS_UNIT_CONVERT_CM fell from שליטה to בתהליך on
    // 2026-07-24 while its window still read 90% and Mia demonstrably knew the
    // material (confirmed by Dima, 2026-07-31).
    //
    // Missing one spaced-retrieval item after two weeks is normal — effortful
    // retrieval is the mechanism we WANT. Demoting on it punishes the thing
    // that makes spacing work. So: demote only when the accumulated evidence
    // agrees; otherwise keep mastery and re-probe sooner.
    const evidenceAgrees =
      windowAcc !== undefined && windowAcc < RETENTION_DEMOTION_ACCURACY;

    next = evidenceAgrees
      ? {
          ...prior,
          status:              'בתהליך',
          probesPassed:        undefined,
          needsRetentionProbe: false,
          retentionProbeDueAt: null,
        }
      : {
          ...prior,
          // Mastery held. Re-probe on the short schedule so a genuine decay is
          // caught quickly rather than waiting the full 30 days.
          probesPassed:        0,
          needsRetentionProbe: false,
          retentionProbeDueAt: new Date(
            new Date(nowIso).getTime() + RETENTION_PROBE_SHORT_DAYS * DAY_MS,
          ).toISOString(),
        };
  } else {
    const passed = (prior.probesPassed ?? 0) + 1;
    next = {
      ...prior,
      probesPassed:        passed,
      needsRetentionProbe: false,
      retentionProbeDueAt: passed >= 2
        ? null   // 7-day and 30-day probes both passed — retention confirmed
        : new Date(
            new Date(nowIso).getTime() +
            (RETENTION_PROBE_LONG_DAYS - RETENTION_PROBE_SHORT_DAYS) * DAY_MS,
          ).toISOString(),
    };
  }
  return { ...masteryMap, [skillCode]: next };
}

/**
 * Self-healing for legacy data: any שליטה record with no probe scheduled
 * (graduated before probes existed — i.e. potentially false mastery) gets
 * probed immediately. Returns the map unchanged if nothing needed fixing.
 */
export function ensureProbeSchedules(masteryMap: MasteryMap, nowIso: string): MasteryMap {
  let changed = false;
  const next: MasteryMap = { ...masteryMap };
  for (const [skill, r] of Object.entries(masteryMap)) {
    if (r.status === 'שליטה' && r.retentionProbeDueAt === null && (r.probesPassed ?? 0) < 2) {
      next[skill] = { ...r, probesPassed: r.probesPassed ?? 0, retentionProbeDueAt: nowIso };
      changed = true;
    }
  }
  return changed ? next : masteryMap;
}

// ─── Seeding from gap profile ─────────────────────────────────────────────────

/**
 * Build the initial mastery map from the diagnostic results.
 *
 * Run exactly once, right after the diagnostic completes. Seeds every
 * strand-relevant skill as 'בתהליך' (active work), and leaves untouched
 * skills as 'טרם נלמד' (unprobed — the session composer avoids them
 * until a later diagnostic expansion).
 *
 * firstAttemptAccuracy starts at 0.5 for gaps / 1.0 for strengths so the
 * composer has a pre-session signal of relative ease. These values are
 * replaced by rolling-window accuracy once the first session runs.
 */
export function seedMasteryFromDiagnostic(
  profileId: string,
  gaps: string[],
  strengths: string[],
  completedAtIso: string,
): MasteryMap {
  const map: MasteryMap = {};
  const build = (skillCode: string, initialAccuracy: number): MasteryRecord => ({
    profileId,
    skillCode,
    status:               'בתהליך',
    firstAttemptAccuracy: initialAccuracy,
    itemCount:            0,
    sessionCount:         0,
    lastPracticedAt:      completedAtIso,
    needsRetentionProbe:  false,
    retentionProbeDueAt:  null,
  });
  for (const g of gaps)      map[g] = build(g, 0.5);
  for (const s of strengths) map[s] = build(s, 1.0);
  return map;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/** Is this skill unknown (never probed) in Mia's mastery record? */
export function isUnprobed(masteryMap: MasteryMap, skillCode: string): boolean {
  return !(skillCode in masteryMap);
}

/** Has this skill reached graduation? */
export function isMastered(masteryMap: MasteryMap, skillCode: string): boolean {
  return masteryMap[skillCode]?.status === 'שליטה';
}

/** Return all skills currently in active practice ('בתהליך'). */
export function skillsInProgress(masteryMap: MasteryMap): string[] {
  return Object.values(masteryMap)
    .filter(r => r.status === 'בתהליך')
    .map(r => r.skillCode);
}

/** Return all mastered skills ('שליטה'). */
export function masteredSkills(masteryMap: MasteryMap): string[] {
  return Object.values(masteryMap)
    .filter(r => r.status === 'שליטה')
    .map(r => r.skillCode);
}
