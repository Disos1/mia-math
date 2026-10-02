/**
 * Book alignment — ה.ש.ב.ח.ה ד'.
 *
 * Pins the behaviour against Mia's REAL state on 2026-09-19 (Supabase
 * mastery_records), because every earlier failure of this app was code that was
 * internally consistent but wrong about the child: a skill built but unreachable,
 * a rule written but never applied, a statistic that was a lifetime average.
 */

import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord, GapProfile } from '../../types';
import { HASHBACHA_4, STRANDS, unitsOf } from './hashbacha4';
import {
  teachingWeek, estimateUnit, curriculumFrontier, standingVsClass,
  type ClassPosition,
} from './classPosition';
import { SKILLS_WITH_PRACTICE } from '../items';
import { SKILL_GRAPH } from '../skillGraph';
import { composeSession } from '../sessionComposer';

// ─── Mia on 2026-09-19 ───────────────────────────────────────────────────────

const r = (s: string, st: MasteryRecord['status'], a: number, n: number): MasteryRecord => ({
  profileId: 'p', skillCode: s, status: st, firstAttemptAccuracy: a, itemCount: n,
  sessionCount: 10, lastPracticedAt: '2026-09-07T00:00:00.000Z',
  needsRetentionProbe: false, retentionProbeDueAt: null,
});

const MIA_SEP19: MasteryMap = {
  ARITH_MULT_6_9:         r('ARITH_MULT_6_9',         'שליטה',  0.9, 943),
  ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.7, 798),
  ARITH_WORD_2STEP:       r('ARITH_WORD_2STEP',       'בתהליך', 0.7, 427),
  ARITH_WORD_3STEP:       r('ARITH_WORD_3STEP',       'בתהליך', 0.6, 394),
  FRAC_COMPARE_UNIT:      r('FRAC_COMPARE_UNIT',      'שליטה',  1.0,  42),
  FRAC_OF_QUANTITY:       r('FRAC_OF_QUANTITY',       'בתהליך', 0.3, 323),
  MEAS_UNIT_CONVERT_CM:   r('MEAS_UNIT_CONVERT_CM',   'בתהליך', 0.9, 133),
  PLACE_VALUE_TO_MILLION: r('PLACE_VALUE_TO_MILLION', 'שליטה',  0.9,  41),
};

const GAP = {
  version: 1, computedAt: '2026-07-09T15:29:59.860Z', diagnosticSessionId: 'x',
  strands: { ARITH: { status: 'בתהליך', priority: 1, activeErrors: [] } }, cpaStartLayer: {},
  sessionComposerNotes: {
    startWith: 'easy_known_skill', firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO',
    blockedPracticePriority: ['ARITH_SUB_REGROUP_ZERO', 'ARITH_WORD_2STEP'],
  },
} as unknown as GapProfile;

const NOW = '2026-09-19T12:00:00.000Z';

const positionAt = (iso: string): ClassPosition => ({
  units:  Object.fromEntries(STRANDS.map(s => [s, estimateUnit(s, iso).id])),
  source: Object.fromEntries(STRANDS.map(s => [s, 'estimate' as const])),
});

// ─── The book itself ─────────────────────────────────────────────────────────

describe('curriculum data', () => {
  it('lists units in teaching order within every strand', () => {
    for (const s of STRANDS) {
      const weeks = unitsOf(s).map(u => u.week);
      expect([...weeks].sort((a, b) => a - b), s).toEqual(weeks);
    }
  });

  it('starts all three strands in the first week — no "September review"', () => {
    // The generic research said September was grade-3 review. The publisher's
    // plan starts numbers, fractions and geometry on 1 September.
    for (const s of STRANDS) expect(unitsOf(s)[0].week, s).toBe(0);
  });

  it('only claims coverage with skills that actually have a generator', () => {
    // A unit listing an unbuilt skill would tell the parent it is covered when
    // Mia can never be given a single item from it.
    for (const u of HASHBACHA_4) {
      for (const s of u.skills) {
        expect(SKILLS_WITH_PRACTICE, `${u.id} → ${s}`).toContain(s);
        expect(SKILL_GRAPH[s], `${u.id} → ${s} missing from graph`).toBeDefined();
      }
    }
  });

  it('keeps ids unique and strand-prefixed', () => {
    const ids = HASHBACHA_4.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of HASHBACHA_4) expect(u.id.startsWith(`${u.strand}.`)).toBe(true);
  });
});

