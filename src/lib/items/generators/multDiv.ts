/**
 * Multiplication & division book — ה.ש.ב.ח.ה ד' "כפל וחילוק", all 20 topics.
 *
 * Built from the publisher's plan, which lists for every sub-topic the skills
 * the child is expected to acquire (מיומנויות נרכשות). Each generator below
 * names the topic and the skills it covers. Two facts from that plan decided
 * more than anything else:
 *
 *   • Remainders first appear in topic 14 (long division A). Topic 13 — also
 *     called "חילוק במחלק חד-ספרתי" — is EXACT division by splitting the
 *     dividend (84 ÷ 4 = 80 ÷ 4 + 4 ÷ 4). The app used to put remainders there,
 *     a full topic before her class meets them.
 *   • Topic 3's "single-digit divisor" means dividing whole tens, hundreds and
 *     thousands (2,400 ÷ 6), not two- or three-digit numbers.
 *
 * Grade-4 limits from the validated research, kept literally: divisors are a
 * single digit or a whole ten/hundred; remainders are whole numbers written
 * with שארית, never decimals or fractions.
 *
 * Parameters are swept, never hand-listed (see poolSize.test.ts). Signatures
 * are deterministic outputs of a named faulty rule; the four new ones
 * (ERR_ZERO_IDENTITY, ERR_CROSS_TERMS, ERR_POWER_AS_PRODUCT,
 * ERR_REMAINDER_IGNORED) are defined that way, not taken from the catalogue.
 */

import type { PracticeItem, WorkedStep } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const fmt = (n: number) => n.toLocaleString('en-US');
const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 2 and 3 → "2³". */
export const pow = (base: number, exp: number) => `${base}${String(exp).split('').map(d => SUP[d]).join('')}`;
const zeros = (scale: number) => String(scale).length - 1;

// ─── 1. MULT_BY_10_100_1000 — כפל ב-10, ב-100 וב-1,000 ─────────────────────

const M10 = 'MULT_BY_10_100_1000';

function* multBy10(): Generator<PracticeItem> {
  for (let a = 3; a <= 990; a += 13) {
    for (const scale of [10, 100, 1_000]) {
      const p = a * scale;
      if (p > 1_000_000) continue;
      const short = a * (scale / 10);           // one zero short
      yield buildItem({
        itemId: `G_M10_${a}_${scale}`, skillCode: M10,
        question: `כמה זה ${a} × ${fmt(scale)}?`,
        correct: p,
        signature: scale > 10 ? short : null,
        signatureCode: scale > 10 ? 'ERR_ZERO_COUNT' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: scale === 10 ? 1 : 2,
        answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `כופלים ב-${fmt(scale)}: כל ספרה זזה ${zeros(scale)} ${zeros(scale) === 1 ? 'מקום' : 'מקומות'} שמאלה, ובמקומות שהתפנו כותבים אפסים.` },
          { text: `${a} × ${fmt(scale)} = ?`, answer: p },
        ],
      });

      if (a % 3 === 0) {
        yield buildItem({
          itemId: `G_M10_MISS_${a}_${scale}`, skillCode: M10,
          question: `${a} × ? = ${fmt(p)}. בכמה כפלו?`,
          correct: fmt(scale),
          signature: fmt(scale === 10 ? 100 : scale / 10), signatureCode: 'ERR_ZERO_COUNT',
          distractors: [fmt(scale === 1_000 ? 100 : 1_000)], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: `סופרים כמה אפסים נוספו ל-${a}: ${zeros(scale)}.` },
            { text: `${zeros(scale)} אפסים — כפלו ב-${fmt(scale)}.` },
          ],
        });
      }
    }
  }
}

// ─── 2. MULT_BY_TENS — כפל בעשרות, במאות ובאלפים שלמים ─────────────────────

const MT = 'MULT_BY_TENS';

function* multByTens(): Generator<PracticeItem> {
  // Built on the times tables within 100, as the book says.
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      for (const scale of [10, 100, 1_000]) {
        const p = a * b * scale;
        yield buildItem({
          itemId: `G_MT_MUL_${a}_${b * scale}`, skillCode: MT,
          question: `כמה זה ${a} × ${fmt(b * scale)}?`,
          correct: p,
          signature: a * b * (scale / 10),        // one zero short
          signatureCode: 'ERR_ZERO_COUNT',
          distractors: [], cpaLayer: 'abstract',
          difficulty: scale === 10 ? 1 : scale === 100 ? 2 : 3,
          answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `קודם עובדת הכפל: ${a} × ${b} = ?`, answer: a * b },
            { text: `ואז כופלים ב-${fmt(scale)}: מוסיפים ${zeros(scale)} ${zeros(scale) === 1 ? 'אפס' : 'אפסים'}.`, answer: p },
          ],
        });
      }
      // Both factors whole tens: 30 × 40, 20 × 300.
      for (const [sa, sb] of [[10, 10], [10, 100], [100, 10]] as const) {
        const p = a * sa * b * sb;
        if (p > 1_000_000) continue;
        yield buildItem({
          itemId: `G_MT_BOTH_${a * sa}_${b * sb}`, skillCode: MT,
          question: `כמה זה ${fmt(a * sa)} × ${fmt(b * sb)}?`,
          correct: p,
          signature: p / 10, signatureCode: 'ERR_ZERO_COUNT',
          distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `${a} × ${b} = ?`, answer: a * b },
            { text: `סופרים את כל האפסים בשני הגורמים: ${zeros(sa) + zeros(sb)}, ומוסיפים אותם.`, answer: p },
          ],
        });
      }
    }
  }
}

// ─── 3. DIV_TENS_BY_DIGIT — חילוק במחלק חד-ספרתי, ב-10, ב-100 וב-1,000 ─────

const DT = 'DIV_TENS_BY_DIGIT';

function* divTensByDigit(): Generator<PracticeItem> {
  // Whole tens / hundreds / thousands divided by a single digit, via the facts.
  for (let d = 2; d <= 9; d++) {
    for (let q = 2; q <= 9; q++) {
      for (const scale of [10, 100, 1_000]) {
        const n = d * q * scale;
        yield buildItem({
          itemId: `G_DT_${n}_${d}`, skillCode: DT,
          question: `כמה זה ${fmt(n)} ÷ ${d}?`,
          correct: q * scale,
          signature: q * (scale / 10), signatureCode: 'ERR_ZERO_COUNT',
          distractors: [], cpaLayer: 'abstract', difficulty: scale === 10 ? 1 : 2,
          answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `${fmt(n)} הם ${d * q} ${scale === 10 ? 'עשרות' : scale === 100 ? 'מאות' : 'אלפים'}.` },
            { text: `${d * q} ÷ ${d} = ?`, answer: q },
            { text: `אז התוצאה היא ${q} ${scale === 10 ? 'עשרות' : scale === 100 ? 'מאות' : 'אלפים'}:`, answer: q * scale },
          ],
        });
      }
    }
  }

  // Dividing by 10, 100 and 1,000 — the quotient is that many times smaller.
  for (let a = 4; a <= 990; a += 17) {
    for (const scale of [10, 100, 1_000]) {
      const n = a * scale;
      if (n > 1_000_000) continue;
      yield buildItem({
        itemId: `G_DT_TEN_${n}_${scale}`, skillCode: DT,
        question: `כמה זה ${fmt(n)} ÷ ${fmt(scale)}?`,
        correct: a,
        signature: scale > 10 ? a * 10 : null, signatureCode: scale > 10 ? 'ERR_ZERO_COUNT' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `מחלקים ב-${fmt(scale)}: מורידים ${zeros(scale)} ${zeros(scale) === 1 ? 'אפס' : 'אפסים'} מהסוף.`, answer: a },
        ],
      });
    }
  }

  // What happens to the quotient — the pattern the book asks her to notice.
  for (let d = 2; d <= 9; d++) {
    for (let q = 2; q <= 9; q += 3) {
      yield buildItem({
        itemId: `G_DT_PATTERN_${d}_${q}`, skillCode: DT,
        question: `${d * q} ÷ ${d} = ${q}. כמה זה ${fmt(d * q * 100)} ÷ ${d}?`,
        correct: q * 100, signature: q, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'המחלק לא השתנה, והמחולק גדל פי 100.' },
          { text: 'לכן גם המנה גדלה פי 100:', answer: q * 100 },
        ],
      });
    }
  }
}

