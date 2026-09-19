/**
 * Numbers booklet, units 5–6 (ה.ש.ב.ח.ה ד' "מספרים בתחום המיליון", pp. 50–70).
 *
 *   NUM_ORDER_LINE — סדר בין מספרים: reading a point on a number line from its
 *                    labelled ends, predecessor and successor across a 9/0
 *                    boundary, continuing a sequence with a constant step.
 *   NUM_ROUNDING   — עיגול מספרים: to tens, hundreds, thousands and ten-thousands.
 *                    The book teaches it on a number line, so the pictorial layer
 *                    here is exactly that line: the two candidate round numbers,
 *                    the halfway point, and her number marked between them.
 *
 * Range stays within 0 … 1,000,000 (grade-4 curriculum). No decimals.
 *
 * Only one signature here, ERR_ROUND_TRUNCATE (rounding by chopping). It is not
 * from the validated research catalogue; it is defined as the exact output of
 * "replace the lower digits with zeros", checked in tests, and only attached to
 * items that round UP — where chopping gives a different number. On round-down
 * items chopping happens to be correct, so no signature is claimed there.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── NUM_ORDER_LINE ──────────────────────────────────────────────────────────

const OL = 'NUM_ORDER_LINE';

function* successorPredecessor(): Generator<PracticeItem> {
  // Every case crosses at least one boundary — that is where the errors live.
  const succ = [9_999, 49_999, 99_999, 209_999, 359_099, 499_999, 70_909, 699_990, 999_999];
  const pred = [10_000, 100_000, 300_000, 180_100, 450_000, 1_000_000, 205_000, 60_010];
  for (const n of succ) {
    yield buildItem({
      itemId: `G_OL_SUCC_${n}`, skillCode: OL,
      question:   `מהו המספר העוקב ל-${fmt(n)}?`,
      correct:    n + 1, signature: null, signatureCode: null, distractors: [],
      cpaLayer:   'abstract', difficulty: n >= 99_999 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'המספר העוקב הוא המספר שבא מיד אחריו — מוסיפים 1.' },
        { text: 'כשמוסיפים 1 ל-9 מקבלים 10: כותבים 0 וממירים למקום הבא.' },
        { text: 'מה המספר העוקב?', answer: n + 1 },
      ],
    });
  }
  for (const n of pred) {
    yield buildItem({
      itemId: `G_OL_PRED_${n}`, skillCode: OL,
      question:   `מהו המספר הקודם ל-${fmt(n)}?`,
      correct:    n - 1, signature: null, signatureCode: null, distractors: [],
      cpaLayer:   'abstract', difficulty: n >= 100_000 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'המספר הקודם הוא המספר שבא מיד לפניו — מחסרים 1.' },
        { text: 'כשאין מה לחסר במקום האחדות, פורטים מהמקום הבא — אפסים הופכים ל-9.' },
        { text: 'מה המספר הקודם?', answer: n - 1 },
      ],
    });
  }
}

function* sequences(): Generator<PracticeItem> {
  // Constant-step sequences, rising and falling, across the whole range.
  const specs: Array<[number, number]> = [
    [45_000, 5_000], [120_000, 10_000], [300_000, 100_000], [7_500, 500],
    [98_000, 1_000], [250_000, 25_000], [640_000, -20_000], [1_000_000, -100_000],
    [55_500, -500], [83_000, 2_000], [199_000, 1_000], [400_000, -50_000],
  ];
  for (const [start, step] of specs) {
    const terms = [start, start + step, start + 2 * step];
    const next  = start + 3 * step;
    if (next < 0 || next > 1_000_000) continue;
    yield buildItem({
      itemId: `G_OL_SEQ_${start}_${step}`, skillCode: OL,
      question:   `המשיכי את הסדרה: ${terms.map(fmt).join(', ')}, ___`,
      correct:    next, signature: null, signatureCode: null, distractors: [],
      cpaLayer:   'abstract', difficulty: Math.abs(step) % 1000 === 0 ? 2 : 3,
      answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `בכמה משתנה כל מספר בסדרה? (${step > 0 ? 'עולה' : 'יורדת'})`, answer: Math.abs(step) },
        { text: `${step > 0 ? 'מוסיפים' : 'מחסרים'} ${fmt(Math.abs(step))} למספר האחרון:`, answer: next },
      ],
    });
  }
}

function* readTheLine(): Generator<PracticeItem> {
  // Only the two ends are labelled; the child works out the size of one step,
  // exactly the book's "השלמת מספרים על ישר המספרים על פי מספרים שמסומנים עליו".
  const lines: Array<[number, number, number]> = [
    [300_000, 400_000, 7], [0, 100_000, 4], [500_000, 600_000, 3],
    [20_000, 30_000, 6], [700_000, 800_000, 9], [0, 1_000_000, 8],
    [40_000, 50_000, 2], [150_000, 160_000, 5],
  ];
  for (const [min, max, k] of lines) {
    const step  = (max - min) / 10;
    const value = min + k * step;
    yield buildItem({
      itemId: `G_OL_LINE_${min}_${max}_${k}`, skillCode: OL,
      question:   'איזה מספר מסומן על ישר המספרים?',
      correct:    value, signature: null, signatureCode: null, distractors: [],
      visual:     { type: 'number_line', min, max, step, mark: value, markLabel: '?', labelValues: [min, max] },
      // The line IS the question, so this is abstract, not a scaffold.
      cpaLayer:   'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `כמה קפיצות שוות יש בין ${fmt(min)} ל-${fmt(max)}?`, answer: 10 },
        { text: 'כמה שווה כל קפיצה?', answer: step },
        { text: `הנקודה נמצאת ${k} קפיצות אחרי ${fmt(min)}. מה המספר?`, answer: value },
      ],
    });
  }
}

export function generateOrderLine(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...successorPredecessor(), ...sequences(), ...readTheLine()], opts);
}

// ─── NUM_ROUNDING ────────────────────────────────────────────────────────────

const RD = 'NUM_ROUNDING';

const PLACES: Array<{ unit: number; he: string; each: string }> = [
  { unit: 10,     he: 'לעשרות',       each: 'עשרת שלמה' },
  { unit: 100,    he: 'למאות',        each: 'מאה שלמה' },
  { unit: 1_000,  he: 'לאלפים',       each: 'אלף שלם' },
  { unit: 10_000, he: 'לעשרות אלפים', each: 'עשרת אלפים שלמה' },
];

/** Standard rounding, half up — what the book teaches. */
export function roundTo(n: number, unit: number): number {
  return Math.floor(n / unit + 0.5) * unit;
}

