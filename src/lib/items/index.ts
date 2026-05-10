/**
 * Item generator — public API.
 *
 * Replaces the static practiceItems.ts bank with a per-skill generator. Each
 * call enumerates valid parameter combinations for the skill (typically 100s),
 * shuffles via a seeded RNG, applies the recent-items filter, and returns up
 * to `count` PracticeItems.
 *
 * ItemIds are deterministic from parameters (`G_…` prefix), so:
 *   - The same item can recur across sessions naturally (good for spaced repetition).
 *   - The recent-items buffer can flag "Mia just saw this" and the generator
 *     prefers fresh combos when sampling.
 *   - Replay of a wrong answer is possible by the (skillCode, params) tuple.
 */

import type { PracticeItem } from '../../types';
import { makeRng, hashString } from './rng';
import type { GenerateOpts } from './shared';

import { generate as genRegroupZero }    from './generators/regroupZero';
import { generate as genMultFacts }      from './generators/multFacts';
import { generate as genFracCompare }    from './generators/fracCompare';
import { generate as genFracOfQty }      from './generators/fracOfQuantity';
import { generate as genWord2Step }      from './generators/word2step';
import { generate as genWord3Step }      from './generators/word3step';
import { generate as genUnitConvertCm }  from './generators/unitConvertCm';
import { generate as genUnitConvertM }   from './generators/unitConvertM';
import { generate as genTimeCrossHour }  from './generators/timeCrossHour';

type GenFn = (opts: GenerateOpts) => PracticeItem[];

const REGISTRY: Record<string, GenFn> = {
  ARITH_SUB_REGROUP_ZERO: genRegroupZero,
  ARITH_MULT_6_9:         genMultFacts,
  FRAC_COMPARE_UNIT:      genFracCompare,
  FRAC_OF_QUANTITY:       genFracOfQty,
  ARITH_WORD_2STEP:       genWord2Step,
  ARITH_WORD_3STEP:       genWord3Step,
  MEAS_UNIT_CONVERT_CM:   genUnitConvertCm,
  MEAS_UNIT_CONVERT_M:    genUnitConvertM,
  MEAS_TIME_CROSS_HOUR:   genTimeCrossHour,
};

/** All skill codes for which a generator exists. */
export const SKILLS_WITH_PRACTICE: string[] = Object.keys(REGISTRY);

export interface ItemPoolOpts {
  /** Max items to return. Defaults to 80 (plenty for any single session). */
  count?:     number;
  /** Cross-session itemIds to prefer-not-to-repeat. */
  recentIds?: Set<string>;
  /** Optional caller-supplied RNG; defaults to a session-stable seeded RNG. */
  rng?:       () => number;
  /** Optional seed to derive a deterministic RNG when caller doesn't pass one. */
  seed?:      string;
}

/**
 * Generate a fresh pool of practice items for a skill.
 *
 * Returns an empty array for unknown skill codes. Safe to call repeatedly;
 * each call re-shuffles the underlying combo set so the composer's existing
 * filter-by-cpaLayer / filter-by-usedIds logic continues to work unchanged.
 */
export function getItemPool(skillCode: string, opts: ItemPoolOpts = {}): PracticeItem[] {
  const fn = REGISTRY[skillCode];
  if (!fn) return [];
  const count     = opts.count     ?? 80;
  const recentIds = opts.recentIds ?? new Set<string>();
  const rng       = opts.rng       ?? makeRng(hashString(opts.seed ?? `${skillCode}::${Date.now()}`));
  return fn({ count, recentIds, rng });
}
