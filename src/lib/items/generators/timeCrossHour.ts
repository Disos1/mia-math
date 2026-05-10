/**
 * MEAS_TIME_CROSS_HOUR — time arithmetic that crosses an hour boundary.
 *
 * Signature: format the result as h:NN where NN > 59 (e.g. 2:70 from 2:40+30).
 * Filler distractors: same hour (no advance), wrong-hour shift.
 *
 * Half the pool carries an analog_clock visual (pictorial), half is abstract.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'MEAS_TIME_CROSS_HOUR';

const ACTIONS = [
  'השיעור',
  'ההצגה',
  'הסרטון',
  'הארוחה',
  'האימון',
  'הטיול',
  'ההפסקה',
  'המשחק',
];

function fmt(h: number, m: number): string {
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function difficultyFor(elapsed: number): number {
  if (elapsed <= 20) return 1;
  if (elapsed <= 35) return 2;
  return 2;
}

function* enumerate(): Generator<PracticeItem> {
  for (let h = 1; h <= 11; h++) {
    for (const startM of [30, 35, 40, 45, 50, 55]) {
      for (const elapsed of [10, 15, 20, 25, 30, 35, 40, 45, 50]) {
        const totalM = startM + elapsed;
        if (totalM < 60) continue;          // must cross the hour
        if (totalM >= 120) continue;         // skip 2-hour rollovers (out of grade)
        const newH = h + 1;
        const newM = totalM - 60;

        for (let ai = 0; ai < ACTIONS.length; ai += 2) {
          const action  = ACTIONS[(h + ai) % ACTIONS.length];
          const correct = fmt(newH, newM);
          // Signature: didn't carry the hour — h:totalM (e.g. "2:70")
          const sig     = `${h}:${totalM.toString().padStart(2, '0')}`;
          const wrongHour = fmt(newH, totalM); // advanced hour but didn't subtract 60 from minutes
          const sameHour  = fmt(h, newM);      // subtracted 60 from minutes but didn't advance hour

          // Pictorial variant (with analog_clock visual)
          yield buildItem({
            itemId:        `G_TIME_${h}_${startM}_P_${elapsed}_PIC_${ai}`,
            skillCode:     SKILL,
            question:      `${action} מתחיל ב-${fmt(h, startM)} ונמשך ${elapsed} דקות. מתי הוא נגמר?`,
            correct,
            signature:     sig === correct ? null : sig,
            signatureCode: sig === correct ? null : 'ERR_UNIT_MISMATCH',
            distractors:   [wrongHour, sameHour].filter(x => x !== correct && x !== sig),
            visual:        { type: 'analog_clock', time: fmt(h, startM), elapsedMin: elapsed },
            cpaLayer:      'pictorial',
            difficulty:    difficultyFor(elapsed),
            rng:           () => 0.5,
          });

          // Abstract variant
          yield buildItem({
            itemId:        `G_TIME_${h}_${startM}_P_${elapsed}_ABS_${ai}`,
            skillCode:     SKILL,
            question:      `${action} מתחיל ב-${fmt(h, startM)} ונמשך ${elapsed} דקות. מתי הוא נגמר?`,
            correct,
            signature:     sig === correct ? null : sig,
            signatureCode: sig === correct ? null : 'ERR_UNIT_MISMATCH',
            distractors:   [wrongHour, sameHour].filter(x => x !== correct && x !== sig),
            cpaLayer:      'abstract',
            difficulty:    Math.min(3, difficultyFor(elapsed) + 1),
            rng:           () => 0.5,
          });
        }
      }
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
