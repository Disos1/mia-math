/**
 * Phase 2 Decision Engine — Opus task.
 *
 * Fully specified in Mia_Math_Diagnostic_Walkthrough_v1.md §4.
 * This module is intentionally stateless: pure functions, no side effects.
 * All state (attempts, signals) lives in the calling component.
 */

import type { DiagnosticAttempt, DiagnosticItem, Phase1Signals, EntryStatus } from '../types';
import { VERIFICATION_ITEMS } from '../constants/diagnosticItems';
import { MULT_FACT_RETRIEVAL_THRESHOLD_MS, DIAGNOSTIC_SOFT_CAP_MS } from '../constants/config';

// ─── Phase 1 Signal Computation ───────────────────────────────────────────────
//
// Each of the five entry items maps to one of the five misconception codes.
// The status encodes both correctness and (for ERR_MULT_FACT) response time.

export function computePhase1Signals(entryAttempts: DiagnosticAttempt[]): Phase1Signals {
  const bySkill = new Map(entryAttempts.map(a => [a.skillCode, a]));

  function status(
    skillCode: string,
    opts: { isMultFact?: boolean; altWrongA?: string | number; altWrongB?: string | number } = {}
  ): EntryStatus {
    const attempt = bySkill.get(skillCode);
    if (!attempt) return 'wrong'; // no attempt recorded = treat as wrong

    if (attempt.correct) {
      if (opts.isMultFact) {
        return attempt.timeToAnswerMs < MULT_FACT_RETRIEVAL_THRESHOLD_MS
          ? 'clear_fast'
          : 'clear_slow'; // correct but slow = computing, not retrieving
      }
      return 'clear';
    }

    // Wrong answer — distinguish signature from other error patterns
    if (attempt.signatureHit !== null) return 'signature_hit';
    if (opts.altWrongA !== undefined && attempt.answer === opts.altWrongA) return 'wrong_other_A';
    if (opts.altWrongB !== undefined && attempt.answer === opts.altWrongB) return 'wrong_other_B';
    return 'wrong_other';
  }

  return {
    REGROUP_ZERO_STATUS:  status('ARITH_SUB_REGROUP_ZERO'),
    MULT_FACT_STATUS:     status('ARITH_MULT_6_9', { isMultFact: true }),
    FRACTION_BIAS_STATUS: status('FRAC_COMPARE_UNIT'),
    // Dana apples item: 4 = ignores starting quantity; 17 = adds instead of subtracts first step
    NUMBER_GRAB_STATUS:   status('ARITH_WORD_2STEP', { altWrongA: 4, altWrongB: 17 }),
    UNIT_MISMATCH_STATUS: status('MEAS_UNIT_CONVERT_CM'),
  };
}

// ─── Phase 2 Item Selection ───────────────────────────────────────────────────
//
// For each of the five misconceptions, one verification item is selected:
//   confirmation probe (V-A) if the entry item was wrong / signature-hit / slow
//   harder probe (V-B)       if the entry item was correct (and fast, for mult-fact)
//
// Selected items are interleaved: confirmation probes first, harder probes second,
// alternating where possible so Mia doesn't hit five hard items in a row.

const ITEM_PAIRS: Array<{ status: keyof Phase1Signals; confirmId: string; harderId: string }> = [
  { status: 'REGROUP_ZERO_STATUS',  confirmId: 'DIAG_VA_REGROUP_703',      harderId: 'DIAG_VB_REGROUP_1000'      },
  { status: 'MULT_FACT_STATUS',     confirmId: 'DIAG_VA_MULT_6X9',         harderId: 'DIAG_VB_MULT_8X9'          },
  { status: 'FRACTION_BIAS_STATUS', confirmId: 'DIAG_VA_FRAC_THIRD_SIXTH', harderId: 'DIAG_VB_FRAC_QUARTER_OF_20' },
  { status: 'NUMBER_GRAB_STATUS',   confirmId: 'DIAG_VA_WORD_BALLS',       harderId: 'DIAG_VB_WORD_NOTEBOOKS'    },
  { status: 'UNIT_MISMATCH_STATUS', confirmId: 'DIAG_VA_UNIT_TIME_MOVIE',  harderId: 'DIAG_VB_UNIT_KM_M'         },
];

function needsConfirmation(s: EntryStatus): boolean {
  // Correct and fast → harder probe. Everything else → confirmation probe.
  return s !== 'clear' && s !== 'clear_fast';
}