/** The truncation misconception: chop the lower digits. */
export function truncateTo(n: number, unit: number): number {
  return Math.floor(n / unit) * unit;
}

function* rounding(): Generator<PracticeItem> {
  const numbers = [
    4_738, 4_762, 3_970, 12_345, 12_355, 58_149, 58_650, 99_950,
    247_381, 247_819, 365_500, 604_082, 719_463, 849_999, 95_050, 7_415,
  ];
  for (const n of numbers) {
    for (const p of PLACES) {
      if (p.unit >= n) continue;                     // nothing to round
      const correct = roundTo(n, p.unit);
      const chopped = truncateTo(n, p.unit);
      const roundsUp = correct !== chopped;
      if (correct === n) continue;                   // already round — not a question
      const lower = chopped;
      const upper = chopped + p.unit;

      for (const pictorial of [false, true]) {
        yield buildItem({
          itemId:        `G_RD_${n}_${p.unit}${pictorial ? '_P' : ''}`,
          skillCode:     RD,
          question:      `עגלי את ${fmt(n)} ${p.he}.`,
          correct,
          signature:     roundsUp ? chopped : null,
          signatureCode: roundsUp ? 'ERR_ROUND_TRUNCATE' : null,
          distractors:   [],
          visual:        pictorial
            ? { type: 'number_line', min: lower, max: upper, step: p.unit / 10,
                mark: n, markLabel: fmt(n), labelValues: [lower, lower + p.unit / 2, upper] }
            : null,
          cpaLayer:      pictorial ? 'pictorial' : 'abstract',
          difficulty:    p.unit >= 1_000 ? 3 : 2,
          answerMode:    'keypad',
          rng:           () => 0.5,
          steps: [
            { text: `מהי ה${p.each} שמתחת ל-${fmt(n)}?`, answer: lower },
            { text: `ומהי ה${p.each} שמעליו?`, answer: upper },
            { text: `האמצע הוא ${fmt(lower + p.unit / 2)}. ${fmt(n)} ${n >= lower + p.unit / 2 ? 'באמצע או אחריו — מעגלים למעלה' : 'לפני האמצע — מעגלים למטה'}. התשובה:`, answer: correct },
          ],
        });
      }
    }
  }
}

export function generateRounding(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...rounding()], opts);
}