// ─── Where the class is ──────────────────────────────────────────────────────

describe('class position estimate', () => {
  it('counts teaching weeks from 1 September', () => {
    expect(teachingWeek('2026-09-01T08:00:00.000Z')).toBe(0);
    expect(teachingWeek(NOW)).toBe(2);
  });

  it('does not advance the class during the Sukkot break', () => {
    expect(teachingWeek('2026-10-01T12:00:00.000Z')).toBe(teachingWeek('2026-09-21T00:00:00.000Z'));
  });

  it('puts the class on the units the book schedules for week 3', () => {
    const p = positionAt(NOW);
    expect(p.units.numbers).toBe('numbers.digit_value');
    expect(p.units.fractions).toBe('fractions.compare');
    expect(p.units.geometry).toBe('geometry.parallel');
  });
});

// ─── What Mia should do next ─────────────────────────────────────────────────

describe('frontier for Mia on 2026-09-19', () => {
  const f = curriculumFrontier(positionAt(NOW), MIA_SEP19);
  const target = (s: string) => f.targets.find(t => t.strand === s);

  it('works with the class on fractions and geometry', () => {
    expect(target('fractions')).toMatchObject({ skill: 'FRAC_COMPARE_SAME', aheadBy: 0 });
    expect(target('geometry')).toMatchObject({ skill: 'GEOM_PARALLEL_PERP', aheadBy: 0 });
  });

  it('pre-teaches the next numbers unit, because she already has place value', () => {
    expect(target('numbers')).toMatchObject({ skill: 'NUM_ORDER_LINE', aheadBy: 1 });
  });

  it('runs as far ahead as her mastery allows — the class is not a ceiling', () => {
    // She has mastered every numbers unit the app can teach, so her target is
    // the next thing she can actually learn, however far past the class it sits.
    const far = { ...MIA_SEP19, NUM_ORDER_LINE: r('NUM_ORDER_LINE', 'שליטה', 1, 20) };
    const t   = curriculumFrontier(positionAt(NOW), far).targets.find(x => x.strand === 'numbers');
    expect(t).toMatchObject({ skill: 'NUM_ROUNDING' });
    expect(t!.aheadBy).toBeGreaterThan(1);
  });

  it('treats units the class has passed as repair, not new material', () => {
    expect(f.behind.map(b => b.skill).sort()).toEqual(['FRAC_PART_WHOLE', 'GEOM_POLYGONS']);
    const targetSkills = f.targets.map(t => t.skill);
    for (const b of f.behind) expect(targetSkills).not.toContain(b.skill);
  });

  it('flags her summer regression on fraction-of-a-quantity before the class reaches it', () => {
    // 30% in September; the book reaches it in November.
    expect(f.upcoming.map(u => u.skill)).toContain('FRAC_OF_QUANTITY');
  });

  it('reports her standing honestly — ahead in numbers, unknown (not weak) elsewhere', () => {
    const st = standingVsClass(positionAt(NOW), MIA_SEP19);
    expect(st.numbers.ahead).toBeGreaterThan(0);
    // Polygons and part-whole were built on 2026-09-19 and never given to her.
    // That is UNCHECKED, not a gap — she may know them perfectly from class.
    expect(st.fractions).toMatchObject({ gaps: 0, unchecked: 1 });
    expect(st.geometry).toMatchObject({ gaps: 0, unchecked: 1 });
  });

  it('does not call a half-mastered unit weak because of its never-seen half', () => {
    // Class moved on to fraction-of-quantity. "Compare" = unit fractions (mastered)
    // + same denominator (never given). That is unchecked, not a gap.
    const later = { ...positionAt(NOW), units: { ...positionAt(NOW).units, fractions: 'fractions.of_quantity' } };
    const st = standingVsClass(later, MIA_SEP19).fractions;
    expect(st.gaps).toBe(0);                       // the claim under test
    expect(st.unchecked).toBeGreaterThanOrEqual(2); // grows as more units are built
  });

  it('calls it a real gap only once she has practised it', () => {
    const tried = { ...MIA_SEP19, FRAC_PART_WHOLE: r('FRAC_PART_WHOLE', 'בתהליך', 0.5, 12) };
    expect(standingVsClass(positionAt(NOW), tried).fractions).toMatchObject({ gaps: 1, unchecked: 0 });
  });
});

