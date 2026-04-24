/**
 * Mastery tracker — Opus task.
 *
 * Updates a MasteryMap after each first-attempt answer in a practice session.
 * Implements the graduation rule from Mia_Math_Build_Handoff:
 *
 *   status = 'שליטה' iff
 *     first_attempt_accuracy ≥ 0.80
 *     AND item_count         ≥ 10  (rolling window)
 *     AND session_count      ≥ 2
 *     AND current CPA layer  = 'abstract'  (mastery only counts at abstract)
 *
 * Before graduation, status is 'בתהליך'. Skills never seen → 'טרם נלמד'
 * (seeded by buildGapProfile — not by this module).
 *
 * Rolling window is the most recent 10 first-attempt items. Old attempts
 * outside the window do not drag accuracy down; the kid is judged on
 * her current state, not her learning curve.
 *
 * Pure functions, no side effects. Persistence lives in sessionStore.ts.
 */

import type {
  MasteryMap,
  MasteryRecord,
  PracticeAttempt,
} from '../types';
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_ITEM_MINIMUM,
  MASTERY_SESSION_MINIMUM,
} from '../constants/config';

// Rolling-window accuracy is calculated from a per-skill ledger of the last
// N first-attempts. The MasteryRecord itself stores only the aggregate; this
// module's caller is responsible for holding the ledger (in localStorage or
// memory) and passing the last-N attempts in when requesting a recompute.
//
// Keeping the ledger outside the MasteryRecord keeps MasteryRecord
// serialisation small and stable even as the window grows/rolls.

const WINDOW = MASTERY_ITEM_MINIMUM; // 10

/** Per-skill rolling ledger. Outer key: skillCode. Inner: recent first-attempt correctness. */
export type AttemptLedger = Record<string, boolean[]>;

/** Append a first-attempt result to the ledger; trim to window. */
export function appendToLedger(
  ledger: AttemptLedger,
  skillCode: string,
  correct: boolean,
): AttemptLedger {
  const prior = ledger[skillCode] ?? [];
  const next = [...prior, correct].slice(-WINDOW);
  return { ...ledger, [skillCode]: next };
}

/** Accuracy over the rolling window (0 if no attempts yet). */
function windowAccuracy(ledger: AttemptLedger, skillCode: string): number {
  const window = ledger[skillCode];
  if (!window || window.length === 0) return 0;
  const correctCount = window.filter(Boolean).length;
  return correctCount / window.length;
}

// ─── Mastery update ────────────────────────────────────────────────────────────

/**
 * Apply one practice attempt to the mastery map + ledger.
 *
 * Side-effect free: returns new map/ledger. Caller persists.
 *
 * Rules:
 *  - Only first-attempt answers (attempt.firstAttempt === true) affect the ledger.
 *  - itemCount increments per first-attempt.
 *  - sessionCount increments once per (skill, session) pair — tracked by
 *    the caller via `isNewSessionForSkill` flag.
 *  - Status promotes to שליטה only when all thresholds met AND current
 *    attempt was at CPA layer 'abstract'. Demotion from שליטה → בתהליך
 *    happens here only if accuracy drops below MASTERY_ACCURACY_THRESHOLD
 *    (retention probe is a separate flow, Phase 7).
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

  ledger = appendToLedger(ledger, attempt.skillCode, attempt.correct);

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

  const graduates =
    attempt.cpaLayer === 'abstract' &&
    accuracy    >= MASTERY_ACCURACY_THRESHOLD &&
    itemCount   >= MASTERY_ITEM_MINIMUM &&
    sessionCount >= MASTERY_SESSION_MINIMUM;

  const demotes =
    prior.status === 'שליטה' &&
    itemCount   >= MASTERY_ITEM_MINIMUM &&
    accuracy    <  MASTERY_ACCURACY_THRESHOLD;

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

  return {
    masteryMap: { ...masteryMap, [attempt.skillCode]: next },
    ledger,
  };
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

