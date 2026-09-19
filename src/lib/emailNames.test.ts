/**
 * The daily email runs in Deno and cannot import the app, so it keeps its own
 * Hebrew name tables. Those drifted: every grade-4 skill appeared in the parent
 * email as a raw code ("PLACE_VALUE_TO_MILLION"). This reads the function's
 * source and fails if any registered skill or error code is missing a name.
 */
import { describe, it, expect } from 'vitest';
import { SKILLS_WITH_PRACTICE } from './items';
import he from '../i18n/he_f.json';
// ?raw keeps this inside the app's own build types — node:fs broke `tsc -b`.
import src from '../../supabase/functions/daily-summary/index.ts?raw';

describe('daily email name tables', () => {
  it('names every skill the app can give her', () => {
    for (const s of SKILLS_WITH_PRACTICE) {
      expect(src, `email has no Hebrew name for ${s}`).toMatch(new RegExp(`\\b${s}:\\s*'`));
    }
  });

  it('names every error code the app can report', () => {
    const codes = Object.keys(he).filter(k => k.startsWith('err.')).map(k => k.slice(4));
    for (const c of codes) {
      expect(src, `email has no Hebrew name for ${c}`).toMatch(new RegExp(`\\b${c}:\\s*'`));
    }
  });
});
