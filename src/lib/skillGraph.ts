/**
 * Skill prerequisite graph — Opus task.
 *
 * Turns the flat skill registry into a dependency graph so the app can answer
 * the only question that matters when Mia fails an item: *why*.
 *
 * When she misses long multiplication, re-drilling long multiplication is the
 * wrong move if the actual blocker is ×7 facts. `findBlocker()` walks down the
 * prerequisite chain and returns the deepest unmastered skill — the thing to
 * practise today.
 *
 * Curriculum grounding (deep research, validated 2026-07-31, 3/3 tool agreement):
 *   - Grade 4 in תשפ"ז follows the 2006 curriculum (מפמ"ר circular, Aug 2025).
 *   - Grade-4 number range is to 1,000,000.
 *   - Decimals and averages are GRADE 5 — deliberately absent here.
 *   - Long division is limited to a single-digit divisor or a whole ten.
 *
 * Classroom ORDER comes from her actual textbook, ה.ש.ב.ח.ה ד' — see
 * curriculum/hashbacha4.ts. (Corrected 2026-09-19: the research's "September is
 * grade-3 review, fractions from October" does not hold for this series. New
 * material starts on 1 September on three parallel strands — numbers,
 * fractions and geometry; multiplication/division arrive in January.)
 *
 * See Mia_Math_Grade4_Plan.md §v2.0 and §v3.0.
 */

import type { MasteryMap } from '../types';
import { isMastered } from './masteryTracker';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Grade = 3 | 4;

/**
 * How a prerequisite is required.
 *   'accuracy' — the skill must be mastered (the normal case).
 *   'fluency'  — mastery is not enough; retrieval must be FAST. Used where a
 *                skill is executed inside a larger algorithm and slow recall
 *                consumes the working memory the new procedure needs.
 *                (Research: weak facts consume resources needed for the
 *                algorithm; `ERR_MULT_FACT_SLOW` already models this.)
 */
export type PrereqKind = 'accuracy' | 'fluency';

export interface Prereq {
  skill: string;
  kind:  PrereqKind;
  /** Why this edge exists — surfaced to Mia as the "tools for today" framing. */
  why:   string;
}

export interface SkillNode {
  skill:    string;
  grade:    Grade;
  strand:   string;
  /** Rough classroom month for grade-4 skills; null for grade-3 catch-up. */
  taughtFrom: 'sept' | 'oct' | 'jan' | 'spring' | null;
  prereqs:  Prereq[];
}

// ─── The graph ────────────────────────────────────────────────────────────────
//
// Grade-3 nodes describe what the app already teaches. Grade-4 nodes are added
// as their generators land; an entry here with no generator yet is harmless —
// `findBlocker` only ever routes to skills that exist in the mastery map.

