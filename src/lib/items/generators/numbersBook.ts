/**
 * Numbers book — ה.ש.ב.ח.ה ד' "מספרים בתחום המיליון": the topics that had no
 * skill of their own until 2026-10-18. Each generator cites its topic and the
 * skills the publisher's plan lists for it.
 *
 *   NUM_DIGIT_CARDS     — topic 3: build the largest / smallest number from digit
 *                         cards, and what swapping two digits does to a number.
 *   NUM_COMPARE         — topic 4: > < = with full expressions, a missing digit
 *                         that makes the comparison true, and ordering.
 *   NUM_ADD_LARGE       — topic 7: addition to 1,000,000, estimating sums, a
 *                         missing addend.
 *   NUM_CHANGE_EFFECT   — topic 10: what changing one part of an addition or a
 *                         subtraction does to its result.
 *   DATA_CHANCE_COMPARE — topic 16: which of two events is more likely,
 *                         "סביר יותר ש…".
 *
 * Ordering items never put a LIST of large numbers on a button. The comma that
 * groups digits and the comma that separates numbers are the same character, so
 * "345,210, 354,120" reads as four numbers (the bug Dima photographed). They ask
 * for one number instead — the smallest, the second largest.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { carries } from './numbersOps';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Arrange digits into the biggest / smallest number, no leading zero. */
function largestOf(digits: number[]): number {
  return Number([...digits].sort((a, b) => b - a).join(''));
}
function smallestOf(digits: number[]): number {
  const sorted = [...digits].sort((a, b) => a - b);
  const firstNonZero = sorted.findIndex(d => d !== 0);
  const lead = sorted.splice(firstNonZero, 1)[0];
  return Number([lead, ...sorted].join(''));
}

// ─── NUM_DIGIT_CARDS — topic 3 ──────────────────────────────────────────────

const DC = 'NUM_DIGIT_CARDS';

