/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord, GapProfile } from '../../types';
import { HASHBACHA_4, STRANDS, DORMANT_BY_DEFAULT, unitsOf, unitById } from './hashbacha4';
import {
  teachingWeek, estimateUnit, curriculumFrontier, standingVsClass, loadClassPosition, extrapolateUnit,
  NOT_STARTED, type ClassPosition,
} from './classPosition';
import { SKILLS_WITH_PRACTICE, getItemPool } from '../items';
import { SKILL_GRAPH } from '../skillGraph';
import { composeSession } from '../sessionComposer';

const r = (s: string, st: MasteryRecord['status'], a: number, n: number): MasteryRecord => ({
  profileId: 'p', skillCode: s, status: st, firstAttemptAccuracy: a, itemCount: n,
  sessionCount: 4, lastPracticedAt: '2026-09-05T00:00:00.000Z',
  needsRetentionProbe: false, retentionProbeDueAt: null,
});

const SYNTHETIC_LEARNER: MasteryMap = {
  ARITH_MULT_6_9:         r('ARITH_MULT_6_9',         'שליטה',  0.92, 28),
  ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.72, 28),
  ARITH_WORD_2STEP:       r('ARITH_WORD_2STEP',       'בתהליך', 0.72, 28),
  ARITH_WORD_3STEP:       r('ARITH_WORD_3STEP',       'בתהליך', 0.62, 28),
  FRAC_COMPARE_UNIT:      r('FRAC_COMPARE_UNIT',      'שליטה',  0.96, 28),
  FRAC_OF_QUANTITY:       r('FRAC_OF_QUANTITY',       'בתהליך', 0.35, 28),
  MEAS_UNIT_CONVERT_CM:   r('MEAS_UNIT_CONVERT_CM',   'בתהליך', 0.92, 28),
  PLACE_VALUE_TO_MILLION: r('PLACE_VALUE_TO_MILLION', 'שליטה',  0.92, 28),
};

const GAP = {
  version: 1, computedAt: '2024-01-01T08:00:00.000Z', diagnosticSessionId: 'x',
  strands: { ARITH: { status: 'בתהליך', priority: 1, activeErrors: [] } }, cpaStartLayer: {},
  sessionComposerNotes: {
    startWith: 'easy_known_skill', firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO',
    blockedPracticePriority: ['ARITH_SUB_REGROUP_ZERO', 'ARITH_WORD_2STEP'],
  },
} as unknown as GapProfile;

const NOW = '2026-09-19T12:00:00.000Z';

const TOPIC1: MasteryMap = {
  NUM_READ_WRITE: r('NUM_READ_WRITE', 'שליטה', 0.9, 30),
  DATA_DIAGRAMS:  r('DATA_DIAGRAMS',  'שליטה', 0.9, 30),
};

const positionAt = (iso: string): ClassPosition => ({
  units:  Object.fromEntries(STRANDS.map(s => [s, DORMANT_BY_DEFAULT.has(s) ? NOT_STARTED : estimateUnit(s, iso).id])),
  source: Object.fromEntries(STRANDS.map(s => [s, 'estimate' as const])),
});

describe('curriculum data', () => {
  it('lists units in teaching order within every strand', () => {
    for (const s of STRANDS) {
      const weeks = unitsOf(s).map(u => u.week);
      expect([...weeks].sort((a, b) => a - b), s).toEqual(weeks);
    }
  });

  it('starts every book in the first week — no "September review"', () => {

    for (const s of STRANDS) expect(unitsOf(s)[0].week, s).toBe(0);
  });

  it('follows the contents pages of the three books she learns in parallel', () => {

    const topics = (s: 'numbers' | 'multdiv' | 'geometry') => unitsOf(s).map(u => u.topic);
    const oneTo  = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    expect(topics('numbers')).toEqual(oneTo(17));
    expect(topics('multdiv')).toEqual(oneTo(20));
    expect(topics('geometry')).toEqual(oneTo(22));
  });

  it('builds every topic of all three books', () => {
    for (const s of ['numbers', 'multdiv', 'geometry'] as const) {
      for (const u of unitsOf(s)) expect(u.skills.length, `${u.id} has no practice`).toBeGreaterThan(0);
    }
  });

  it('only claims coverage with skills that actually have a generator', () => {

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
    expect(p.units.numbers).toBe('numbers.represent_a');
    expect(p.units.multdiv).toBe('multdiv.div_tens_digit');
    expect(p.units.geometry).toBe('geometry.parallel');
  });

  it('leaves the fractions book alone until the parent says the class started it', () => {

    expect(loadClassPosition('nobody', NOW).units.fractions).toBe(NOT_STARTED);
  });
});

