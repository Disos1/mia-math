/**
 * Sweep over EVERY registered generator for the failure classes Mia has
 * actually hit, or nearly hit. Each check names the incident it guards.
 *
 * Adding a skill to the registry automatically puts it under all of these —
 * a new generator cannot opt out.
 */

import { describe, it, expect } from 'vitest';
import { SKILLS_WITH_PRACTICE, getItemPool } from './index';
import { makeRng, hashString } from './rng';
import { MASTERY_ITEM_MINIMUM } from '../../constants/config';

const pools = SKILLS_WITH_PRACTICE.map(skill => ({
  skill,
  items: getItemPool(skill, {
    count: 10_000, recentIds: new Set(), rng: makeRng(hashString(`sweep-${skill}`)),
  }),
}));

const choiceItems = (items: typeof pools[number]['items']) =>
  items.filter(i => (i.answerMode ?? 'choice') === 'choice');

describe('every generator, every item', () => {
  it('produces items for every registered skill', () => {
    for (const p of pools) expect(p.items.length, p.skill).toBeGreaterThan(0);
  });

  it('never shows a placeholder option like "?3"', () => {
    // 2026-09-19: the shared builder padded text answers to four buttons with
    // "?2", "?3". Any text item with fewer real options would have shown a child
    // literal junk. The padding is gone; this keeps it gone.
    for (const { skill, items } of pools) {
      for (const it of items) {
        for (const o of it.options) {
          expect(String(o), `${skill} ${it.itemId}`).not.toMatch(/^\?\d+$/);
        }
      }
    }
  });

  it('never puts a bare comparison sign on a button', () => {
    // On an RTL page a lone ">" is bidi-mirrored: it would DISPLAY as "<" while
    // being scored as ">". Signs may only appear inside a full expression, which
    // MathText isolates left-to-right.
    for (const { skill, items } of pools) {
      for (const it of items) {
        for (const o of it.options) {
          expect(String(o).trim(), `${skill} ${it.itemId}`).not.toMatch(/^[<>=≤≥]$/);
        }
      }
    }
  });

  it('includes the correct answer among a choice item\'s options', () => {
    for (const { skill, items } of pools) {
      for (const it of choiceItems(items)) {
        expect(it.options, `${skill} ${it.itemId}`).toContain(it.correct);
      }
    }
  });

  it('gives every choice item at least two distinct options', () => {
    for (const { skill, items } of pools) {
      for (const it of choiceItems(items)) {
        expect(new Set(it.options.map(String)).size, `${skill} ${it.itemId}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never tags the correct answer as a misconception', () => {
    for (const { skill, items } of pools) {
      for (const it of items) {
        if (it.signature !== null) {
          expect(String(it.signature), `${skill} ${it.itemId}`).not.toBe(String(it.correct));
        }
      }
    }
  });

  it('keeps item ids unique within a skill', () => {
    for (const { skill, items } of pools) {
      expect(new Set(items.map(i => i.itemId)).size, skill).toBe(items.length);
    }
  });
});

describe('every skill can actually be mastered', () => {
  it('has enough ABSTRACT items to fill the mastery window', () => {
    // The mastery ledger counts abstract-layer answers only. A skill whose items
    // are all tagged pictorial can never graduate — she would practise it forever
    // with nothing to show. Geometry is the trap: every item has a figure, but the
    // figure IS the question, so those items must be abstract.
    for (const { skill, items } of pools) {
      const abstract = items.filter(i => i.cpaLayer === 'abstract').length;
      expect(abstract, `${skill} has only ${abstract} abstract items`).toBeGreaterThanOrEqual(MASTERY_ITEM_MINIMUM);
    }
  });
});

describe('a claimed misconception stays observable', () => {
  it('leaves enough items carrying each signature to diagnose it', () => {
    // buildItem drops a signature that collides with the correct answer. If a
    // skill's signature collided on EVERY item, the misconception would quietly
    // become undiagnosable — the engine could never see her make it.
    for (const { skill, items } of pools) {
      const codes = new Set(items.map(i => i.signatureCode).filter(Boolean));
      for (const code of codes) {
        const carrying = items.filter(i => i.signatureCode === code).length;
        expect(carrying, `${skill}: only ${carrying} items can show ${code}`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('two-way questions offer exactly the two things asked about', () => {
  it('never invents a number that is not in an "X or Y" question', () => {
    // 2026-09-19: "איזה מספר גדול יותר: 87,654 או 103,210?" offered 103,208 and
    // 103,211 as well — the numeric padding made up candidates the question
    // never mentioned, and printed them without commas.
    for (const { skill, items } of pools) {
      for (const it of choiceItems(items)) {
        if (!/ או /.test(it.question)) continue;
        const inQuestion = new Set((it.question.match(/[\d,]*\d(\/\d+)?/g) ?? []));
        for (const o of it.options) {
          const s = String(o);
          if (!/\d/.test(s) || /[<>=]/.test(s)) continue;   // words / full expressions
          // Every number offered must come from the question. An option may be a
          // phrase ("6 על 4"), so check the numbers inside it, not the whole string.
          for (const num of s.match(/[\d,]*\d(\/\d+)?/g) ?? []) {
            expect(inQuestion.has(num), `${skill} ${it.itemId}: option "${s}" offers ${num}, which is not in "${it.question}"`).toBe(true);
          }
        }
      }
    }
  });

  it('names a digit only when it appears once in the number', () => {
    // 2026-10-21: "מהו הערך של הספרה 3 במספר 139,139?" — two 3s, two right
    // answers (30,000 and 30), and the app accepted only one of them.
    for (const { skill, items } of pools) {
      for (const it of items) {
        const num = it.question.match(/במספר ([\d,]+)/)?.[1];
        if (!num) continue;
        const digits = num.replace(/,/g, '');
        for (const m of it.question.matchAll(/(?:הספרה|לספרה) (\d)(?!\d)/g)) {
          const count = digits.split('').filter(c => c === m[1]).length;
          expect(count, `${skill} ${it.itemId}: "${it.question}"`).toBe(1);
        }
      }
    }
  });

  it('never asks about parallel or perpendicular sides the eye cannot tell apart', () => {
    // 2026-10-27: a quadrilateral with sides 9° from parallel, asked "how many
    // pairs of parallel sides?" (answer 0). On a tablet they looked parallel.
    const CLEAR = 20;
    for (const { skill, items } of pools) {
      if (skill !== 'GEOM_PARALLEL_PERP') continue;
      for (const it of items) {
        const v = it.visual;
        if (!v || v.type !== 'polygon') continue;
        const P = v.points, n = P.length;
        const dir = (i: number) => {
          const a = P[i], b = P[(i + 1) % n];
          return ((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 180) % 180;
        };
        const sideIdx = (name: string) => v.labels!.findIndex((l, i) => l + v.labels![(i + 1) % n] === name);
        const between = (i: number, j: number) => { const d = Math.abs(dir(i) - dir(j)); return Math.min(d, 180 - d); };
        const pairs: Array<[number, number]> = [];
        if (it.itemId.startsWith('G_PP_COUNT')) {
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
        } else {
          const ref = v.highlightSides![0];
          for (let j = 0; j < n; j++) if (j !== ref) pairs.push([ref, j]);
        }
        const correctIdx = typeof it.correct === 'string' ? sideIdx(it.correct) : -1;
        for (const [i, j] of pairs) {
          const d = between(i, j);
          if (d < 0.6 || Math.abs(90 - d) < 0.6) continue;              // exactly parallel / perpendicular
          if (it.itemId.includes('_PERP')) {
            if (j !== correctIdx) expect(Math.abs(90 - d), `${it.itemId} sides ${i},${j}`).toBeGreaterThanOrEqual(CLEAR);
          } else {
            expect(d, `${it.itemId} sides ${i},${j}`).toBeGreaterThanOrEqual(CLEAR);
          }
        }
      }
    }
  });
});