function* digitCards(): Generator<PracticeItem> {
  // Sets of five or six distinct digit cards, swept over the combinations of
  // 0–9 (every 7th of them, so about a third include 0, which may not lead).
  // The cards are shown shuffled — sorted cards would hand her the answer.
  const sets: number[][] = [];
  const combos = (k: number, from = 0, acc: number[] = []): void => {
    if (acc.length === k) { sets.push([...acc]); return; }
    for (let d = from; d <= 9; d++) combos(k, d + 1, [...acc, d]);
  };
  combos(5); combos(6);
  for (let c = 0; c < sets.length; c += 7) {
    const sorted = sets[c];
    const rot = c % sorted.length;
    const digits = [...sorted.slice(rot), ...sorted.slice(0, rot)];
    if (c % 2 === 1) digits.reverse();
    const cards = digits.join(', ');
    const big = largestOf(digits), small = smallestOf(digits);
    const naiveSmall = Number([...digits].sort((a, b) => a - b).join(''));   // leading 0 kept

    yield buildItem({
      itemId: `G_DC_BIG_${digits.join('')}`, skillCode: DC,
      question: `מהכרטיסים ${cards} בונים מספר שבו כל כרטיס פעם אחת. מהו המספר הגדול ביותר?`,
      correct: big, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'כדי לקבל את המספר הגדול ביותר, שמים את הספרה הגדולה ביותר במקום הגבוה ביותר.' },
        { text: 'מסדרים מהגדולה לקטנה:', answer: big },
      ],
    });

    yield buildItem({
      itemId: `G_DC_SMALL_${digits.join('')}`, skillCode: DC,
      question: `מהכרטיסים ${cards} בונים מספר שבו כל כרטיס פעם אחת. מהו המספר הקטן ביותר?`,
      correct: small,
      // Putting 0 first makes a number with one digit fewer — not allowed.
      signature: digits.includes(0) && naiveSmall !== small ? naiveSmall : null,
      signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: digits.includes(0) ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'מסדרים מהקטנה לגדולה — אבל מספר לא מתחיל ב-0.' },
        ...(digits.includes(0) ? [{ text: 'לכן הספרה הראשונה היא הקטנה ביותר שאינה 0, ואחריה ה-0.' }] : []),
        { text: 'המספר הקטן ביותר:', answer: small },
      ],
    });
  }

  // Swapping two digits — what happens to the number, and by how much.
  for (let n = 102_345; n <= 987_654; n += 31_337) {
    const s = String(n).split('').map(Number);
    for (const [i, j] of [[4, 5], [0, 1], [2, 3]] as const) {
      if (s[i] === s[j]) continue;
      // Each named digit must appear once, or "swap the 9 and the 3" is ambiguous.
      if (s.filter(x => x === s[i]).length > 1 || s.filter(x => x === s[j]).length > 1) continue;
      const t = [...s]; [t[i], t[j]] = [t[j], t[i]];
      const m = Number(t.join(''));
      if (String(m).length !== 6) continue;
      yield buildItem({
        itemId: `G_DC_SWAP_${n}_${i}${j}`, skillCode: DC,
        question: `במספר ${fmt(n)} מחליפים בין הספרה ${s[i]} לספרה ${s[j]}. האם המספר גדל או קטן?`,
        correct: m > n ? 'גדל' : 'קטן',
        signature: null, signatureCode: null,
        distractors: [m > n ? 'קטן' : 'גדל', 'לא משתנה'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `המספר החדש: ${fmt(m)}.` },
          { text: `הספרה במקום הגבוה מבין השתיים קובעת: ${fmt(m)} ${m > n ? '>' : '<'} ${fmt(n)}.` },
        ],
      });
    }
  }

  // Changing one digit — by how much does the number change? (Class, 18/10:
  // "שינוי ערך ספרה במספר".) Answering the difference of the digits, ignoring
  // their place, is the digit-for-value slip.
  for (let n = 104_352; n <= 987_654; n += 29_311) {
    const s = String(n);
    for (let pos = 0; pos < 5; pos++) {
      const d = Number(s[pos]);
      if (s.split(s[pos]).length !== 2) continue;          // the digit must appear once
      const e = (d + 3 + pos * 2) % 10;
      if (e === d || (pos === 0 && e === 0)) continue;
      const pow = s.length - 1 - pos;
      const delta = (e - d) * 10 ** pow;
      const up = delta > 0;
      yield buildItem({
        itemId: `G_DC_CHANGE_${n}_${pos}`, skillCode: DC,
        question: `במספר ${fmt(n)} כותבים ${e} במקום הספרה ${d}. בכמה ${up ? 'גדל' : 'קטן'} המספר?`,
        correct: Math.abs(delta), signature: Math.abs(e - d), signatureCode: 'ERR_DIGIT_FOR_VALUE',
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `הספרה ${d} נמצאת במקום ששווה ${fmt(10 ** pow)}.` },
          { text: `היא ${up ? 'גדלה' : 'קטנה'} ב-${Math.abs(e - d)}, אז המספר ${up ? 'גדל' : 'קטן'} ב-${Math.abs(e - d)} × ${fmt(10 ** pow)}:`, answer: Math.abs(delta) },
        ],
      });
    }
  }
}

// ─── NUM_COMPARE — topic 4 ──────────────────────────────────────────────────

const CP = 'NUM_COMPARE';