describe('frontier for a synthetic mixed-mastery profile', () => {
  const f = curriculumFrontier(positionAt(NOW), SYNTHETIC_LEARNER);
  const target = (s: string) => f.targets.find(t => t.strand === s);

  it('works with the class on geometry', () => {
    expect(target('geometry')).toMatchObject({ skill: 'GEOM_PARALLEL_PERP', aheadBy: 0 });
  });

  it('works with the class on numbers topic 1 — reading and writing numbers, which she has not shown', () => {

    expect(target('numbers')).toMatchObject({ skill: 'NUM_READ_WRITE', aheadBy: 0 });
  });

  it('pre-teaches in numbers, in the book\'s order, once topics 1–2 are hers', () => {
    const more = { ...SYNTHETIC_LEARNER, ...TOPIC1 };
    const t = curriculumFrontier(positionAt(NOW), more).targets.find(x => x.strand === 'numbers');
    expect(t).toMatchObject({ skill: 'NUM_DIGIT_CARDS', aheadBy: 2 });
  });

  it('works with the class on mult/div topic 3 and repairs topics 1–2 alongside', () => {

    expect(target('multdiv')).toMatchObject({ skill: 'DIV_TENS_BY_DIGIT', aheadBy: 0 });
    expect(f.behind.map(b => b.skill)).toEqual(expect.arrayContaining(['MULT_BY_10_100_1000', 'MULT_BY_TENS']));
  });

  it('gives nothing from the fractions book while the class has not started it', () => {
    expect(target('fractions')).toBeUndefined();
    expect(f.behind.filter(b => b.strand === 'fractions')).toEqual([]);
  });

  it('runs as far ahead as her mastery allows — the class is not a ceiling', () => {
    const far = { ...SYNTHETIC_LEARNER, ...TOPIC1,
      NUM_DIGIT_CARDS: r('NUM_DIGIT_CARDS', 'שליטה', 1, 20),
      NUM_COMPARE:     r('NUM_COMPARE', 'שליטה', 1, 20),
    };
    const t = curriculumFrontier(positionAt(NOW), far).targets.find(x => x.strand === 'numbers');
    expect(t).toMatchObject({ skill: 'NUM_ORDER_LINE', aheadBy: 4 });
  });

  it('treats units the class has passed as repair, not new material', () => {
    expect(f.behind.map(b => b.skill).sort()).toEqual(['GEOM_POLYGONS', 'MULT_BY_10_100_1000', 'MULT_BY_TENS']);
    const targetSkills = f.targets.map(t => t.skill);
    for (const b of f.behind) expect(targetSkills).not.toContain(b.skill);
  });

  it('reports her standing honestly — ahead in numbers, unknown (not weak) elsewhere', () => {
    const st = standingVsClass(positionAt(NOW), SYNTHETIC_LEARNER);
    expect(st.numbers.ahead).toBe(0);                    // topic 1 is not all hers yet
    expect(standingVsClass(positionAt(NOW), { ...SYNTHETIC_LEARNER, ...TOPIC1 }).numbers.ahead).toBeGreaterThan(0);

    expect(st.geometry).toMatchObject({ gaps: 0, unchecked: 1 });
    expect(st.multdiv).toMatchObject({ gaps: 0, unchecked: 2 });
    expect(st.fractions).toMatchObject({ ahead: 0, gaps: 0, unchecked: 0 });
  });

  it('does not call a half-mastered unit weak because of its never-seen half', () => {

    const later = { ...positionAt(NOW), units: { ...positionAt(NOW).units, fractions: 'fractions.of_quantity' } };
    const st = standingVsClass(later, SYNTHETIC_LEARNER).fractions;
    expect(st.gaps).toBe(0);
    expect(st.unchecked).toBeGreaterThanOrEqual(2);
  });

  it('calls it a real gap only once she has practised it', () => {
    const tried = { ...SYNTHETIC_LEARNER, GEOM_POLYGONS: r('GEOM_POLYGONS', 'בתהליך', 0.5, 12) };
    expect(standingVsClass(positionAt(NOW), tried).geometry).toMatchObject({ gaps: 1, unchecked: 0 });
  });

  it('flags a weak skill the class is about to reach, once the parent starts that book', () => {

    const started = { ...positionAt(NOW), units: { ...positionAt(NOW).units, fractions: 'fractions.improper' } };
    expect(curriculumFrontier(started, SYNTHETIC_LEARNER).upcoming.map(u => u.skill)).toContain('FRAC_OF_QUANTITY');
  });
});