export const SKILL_GRAPH: Record<string, SkillNode> = {
  // ── Grade 3 — existing content ────────────────────────────────────────────
  ARITH_MULT_6_9: {
    skill: 'ARITH_MULT_6_9', grade: 3, strand: 'ARITH', taughtFrom: null,
    prereqs: [],
  },
  ARITH_SUB_REGROUP_ZERO: {
    skill: 'ARITH_SUB_REGROUP_ZERO', grade: 3, strand: 'ARITH', taughtFrom: null,
    // Place value is the true foundation of borrowing across a zero. The app has
    // no grade-3 place-value skill yet, so this edge points at the grade-4 node
    // that finally supplies it — see PLACE_VALUE_TO_MILLION.
    prereqs: [],
  },
  ARITH_WORD_2STEP: {
    skill: 'ARITH_WORD_2STEP', grade: 3, strand: 'ARITH', taughtFrom: null,
    prereqs: [
      { skill: 'ARITH_SUB_REGROUP_ZERO', kind: 'accuracy',
        why: 'כדי לפתור את השלב השני צריך לדעת לחסר בביטחון' },
    ],
  },
  ARITH_WORD_3STEP: {
    skill: 'ARITH_WORD_3STEP', grade: 3, strand: 'ARITH', taughtFrom: null,
    prereqs: [
      { skill: 'ARITH_WORD_2STEP', kind: 'accuracy',
        why: 'שאלה בשלושה שלבים בנויה על שאלה בשני שלבים' },
    ],
  },
  FRAC_COMPARE_UNIT: {
    skill: 'FRAC_COMPARE_UNIT', grade: 3, strand: 'FRAC', taughtFrom: null,
    prereqs: [],
  },
  FRAC_OF_QUANTITY: {
    skill: 'FRAC_OF_QUANTITY', grade: 3, strand: 'FRAC', taughtFrom: null,
    prereqs: [
      { skill: 'FRAC_COMPARE_UNIT', kind: 'accuracy',
        why: 'צריך להבין מה זה שבר יסודי לפני שמחשבים שבר מתוך כמות' },
    ],
  },
  MEAS_UNIT_CONVERT_CM: {
    skill: 'MEAS_UNIT_CONVERT_CM', grade: 3, strand: 'MEAS', taughtFrom: null,
    prereqs: [],
  },
  MEAS_UNIT_CONVERT_M: {
    skill: 'MEAS_UNIT_CONVERT_M', grade: 3, strand: 'MEAS', taughtFrom: null,
    prereqs: [
      { skill: 'MEAS_UNIT_CONVERT_CM', kind: 'accuracy',
        why: 'אותו רעיון של המרה, רק עם מספרים גדולים יותר' },
    ],
  },
  MEAS_TIME_CROSS_HOUR: {
    skill: 'MEAS_TIME_CROSS_HOUR', grade: 3, strand: 'MEAS', taughtFrom: null,
    prereqs: [],
  },

  // ── Grade 4 — aligned to her textbook, ה.ש.ב.ח.ה ד' ────────────────────────
  //
  // Timings come from the publisher's own pacing plan (curriculum/hashbacha4.ts),
  // which replaced the generic-research timings on 2026-09-19. Numbers, fractions
  // and geometry all start on 1 September; nothing waits for October.
  //
  // Nodes are declared ahead of their generators so the graph, the composer and
  // the parent dashboard can already reason about the year. Skills without a
  // generator simply never get selected.

  PLACE_VALUE_TO_MILLION: {
    skill: 'PLACE_VALUE_TO_MILLION', grade: 4, strand: 'PLACE_VALUE', taughtFrom: 'sept',
    // No prereq inside the app yet — this IS the foundational node, and it is
    // the missing floor beneath ARITH_SUB_REGROUP_ZERO (her worst skill).
    prereqs: [],
  },
  ARITH_ADD_SUB_LARGE: {
    skill: 'ARITH_ADD_SUB_LARGE', grade: 4, strand: 'ARITH', taughtFrom: 'oct',
    prereqs: [
      { skill: 'PLACE_VALUE_TO_MILLION', kind: 'accuracy',
        why: 'כדי לחבר ולחסר מספרים גדולים צריך להבין את ערך המקום שלהם' },
      { skill: 'ARITH_SUB_REGROUP_ZERO', kind: 'accuracy',
        why: 'ההמרה מעבר לאפס היא בדיוק אותו רעיון — רק במספרים גדולים' },
    ],
  },
  NUM_ORDER_LINE: {
    skill: 'NUM_ORDER_LINE', grade: 4, strand: 'PLACE_VALUE', taughtFrom: 'sept',
    prereqs: [
      { skill: 'PLACE_VALUE_TO_MILLION', kind: 'accuracy',
        why: 'כדי לסדר מספרים גדולים על ישר המספרים צריך לדעת כמה כל ספרה שווה' },
    ],
  },
  NUM_ROUNDING: {
    skill: 'NUM_ROUNDING', grade: 4, strand: 'PLACE_VALUE', taughtFrom: 'oct',
    prereqs: [
      { skill: 'PLACE_VALUE_TO_MILLION', kind: 'accuracy',
        why: 'עיגול לאלפים או לעשרות אלפים מתחיל מלזהות את הספרה במקום הנכון' },
    ],
  },
  FRAC_PART_WHOLE: {
    skill: 'FRAC_PART_WHOLE', grade: 4, strand: 'FRAC', taughtFrom: 'sept',
    // Foundation of the fractions booklet: the name of a fraction comes from the
    // number of equal parts. Nothing in the app sits beneath it.
    prereqs: [],
  },
  FRAC_COMPARE_SAME: {
    skill: 'FRAC_COMPARE_SAME', grade: 4, strand: 'FRAC', taughtFrom: 'sept',
    prereqs: [
      { skill: 'FRAC_COMPARE_UNIT', kind: 'accuracy',
        why: 'להשוות 3/5 ו-3/8 זה כמו להשוות חמישית ושמינית — רק כמה חתיכות מכל אחת' },
    ],
  },
  GEOM_POLYGONS: {
    skill: 'GEOM_POLYGONS', grade: 4, strand: 'GEOM', taughtFrom: 'sept',
    prereqs: [],
  },
  GEOM_PARALLEL_PERP: {
    skill: 'GEOM_PARALLEL_PERP', grade: 4, strand: 'GEOM', taughtFrom: 'sept',
    // Not gated on GEOM_POLYGONS: the class is on this unit NOW, and gating it
    // behind a skill she has never practised would put her a fortnight behind
    // the lesson. Polygon naming reaches her through the repair stream instead.
    prereqs: [],
  },
  FRAC_EQUIVALENT: {
    // שמות שונים לשבר — late January in the book (pp. 111–120), not October.
    skill: 'FRAC_EQUIVALENT', grade: 4, strand: 'FRAC', taughtFrom: 'jan',
    prereqs: [
      { skill: 'FRAC_COMPARE_UNIT', kind: 'accuracy',
        why: 'שברים שקולים בנויים על ההבנה מה גודל של שבר' },
    ],
  },

  // ── Grade 4 — Phase B (the Jan–Mar convergence) ───────────────────────────

  ARITH_MULT_VERTICAL: {
    skill: 'ARITH_MULT_VERTICAL', grade: 4, strand: 'ARITH', taughtFrom: 'jan',
    prereqs: [
      // FLUENCY, not just accuracy: inside the algorithm each fact must be
      // retrieved, not computed, or working memory is spent on the wrong thing.
      { skill: 'ARITH_MULT_6_9', kind: 'fluency',
        why: 'בכפל ארוך צריך לזכור את לוח הכפל מהר — אחרת אין מקום בראש לאלגוריתם' },
      { skill: 'PLACE_VALUE_TO_MILLION', kind: 'accuracy',
        why: 'ההזזה של המכפלה החלקית היא ערך מקום' },
    ],
  },
  ARITH_DIV_LONG: {
    skill: 'ARITH_DIV_LONG', grade: 4, strand: 'ARITH', taughtFrom: 'jan',
    prereqs: [
      { skill: 'ARITH_MULT_6_9', kind: 'fluency',
        why: 'בחירת ספרת המנה היא שאלת כפל — צריך לזכור אותה מהר' },
      { skill: 'ARITH_SUB_REGROUP_ZERO', kind: 'accuracy',
        why: 'בכל שלב בחילוק ארוך מחסרים — כולל מעבר לאפס' },
      // Place value is load-bearing here, not incidental. The documented long-
      // division misconceptions are place-value failures: omitting a zero from
      // the quotient, bringing down without preserving place, and dividing each
      // digit independently (936÷4 → 201). Without this edge the graph let
      // long division unlock in July purely because facts and subtraction
      // happened to be green — caught by test, 2026-07-31.
      { skill: 'PLACE_VALUE_TO_MILLION', kind: 'accuracy',
        why: 'בחילוק ארוך כל ספרה שומרת על הערך שלה — בלי זה האפס במנה נעלם' },
    ],
  },
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Every skill this one directly depends on. */
export function prerequisitesOf(skill: string): Prereq[] {
  return SKILL_GRAPH[skill]?.prereqs ?? [];
}

/** Skills that list `skill` as a prerequisite (i.e. what it unlocks). */
export function unlockedBy(skill: string): string[] {
  return Object.values(SKILL_GRAPH)
    .filter(n => n.prereqs.some(p => p.skill === skill))
    .map(n => n.skill);
}

export function gradeOf(skill: string): Grade | null {
  return SKILL_GRAPH[skill]?.grade ?? null;
}

/**
 * Is a prerequisite edge satisfied?
 *
 * 'accuracy' edges need mastery. 'fluency' edges additionally require that the
 * skill is not flagged slow — mastery at a crawl does not unlock an algorithm
 * that must call the fact dozens of times.
 *
 * `slowSkills` is supplied by the caller (derived from answer latency); when it
 * is omitted, fluency edges degrade to accuracy edges rather than blocking
 * everything, so a missing latency signal can never freeze her progress.
 */
export function isPrereqSatisfied(
  prereq:     Prereq,
  masteryMap: MasteryMap,
  slowSkills: ReadonlySet<string> = new Set(),
): boolean {
  if (!isMastered(masteryMap, prereq.skill)) return false;
  if (prereq.kind === 'fluency' && slowSkills.has(prereq.skill)) return false;
  return true;
}

export interface BlockerResult {
  /** The skill to actually practise now. Equals `target` when nothing blocks it. */
  skill:   string;
  /** How many edges below the target we descended (0 = target itself). */
  depth:   number;
  /** The edge that explains the drop — null when depth is 0. */
  via:     Prereq | null;
  /** Full chain from target down to the returned skill, for debugging/dashboard. */
  chain:   string[];
}

/**
 * Walk down from `target` to the deepest unmastered prerequisite.
 *
 * Returns the target itself when every prerequisite is satisfied. Depth-first,
 * taking the first unsatisfied prerequisite at each level; ties are resolved by
 * declaration order, which is authored deliberately (most-foundational first).
 *
 * `maxDepth` guards against over-eager demotion: sending Mia three layers down
 * in one step reads as punishment, not help. The composer descends one layer at
 * a time across sessions (v1.1 finding C-4).
 *
 * Cycle-safe: a malformed graph cannot hang the session runner.
 */
export function findBlocker(
  target:     string,
  masteryMap: MasteryMap,
  opts: { slowSkills?: ReadonlySet<string>; maxDepth?: number } = {},
): BlockerResult {
  const slowSkills = opts.slowSkills ?? new Set<string>();
  const maxDepth   = opts.maxDepth   ?? 1;

  let current = target;
  let depth   = 0;
  let via: Prereq | null = null;
  const chain: string[]  = [target];
  const seen = new Set<string>([target]);

  while (depth < maxDepth) {
    const unmet = prerequisitesOf(current)
      .find(p => !isPrereqSatisfied(p, masteryMap, slowSkills));
    if (!unmet) break;
    if (seen.has(unmet.skill)) break;   // cycle guard
    seen.add(unmet.skill);
    chain.push(unmet.skill);
    current = unmet.skill;
    via     = unmet;
    depth  += 1;
  }

  return { skill: current, depth, via, chain };
}

/**
 * Is this skill ready to be introduced as new material?
 * True when every prerequisite edge is satisfied.
 */
export function isUnlocked(
  skill:      string,
  masteryMap: MasteryMap,
  slowSkills: ReadonlySet<string> = new Set(),
): boolean {
  return prerequisitesOf(skill).every(p => isPrereqSatisfied(p, masteryMap, slowSkills));
}

/** Every declared skill at a given curriculum year, in declaration order. */
export function skillsAtGrade(grade: Grade): string[] {
  return Object.values(SKILL_GRAPH).filter(n => n.grade === grade).map(n => n.skill);
}

/** Grade-4 skills whose prerequisites are all met — candidates for new material. */
export function unlockedGrade4Skills(
  masteryMap: MasteryMap,
  slowSkills: ReadonlySet<string> = new Set(),
): string[] {
  return Object.values(SKILL_GRAPH)
    .filter(n => n.grade === 4 && isUnlocked(n.skill, masteryMap, slowSkills))
    .map(n => n.skill);
}