// ─── 4. DIV_BY_TENS — חילוק בעשרות שלמות ובמאות שלמות ──────────────────────

const DB = 'DIV_BY_TENS';

function* divByTens(): Generator<PracticeItem> {
  for (let d = 2; d <= 9; d++) {
    for (let q = 2; q <= 9; q++) {
      for (const [ds, ns] of [[10, 10], [10, 100], [100, 100], [100, 1_000], [10, 1_000]] as const) {
        const divisor = d * ds;
        const n = d * q * ns;
        if (n % divisor !== 0) continue;
        const quotient = n / divisor;
        yield buildItem({
          itemId: `G_DB_${n}_${divisor}`, skillCode: DB,
          question: `כמה זה ${fmt(n)} ÷ ${fmt(divisor)}?`,
          correct: quotient,
          signature: quotient * 10 <= 99_999 ? quotient * 10 : null,
          signatureCode: quotient * 10 <= 99_999 ? 'ERR_ZERO_COUNT' : null,
          distractors: [], cpaLayer: 'abstract', difficulty: ds === 10 ? 2 : 3,
          answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `מקטינים את המחולק ואת המחלק פי ${fmt(ds)} — המנה לא משתנה.` },
            { text: `${fmt(n / ds)} ÷ ${d} = ?`, answer: quotient },
          ],
        });
      }
    }
  }

  // The two rules the book states outright.
  const rules: Array<[string, string, string[]]> = [
    ['אותו מחולק, והמחלק גדל. מה קורה למנה?', 'קטנה', ['גדלה', 'לא משתנה']],
    ['אותו מחלק, והמחולק גדל. מה קורה למנה?', 'גדלה', ['קטנה', 'לא משתנה']],
    ['מגדילים פי 10 גם את המחולק וגם את המחלק. מה קורה למנה?', 'לא משתנה', ['גדלה פי 10', 'קטנה פי 10']],
  ];
  for (const [i, [q, a, wrong]] of rules.entries()) {
    for (const [n, d1, d2] of [[2_400, 6, 60], [3_600, 4, 40], [4_800, 8, 80], [1_200, 3, 30], [5_400, 9, 90]]) {
      yield buildItem({
        itemId: `G_DB_RULE_${i}_${n}`, skillCode: DB,
        question: `${q} למשל ${fmt(n)} ÷ ${d1} ו-${fmt(n)} ÷ ${d2}.`,
        correct: a, signature: null, signatureCode: null,
        distractors: wrong, exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `${fmt(n)} ÷ ${d1} = ${fmt(n / d1)}, ו-${fmt(n)} ÷ ${d2} = ${fmt(n / d2)}.` },
          { text: `התשובה: ${a}.` },
        ],
      });
    }
  }
}

// ─── 5. MULT_DIV_LINK — הקשר בין כפל לבין חילוק ────────────────────────────

const ML = 'MULT_DIV_LINK';

function* multDivLink(): Generator<PracticeItem> {
  for (let a = 2; a <= 10; a++) {
    for (let b = 2; b <= 10; b++) {
      const p = a * b;
      // Missing factor.
      yield buildItem({
        itemId: `G_ML_MISS_${a}_${b}`, skillCode: ML,
        question: `? × ${b} = ${p}. מה הגורם החסר?`,
        correct: a, signature: p, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'גורם חסר מוצאים בעזרת חילוק.' }, { text: `${p} ÷ ${b} = ?`, answer: a }],
      });
      // Missing dividend.
      yield buildItem({
        itemId: `G_ML_DIVIDEND_${a}_${b}`, skillCode: ML,
        question: `? ÷ ${b} = ${a}. מהו המחולק?`,
        correct: p, signature: a + b !== p ? a + b : null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'מחולק חסר מוצאים בעזרת כפל: המנה כפול המחלק.' }, { text: `${a} × ${b} = ?`, answer: p }],
      });
      // Missing divisor.
      yield buildItem({
        itemId: `G_ML_DIVISOR_${a}_${b}`, skillCode: ML,
        question: `${p} ÷ ? = ${a}. מהו המחלק?`,
        correct: b, signature: p, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'מחלק חסר מוצאים בחילוק המחולק במנה.' }, { text: `${p} ÷ ${a} = ?`, answer: b }],
      });
      // The multiplicative triple: which sentence belongs to this family?
      if (a < b) {
        yield buildItem({
          itemId: `G_ML_FAMILY_${a}_${b}`, skillCode: ML,
          question: `${a} × ${b} = ${p}. איזה תרגיל שייך לאותה משפחה?`,
          correct: `${p} ÷ ${a} = ${b}`,
          signature: `${p} ÷ ${b} = ${b}`, signatureCode: null,
          distractors: [`${p} − ${a} = ${b}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: `שלושת המספרים ${a}, ${b} ו-${p} יוצרים משפחה: שני תרגילי כפל ושני תרגילי חילוק.` },
            { text: `${p} ÷ ${a} = ${b} ו-${p} ÷ ${b} = ${a}.` },
          ],
        });
      }
    }
  }
}

// ─── 6. NUM_ORDER_OPS_MULT — סדר פעולות החשבון ושימוש בסוגריים ─────────────

const OM = 'NUM_ORDER_OPS_MULT';

function* orderOpsMult(): Generator<PracticeItem> {
  for (let a = 2; a <= 30; a += 3) {
    for (let b = 2; b <= 9; b++) {
      for (let c = 2; c <= 9; c += 2) {
        // Multiplication before addition — left to right is the classic slip.
        yield buildItem({
          itemId: `G_OM_ADDMUL_${a}_${b}_${c}`, skillCode: OM,
          question: `כמה זה ${a} + ${b} × ${c}?`,
          correct: a + b * c,
          signature: (a + b) * c, signatureCode: 'ERR_ORDER_OPS',
          distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'כפל וחילוק לפני חיבור וחיסור.' },
            { text: `${b} × ${c} = ?`, answer: b * c },
            { text: `${a} + ${b * c} = ?`, answer: a + b * c },
          ],
        });
        // The same numbers with brackets — now the brackets come first.
        yield buildItem({
          itemId: `G_OM_PAR_${a}_${b}_${c}`, skillCode: OM,
          question: `כמה זה (${a} + ${b}) × ${c}?`,
          correct: (a + b) * c,
          signature: a + b * c, signatureCode: 'ERR_ORDER_OPS',
          distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'קודם מה שבתוך הסוגריים.' },
            { text: `${a} + ${b} = ?`, answer: a + b },
            { text: `${a + b} × ${c} = ?`, answer: (a + b) * c },
          ],
        });
        // Division before subtraction.
        const big = b * c + a;
        if (big - b * c / b >= 0) {
          yield buildItem({
            itemId: `G_OM_SUBDIV_${a}_${b}_${c}`, skillCode: OM,
            question: `כמה זה ${big} − ${b * c} ÷ ${b}?`,
            correct: big - c,
            signature: Number.isInteger((big - b * c) / b) ? (big - b * c) / b : null,
            signatureCode: Number.isInteger((big - b * c) / b) ? 'ERR_ORDER_OPS' : null,
            distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
            steps: [
              { text: 'חילוק לפני חיסור.' },
              { text: `${b * c} ÷ ${b} = ?`, answer: c },
              { text: `${big} − ${c} = ?`, answer: big - c },
            ],
          });
        }
      }
    }
  }

  // Only multiplication: order does not matter — so choose a clever one.
  for (const [x, y] of [[4, 25], [2, 50], [5, 20], [8, 125], [4, 50], [2, 500], [5, 200], [25, 40]]) {
    for (let k = 3; k <= 19; k += 2) {
      yield buildItem({
        itemId: `G_OM_SMART_${x}_${k}_${y}`, skillCode: OM,
        question: `חשבי בדרך נוחה: ${x} × ${k} × ${y}`,
        correct: x * k * y, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כשיש רק כפל, אפשר לכפול בכל סדר (חוק החילוף וחוק הקיבוץ).' },
          { text: `קודם ${x} × ${y} = ?`, answer: x * y },
          { text: `ואז ${x * y} × ${k} = ?`, answer: x * k * y },
        ],
      });
    }
  }

  // Only division: order DOES matter.
  for (const [n, a, b] of [[48, 4, 2], [72, 6, 3], [96, 8, 2], [64, 8, 4], [90, 6, 3], [80, 4, 2], [36, 6, 3], [100, 10, 5]]) {
    const left = n / a / b, right = n / (a / b);
    yield buildItem({
      itemId: `G_OM_DIVORDER_${n}_${a}_${b}`, skillCode: OM,
      question: `האם ${n} ÷ ${a} ÷ ${b} שווה ל-${n} ÷ (${a} ÷ ${b})?`,
      correct: 'לא', signature: 'כן', signatureCode: null,
      distractors: [], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `${n} ÷ ${a} ÷ ${b} = ${left}.` },
        { text: `${n} ÷ (${a} ÷ ${b}) = ${n} ÷ ${a / b} = ${right}.` },
        { text: 'בחילוק, סדר הפעולות משנה את התוצאה.' },
      ],
    });
  }

  // A two-step word problem written as ONE expression.
  for (let packs = 2; packs <= 9; packs++) {
    for (const each of [6, 8, 10, 12]) {
      for (const extra of [3, 4, 5]) {
        yield buildItem({
          itemId: `G_OM_WORD_${packs}_${each}_${extra}`, skillCode: OM,
          question: `במחסן ${packs} קופסאות ובכל קופסה ${each} עפרונות, ועוד ${extra} עפרונות בודדים. איזה תרגיל מתאר כמה עפרונות יש?`,
          correct: `${packs} × ${each} + ${extra}`,
          signature: `${packs} × (${each} + ${extra})`, signatureCode: 'ERR_ORDER_OPS',
          distractors: [`${packs} + ${each} × ${extra}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `בקופסאות: ${packs} × ${each}. הבודדים נוספים אחר כך: + ${extra}.` },
            { text: `${packs} × ${each} + ${extra} = ${packs * each + extra}.` },
          ],
        });
      }
    }
  }
}