describe('the book\'s order is the order', () => {

  const MID_YEAR: MasteryMap = {
    ARITH_MULT_6_9:         r('ARITH_MULT_6_9', 'שליטה', 0.95, 950),
    PLACE_VALUE_TO_MILLION: r('PLACE_VALUE_TO_MILLION', 'שליטה', 0.92, 120),
    ...TOPIC1,
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


  const LATER_IN_THE_YEAR = [
    'ARITH_DIV_LONG', 'DIV_LONG_B', 'DIV_ONE_DIGIT', 'NUM_DIVISIBILITY', 'NUM_PRIMES',
    'NUM_FACTORISE', 'NUM_DIV_3_9', 'NUM_DIV_6', 'NUM_POWERS',
    'ARITH_MULT_VERTICAL', 'MULT_VERTICAL_3BY2', 'NUM_NEGATIVE', 'NUM_GEMATRIA',
    'DATA_CHANCE_COMPARE', 'GEOM_AREA', 'GEOM_SYMMETRY', 'GEOM_SOLIDS',
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

    const upTo7: MasteryMap = { ...MID_YEAR,
      NUM_DIGIT_CARDS: r('NUM_DIGIT_CARDS', 'שליטה', 0.9, 30),
      NUM_COMPARE:     r('NUM_COMPARE', 'שליטה', 0.9, 30),
      NUM_ADD_LARGE:   r('NUM_ADD_LARGE', 'שליטה', 0.9, 30),
    };
    const t = curriculumFrontier(positionAt(NOW), upTo7).targets.find(x => x.strand === 'numbers');
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
    expect(newMaterial).toContain('DIV_TENS_BY_DIGIT');
    expect(newMaterial).toContain('GEOM_RECT_SQUARE');
  });

  it('opens the later units once the earlier ones are genuinely hers', () => {

    const far: MasteryMap = { ...MID_YEAR,
      NUM_DIGIT_CARDS:        r('NUM_DIGIT_CARDS', 'שליטה', 0.9, 30),
      NUM_COMPARE:            r('NUM_COMPARE', 'שליטה', 0.9, 30),
      NUM_ADD_LARGE:          r('NUM_ADD_LARGE', 'שליטה', 0.9, 30),
      ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'שליטה', 0.95, 820),
      ARITH_ADD_SUB_LARGE:    r('ARITH_ADD_SUB_LARGE', 'שליטה', 0.9, 80),
    };
    const t = curriculumFrontier(positionAt(NOW), far).targets.find(x => x.strand === 'numbers');
    expect(t?.skill).toBe('NUM_ADD_SUB_LINK');     // the next unit, not a jump
    expect(t!.aheadBy).toBeGreaterThan(1);
  });
});

