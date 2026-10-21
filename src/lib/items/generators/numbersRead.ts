/**
 * NUM_READ_WRITE — numbers booklet topics 1–2: reading and writing numbers to
 * a million, in words and in digits, the place-value "house" (בית המספרים),
 * and the decimal structure (מבנה עשרוני).
 *
 * Added 2026-10-21 from her class's lesson log: the class spent five weeks
 * here, and the app had five hand-written questions for it. Everything below
 * is swept; the words come from numberWords(), never typed by hand.
 *
 * Signature ERR_ZERO_PLACEHOLDER: writing the groups as they are heard, without
 * the zeros that hold empty places — "ארבע מאות וחמישה אלף ושבעים" → 40,570.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { numberWords } from './numberWords';

const SKILL = 'NUM_READ_WRITE';
const fmt = (n: number) => n.toLocaleString('en-US');

const PLACE = ['האחדות', 'העשרות', 'המאות', 'האלפים', 'עשרות האלפים', 'מאות האלפים'];
const digitAt = (n: number, pow: number) => Math.floor(n / 10 ** pow) % 10;

/** Six- and five-digit numbers with empty places, swept from bases and zero masks. */
function* numbers(): Generator<number> {
  const seen = new Set<number>();
  for (let base = 123_456; base <= 987_654; base += 41_113) {
    for (const mask of [0, 0b00010, 0b00100, 0b01000, 0b10000, 0b00101, 0b01010, 0b10010, 0b01100, 0b10101, 0b00011]) {
      let n = base;
      for (let pos = 0; pos < 5; pos++) if (mask & (1 << pos)) n -= digitAt(n, pos) * 10 ** pos;
      for (const v of [n, n % 100_000]) {
        if (v < 10_000 || seen.has(v)) continue;
        seen.add(v);
        yield v;
      }
    }
  }
}

/** The number as heard group by group, without the empty-place zeros. */
function writtenAsHeard(n: number): number | null {
  const t = Math.floor(n / 1000), r = n % 1000;
  if (t === 0 || r >= 100) return null;
  const heard = Number(`${t}${r === 0 ? '' : r}`);
  return heard !== n ? heard : null;
}