// ─── 7. NUM_ZERO_ONE — תכונות ה-0 וה-1 ─────────────────────────────────────

const Z1 = 'NUM_ZERO_ONE';

function* zeroOne(): Generator<PracticeItem> {
  for (let n = 7; n <= 9_999; n += 97) {
    const facts: Array<[string, number, number | null, string]> = [
      [`${fmt(n)} × 0`, 0, n, 'כל מספר כפול 0 שווה 0.'],
      [`0 × ${fmt(n)}`, 0, n, 'אפס כפול כל מספר שווה 0.'],
      [`${fmt(n)} × 1`, n, 1, 'כל מספר כפול 1 שווה לעצמו.'],
      [`${fmt(n)} ÷ 1`, n, 1, 'כל מספר חלקי 1 שווה לעצמו.'],
      [`0 ÷ ${fmt(n)}`, 0, n, '0 חלקי כל מספר (שאינו 0) שווה 0.'],
      [`${fmt(n)} ÷ ${fmt(n)}`, 1, 0, 'מספר חלקי עצמו שווה 1.'],
      [`${fmt(n)} + 0`, n, 0, 'הוספת 0 לא משנה את המספר.'],
    ];
    for (const [i, [expr, ans, sig, why]] of facts.entries()) {
      if ((n + i) % 3 !== 0) continue;               // keep the mix balanced
      const signature = sig !== null && sig !== ans && String(sig).length <= String(ans).length + 1 ? sig : null;
      yield buildItem({
        itemId: `G_Z1_${n}_${i}`, skillCode: Z1,
        question: `כמה זה ${expr}?`,
        correct: ans,
        signature,
        signatureCode: signature !== null && i < 2 ? 'ERR_ZERO_IDENTITY' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: why }, { text: 'אז התוצאה היא?', answer: ans }],
      });
    }
  }

  // Dividing by zero — not a number at all.
  for (let n = 3; n <= 99; n += 4) {
    yield buildItem({
      itemId: `G_Z1_DIV0_${n}`, skillCode: Z1,
      question: `כמה זה ${n} ÷ 0?`,
      correct: 'אי אפשר לחלק ב-0',
      signature: '0', signatureCode: null,
      distractors: [String(n)], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `${n} ÷ 0 שואל: איזה מספר כפול 0 נותן ${n}?` },
        { text: 'אין מספר כזה — כל מספר כפול 0 נותן 0. לכן אי אפשר לחלק ב-0.' },
      ],
    });
  }

  // 0 in addition and 1 in multiplication: both leave a number as it is.
  const roles: Array<[string, string, string[]]> = [
    ['איזה מספר לא משנה מספר כשמוסיפים אותו?', '0', ['1', '10']],
    ['איזה מספר לא משנה מספר כשכופלים בו?', '1', ['0', '10']],
    ['איזה מספר הופך כל מספר ל-0 כשכופלים בו?', '0', ['1', '10']],
  ];
  for (const [i, [q, a, w]] of roles.entries()) {
    yield buildItem({
      itemId: `G_Z1_ROLE_${i}`, skillCode: Z1, question: q,
      correct: a, signature: null, signatureCode: null, distractors: w, exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: '0 בחיבור ו-1 בכפל לא משנים את המספר; 0 בכפל מאפס אותו.' }],
    });
  }
}

// ─── 8. MULT_TWO_DIGIT — כפל בגורם דו-ספרתי ────────────────────────────────

const M2 = 'MULT_TWO_DIGIT';