describe('composed sessions for a synthetic learner (book-aligned)', () => {
  const sessions = [60, 61, 62, 63].map(k => composeSession({
    profileId: 'p', gapProfile: GAP, masteryMap: SYNTHETIC_LEARNER, mode: 'quantity',
    sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4,
    classPosition: positionAt(NOW),
  }));
  const skillsIn = (i: number) => new Set(sessions[i].plannedItems.map(p => p.item.skillCode));
  const allSkills = new Set(sessions.flatMap(s => s.plannedItems.map(p => p.item.skillCode)));

  it('reaches all three books across a few sessions', () => {
    for (const s of ['MULT_BY_10_100_1000', 'GEOM_PARALLEL_PERP', 'NUM_READ_WRITE']) {
      expect(allSkills, s).toContain(s);
    }
  });

  it('repairs her worst regression within a few sessions, though its book is not started', () => {

    expect(allSkills).toContain('FRAC_OF_QUANTITY');
  });

  it('gives no new fractions material while that book is not started', () => {
    for (const s of sessions) {
      for (const p of s.plannedItems.filter(x => x.sessionPhase === 'new_material')) {
        expect(p.item.skillCode.startsWith('FRAC_'), p.item.skillCode).toBe(false);
      }
    }
  });

  it('marks nothing as ahead while every book is with or behind the class', () => {

    expect(sessions.flatMap(s => s.plannedItems).filter(p => p.ahead)).toEqual([]);
  });

  it('opens a never-practised skill with a worked example', () => {
    for (const skill of ['GEOM_PARALLEL_PERP', 'DIV_TENS_BY_DIGIT']) {
      const first = sessions.flatMap(s => s.plannedItems).find(p => p.item.skillCode === skill);
      expect(first?.isWorkedExample, skill).toBe(true);
    }
  });

  it('gives new material only from her frontier in each book', () => {
    const allowed = new Set(['DIV_TENS_BY_DIGIT', 'GEOM_PARALLEL_PERP', 'NUM_READ_WRITE']);
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

describe('teaching-order guards', () => {
  const textOf = (skill: string): string[] =>
    getItemPool(skill, { count: 100_000, rng: () => 0.5 })
      .map(i => [i.question, ...(i.options ?? []).map(String), ...(i.steps ?? []).map(st => st.text)].join(' '));

  it('never mentions a remainder before the mult/div book teaches it (topic 14)', () => {

    const remainderWeek = unitById('multdiv.long_div_a')!.week;
    const early = new Set(HASHBACHA_4.filter(u => u.week < remainderWeek).flatMap(u => u.skills));
    for (const skill of early) {
      for (const t of textOf(skill)) expect(t, skill).not.toMatch(/שארית/);
    }
  });

  it('keeps the angle sum of a triangle out — it is not grade-4 material', () => {
    for (const t of textOf('GEOM_TRIANGLES')) expect(t).not.toMatch(/180/);
  });
});

describe('extrapolating a saved position', () => {
  const SET = '2026-10-21T18:00:00.000Z';
  const at = (strand: 'numbers' | 'multdiv' | 'geometry', anchor: string, iso: string) =>
    extrapolateUnit(strand, anchor, SET, iso).id;

  it('stays where the parent put it on the day it was set', () => {
    expect(at('numbers', 'numbers.compare', SET)).toBe('numbers.compare');
  });

  it('moves on at the book\'s pace, one book at a time', () => {
    const week = '2026-10-29T12:00:00.000Z';
    expect(at('numbers', 'numbers.compare', week)).toBe('numbers.order_line');       // 1-week topic
    expect(at('multdiv', 'multdiv.div_by_tens', week)).toBe('multdiv.div_by_tens'); // 2-week topic
    const twoWeeks = '2026-11-05T12:00:00.000Z';
    expect(at('multdiv', 'multdiv.div_by_tens', twoWeeks)).toBe('multdiv.mult_div_link');
    expect(at('geometry', 'geometry.parallel', twoWeeks)).toBe('geometry.rect_square');
  });

  it('does not advance through a school holiday', () => {
    const before = '2026-12-06T00:00:00.000Z', after = '2026-12-13T00:00:00.000Z';
    expect(extrapolateUnit('numbers', 'numbers.rounding', before, after).id).toBe('numbers.rounding');
  });

  it('never runs past the end of the book', () => {
    const units = unitsOf('numbers');
    expect(at('numbers', 'numbers.compare', '2027-09-01T00:00:00.000Z')).toBe(units[units.length - 1].id);
  });
});