// ─── Teaching order ──────────────────────────────────────────────────────────
//
// Dima, 2026-10-02: "you gave her questions with חילוק ארוך that she has not
// studied yet… she also doesn't know yet חילוק עם שארית. Please align with the
// order of the topics for the fourth grade in Israel."
//
// Two separate leaks caused it. The frontier walk stepped OVER a unit she could
// not do yet and kept going (landing on negative numbers, nine units ahead),
// and the blocker search ran over every grade-4 skill in the graph regardless
// of the book, so spring units arrived dressed as repair.

describe('the book\'s order is the order', () => {
  // A child a few weeks in: strong facts and place value, early units mastered,
  // still shaky on subtraction across zero — which is what gates the big
  // addition unit, and so gates everything built on it.
  const MID_YEAR: MasteryMap = {
    ARITH_MULT_6_9:         r('ARITH_MULT_6_9', 'שליטה', 0.95, 950),
    PLACE_VALUE_TO_MILLION: r('PLACE_VALUE_TO_MILLION', 'שליטה', 0.92, 120),
    NUM_ORDER_LINE:         r('NUM_ORDER_LINE', 'שליטה', 0.9, 60),
    NUM_ROUNDING:           r('NUM_ROUNDING', 'שליטה', 0.88, 55),
    FRAC_PART_WHOLE:        r('FRAC_PART_WHOLE', 'שליטה', 0.9, 40),
    FRAC_COMPARE_UNIT:      r('FRAC_COMPARE_UNIT', 'שליטה', 1, 42),
    FRAC_COMPARE_SAME:      r('FRAC_COMPARE_SAME', 'שליטה', 0.9, 35),
    GEOM_POLYGONS:          r('GEOM_POLYGONS', 'שליטה', 0.9, 30),
    GEOM_PARALLEL_PERP:     r('GEOM_PARALLEL_PERP', 'שליטה', 0.88, 35),
    ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.75, 800),
    FRAC_OF_QUANTITY:       r('FRAC_OF_QUANTITY', 'בתהליך', 0.35, 330),
  };

  /** Units the book teaches from January onwards. */
  const LATER_IN_THE_YEAR = [
    'ARITH_DIV_LONG', 'DIV_ONE_DIGIT', 'NUM_DIVISIBILITY', 'NUM_PRIMES',
    'ARITH_MULT_VERTICAL', 'MULT_BY_TENS', 'MULT_DIV_LINK', 'NUM_NEGATIVE',
    'NUM_GEMATRIA', 'GEOM_AREA', 'GEOM_SYMMETRY', 'GEOM_SOLIDS',
  ];

  const sessions = [0, 1, 2, 3, 4, 5].map(k => composeSession({
    profileId: 'p', gapProfile: GAP, masteryMap: MID_YEAR, mode: 'quantity',
    sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4,
    classPosition: positionAt(NOW),
  }));

  it('never hands her a topic the book teaches months later — in any slot', () => {
    for (const s of sessions) {
      for (const p of s.plannedItems) {
        expect(LATER_IN_THE_YEAR, `${p.sessionPhase}: ${p.item.skillCode}`)
          .not.toContain(p.item.skillCode);
      }
    }
  });

  it('stops at the first unit she has not mastered, even when it is locked', () => {
    // numbers.addition is locked behind subtraction across zero, so the numbers
    // strand offers no new material — it does NOT skip ahead to a later unit.
    const t = curriculumFrontier(positionAt(NOW), MID_YEAR).targets.find(x => x.strand === 'numbers');
    expect(t).toBeUndefined();
  });

  it('works on what unblocks the next unit instead', () => {
    const repaired = new Set(sessions.flatMap(s => s.plannedItems)
      .filter(p => p.sessionPhase === 'blocked_practice').map(p => p.item.skillCode));
    expect(repaired).toContain('ARITH_SUB_REGROUP_ZERO');
  });

  it('still moves the strands she IS ready for', () => {
    const newMaterial = new Set(sessions.flatMap(s => s.plannedItems)
      .filter(p => p.sessionPhase === 'new_material').map(p => p.item.skillCode));
    expect(newMaterial).toContain('FRAC_COMPLETE_WHOLE');
    expect(newMaterial).toContain('GEOM_RECT_SQUARE');
  });

  it('opens the later units once the earlier ones are genuinely hers', () => {
    // The order is a sequence, not a calendar: master what comes before and the
    // next unit opens, however far ahead of the class that is.
    const far: MasteryMap = { ...MID_YEAR,
      ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'שליטה', 0.95, 820),
      ARITH_ADD_SUB_LARGE:    r('ARITH_ADD_SUB_LARGE', 'שליטה', 0.9, 80),
    };
    const t = curriculumFrontier(positionAt(NOW), far).targets.find(x => x.strand === 'numbers');
    expect(t?.skill).toBe('NUM_ADD_SUB_LINK');     // the next unit, not a jump
    expect(t!.aheadBy).toBeGreaterThan(1);
  });
});