function* compare(): Generator<PracticeItem> {
  // Is the comparison true? Full expressions only — a lone ">" on a button is
  // bidi-mirrored and reads as its opposite.
  for (let a = 10_234; a <= 990_000; a += 61_117) {
    for (const delta of [1, 9, 90, 900, 9_000, -1, -90, -9_000]) {
      const b = a + delta;
      if (b <= 0 || b >= 1_000_000) continue;
      for (const sign of ['>', '<'] as const) {
        if ((a + delta) % 3 !== 0 && sign === '<') continue;    // keep the pool balanced
        const truth = sign === '>' ? a > b : a < b;
        yield buildItem({
          itemId: `G_CP_TRUE_${a}_${b}_${sign === '>' ? 'G' : 'L'}`, skillCode: CP,
          question: `האם הביטוי נכון? ${fmt(a)} ${sign} ${fmt(b)}`,
          correct: truth ? 'נכון' : 'לא נכון', signature: null, signatureCode: null,
          distractors: [truth ? 'לא נכון' : 'נכון'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: Math.abs(delta) < 10 ? 3 : 2, rng: () => 0.5,
          steps: [
            { text: 'משווים ספרה-ספרה משמאל, מהמקום הגבוה, עד שמגיעים לספרות שונות.' },
            { text: `${fmt(Math.max(a, b))} הוא הגדול, ולכן הביטוי ${truth ? 'נכון' : 'לא נכון'}.` },
          ],
        });
      }
    }
  }

  // A missing digit that makes the number bigger. Phrased in words: a "?"
  // inside a comparison breaks bidi isolation, and the expression would reach
  // her reordered. "■" sitting between digits stays in place.
  for (let n = 120_000; n <= 980_000; n += 23_000) {
    const digits = String(n).split('');
    for (const pos of [1, 2]) {
      const target = Number(digits[pos]);
      if (target === 0 || target === 9) continue;
      const shown = fmt(n).replace(/\d/g, (ch, at, str) => {
        const idx = str.slice(0, at).replace(/,/g, '').length;
        return idx === pos ? '■' : ch;
      });
      const right = String(target + 1);
      const wrong = [...new Set([String(target - 1), String(Math.max(0, target - 2))])].filter(w => w !== right);
      yield buildItem({
        itemId: `G_CP_MISS_${n}_${pos}`, skillCode: CP,
        question: `איזו ספרה כדאי לכתוב במקום ■ כדי שהמספר ${shown} יהיה גדול מ-${fmt(n)}?`,
        correct: right, signature: null, signatureCode: null,
        distractors: wrong, exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: 'הספרות שלפני ■ זהות בשני המספרים, אז הספרה במקום ■ היא שקובעת.' },
          { text: `צריך ספרה גדולה מ-${target}, למשל ${right}.` },
        ],
      });
    }
  }

  // Ordering — asked as ONE number, never as a list on a button.
  for (let base = 201_000; base <= 960_000; base += 37_000) {
    const set = [base + 4_500, base + 45_000, base + 450, base + 54_000];
    const sorted = [...set].sort((x, y) => x - y);
    for (const [k, label] of [[0, 'איזה מהמספרים הוא הקטן ביותר?'], [3, 'איזה מהמספרים הוא הגדול ביותר?'],
                                     [1, 'מסדרים את המספרים מהקטן לגדול. איזה מספר יהיה שני?']] as const) {
      yield buildItem({
        itemId: `G_CP_ORDER_${base}_${k}`, skillCode: CP,
        question: label,
        correct: fmt(sorted[k]), signature: null, signatureCode: null,
        distractors: set.filter(x => x !== sorted[k]).map(fmt), exactOptions: true,
        cpaLayer: 'abstract', difficulty: k === 1 ? 3 : 2, rng: () => 0.5,
        steps: [
          { text: 'משווים את הספרות משמאל לימין, מקום אחרי מקום.' },
          { text: `לפי הסדר מהקטן לגדול: ${sorted.map(fmt).join(' ← ')}.` },
        ],
      });
    }
  }
}

// ─── NUM_ADD_LARGE — topic 7 ────────────────────────────────────────────────

const AD = 'NUM_ADD_LARGE';

