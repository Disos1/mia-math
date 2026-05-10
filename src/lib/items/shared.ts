/**
 * Shared types + helpers for skill generators.
 *
 * Each skill module exports a `generate(opts)` function that returns
 * `PracticeItem[]`. The shared `pickFromCombos` helper applies the
 * recent-items filter and returns up to `count` items, falling through
 * to include recent items only if the fresh pool is too small.
 */

import type { PracticeItem, ErrorSignatureCode, CPALayer, ItemVisual } from '../../types';
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
}

/**
 * Build a 4-option PracticeItem. Options are de-duplicated; if the supplied
 * distractors collide with correct/signature, the helper synthesises numeric
 * fallbacks (correct ±k) until the array has 4 unique entries.
 */
export function buildItem(a: BuildItemArgs): PracticeItem {
  const opts: (string | number)[] = [a.correct];
  if (a.signature !== null && a.signature !== undefined) opts.push(a.signature);
  for (const d of a.distractors) {
    if (opts.length >= 4) break;
    if (opts.includes(d)) continue;
    opts.push(d);
  }
  // Numeric fallback if dedupe collapsed below 4
  if (typeof a.correct === 'number') {
    let k = 1;
    while (opts.length < 4) {
      const cand = (a.correct as number) + (k % 2 === 0 ? -k : k);
      if (cand >= 0 && !opts.includes(cand)) opts.push(cand);
      k++;
      if (k > 50) break; // safety
    }
  }
  // Last-resort string fallback
  while (opts.length < 4) opts.push(`?${opts.length}`);

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