function* multTwoDigit(): Generator<PracticeItem> {
  // Split the two-digit factor by place value: 23 × 14 = 23 × 10 + 23 × 4.
  for (let a = 12; a <= 49; a += 3) {
    for (let b = 11; b <= 29; b += 2) {
      const tens = Math.floor(b / 10) * 10, ones = b % 10;
      if (ones === 0) continue;
      // Tens × tens plus ones × ones — the cross products forgotten.
      const at = Math.floor(a / 10) * 10, ao = a % 10;
      const crossless = at * tens + ao * ones;
      const usable = crossless !== a * b;
      yield buildItem({
        itemId: `G_M2_SPLIT_${a}_${b}`, skillCode: M2,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: usable ? crossless : null,
        signatureCode: usable ? 'ERR_CROSS_TERMS' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `מפרקים את ${b} ל-${tens} + ${ones}, וכופלים את ${a} בכל חלק.` },
          { text: `${a} × ${tens} = ?`, answer: a * tens },
          { text: `${a} × ${ones} = ?`, answer: a * ones },
          { text: `מחברים: ${a * tens} + ${a * ones} = ?`, answer: a * b },
        ],
      });
    }
  }

  // A two-digit number times whole tens, by writing the tens as a product.
  for (let a = 11; a <= 49; a += 2) {
    for (const t of [20, 30, 40, 50]) {
      yield buildItem({
        itemId: `G_M2_TENS_${a}_${t}`, skillCode: M2,
        question: `כמה זה ${a} × ${t}?`,
        correct: a * t,
        signature: a * (t / 10), signatureCode: 'ERR_ZERO_COUNT',
        distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${t} = ${t / 10} × 10, אז כופלים קודם ב-${t / 10} ואחר כך ב-10.` },
          { text: `${a} × ${t / 10} = ?`, answer: a * (t / 10) },
          { text: `${a * (t / 10)} × 10 = ?`, answer: a * t },
        ],
      });
    }
  }

  // Compare products by their factors — without computing them.
  for (let a = 12; a <= 48; a += 4) {
    for (const [b1, b2] of [[14, 15], [21, 19], [30, 29], [25, 26]]) {
      const bigger = a * b1 > a * b2 ? `${a} × ${b1}` : `${a} × ${b2}`;
      const smaller = a * b1 > a * b2 ? `${a} × ${b2}` : `${a} × ${b1}`;
      yield buildItem({
        itemId: `G_M2_CMP_${a}_${b1}_${b2}`, skillCode: M2,
        question: `בלי לחשב: איזו מכפלה גדולה יותר — ${a} × ${b1} או ${a} × ${b2}?`,
        correct: bigger, signature: smaller, signatureCode: null,
        distractors: ['הן שוות'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [{ text: `הגורם ${a} זהה בשתיהן — לכן הגדולה היא זו שהגורם השני בה גדול יותר.` }],
      });
    }
  }
}

// ─── 9. ARITH_MULT_VERTICAL — כפל בגורם דו-ספרתי במאונך (א) ────────────────

const MV = 'ARITH_MULT_VERTICAL';

function* multVertical(): Generator<PracticeItem> {
  // Two digits × two digits in the column — where the place-holder zero lives.
  for (let a = 13; a <= 97; a += 4) {
    for (let b = 12; b <= 39; b += 3) {
      const tens = Math.floor(b / 10), ones = b % 10;
      if (ones === 0) continue;
      const naive = a * ones + a * tens;               // second row not shifted
      yield buildItem({
        itemId: `G_MV_TWO_${a}_${b}`, skillCode: MV,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: naive !== a * b ? naive : null,
        signatureCode: naive !== a * b ? 'ERR_MULT_PLACEHOLDER' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `שורה ראשונה — כופלים באחדות: ${a} × ${ones} = ?`, answer: a * ones },
          { text: `שורה שנייה — כופלים בעשרות: ${a} × ${tens} = ${a * tens}, וכותבים אפס שומר מקום, כלומר ${fmt(a * tens * 10)}.` },
          { text: `מחברים את השורות: ${fmt(a * ones)} + ${fmt(a * tens * 10)} = ?`, answer: a * b },
        ],
      });
    }
  }

  // Estimating a product — round each factor to a whole ten.
  for (let a = 18; a <= 97; a += 5) {
    for (let b = 11; b <= 49; b += 6) {
      const ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10;
      const est = ra * rb;
      yield buildItem({
        itemId: `G_MV_EST_${a}_${b}`, skillCode: MV,
        question: `בערך כמה זה ${a} × ${b}?`,
        correct: fmt(est),
        signature: fmt(est * 10), signatureCode: null,
        distractors: [fmt(est / 10)], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `מעגלים: ${a} בערך ${ra}, ו-${b} בערך ${rb}.` },
          { text: `${ra} × ${rb} = ${fmt(est)}.` },
        ],
      });
    }
  }
}

/** "34 × 6" done as 3×6 and 4×6 written side by side → 1824. */
function digitwise(a: number, b: number): number {
  return Number(String(a).split('').map(d => Number(d) * b).join(''));
}
void digitwise;   // kept for the single-digit review the book does not ask for

// ─── 10. MULT_VERTICAL_3BY2 — כפל בגורם דו-ספרתי במאונך (ב) ───────────────

const MV3 = 'MULT_VERTICAL_3BY2';

function* multVertical3by2(): Generator<PracticeItem> {
  for (let a = 104; a <= 987; a += 37) {
    for (let b = 12; b <= 48; b += 5) {
      const tens = Math.floor(b / 10), ones = b % 10;
      if (ones === 0) continue;
      const naive = a * ones + a * tens;
      yield buildItem({
        itemId: `G_MV3_${a}_${b}`, skillCode: MV3,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: naive !== a * b ? naive : null,
        signatureCode: naive !== a * b ? 'ERR_MULT_PLACEHOLDER' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `שורה ראשונה — ${a} × ${ones} = ?`, answer: a * ones },
          { text: `שורה שנייה — ${a} × ${tens} = ${fmt(a * tens)}, עם אפס שומר מקום: ${fmt(a * tens * 10)}.` },
          { text: `מחברים: ${fmt(a * ones)} + ${fmt(a * tens * 10)} = ?`, answer: a * b },
        ],
      });
    }
  }
}

// ─── 11. MULT_PROPERTIES — עוד על כפל ──────────────────────────────────────

const MP = 'MULT_PROPERTIES';

function* multProperties(): Generator<PracticeItem> {
  // Even or odd, from the factors alone.
  for (let a = 13; a <= 97; a += 6) {
    for (let b = 11; b <= 59; b += 8) {
      const even = (a * b) % 2 === 0;
      yield buildItem({
        itemId: `G_MP_PAR_${a}_${b}`, skillCode: MP,
        question: `בלי לחשב: האם המכפלה ${a} × ${b} זוגית או אי-זוגית?`,
        correct: even ? 'זוגית' : 'אי-זוגית',
        signature: null, signatureCode: null,
        distractors: [even ? 'אי-זוגית' : 'זוגית'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: 'אם לפחות אחד הגורמים זוגי — המכפלה זוגית. רק אי-זוגי כפול אי-זוגי נותן אי-זוגי.' },
          { text: `${a} ${a % 2 === 0 ? 'זוגי' : 'אי-זוגי'}, ${b} ${b % 2 === 0 ? 'זוגי' : 'אי-זוגי'} — ולכן המכפלה ${even ? 'זוגית' : 'אי-זוגית'}.` },
        ],
      });
    }
  }

  // Last digit of an odd multiple of 5.
  for (let a = 11; a <= 99; a += 4) {
    if (a % 2 === 0) continue;
    for (const f of [5, 15, 25, 35, 45]) {
      yield buildItem({
        itemId: `G_MP_FIVE_${a}_${f}`, skillCode: MP,
        question: `בלי לחשב: באיזו ספרה מסתיימת המכפלה ${a} × ${f}?`,
        correct: (a * f) % 10, signature: 0, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'מספר אי-זוגי כפול מספר שמסתיים ב-5 — המכפלה מסתיימת ב-5.', answer: (a * f) % 10 }],
      });
    }
  }

  // Is the answer reasonable? Estimate before believing a result.
  for (let a = 21; a <= 89; a += 7) {
    for (let b = 12; b <= 48; b += 9) {
      const right = a * b;
      const wrong = right * 10 + 7;
      for (const shown of [right, wrong]) {
        const ok = shown === right;
        yield buildItem({
          itemId: `G_MP_SENSE_${a}_${b}_${ok ? 'R' : 'W'}`, skillCode: MP,
          question: `נועה חישבה: ${a} × ${b} = ${fmt(shown)}. האם התשובה סבירה?`,
          correct: ok ? 'סבירה' : 'לא סבירה',
          signature: null, signatureCode: null,
          distractors: [ok ? 'לא סבירה' : 'סבירה'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `אומדן: ${Math.round(a / 10) * 10} × ${Math.round(b / 10) * 10} = ${fmt(Math.round(a / 10) * 10 * Math.round(b / 10) * 10)}.` },
            { text: ok ? 'התשובה קרובה לאומדן — סבירה.' : 'התשובה רחוקה מאוד מהאומדן — לא סבירה.' },
          ],
        });
      }
    }
  }
}

// ─── 12. NUM_POWERS — מכפלה של גורמים שווים - חזקות ────────────────────────

const PW = 'NUM_POWERS';

function* powers(): Generator<PracticeItem> {
  for (let base = 2; base <= 10; base++) {
    for (let exp = 1; exp <= 6; exp++) {
      const v = base ** exp;
      if (v > 100_000) continue;
      yield buildItem({
        itemId: `G_PW_VAL_${base}_${exp}`, skillCode: PW,
        question: `כמה זה ${pow(base, exp)}?`,
        correct: v,
        // Base times exponent — reading the small number as a factor.
        signature: exp > 1 && base * exp !== v ? base * exp : null,
        signatureCode: exp > 1 && base * exp !== v ? 'ERR_POWER_AS_PRODUCT' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: exp <= 2 ? 1 : exp <= 3 ? 2 : 3,
        answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${pow(base, exp)} הוא ${base} כפול עצמו ${exp} ${exp === 1 ? 'פעם' : 'פעמים'}: ${Array(exp).fill(base).join(' × ')}.` },
          { text: 'כמה יוצא?', answer: v },
        ],
      });

      if (exp >= 2) {
        yield buildItem({
          itemId: `G_PW_WRITE_${base}_${exp}`, skillCode: PW,
          question: `איך כותבים כחזקה: ${Array(exp).fill(base).join(' × ')}?`,
          correct: pow(base, exp),
          signature: exp !== base ? pow(exp, base) : null, signatureCode: null,
          distractors: [String(base * exp)], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [{ text: `הבסיס הוא הגורם שחוזר (${base}), והמעריך הוא כמה פעמים הוא חוזר (${exp}).` }],
        });
      }
    }
  }

  // The two rules the book states: base 1, and exponent 1.
  for (let n = 2; n <= 40; n++) {
    yield buildItem({
      itemId: `G_PW_ONEBASE_${n}`, skillCode: PW,
      question: `כמה זה ${pow(1, n)}?`,
      correct: 1, signature: n, signatureCode: 'ERR_POWER_AS_PRODUCT', distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: '1 כפול 1 כפול 1… תמיד 1. חזקה שבסיסה 1 שווה 1.', answer: 1 }],
    });
    yield buildItem({
      itemId: `G_PW_ONEEXP_${n}`, skillCode: PW,
      question: `כמה זה ${pow(n, 1)}?`,
      correct: n, signature: 1, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'חזקה שהמעריך שלה 1 שווה לבסיס.', answer: n }],
    });
  }

  // Compare powers.
  for (let a = 2; a <= 6; a++) {
    for (let b = 2; b <= 6; b++) {
      if (a >= b || a ** b === b ** a) continue;
      const big = a ** b > b ** a ? pow(a, b) : pow(b, a);
      const small = a ** b > b ** a ? pow(b, a) : pow(a, b);
      yield buildItem({
        itemId: `G_PW_CMP_${a}_${b}`, skillCode: PW,
        question: `איזו חזקה גדולה יותר: ${pow(a, b)} או ${pow(b, a)}?`,
        correct: big, signature: small, signatureCode: null,
        distractors: ['הן שוות'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [{ text: `${pow(a, b)} = ${a ** b}, ו-${pow(b, a)} = ${b ** a}.` }],
      });
    }
  }
}