function* addLarge(): Generator<PracticeItem> {
  for (let a = 3_150; a <= 620_000; a += 24_137) {
    for (let b = 1_420; b <= 330_000; b += 28_311) {
      if (a + b > 999_999 || !carries(a, b)) continue;
      yield buildItem({
        itemId: `G_AD_${a}_${b}`, skillCode: AD,
        question: `כמה זה ${fmt(a)} + ${fmt(b)}?`,
        correct: a + b, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: a + b >= 100_000 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מחברים במאונך מימין לשמאל: אחדות, עשרות, מאות — וכל עשר עוברות למקום הבא.' },
          { text: `${fmt(a)} + ${fmt(b)} = ?`, answer: a + b },
        ],
      });
    }
  }

  // Missing addend.
  for (let a = 4_500; a <= 540_000; a += 41_137) {
    for (let b = 2_300; b <= 260_000; b += 47_311) {
      if (a + b > 999_999 || !carries(a, b)) continue;
      yield buildItem({
        itemId: `G_AD_MISS_${a}_${b}`, skillCode: AD,
        question: `${fmt(a)} + ? = ${fmt(a + b)}. מה המחובר החסר?`,
        correct: b, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מחובר חסר מוצאים בחיסור: הסכום פחות המחובר הידוע.' },
          { text: `${fmt(a + b)} − ${fmt(a)} = ?`, answer: b },
        ],
      });
    }
  }

  // Estimating a sum — round to thousands first.
  for (let a = 12_480; a <= 590_000; a += 37_211) {
    for (let b = 9_730; b <= 380_000; b += 53_117) {
      const ra = Math.round(a / 1_000) * 1_000, rb = Math.round(b / 1_000) * 1_000;
      const est = ra + rb;
      if (est > 999_999) continue;
      yield buildItem({
        itemId: `G_AD_EST_${a}_${b}`, skillCode: AD,
        question: `בערך כמה זה ${fmt(a)} + ${fmt(b)}? (עגלי לאלפים)`,
        correct: fmt(est), signature: fmt(est + 10_000), signatureCode: null,
        distractors: [fmt(Math.max(1_000, est - 10_000))], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `${fmt(a)} בערך ${fmt(ra)}, ו-${fmt(b)} בערך ${fmt(rb)}.` },
          { text: `${fmt(ra)} + ${fmt(rb)} = ${fmt(est)}.` },
        ],
      });
    }
  }
}

// ─── NUM_CHANGE_EFFECT — topic 10 ───────────────────────────────────────────

const CE = 'NUM_CHANGE_EFFECT';