// ─── What actually reaches her ───────────────────────────────────────────────

describe('composed sessions for Mia (book-aligned)', () => {
  const sessions = [60, 61, 62, 63].map(k => composeSession({
    profileId: 'p', gapProfile: GAP, masteryMap: MIA_SEP19, mode: 'quantity',
    sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4,
    classPosition: positionAt(NOW),
  }));
  const skillsIn = (i: number) => new Set(sessions[i].plannedItems.map(p => p.item.skillCode));
  const allSkills = new Set(sessions.flatMap(s => s.plannedItems.map(p => p.item.skillCode)));

  it('reaches every strand across a few sessions', () => {
    for (const s of ['FRAC_COMPARE_SAME', 'GEOM_PARALLEL_PERP', 'NUM_ORDER_LINE']) {
      expect(allSkills, s).toContain(s);
    }
  });

  it('repairs her worst regression within a few sessions', () => {
    expect(allSkills).toContain('FRAC_OF_QUANTITY');
  });

  it('marks pre-teaching items as ahead of the class', () => {
    const ahead = sessions.flatMap(s => s.plannedItems).filter(p => p.ahead);
    expect(ahead.length).toBeGreaterThan(0);
    for (const p of ahead) expect(p.item.skillCode).toBe('NUM_ORDER_LINE');
  });

  it('opens a never-practised skill with a worked example', () => {
    const first = sessions[0].plannedItems.find(p => p.item.skillCode === 'FRAC_COMPARE_SAME');
    expect(first?.isWorkedExample).toBe(true);
  });

  it('never gives new material the class has not scheduled within the cap', () => {
    const allowed = new Set(['FRAC_COMPARE_SAME', 'GEOM_PARALLEL_PERP', 'NUM_ORDER_LINE']);
    for (const s of sessions) {
      for (const p of s.plannedItems.filter(x => x.sessionPhase === 'new_material')) {
        expect(allowed, p.item.skillCode).toContain(p.item.skillCode);
      }
    }
  });

  it('fills every session and never repeats an item', () => {
    for (const s of sessions) {
      expect(s.plannedItems.length).toBeGreaterThanOrEqual(18);
      const ids = s.plannedItems.map(p => p.item.itemId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(skillsIn(0).size).toBeGreaterThan(3);
  });
});