export function selectVerificationItems(
  signals: Phase1Signals,
  elapsedMs: number,
): DiagnosticItem[] {
  const confirmation: DiagnosticItem[] = [];
  const harder: DiagnosticItem[] = [];

  for (const pair of ITEM_PAIRS) {
    const s = signals[pair.status];
    const itemId = needsConfirmation(s) ? pair.confirmId : pair.harderId;
    const item = VERIFICATION_ITEMS[itemId];
    if (needsConfirmation(s)) {
      confirmation.push(item);
    } else {
      harder.push(item);
    }
  }

  // Time cap: if > 80% of the soft cap has elapsed, compress to confirmation only
  if (elapsedMs > DIAGNOSTIC_SOFT_CAP_MS * 0.8 && confirmation.length > 0) {
    return confirmation.slice(0, Math.min(3, confirmation.length));
  }

  // Interleave: [C, H, C, H, C] or [C, C, H, H, H] depending on counts
  const result: DiagnosticItem[] = [];
  let ci = 0, hi = 0;
  while (ci < confirmation.length || hi < harder.length) {
    if (ci < confirmation.length) result.push(confirmation[ci++]);
    if (hi < harder.length)      result.push(harder[hi++]);
  }
  return result;
}

// ─── Results Classification ───────────────────────────────────────────────────
//
// Determines which skills appear in "חוזקות" vs "עליהן נעבוד יחד" on the results screen.
//
// A skill is a GAP if:
//   - entry item was wrong (any status except clear / clear_fast) AND
//   - verification item (if given) was also wrong
//
// A skill is RULED OUT (shows as strength) if:
//   - entry was wrong but verification was correct (slip, not misconception)
//
// A skill is a STRENGTH if:
//   - both entry and verification were correct

export function classifyResults(
  allAttempts: DiagnosticAttempt[],
  signals: Phase1Signals,
): { gaps: string[]; strengths: string[] } {
  // Group attempts by skillCode, ordered by sequence
  const bySkill = new Map<string, DiagnosticAttempt[]>();
  for (const a of allAttempts) {
    if (!bySkill.has(a.skillCode)) bySkill.set(a.skillCode, []);
    bySkill.get(a.skillCode)!.push(a);
  }

  const statusMap: Record<string, EntryStatus> = {
    'ARITH_SUB_REGROUP_ZERO': signals.REGROUP_ZERO_STATUS,
    'ARITH_MULT_6_9':          signals.MULT_FACT_STATUS,
    'FRAC_COMPARE_UNIT':       signals.FRACTION_BIAS_STATUS,
    'ARITH_WORD_2STEP':        signals.NUMBER_GRAB_STATUS,
    'MEAS_UNIT_CONVERT_CM':    signals.UNIT_MISMATCH_STATUS,
  };

  const gaps: string[] = [];
  const strengths: string[] = [];

  for (const [skillCode, attempts] of bySkill.entries()) {
    // FRAC_OF_QUANTITY only appears as a verification item — handled in the special case below
    if (skillCode === 'FRAC_OF_QUANTITY') continue;

    const entryStatus = statusMap[skillCode];
    const entryCorrect = attempts[0]?.correct ?? false;
    const verifyAttempt = attempts[1]; // second attempt = verification item (may be different skillCode for FRAC_OF_QUANTITY)

    if (entryCorrect) {
      if (!verifyAttempt || verifyAttempt.correct) {
        strengths.push(skillCode);
      } else {
        // Got entry right, verification wrong — flag as partial gap at higher difficulty
        gaps.push(skillCode);
      }
    } else {
      if (verifyAttempt?.correct) {
        // Got entry wrong, verification right — ruled out (slip)
        strengths.push(skillCode);
      } else {
        // Got entry wrong, verification also wrong — confirmed/suspected gap
        gaps.push(skillCode);
      }
    }

    // ERR_MULT_FACT_SLOW: correct but slow → treat as suspected gap, not a strength
    if (skillCode === 'ARITH_MULT_6_9' && entryStatus === 'clear_slow') {
      if (!gaps.includes(skillCode)) {
        gaps.push(skillCode);
        const idx = strengths.indexOf(skillCode);
        if (idx !== -1) strengths.splice(idx, 1);
      }
    }
  }

  // FRAC_OF_QUANTITY is a distinct skill code from FRAC_COMPARE_UNIT —
  // handle it separately if it appears in attempts (from V-B harder probe)
  const fracQtyAttempts = allAttempts.filter(a => a.skillCode === 'FRAC_OF_QUANTITY');
  if (fracQtyAttempts.length > 0) {
    const correct = fracQtyAttempts[0].correct;
    if (correct) {
      strengths.push('FRAC_OF_QUANTITY');
    } else {
      gaps.push('FRAC_OF_QUANTITY');
    }
  }

  return { gaps, strengths };
}
