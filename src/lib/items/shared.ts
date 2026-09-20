/**
 * Shared types + helpers for skill generators.
 *
 * Each skill module exports a `generate(opts)` function that returns
 * `PracticeItem[]`. The shared `pickFromCombos` helper applies the
 * recent-items filter and returns up to `count` items, falling through
 * to include recent items only if the fresh pool is too small.
 */

import type { PracticeItem, ErrorSignatureCode, CPALayer, ItemVisual, AnswerMode, WorkedStep } from '../../types';
import { shuffle } from './rng';

export interface GenerateOpts {
  count:     number;
  rng:       () => number;
  recentIds: Set<string>;
}

export interface BuildItemArgs {
  itemId:        string;
  skillCode:     string;
  question:      string;
  correct:       string | number;
  signature:     string | number | null;
  signatureCode: ErrorSignatureCode | null;
  /** Two filler distractors. Helper dedupes against correct/signature. */
  distractors:   (string | number)[];
  visual?:       ItemVisual | null;
  cpaLayer:      CPALayer;
  difficulty:    number;
  rng:           () => number;
  /** 'keypad' items are answered by typing; options are kept as fallback only. */
  answerMode?:   AnswerMode;
  /** Worked-solution steps for the step-ladder / worked-example views. */
  steps?:        WorkedStep[];
  /**
   * Use exactly the supplied options — no numeric padding. For "X or Y?"
   * questions the ±1 fallback invented numbers that were not in the question
   * (103,208 as a choice in "87,654 or 103,210?").
   */
  exactOptions?: boolean;
}

/**
 * Build a 4-option PracticeItem. Options are de-duplicated; if the supplied
 * distractors collide with correct/signature, the helper synthesises numeric
 * fallbacks (correct ±k) until the array has 4 unique entries.
 */
export function buildItem(a: BuildItemArgs): PracticeItem {
  // A signature identical to the correct answer would mark her RIGHT answer as
  // a misconception. Once generators sweep ranges instead of listing cases this
  // collision is inevitable (3/4 − 4/8: the "added across" answer really is
  // 1/4), so it is dropped here rather than guarded at fifty call sites. The
  // sweep test still fails if one ever reaches an item, and a second test keeps
  // each misconception observable on enough items to be diagnosable.
  if (a.signature !== null && a.signature !== undefined
      && String(a.signature) === String(a.correct)) {
    a = { ...a, signature: null, signatureCode: null };
  }
  const opts: (string | number)[] = [a.correct];
  if (a.signature !== null && a.signature !== undefined) opts.push(a.signature);
  for (const d of a.distractors) {
    if (opts.length >= 4) break;
    if (opts.includes(d)) continue;
    opts.push(d);
  }
  // Numeric fallback if dedupe collapsed below 4
  if (typeof a.correct === 'number' && !a.exactOptions) {
    let k = 1;
    while (opts.length < 4) {
      const cand = (a.correct as number) + (k % 2 === 0 ? -k : k);
      if (cand >= 0 && !opts.includes(cand)) opts.push(cand);
      k++;
      if (k > 50) break; // safety
    }
  }
  // No placeholder padding for text answers. This used to push "?2", "?3" so
  // every item had four buttons — which would show a child literal junk options
  // whenever a text item had fewer real ones. Two or three honest options render
  // fine in the grid; a fake one never does. (Guarded by a test over every
  // generator: no option may be a placeholder.)

  return {
    itemId:         a.itemId,
    skillCode:      a.skillCode,
    skillHebrewKey: `skill.${a.skillCode}`,
    question:       a.question,
    options:        shuffle(opts, a.rng),
    correct:        a.correct,
    signature:      a.signature,
    signatureCode:  a.signatureCode,
    visual:         a.visual ?? null,
    cpaLayer:       a.cpaLayer,
    difficulty:     a.difficulty,
    answerMode:     a.answerMode ?? 'choice',
    steps:          a.steps,
  };
}

/**
 * Shared post-processing: shuffle a fully-enumerated combo set, prefer items
 * not in `recentIds`, and return up to `count`. Falls through to including
 * recent items only when the fresh set is too small.
 */
export function pickFromCombos(combos: PracticeItem[], opts: GenerateOpts): PracticeItem[] {
  const shuffled = shuffle(combos, opts.rng);
  const fresh    = shuffled.filter(it => !opts.recentIds.has(it.itemId));
  if (fresh.length >= opts.count) return fresh.slice(0, opts.count);
  // Pool exhausted under the recents filter — fall back to whole pool
  return shuffled.slice(0, opts.count);
}