function* changeEffect(): Generator<PracticeItem> {
  for (const d of [10, 100, 1_000, 10_000]) {
    for (let a = 3_400; a <= 180_000; a += 23_137) {
      for (let b = 2_100; b <= 70_000; b += 31_311) {
        if (a + b > 999_999 || b >= a) continue;
        yield buildItem({
          itemId: `G_CE_ADDUP_${a}_${b}_${d}`, skillCode: CE,
          question: `בתרגיל ${fmt(a)} + ${fmt(b)} הגדילו את המחובר הראשון ב-${fmt(d)}. מה קורה לסכום?`,
          correct: `גדל ב-${fmt(d)}`, signature: 'לא משתנה', signatureCode: null,
          distractors: [`קטן ב-${fmt(d)}`, `גדל ב-${fmt(d * 2)}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: 'הסכום הוא כמה יש בסך הכול.' },
            { text: `הוסיפו ${fmt(d)} לאחד המחוברים — בסך הכול יש ${fmt(d)} יותר.` },
          ],
        });
        yield buildItem({
          itemId: `G_CE_SUBUP_${a}_${b}_${d}`, skillCode: CE,
          question: `בתרגיל ${fmt(a)} − ${fmt(b)} הגדילו את המחסר ב-${fmt(d)}. מה קורה להפרש?`,
          correct: `קטן ב-${fmt(d)}`, signature: `גדל ב-${fmt(d)}`, signatureCode: null,
          distractors: ['לא משתנה'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: 'המחסר הוא מה שמורידים.' },
            { text: `מורידים ${fmt(d)} יותר — נשאר ${fmt(d)} פחות.` },
          ],
        });
        yield buildItem({
          itemId: `G_CE_MINUP_${a}_${b}_${d}`, skillCode: CE,
          question: `בתרגיל ${fmt(a)} − ${fmt(b)} הגדילו את המחוסר ב-${fmt(d)}. מה קורה להפרש?`,
          correct: `גדל ב-${fmt(d)}`, signature: `קטן ב-${fmt(d)}`, signatureCode: null,
          distractors: ['לא משתנה'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: 'המחוסר הוא המספר שממנו מורידים.' },
            { text: `יש ממנו ${fmt(d)} יותר, ומורידים אותו דבר — נשאר ${fmt(d)} יותר.` },
          ],
        });
      }
    }
  }

  // Keeping the sum: add to one addend, take the same from the other —
  // 398 + 245 = 400 + 243.
  // Thinner than the other kinds on purpose: the pool is drawn uniformly, and
  // a full sweep here would crowd the three change questions out of a session.
  for (let hundreds = 2; hundreds <= 980; hundreds += 89) {
    for (const gap of [1, 2, 5]) {
      const a = hundreds * 100 - gap;
      for (let b = 245 + (hundreds % 7) * 111; b <= 9_999; b += 4_000) {
        yield buildItem({
          itemId: `G_CE_KEEP_${a}_${b}`, skillCode: CE,
          question: `${fmt(a)} + ${fmt(b)} = ${fmt(a + gap)} + ?`,
          correct: b - gap, signature: b + gap, signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `למחובר הראשון הוסיפו ${gap}.` },
            { text: `כדי שהסכום לא ישתנה, מורידים ${gap} מהמחובר השני: ${fmt(b)} − ${gap} = ?`, answer: b - gap },
          ],
        });
      }
    }
  }
}

// ─── DATA_CHANCE_COMPARE — topic 16 ─────────────────────────────────────────

const CC = 'DATA_CHANCE_COMPARE';

function* chanceCompare(): Generator<PracticeItem> {
  // Two colours in a box — count, do not guess.
  for (let red = 1; red <= 12; red++) {
    for (let blue = 1; blue <= 12; blue++) {
      const same = red === blue;
      const answer = same ? 'הסיכוי שווה' : red > blue ? 'אדום' : 'כחול';
      yield buildItem({
        itemId: `G_CC_BOX_${red}_${blue}`, skillCode: CC,
        question: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. מוציאים כדור בלי להסתכל. איזה צבע סביר יותר להוציא?`,
        correct: answer, signature: same ? null : red > blue ? 'כחול' : 'אדום', signatureCode: null,
        distractors: same ? ['אדום', 'כחול'] : ['הסיכוי שווה'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: same ? 3 : Math.abs(red - blue) <= 2 ? 2 : 1, rng: () => 0.5,
        steps: [
          { text: 'סופרים כמה יש מכל צבע — ממה שיש יותר, יש סיכוי גדול יותר.' },
          { text: `אדום: ${red}, כחול: ${blue}. התשובה: ${answer}.` },
        ],
      });
    }
  }

  // A die: which of two events is more likely? Counted from the six faces.
  const events: Array<[string, number[]]> = [
    ['מספר זוגי', [2, 4, 6]], ['מספר אי-זוגי', [1, 3, 5]], ['המספר 6', [6]],
    ['מספר גדול מ-4', [5, 6]], ['מספר קטן מ-3', [1, 2]], ['מספר גדול מ-1', [2, 3, 4, 5, 6]],
    ['המספר 1 או 2', [1, 2]], ['מספר שמתחלק ב-3', [3, 6]],
  ];
  for (let i = 0; i < events.length; i++) {
    for (let j = 0; j < events.length; j++) {
      if (i === j) continue;
      const [na, fa] = events[i], [nb, fb] = events[j];
      const answer = fa.length === fb.length ? 'הסיכוי שווה' : fa.length > fb.length ? na : nb;
      yield buildItem({
        itemId: `G_CC_DIE_${i}_${j}`, skillCode: CC,
        question: `מטילים קובייה רגילה. מה סביר יותר — ${na} או ${nb}?`,
        correct: answer, signature: null, signatureCode: null,
        distractors: [na, nb, 'הסיכוי שווה'].filter(x => x !== answer), exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `${na}: ${fa.length} ${fa.length === 1 ? 'אפשרות' : 'אפשרויות'} (${fa.join(', ')}).` },
          { text: `${nb}: ${fb.length} ${fb.length === 1 ? 'אפשרות' : 'אפשרויות'} (${fb.join(', ')}).` },
          { text: `התשובה: ${answer}.` },
        ],
      });
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateDigitCards    = (o: GenerateOpts) => take(digitCards(), o);
export const generateCompare       = (o: GenerateOpts) => take(compare(), o);
export const generateAddLarge      = (o: GenerateOpts) => take(addLarge(), o);
export const generateChangeEffect  = (o: GenerateOpts) => take(changeEffect(), o);
export const generateChanceCompare = (o: GenerateOpts) => take(chanceCompare(), o);