function* items(): Generator<PracticeItem> {
  for (const n of numbers()) {
    const words = numberWords(n);
    const heard = writtenAsHeard(n);

    // Words → digits.
    yield buildItem({
      itemId: `G_RW_DIGITS_${n}`, skillCode: SKILL,
      question: `כתבי בספרות: ${words}`,
      correct: n,
      signature: heard, signatureCode: heard !== null ? 'ERR_ZERO_PLACEHOLDER' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: heard !== null ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'קודם האלפים: כמה אלפים יש?', answer: Math.floor(n / 1000) },
        { text: 'ואחריהם שלוש ספרות בדיוק — מאות, עשרות, אחדות. מקום ריק מקבל 0.', answer: n % 1000 },
        { text: 'מה המספר המלא?', answer: n },
      ],
    });

    // Digits → words: the wrong options are real misreadings of the same digits.
    const others = [...new Set([heard, swapZero(n, -1), swapZero(n, 1)]
      .filter((x): x is number => x !== null && x !== n && x >= 1 && x <= 999_999))];
    if (others.length >= 1) {
      yield buildItem({
        itemId: `G_RW_WORDS_${n}`, skillCode: SKILL,
        question: `איך קוראים את המספר ${fmt(n)}?`,
        correct: words, signature: heard !== null ? numberWords(heard) : null,
        signatureCode: heard !== null ? 'ERR_ZERO_PLACEHOLDER' : null,
        distractors: others.map(numberWords), exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `קוראים קודם את מה שלפני הפסיק — ${fmt(Math.floor(n / 1000))} — ומוסיפים "אלף".` },
          { text: `אחר כך את שלוש הספרות שאחרי הפסיק: ${String(n % 1000).padStart(3, '0')}.` },
        ],
      });
    }

    // Expanded form, both ways (מבנה עשרוני).
    const parts = [5, 4, 3, 2, 1, 0].map(p => digitAt(n, p) * 10 ** p).filter(v => v > 0);
    const concat = Number(parts.map(v => String(v).replace(/0+$/, '')).join(''));
    yield buildItem({
      itemId: `G_RW_EXP_${n}`, skillCode: SKILL,
      question: `כמה זה ${parts.map(fmt).join(' + ')}?`,
      correct: n,
      signature: parts.length < String(n).length && concat !== n ? concat : null,
      signatureCode: parts.length < String(n).length && concat !== n ? 'ERR_ZERO_PLACEHOLDER' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'כל מחובר יושב במקום שלו. מקום שאין לו מחובר מקבל 0.' },
        { text: 'מה המספר?', answer: n },
      ],
    });
    if (parts.length >= 3) {
      const k = 1 + (n % (parts.length - 1));                  // hide one middle part
      const hidden = parts[k];
      const shown = parts.map((v, i) => (i === k ? '?' : fmt(v))).join(' + ');
      yield buildItem({
        itemId: `G_RW_EXPMISS_${n}`, skillCode: SKILL,
        question: `${fmt(n)} = ${shown}. מה המספר החסר?`,
        correct: hidden,
        signature: String(hidden)[0] !== String(hidden) ? Number(String(hidden)[0]) : null,
        signatureCode: String(hidden)[0] !== String(hidden) ? 'ERR_DIGIT_FOR_VALUE' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'איזה מקום חסר בפירוק? הספרה שבו שווה לפי המקום שלה.' },
          { text: 'מה הערך החסר?', answer: hidden },
        ],
      });
    }

    // The place of a digit (בית המספרים) — asked only about a digit that appears once.
    const s = String(n);
    const pos = [...s].findIndex(c => c !== '0' && s.split(c).length === 2);
    if (pos >= 0) {
      const pow = s.length - 1 - pos;
      yield buildItem({
        itemId: `G_RW_PLACE_${n}`, skillCode: SKILL,
        question: `באיזה מקום נמצאת הספרה ${s[pos]} במספר ${fmt(n)}?`,
        correct: `במקום ${PLACE[pow]}`, signature: null, signatureCode: null,
        distractors: [pow - 1, pow + 1, pow + 2].filter(p => p >= 0 && p < 6).map(p => `במקום ${PLACE[p]}`),
        exactOptions: true, cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [{ text: 'סופרים מימין: אחדות, עשרות, מאות — ואחרי הפסיק אלפים, עשרות אלפים, מאות אלפים.' }],
      });
    }

    // How many whole hundreds / thousands.
    // One per number, alternating hundreds and thousands, so this kind does not crowd the rest.
    for (const [pow, unit, whole] of ([[2, 'מאות', 'שלמות'], [3, 'אלפים', 'שלמים']] as const).filter((_, i) => i === n % 2)) {
      const count = Math.floor(n / 10 ** pow);
      const digit = digitAt(n, pow);
      yield buildItem({
        itemId: `G_RW_COUNT_${n}_${pow}`, skillCode: SKILL,
        question: `כמה ${unit} ${whole} יש במספר ${fmt(n)}?`,
        correct: count,
        // Reading only the digit in that place, instead of everything above it.
        signature: digit !== count ? digit : null, signatureCode: null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `ה${unit} כוללות גם את מה שמשמאל להן: מכסים את ${pow} הספרות הימניות ומה שנשאר הוא התשובה.` },
          { text: `כמה ${unit}?`, answer: count },
        ],
      });
    }
  }
}

/** Move one empty place left (−1) or right (+1): 405,070 → 450,070 or 405,700 —
 *  the same digits, misplaced. */
function swapZero(n: number, dir: -1 | 1): number | null {
  const s = String(n).split('');
  const i = s.findIndex((c, k) => c === '0' && s[k + dir] !== undefined && s[k + dir] !== '0');
  if (i < 0) return null;
  [s[i + dir], s[i]] = [s[i], s[i + dir]];
  return s[0] === '0' ? null : Number(s.join(''));
}

export const generateReadWrite = (o: GenerateOpts) => pickFromCombos([...items()], o);