// ─── 13. DIV_ONE_DIGIT — חילוק במחלק חד-ספרתי (בלי שארית) ──────────────────

const D1 = 'DIV_ONE_DIGIT';

function* divOneDigit(): Generator<PracticeItem> {
  // EXACT division, by splitting the dividend into parts the divisor fits:
  // 84 ÷ 4 = 80 ÷ 4 + 4 ÷ 4. No remainders — they come in topic 14.
  for (let d = 2; d <= 9; d++) {
    for (let q = 11; q <= 99; q += 2) {
      const n = d * q;
      if (n > 999) continue;
      // A split whose first part is a whole ten the divisor fits.
      const firstPart = Math.floor(q / 10) * 10 * d;
      const rest = n - firstPart;
      yield buildItem({
        itemId: `G_D1_${n}_${d}`, skillCode: D1,
        question: `כמה זה ${n} ÷ ${d}?`,
        correct: q,
        signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: n > 99 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `מפרקים את ${n} לחלקים שמתחלקים ב-${d}: ${firstPart} + ${rest}.` },
          { text: `${firstPart} ÷ ${d} = ?`, answer: firstPart / d },
          { text: `${rest} ÷ ${d} = ?`, answer: rest / d },
          { text: `מחברים: ${firstPart / d} + ${rest / d} = ?`, answer: q },
        ],
      });
    }
  }

  // Which split suits the divisor? The book's own question.
  for (let d = 3; d <= 9; d++) {
    for (let q = 12; q <= 39; q += 3) {
      const n = d * q;
      const good = `${Math.floor(q / 10) * 10 * d} + ${n - Math.floor(q / 10) * 10 * d}`;
      const tensSplit = Math.floor(n / 10) * 10;
      const bad = `${tensSplit} + ${n - tensSplit}`;
      if (good === bad || tensSplit % d === 0) continue;   // the round split also works
      yield buildItem({
        itemId: `G_D1_SPLIT_${n}_${d}`, skillCode: D1,
        question: `איך כדאי לפרק את ${n} כדי לחלק ב-${d}?`,
        correct: good, signature: bad, signatureCode: null,
        distractors: [], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `צריך שכל אחד משני החלקים יתחלק ב-${d} בדיוק.` },
          { text: `${good}: שני החלקים מתחלקים ב-${d}. ב-${bad} — ${tensSplit} לא מתחלק ב-${d}.` },
        ],
      });
    }
  }

  // The dividend as a DIFFERENCE: 196 ÷ 4 = 200 ÷ 4 − 4 ÷ 4.
  for (let d = 2; d <= 9; d++) {
    for (let hundreds = 1; hundreds <= 8; hundreds++) {
      const round = hundreds * 100;
      if (round % d !== 0) continue;
      const n = round - d;
      yield buildItem({
        itemId: `G_D1_DIFF_${n}_${d}`, skillCode: D1,
        question: `חשבי בדרך נוחה: ${n} ÷ ${d}`,
        correct: n / d, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${n} = ${round} − ${d}.` },
          { text: `${round} ÷ ${d} = ?`, answer: round / d },
          { text: `ועכשיו מחסרים ${d} ÷ ${d} = 1: ${round / d} − 1 = ?`, answer: n / d },
        ],
      });
    }
  }
}

// ─── Long division, step by step — as the book does it on p. 129 ──────────

const PLACE_PL = ['יחידות', 'עשרות', 'מאות', 'אלפים'];
const PLACE_SG = ['יחידה', 'עשרת', 'מאה', 'אלף'];
const placeOf = (count: number, idxFromRight: number) =>
  count === 1 ? `${PLACE_SG[idxFromRight]} אחת` : `${count} ${PLACE_PL[idxFromRight]}`;

/**
 * "מחלקים 4 מאות ל-3… בודקים בעזרת כפל… מחשבים בעזרת חיסור כמה נותרו…"
 * Each place becomes one rung of the ladder, so a miss walks her through the
 * same procedure the book teaches.
 */
function longDivSteps(n: number, d: number): WorkedStep[] {
  const digits = String(n).split('').map(Number);
  const steps: WorkedStep[] = [];
  let carry = 0;
  digits.forEach((dig, i) => {
    const place = digits.length - 1 - i;
    const part  = carry * 10 + dig;
    const q     = Math.floor(part / d);
    carry = part - q * d;
    if (i === 0 && q === 0) {
      steps.push({ text: `${placeOf(dig, place)} לא מספיקות לחלק ל-${d} — ממירים אותן ל${PLACE_PL[place - 1]}.` });
      return;
    }
    steps.push({ text: `מחלקים ${placeOf(part, place)} ל-${d}: כמה פעמים נכנס ${d} ב-${part}?`, answer: q });
  });
  const quotient = Math.floor(n / d);
  steps.push({ text: 'אז המנה היא?', answer: quotient });
  if (n % d > 0) steps.push({ text: 'ומה נשאר בסוף — השארית?', answer: n % d });
  return steps;
}

// ─── 14. ARITH_DIV_LONG — חילוק בדרך של חילוק ארוך (א) ─────────────────────

const DL = 'ARITH_DIV_LONG';

function* divLongA(): Generator<PracticeItem> {
  // The hundreds digit is at least the divisor, so every place divides.
  // With and without remainder — remainders are introduced HERE.
  for (let d = 2; d <= 9; d++) {
    for (let n = 100 * d; n <= 999; n += 7) {
      const q = Math.floor(n / d), r = n % d;
      yield buildItem({
        itemId: `G_DL_${n}_${d}`, skillCode: DL,
        question: r === 0 ? `כמה זה ${n} ÷ ${d}?` : `${n} ÷ ${d} — כמה יוצא (בלי השארית)?`,
        correct: q, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: r === 0 ? 2 : 3, answerMode: 'keypad', rng: () => 0.5,
        steps: longDivSteps(n, d).filter((_, i, all) => r === 0 || i < all.length - 1),
      });

      if (r > 0 && n % 3 === 0) {
        yield buildItem({
          itemId: `G_DL_REM_${n}_${d}`, skillCode: DL,
          question: `${n} ÷ ${d} — מה השארית?`,
          correct: r, signature: d - r !== r ? d - r : null, signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: longDivSteps(n, d),
        });
        yield buildItem({
          itemId: `G_DL_FULL_${n}_${d}`, skillCode: DL,
          question: `כמה זה ${n} ÷ ${d}?`,
          correct: `${q} שארית ${r}`,
          signature: d - r !== r ? `${q} שארית ${d - r}` : null, signatureCode: null,
          distractors: [`${q + 1} שארית ${r}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `${d} נכנס ב-${n} ${q} פעמים: ${d} × ${q} = ${d * q}.` },
            { text: `נשארו ${n - d * q}, וזו השארית — היא תמיד קטנה מ-${d}.` },
          ],
        });
      }
    }
  }
}

