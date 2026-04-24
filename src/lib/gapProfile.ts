/**
 * Gap profile builder — Opus task.
 *
 * Consumes the raw diagnostic output (attempts + Phase-1 signals + classified
 * gaps/strengths) and produces a GapProfile that drives Phase 2 session composition.
 *
 * Per-strand status + active error signatures + CPA start layer + session-composer
 * notes are all derived here. Pure function, no side effects.
 */

import type {
  DiagnosticAttempt,
  Phase1Signals,
  GapProfile,
  StrandCode,
  StrandStatus,
  ErrorSignatureCode,
  CPALayer,
  MasteryStatus,
} from '../types';

// ─── Skill → Strand mapping ───────────────────────────────────────────────────
// Every diagnostic skill code maps to one strand. Keep in sync with the item bank.

const SKILL_TO_STRAND: Record<string, StrandCode> = {
  ARITH_SUB_REGROUP_ZERO: 'ARITH',
  ARITH_MULT_6_9:         'ARITH',
  ARITH_WORD_2STEP:       'ARITH',
  ARITH_WORD_3STEP:       'ARITH',
  FRAC_COMPARE_UNIT:      'FRAC',
  FRAC_OF_QUANTITY:       'FRAC',
  MEAS_UNIT_CONVERT_CM:   'MEAS',
  MEAS_UNIT_CONVERT_M:    'MEAS',
  MEAS_TIME_CROSS_HOUR:   'MEAS',
};

function hasSignatureHit(attempts: DiagnosticAttempt[], skill: string): boolean {
  return attempts.some(a => a.skillCode === skill && a.signatureHit !== null);
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildGapProfile(
  allAttempts: DiagnosticAttempt[],
  signals: Phase1Signals,
  gaps: string[],
  strengths: string[],
  diagnosticSessionId: string,
): GapProfile {
  // 1. Collect error signatures per strand (from attempts)
  const errorsByStrand = new Map<StrandCode, Set<ErrorSignatureCode>>();
  for (const a of allAttempts) {
    if (a.signatureHit === null) continue;
    const strand = SKILL_TO_STRAND[a.skillCode];
    if (!strand) continue;
    if (!errorsByStrand.has(strand)) errorsByStrand.set(strand, new Set());
    errorsByStrand.get(strand)!.add(a.signatureHit);
  }

  // ERR_MULT_FACT_SLOW never appears as a signatureHit (attempt is correct);
  // it's inferred from the Phase-1 signal's clear_slow status.
  if (signals.MULT_FACT_STATUS === 'clear_slow') {
    if (!errorsByStrand.has('ARITH')) errorsByStrand.set('ARITH', new Set());
    errorsByStrand.get('ARITH')!.add('ERR_MULT_FACT_SLOW');
  }

  // 2. Per-strand status: 'בתהליך' if any skill in the strand is a gap, else 'שליטה'
  const gapStrands      = new Set<StrandCode>();
  const strengthStrands = new Set<StrandCode>();
  for (const skill of gaps) {
    const s = SKILL_TO_STRAND[skill];
    if (s) gapStrands.add(s);
  }
  for (const skill of strengths) {
    const s = SKILL_TO_STRAND[skill];
    if (s) strengthStrands.add(s);
  }

  const strands: Partial<Record<StrandCode, StrandStatus>> = {};
  const orderedStrands: StrandCode[] = [
    ...gapStrands,
    ...[...strengthStrands].filter(s => !gapStrands.has(s)),
  ];

  let strandPriority = 1;
  for (const strand of orderedStrands) {
    const isGap = gapStrands.has(strand);
    const status: MasteryStatus = isGap ? 'בתהליך' : 'שליטה';
    strands[strand] = {
      status,
      activeErrors: Array.from(errorsByStrand.get(strand) ?? []),
      priority:     isGap ? strandPriority++ : 99,
    };
  }

  // 3. CPA start layer per gap skill
  //    signature hit              → concrete  (underlying model broken; needs manipulatives)
  //    mult-fact clear_slow       → abstract  (retrieval speed drill, no re-teach)
  //    other gap (wrong_other)    → pictorial (procedure shaky; visual support)
  const cpaStartLayer: Partial<Record<string, CPALayer>> = {};
  for (const skill of gaps) {
    if (skill === 'ARITH_MULT_6_9' && signals.MULT_FACT_STATUS === 'clear_slow') {
      cpaStartLayer[skill] = 'abstract';
    } else if (hasSignatureHit(allAttempts, skill)) {
      cpaStartLayer[skill] = 'concrete';
    } else {
      cpaStartLayer[skill] = 'pictorial';
    }
  }

  // 4. Session composer notes
  //    - Always start first post-diagnostic session with a known skill for confidence
  //    - Priority: signature-hit gaps first, then mult-fact-slow, then other gaps
  const skillUrgency = (skill: string): number => {
    if (hasSignatureHit(allAttempts, skill)) return 1;
    if (skill === 'ARITH_MULT_6_9' && signals.MULT_FACT_STATUS === 'clear_slow') return 2;
    return 3;
  };
  const orderedGaps = [...gaps].sort((a, b) => skillUrgency(a) - skillUrgency(b));

  return {
    version:              1,
    computedAt:           new Date().toISOString(),
    diagnosticSessionId,
    strands,
    cpaStartLayer,
    sessionComposerNotes: {
      startWith:               'easy_known_skill',
      firstNewMaterial:        orderedGaps[0] ?? '',
      blockedPracticePriority: orderedGaps,
    },
  };
}
