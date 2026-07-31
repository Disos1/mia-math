/**
 * Mastery self-audit — Opus task.
 *
 * Recomputes what every skill's status *should* be from the stored evidence and
 * reports where the stored status disagrees.
 *
 * Why this exists: on 2026-07-31 Dima noticed Mia had been demoted on a skill she
 * plainly knew. The cause was a rule specified in the PRD, given a constant in
 * config, and never wired into the code. No unit test could catch it — the logic
 * was internally consistent; it simply implemented the wrong rule. What *would*
 * have caught it in a day is looking at her real record and noticing
 * "status = בתהליך while accuracy = 90% over 133 items" is impossible under the
 * stated rules.
 *
 * So this module encodes the rules a second time, declaratively, and compares.
 * Two independent expressions of the same rule disagreeing is a loud signal;
 * one expression drifting silently is not.
 *
 * Pure and side-effect free. Runs on the parent dashboard, and the same checks
 * are mirrored in the daily-summary Edge Function so a contradiction surfaces in
 * the morning email without anyone going looking.
 */

import type { MasteryMap, MasteryStatus } from '../types';
import type { AttemptLedger } from './masteryTracker';
import { windowAccuracy, windowSize } from './masteryTracker';
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_ITEM_MINIMUM,
  MASTERY_SESSION_MINIMUM,
} from '../constants/config';

export type AuditKind =
  /** Evidence clears every graduation bar but the record still says בתהליך. */
  | 'should_be_mastered'
  /** Record says שליטה but the window no longer supports it. */
  | 'should_not_be_mastered'
  /** Mastered, but its retention probe is long overdue — the probe never fired. */
  | 'probe_overdue';

export interface AuditFinding {
  skillCode:  string;
  kind:       AuditKind;
  stored:     MasteryStatus;
  expected:   MasteryStatus | null;
  accuracy:   number;
  windowSize: number;
  /** Parent-readable Hebrew, safe to show on the dashboard. */
  detail:     string;
}

/** Distinct calendar days represented in a skill's evidence window. */
function windowDays(ledger: AttemptLedger, skillCode: string): number {
  return new Set((ledger[skillCode] ?? []).map(e => e.d)).size;
}

/** How many days late a probe is, or null when not applicable. */
function probeOverdueDays(dueAtIso: string | null, nowIso: string): number | null {
  if (!dueAtIso) return null;
  const ms = new Date(nowIso).getTime() - new Date(dueAtIso).getTime();
  return ms > 0 ? Math.floor(ms / (24 * 60 * 60 * 1000)) : null;
}

/**
 * How overdue a probe must be before we call it a fault rather than "she just
 * hasn't practised that skill lately". Generous on purpose — a quiet week is
 * normal for an 8-year-old and must not generate noise.
 */
export const PROBE_OVERDUE_ALERT_DAYS = 21;

/**
 * Audit the whole mastery map against its evidence.
 *
 * Only reports when there is enough evidence to be sure: a skill with a
 * half-full window is not evidence of a bug, it is evidence of a child who has
 * not finished practising. Silence here must mean "consistent", never "unknown".
 */
export function auditMastery(
  masteryMap: MasteryMap,
  ledger:     AttemptLedger,
  nowIso:     string = new Date().toISOString(),
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const record of Object.values(masteryMap)) {
    const skill    = record.skillCode;
    const accuracy = windowAccuracy(ledger, skill);
    const size     = windowSize(ledger, skill);
    const days     = windowDays(ledger, skill);

    // Not enough evidence to judge either way — stay quiet.
    if (size < MASTERY_ITEM_MINIMUM) {
      if (record.status === 'שליטה') {
        const late = probeOverdueDays(record.retentionProbeDueAt, nowIso);
        if (late !== null && late >= PROBE_OVERDUE_ALERT_DAYS) {
          findings.push({
            skillCode: skill, kind: 'probe_overdue',
            stored: record.status, expected: null,
            accuracy, windowSize: size,
            detail: `בדיקת הזכירה לא בוצעה כבר ${late} ימים — ייתכן שהמיומנות לא נבדקה מחדש.`,
          });
        }
      }
      continue;
    }

    const evidenceSupportsMastery =
      accuracy            >= MASTERY_ACCURACY_THRESHOLD &&
      size                >= MASTERY_ITEM_MINIMUM &&
      days                >= 2 &&
      record.sessionCount >= MASTERY_SESSION_MINIMUM;

    const pct = Math.round(accuracy * 100);

    if (record.status !== 'שליטה' && evidenceSupportsMastery) {
      // The MEAS_UNIT_CONVERT_CM class of fault: she demonstrably knows it, the
      // app says otherwise, and she keeps being given work she does not need.
      findings.push({
        skillCode: skill, kind: 'should_be_mastered',
        stored: record.status, expected: 'שליטה',
        accuracy, windowSize: size,
        detail: `הדיוק האחרון הוא ${pct}% על ${size} תרגילים ב-${days} ימים — לפי הכללים זו כבר שליטה, אבל האפליקציה עדיין מסמנת "בתהליך".`,
      });
    }

    if (record.status === 'שליטה' && accuracy < MASTERY_ACCURACY_THRESHOLD) {
      findings.push({
        skillCode: skill, kind: 'should_not_be_mastered',
        stored: record.status, expected: 'בתהליך',
        accuracy, windowSize: size,
        detail: `מסומן כ"שליטה" אבל הדיוק האחרון הוא ${pct}% בלבד — צריך לחזור לתרגל.`,
      });
    }

    if (record.status === 'שליטה') {
      const late = probeOverdueDays(record.retentionProbeDueAt, nowIso);
      if (late !== null && late >= PROBE_OVERDUE_ALERT_DAYS) {
        findings.push({
          skillCode: skill, kind: 'probe_overdue',
          stored: record.status, expected: null,
          accuracy, windowSize: size,
          detail: `בדיקת הזכירה לא בוצעה כבר ${late} ימים.`,
        });
      }
    }
  }

  return findings;
}

/** True when the mastery map is fully consistent with its evidence. */
export function isMasteryConsistent(
  masteryMap: MasteryMap,
  ledger:     AttemptLedger,
  nowIso?:    string,
): boolean {
  return auditMastery(masteryMap, ledger, nowIso).length === 0;
}