// ─── 15. DIV_LONG_B — חילוק בדרך של חילוק ארוך (ב) ─────────────────────────

const DLB = 'DIV_LONG_B';

function* divLongB(): Generator<PracticeItem> {
  // The first digit is SMALLER than the divisor (348 ÷ 4): the hundreds cannot
  // be divided into whole hundreds, so they are converted to tens first.
  for (let d = 3; d <= 9; d++) {
    for (let n = 100; n < 100 * d && n <= 999; n += 9) {
      if (n < d * 10) continue;
      const q = Math.floor(n / d), r = n % d;
      yield buildItem({
        itemId: `G_DLB_${n}_${d}`, skillCode: DLB,
        question: r === 0 ? `כמה זה ${n} ÷ ${d}?` : `${n} ÷ ${d} — כמה יוצא (בלי השארית)?`,
        correct: q, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: longDivSteps(n, d).filter((_, i, all) => r === 0 || i < all.length - 1),
      });
    }
  }

  // Estimating a quotient with a two-digit divisor (3–4 digit dividend).
  for (const d of [12, 15, 21, 24, 31, 42, 48]) {
    for (let k = 2; k <= 9; k++) {
      const round = Math.round(d / 10) * 10;
      const n = round * k * 10 + (k % 3) * 7;   // close to a friendly multiple
      const est = Math.round((n / round) / 10) * 10;
      if (est <= 0) continue;
      yield buildItem({
        itemId: `G_DLB_EST_${n}_${d}`, skillCode: DLB,
        question: `בערך כמה זה ${fmt(n)} ÷ ${d}?`,
        correct: fmt(est), signature: fmt(est * 10), signatureCode: null,
        distractors: [fmt(Math.max(1, est / 10))], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `מעגלים את המחלק: ${d} בערך ${round}.` },
          { text: `${fmt(n)} ÷ ${round} — בערך ${fmt(est)}.` },
        ],
      });
    }
  }

  // Two-step word problems; the sentences are hand-written, the numbers swept.
  for (let groups = 2; groups <= 6; groups++) {
    for (let teams = 2; teams <= 4; teams++) {
      for (let each = 12; each <= 30; each += 3) {
        const total = groups * teams * each;
        if (total > 999) continue;
        yield buildItem({
          itemId: `G_DLB_WORD_${groups}_${teams}_${each}`, skillCode: DLB,
          question: `בשכבה ${total} תלמידים. מחלקים אותם ל-${groups} כיתות שוות, ואת כל כיתה ל-${teams} קבוצות שוות. כמה תלמידים בכל קבוצה?`,
          correct: each, signature: total / groups, signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `כמה תלמידים בכל כיתה? ${total} ÷ ${groups} = ?`, answer: total / groups },
            { text: `וכמה בכל קבוצה? ${total / groups} ÷ ${teams} = ?`, answer: each },
          ],
        });
      }
    }
  }
}

// ─── Divisibility helpers ──────────────────────────────────────────────────

const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0);

// ─── 16. NUM_DIV_3_9 — סימני התחלקות ב-3 וב-9 ──────────────────────────────

const D39 = 'NUM_DIV_3_9';

function* div39(): Generator<PracticeItem> {
  for (let n = 102; n <= 9_999; n += 113) {
    for (const k of [2, 3, 5, 9, 10]) {
      const yes = n % k === 0;
      const rule = k === 3 || k === 9
        ? `סכום הספרות של ${fmt(n)} הוא ${digitSum(n)}. מספר מתחלק ב-${k} אם סכום ספרותיו מתחלק ב-${k}.`
        : k === 2 ? `ספרת האחדות היא ${n % 10}. מספר מתחלק ב-2 אם ספרת האחדות זוגית.`
        : k === 5 ? `ספרת האחדות היא ${n % 10}. מספר מתחלק ב-5 אם היא 0 או 5.`
        :           `ספרת האחדות היא ${n % 10}. מספר מתחלק ב-10 אם היא 0.`;
      yield buildItem({
        itemId: `G_D39_${n}_${k}`, skillCode: D39,
        question: `האם ${fmt(n)} מתחלק ב-${k} בלי שארית?`,
        correct: yes ? 'כן' : 'לא', signature: null, signatureCode: null,
        distractors: [yes ? 'לא' : 'כן'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: k === 3 || k === 9 ? 2 : 1, rng: () => 0.5,
        steps: [{ text: rule }, { text: `לכן: ${yes ? 'כן' : 'לא'}.` }],
      });
    }
  }

  // Complete a missing digit so the number divides by 3 / by 9.
  for (let a = 1; a <= 9; a++) {
    for (let c = 0; c <= 9; c++) {
      for (const k of [3, 9]) {
        const options = Array.from({ length: 10 }, (_, d) => d)
          .filter(d => (a + d + c) % k === 0);
        if (options.length === 0) continue;
        const right = options[0];
        const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => (a + d + c) % k !== 0).slice(0, 2);
        yield buildItem({
          itemId: `G_D39_MISS_${a}_${c}_${k}`, skillCode: D39,
          question: `איזו ספרה אפשר לכתוב במקום ה-? כדי ש-${a}?${c} יתחלק ב-${k}?`,
          correct: String(right), signature: null, signatureCode: null,
          distractors: wrong.map(String), exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `סכום הספרות הידועות: ${a} + ${c} = ${a + c}.` },
            { text: `צריך שהסכום יתחלק ב-${k}: ${a + c} + ${right} = ${a + c + right}.` },
          ],
        });
      }
    }
  }

  // The link between 3 and 9.
  const claims: Array<[string, string]> = [
    ['כל מספר שמתחלק ב-9 מתחלק גם ב-3', 'נכון'],
    ['כל מספר שמתחלק ב-3 מתחלק גם ב-9', 'לא נכון'],
    ['אם סכום הספרות הוא 18, המספר מתחלק ב-9', 'נכון'],
    ['אם סכום הספרות הוא 12, המספר מתחלק ב-9', 'לא נכון'],
  ];
  for (const [i, [claim, a]] of claims.entries()) {
    yield buildItem({
      itemId: `G_D39_CLAIM_${i}`, skillCode: D39,
      question: `${claim} — נכון או לא נכון?`,
      correct: a, signature: null, signatureCode: null,
      distractors: [a === 'נכון' ? 'לא נכון' : 'נכון'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [{ text: '9 = 3 × 3, לכן מה שמתחלק ב-9 מתחלק ב-3 — אבל לא להפך (למשל 12).' }],
    });
  }
}

// ─── 17. NUM_DIV_6 — סימני התחלקות ב-6 ─────────────────────────────────────

const D6 = 'NUM_DIV_6';

function* div6(): Generator<PracticeItem> {
  for (let n = 104; n <= 9_999; n += 37) {
    const by2 = n % 2 === 0, by3 = digitSum(n) % 3 === 0;
    const yes = by2 && by3;
    yield buildItem({
      itemId: `G_D6_${n}`, skillCode: D6,
      question: `האם ${fmt(n)} מתחלק ב-6 בלי שארית?`,
      correct: yes ? 'כן' : 'לא', signature: null, signatureCode: null,
      distractors: [yes ? 'לא' : 'כן'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'מספר מתחלק ב-6 אם הוא מתחלק גם ב-2 וגם ב-3.' },
        { text: `ב-2: ${by2 ? 'כן' : 'לא'} (ספרת האחדות ${n % 10}). ב-3: ${by3 ? 'כן' : 'לא'} (סכום הספרות ${digitSum(n)}).` },
        { text: `לכן: ${yes ? 'כן' : 'לא'}.` },
      ],
    });
  }

  // Which of these divides by 6? One does; one divides only by 3; one only by 2.
  for (let base = 120; base <= 9_000; base += 211) {
    const six   = base - (base % 6);
    const three = six + 3;          // odd, divisible by 3 only
    const two   = six + 2;          // even, not divisible by 3
    yield buildItem({
      itemId: `G_D6_PICK_${six}`, skillCode: D6,
      question: 'איזה מהמספרים מתחלק ב-6?',
      correct: fmt(six), signature: fmt(three), signatureCode: null,
      distractors: [fmt(two)], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `${fmt(three)} מתחלק ב-3 אבל הוא אי-זוגי. ${fmt(two)} זוגי אבל לא מתחלק ב-3.` },
        { text: `רק ${fmt(six)} מתחלק גם ב-2 וגם ב-3.` },
      ],
    });
  }
}

// ─── 18. NUM_DIVISIBILITY — עוד על סימני התחלקות ───────────────────────────

const DV = 'NUM_DIVISIBILITY';

function* divisibilityMore(): Generator<PracticeItem> {
  // Will there be a remainder? Decide with a rule, not by dividing.
  const packs: Array<[string, string, number]> = [
    ['ביצים', 'תבניות', 6], ['עוגיות', 'קופסאות', 9], ['תלמידים', 'קבוצות', 3],
    ['כיסאות', 'שורות', 5], ['מדבקות', 'דפים', 10],
  ];
  for (const [what, into, k] of packs) {
    for (let n = 102; n <= 999; n += 23) {
      const rem = n % k !== 0;
      yield buildItem({
        itemId: `G_DV_WORD_${what}_${n}`, skillCode: DV,
        question: `יש ${n} ${what} וסודרים אותן ב${into} של ${k}. האם יישארו ${what} שלא נכנסו?`,
        correct: rem ? 'כן' : 'לא', signature: null, signatureCode: null,
        distractors: [rem ? 'לא' : 'כן'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `בודקים אם ${n} מתחלק ב-${k} בעזרת סימן ההתחלקות.` },
          { text: rem ? `${n} לא מתחלק ב-${k} — יישארו.` : `${n} מתחלק ב-${k} — לא יישארו.` },
        ],
      });
    }
  }

  // The smallest number to add so the division comes out exact.
  for (let n = 101; n <= 999; n += 13) {
    for (const k of [3, 5, 9, 10]) {
      const add = (k - (n % k)) % k;
      if (add === 0) continue;
      yield buildItem({
        itemId: `G_DV_ADD_${n}_${k}`, skillCode: DV,
        question: `מה המספר הקטן ביותר שצריך להוסיף ל-${n} כדי שיתחלק ב-${k} בלי שארית?`,
        correct: add, signature: n % k, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${n} ÷ ${k} משאיר ${n % k}.` },
          { text: `כדי להגיע לכפולה הבאה של ${k} חסרים ${k} − ${n % k} = ?`, answer: add },
        ],
      });
    }
  }

  // Find the dividend from divisor, quotient and remainder.
  for (let d = 3; d <= 9; d++) {
    for (let q = 11; q <= 99; q += 4) {
      const r = (q % (d - 1)) + 1;
      if (r >= d) continue;
      const n = d * q + r;
      yield buildItem({
        itemId: `G_DV_FIND_${d}_${q}_${r}`, skillCode: DV,
        question: `בתרגיל חילוק המחלק הוא ${d}, המנה ${q} והשארית ${r}. מהו המחולק?`,
        correct: n, signature: d * q, signatureCode: 'ERR_REMAINDER_IGNORED', distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `המחולק = המחלק × המנה + השארית.` },
          { text: `${d} × ${q} = ?`, answer: d * q },
          { text: `${d * q} + ${r} = ?`, answer: n },
        ],
      });
    }
  }
}

// ─── 19. NUM_PRIMES — מספרים ראשוניים ומספרים פריקים ───────────────────────

const PR = 'NUM_PRIMES';

const divisorsOf = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
const isPrime = (n: number) => n > 1 && divisorsOf(n).length === 2;

function* primes(): Generator<PracticeItem> {
  for (let n = 2; n <= 100; n++) {
    const p = isPrime(n);
    yield buildItem({
      itemId: `G_PR_IS_${n}`, skillCode: PR,
      question: `האם ${n} הוא מספר ראשוני?`,
      correct: p ? 'כן' : 'לא', signature: null, signatureCode: null,
      distractors: [p ? 'לא' : 'כן'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: n > 30 ? 3 : 2, rng: () => 0.5,
      steps: [
        { text: 'מספר ראשוני מתחלק רק ב-1 ובעצמו — יש לו בדיוק שני מחלקים.' },
        { text: p ? `ל-${n} יש רק שני מחלקים: 1 ו-${n}.` : `${n} מתחלק גם ב-${divisorsOf(n)[1]}, ולכן הוא פריק.` },
      ],
    });
  }

  for (let n = 12; n <= 100; n += 2) {
    const divs = divisorsOf(n);
    if (divs.length <= 2) continue;
    yield buildItem({
      itemId: `G_PR_COUNT_${n}`, skillCode: PR,
      question: `כמה מחלקים יש ל-${n} (כולל 1 והמספר עצמו)?`,
      correct: divs.length, signature: divs.length - 2, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'מחפשים זוגות של גורמים שהמכפלה שלהם היא המספר.' },
        { text: `המחלקים הם: ${divs.join(', ')}.`, answer: divs.length },
      ],
    });

    // Products of two factors, in every way (1 × n included).
    const ways = divs.filter(d => d * d <= n).length;
    yield buildItem({
      itemId: `G_PR_WAYS_${n}`, skillCode: PR,
      question: `בכמה דרכים אפשר לכתוב את ${n} כמכפלה של שני גורמים (כולל 1 × ${n}, ובלי לספור סדר)?`,
      correct: ways, signature: ways - 1, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: divs.filter(d => d * d <= n).map(d => `${d} × ${n / d}`).join(', ') + '.' },
        { text: 'כמה דרכים?', answer: ways },
      ],
    });
  }

  // Exactly one of four is prime.
  for (let start = 10; start <= 96; start += 3) {
    const pool = Array.from({ length: 12 }, (_, i) => start + i);
    const prime = pool.find(isPrime);
    const composites = pool.filter(x => !isPrime(x) && x > 1).slice(0, 3);
    if (!prime || composites.length < 3) continue;
    yield buildItem({
      itemId: `G_PR_PICK_${start}`, skillCode: PR,
      question: 'איזה מהמספרים הוא מספר ראשוני?',
      correct: String(prime), signature: null, signatureCode: null,
      distractors: composites.map(String), exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: `${prime} מתחלק רק ב-1 ובעצמו; לשאר יש מחלקים נוספים.` }],
    });
  }
}

// ─── 20. NUM_FACTORISE — פירוק לגורמים ראשוניים ────────────────────────────

const FC = 'NUM_FACTORISE';

function primeFactors(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  for (let p = 2; p <= rest; p++) while (rest % p === 0) { out.push(p); rest /= p; }
  return out;
}
const asProduct = (fs: number[]) => fs.join(' × ');
const asPowers = (fs: number[]) => {
  const counts = new Map<number, number>();
  for (const f of fs) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts.entries()].map(([p, c]) => (c === 1 ? String(p) : pow(p, c))).join(' × ');
};

function* factorise(): Generator<PracticeItem> {
  for (let n = 12; n <= 200; n++) {
    const fs = primeFactors(n);
    if (fs.length < 2) continue;                      // primes have no factorisation

    yield buildItem({
      itemId: `G_FC_PROD_${n}`, skillCode: FC,
      question: `מהו הפירוק של ${n} לגורמים ראשוניים?`,
      correct: asProduct(fs),
      signature: null, signatureCode: null,
      distractors: [asProduct(primeFactors(n * 2)), asProduct(primeFactors(n + 2)).length ? asProduct(primeFactors(n + 2)) : '1'],
      exactOptions: true, cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'מחלקים שוב ושוב במספרים ראשוניים קטנים: 2, 3, 5, 7…' },
        { text: `${n} = ${asProduct(fs)}.` },
      ],
    });

    if (n % 2 === 0 && new Set(fs).size < fs.length) {
      yield buildItem({
        itemId: `G_FC_POW_${n}`, skillCode: FC,
        question: `איך כותבים את הפירוק של ${n} בכתיב חזקות?`,
        correct: asPowers(fs), signature: asProduct(fs) !== asPowers(fs) ? null : null, signatureCode: null,
        distractors: [asPowers(primeFactors(n * 3))], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `${n} = ${asProduct(fs)}.` },
          { text: `גורם שחוזר כמה פעמים נכתב כחזקה: ${asPowers(fs)}.` },
        ],
      });
    }

    if (n % 3 === 0) {
      yield buildItem({
        itemId: `G_FC_BUILD_${n}`, skillCode: FC,
        question: `איזה מספר שווה ל-${asProduct(fs)}?`,
        correct: n, signature: fs.reduce((a, b) => a + b, 0), signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'כופלים את כל הגורמים.', answer: n }],
      });
    }
  }

  // Not every product is a PRIME factorisation.
  for (let a = 2; a <= 9; a++) {
    for (const comp of [4, 6, 8, 9, 10]) {
      const n = a * comp;
      yield buildItem({
        itemId: `G_FC_NOT_${a}_${comp}`, skillCode: FC,
        question: `האם ${a} × ${comp} הוא פירוק של ${n} לגורמים ראשוניים?`,
        correct: 'לא', signature: 'כן', signatureCode: null,
        distractors: [], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [{ text: `${comp} אינו ראשוני (${asProduct(primeFactors(comp))}), אז צריך לפרק גם אותו.` }],
      });
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateMultBy10       = (o: GenerateOpts) => take(multBy10(), o);
export const generateMultByTens     = (o: GenerateOpts) => take(multByTens(), o);
export const generateDivTensByDigit = (o: GenerateOpts) => take(divTensByDigit(), o);
export const generateDivByTens      = (o: GenerateOpts) => take(divByTens(), o);
export const generateMultDivLink    = (o: GenerateOpts) => take(multDivLink(), o);
export const generateOrderOpsMult   = (o: GenerateOpts) => take(orderOpsMult(), o);
export const generateZeroOne        = (o: GenerateOpts) => take(zeroOne(), o);
export const generateMultTwoDigit   = (o: GenerateOpts) => take(multTwoDigit(), o);
export const generateMultVertical   = (o: GenerateOpts) => take(multVertical(), o);
export const generateMultVertical3  = (o: GenerateOpts) => take(multVertical3by2(), o);
export const generateMultProperties = (o: GenerateOpts) => take(multProperties(), o);
export const generatePowers         = (o: GenerateOpts) => take(powers(), o);
export const generateDivOneDigit    = (o: GenerateOpts) => take(divOneDigit(), o);
export const generateDivLong        = (o: GenerateOpts) => take(divLongA(), o);
export const generateDivLongB       = (o: GenerateOpts) => take(divLongB(), o);
export const generateDiv39          = (o: GenerateOpts) => take(div39(), o);
export const generateDiv6           = (o: GenerateOpts) => take(div6(), o);
export const generateDivisibility   = (o: GenerateOpts) => take(divisibilityMore(), o);
export const generatePrimes         = (o: GenerateOpts) => take(primes(), o);
export const generateFactorise      = (o: GenerateOpts) => take(factorise(), o);
