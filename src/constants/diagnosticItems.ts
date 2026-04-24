import type { DiagnosticItem } from '../types';

// ─── Phase 1 — Entry items (fixed, all children, items 1–5) ──────────────────
//
// One item per misconception, in a fixed order designed for momentum:
// subtraction (familiar) → multiplication (quick) → fractions (visual aid)
// → word problem (requires reading) → measurement (concrete but conversion needed)

export const ENTRY_ITEMS: DiagnosticItem[] = [
  {
    itemId:        'DIAG_E1_REGROUP_300',
    skillCode:     'ARITH_SUB_REGROUP_ZERO',
    skillHebrewKey: 'skill.ARITH_SUB_REGROUP_ZERO',
    // Math expression wrapped in MathText at render time
    question:      'כמה זה 300 − 27?',
    options:       [273, 327, 283, 237],
    correct:       273,
    // Signature: subtracts smaller digit from larger in each column (0−2 → 2, not 10−2=8)
    signature:     327,
    signatureCode: 'ERR_REGROUP_ZERO',
    visual:        null,
    phase:         'entry',
    cpaLayer:      'abstract',
  },
  {
    itemId:        'DIAG_E2_MULT_7X8',
    skillCode:     'ARITH_MULT_6_9',
    skillHebrewKey: 'skill.ARITH_MULT_6_9',
    question:      'כמה זה 7 × 8?',
    options:       [56, 48, 54, 63],
    correct:       56,
    // No single signature — any wrong answer is diagnostic.
    // Response time also read by engine: > MULT_FACT_RETRIEVAL_THRESHOLD_MS → ERR_MULT_FACT_SLOW
    signature:     null,
    signatureCode: 'ERR_MULT_FACT',
    visual:        null,
    phase:         'entry',
    cpaLayer:      'abstract',
  },
  {
    itemId:        'DIAG_E3_FRAC_HALF_THIRD',
    skillCode:     'FRAC_COMPARE_UNIT',
    skillHebrewKey: 'skill.FRAC_COMPARE_UNIT',
    question:      'איזה שבר גדול יותר?',
    options:       ['½', '⅓', 'שווים', 'אי אפשר לדעת'],
    correct:       '½',
    // Signature: reads denominator as magnitude ("3 > 2, so ⅓ > ½")
    signature:     '⅓',
    signatureCode: 'ERR_FRACTION_BIAS',
    visual:        { type: 'fraction_circles', partsA: 2, labelA: '½', partsB: 3, labelB: '⅓' },
    phase:         'entry',
    cpaLayer:      'pictorial',
  },
  {
    itemId:        'DIAG_E4_WORD_DANA_APPLES',
    skillCode:     'ARITH_WORD_2STEP',
    skillHebrewKey: 'skill.ARITH_WORD_2STEP',
    question:      'לדנה יש 12 תפוחים. היא נתנה לאחותה 5 תפוחים, ואז קיבלה מסבתא עוד 3 תפוחים. כמה תפוחים יש לה עכשיו?',
    options:       [10, 20, 4, 17],
    correct:       10,
    // Signature: 12 + 5 + 3 = 20 — grabs all numbers without modelling the situation
    signature:     20,
    signatureCode: 'ERR_NUMBER_GRAB',
    visual:        null,
    phase:         'entry',
    cpaLayer:      'abstract',
  },
  {
    itemId:        'DIAG_E5_UNIT_2M30CM',
    skillCode:     'MEAS_UNIT_CONVERT_CM',
    skillHebrewKey: 'skill.MEAS_UNIT_CONVERT_CM',
    question:      'כמה סנטימטרים יש ב-2 מטרים ו-30 סנטימטרים?',
    options:       [230, 32, 50, 2.30],
    correct:       230,
    // Signature: 2 + 30 = 32 — concatenates/adds raw digits without converting (1 m = 100 cm)
    signature:     32,
    signatureCode: 'ERR_UNIT_MISMATCH',
    visual:        null,
    phase:         'entry',
    cpaLayer:      'abstract',
  },
];

// ─── Phase 2 — Verification items (adaptive, one per misconception) ───────────
//
// Two variants per misconception:
//   -A: Confirmation probe  — used when entry item was wrong / signature-hit
//   -B: Harder probe        — used when entry item was correct
//
// The Phase2DecisionEngine (Phase 1 build, Opus task) selects the right variant.

export const VERIFICATION_ITEMS: Record<string, DiagnosticItem> = {

  // ── ERR_REGROUP_ZERO ───────────────────────────────────────────────────────

  'DIAG_VA_REGROUP_703': {
    itemId:        'DIAG_VA_REGROUP_703',
    skillCode:     'ARITH_SUB_REGROUP_ZERO',
    skillHebrewKey: 'skill.ARITH_SUB_REGROUP_ZERO',
    question:      'כמה זה 703 − 428?',
    options:       [275, 325, 285, 375],
    correct:       275,
    // Same signature pattern: 7−4=3, 0−2→2, 3−8→5 → 325
    signature:     325,
    signatureCode: 'ERR_REGROUP_ZERO',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  'DIAG_VB_REGROUP_1000': {
    itemId:        'DIAG_VB_REGROUP_1000',
    skillCode:     'ARITH_SUB_REGROUP_ZERO',
    skillHebrewKey: 'skill.ARITH_SUB_REGROUP_ZERO',
    question:      'כמה זה 1,000 − 247?',
    options:       [753, 867, 843, 763],
    correct:       753,
    // Harder: three zeros to borrow across; signature treats 1000 as 1-0-0-0
    signature:     867,
    signatureCode: 'ERR_REGROUP_ZERO',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  // ── ERR_MULT_FACT ──────────────────────────────────────────────────────────

  'DIAG_VA_MULT_6X9': {
    itemId:        'DIAG_VA_MULT_6X9',
    skillCode:     'ARITH_MULT_6_9',
    skillHebrewKey: 'skill.ARITH_MULT_6_9',
    question:      'כמה זה 6 × 9?',
    options:       [54, 56, 48, 63],
    correct:       54,
    // 56 = confuses 6×9 with 7×8; 48 = confuses 6×8
    signature:     56,
    signatureCode: 'ERR_MULT_FACT',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  'DIAG_VB_MULT_8X9': {
    itemId:        'DIAG_VB_MULT_8X9',
    skillCode:     'ARITH_MULT_6_9',
    skillHebrewKey: 'skill.ARITH_MULT_6_9',
    question:      'כמה זה 8 × 9?',
    options:       [72, 63, 64, 81],
    correct:       72,
    signature:     63,
    signatureCode: 'ERR_MULT_FACT',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  // ── ERR_FRACTION_BIAS ──────────────────────────────────────────────────────

  'DIAG_VA_FRAC_THIRD_SIXTH': {
    itemId:        'DIAG_VA_FRAC_THIRD_SIXTH',
    skillCode:     'FRAC_COMPARE_UNIT',
    skillHebrewKey: 'skill.FRAC_COMPARE_UNIT',
    question:      'איזה שבר גדול יותר?',
    options:       ['⅓', '⅙', 'שווים', 'אי אפשר לדעת'],
    correct:       '⅓',
    // Same denominator-as-magnitude error: picks ⅙ because 6 > 3
    signature:     '⅙',
    signatureCode: 'ERR_FRACTION_BIAS',
    visual:        { type: 'fraction_circles', partsA: 3, labelA: '⅓', partsB: 6, labelB: '⅙' },
    phase:         'verification',
    cpaLayer:      'pictorial',
  },

  'DIAG_VB_FRAC_QUARTER_OF_20': {
    itemId:        'DIAG_VB_FRAC_QUARTER_OF_20',
    // Distinct sub-skill: fraction-of-quantity, not fraction comparison
    skillCode:     'FRAC_OF_QUANTITY',
    skillHebrewKey: 'skill.FRAC_OF_QUANTITY',
    question:      'כמה זה רבע מ-20?',
    options:       [5, 80, 4, 10],
    correct:       5,
    // 80 = multiplies 20×4 instead of dividing (treats "of" as multiplication)
    signature:     80,
    signatureCode: 'ERR_FRAC_QUANTITY_BIAS',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  // ── ERR_NUMBER_GRAB ────────────────────────────────────────────────────────

  'DIAG_VA_WORD_BALLS': {
    itemId:        'DIAG_VA_WORD_BALLS',
    skillCode:     'ARITH_WORD_2STEP',
    skillHebrewKey: 'skill.ARITH_WORD_2STEP',
    question:      'בתיבה יש 15 כדורים כחולים ו-8 כדורים ירוקים. ילד לקח 6 כדורים. כמה כדורים נשארו בתיבה?',
    options:       [17, 29, 23, 11],
    correct:       17,
    // 29 = 15 + 8 + 6 — grabs all three numbers
    signature:     29,
    signatureCode: 'ERR_NUMBER_GRAB',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  'DIAG_VB_WORD_NOTEBOOKS': {
    itemId:        'DIAG_VB_WORD_NOTEBOOKS',
    skillCode:     'ARITH_WORD_3STEP',
    skillHebrewKey: 'skill.ARITH_WORD_3STEP',
    question:      'שירה קנתה 3 מחברות ב-7 שקלים כל אחת. היא שילמה עם שטר של 30 שקלים. כמה עודף קיבלה?',
    options:       [9, 40, 21, 3],
    correct:       9,
    // 40 = 3 + 7 + 30 (full number-grab); 21 = 3×7 (stops after step 1)
    signature:     40,
    signatureCode: 'ERR_NUMBER_GRAB',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },

  // ── ERR_UNIT_MISMATCH ──────────────────────────────────────────────────────

  'DIAG_VA_UNIT_TIME_MOVIE': {
    itemId:        'DIAG_VA_UNIT_TIME_MOVIE',
    skillCode:     'MEAS_TIME_CROSS_HOUR',
    skillHebrewKey: 'skill.MEAS_TIME_CROSS_HOUR',
    question:      'הסרט מתחיל בשעה 3:45 ונמשך 40 דקות. מתי הוא נגמר?',
    options:       ['4:25', '3:85', '4:45', '3:25'],
    correct:       '4:25',
    // 3:85 = adds 40 to 45 without regrouping at 60 minutes
    signature:     '3:85',
    signatureCode: 'ERR_UNIT_MISMATCH',
    visual:        { type: 'analog_clock', time: '3:45' },
    phase:         'verification',
    cpaLayer:      'pictorial',
  },

  'DIAG_VB_UNIT_KM_M': {
    itemId:        'DIAG_VB_UNIT_KM_M',
    skillCode:     'MEAS_UNIT_CONVERT_M',
    skillHebrewKey: 'skill.MEAS_UNIT_CONVERT_M',
    question:      'כמה מטרים יש ב-3 קילומטרים ו-500 מטרים?',
    options:       [3500, 3.5, 8, 350],
    correct:       3500,
    // 8 = 3 + 5 — adds raw digits, ignores units entirely
    signature:     8,
    signatureCode: 'ERR_UNIT_MISMATCH',
    visual:        null,
    phase:         'verification',
    cpaLayer:      'abstract',
  },
};

// ─── Phase 3 — Extension items (0–4, conditional) ─────────────────────────────

export const EXTENSION_ITEMS: Record<string, DiagnosticItem> = {

  'DIAG_X1_ORDER_OPS': {
    itemId:        'DIAG_X1_ORDER_OPS',
    skillCode:     'ARITH_MULT_6_9',
    skillHebrewKey: 'skill.ARITH_MULT_6_9',
    question:      'כמה זה 8 × 7 + 6 × 9?',
    options:       [110, 56, 150, 104],
    correct:       110, // 56 + 54
    signature:     null,
    signatureCode: null,
    visual:        null,
    phase:         'extension',
    cpaLayer:      'abstract',
  },

  'DIAG_X2_WORD_CLASSES': {
    itemId:        'DIAG_X2_WORD_CLASSES',
    skillCode:     'ARITH_WORD_3STEP',
    skillHebrewKey: 'skill.ARITH_WORD_3STEP',
    question:      'לכיתה א׳ יש 28 תלמידים. לכיתה ב׳ יש 5 תלמידים פחות מכיתה א׳. כמה תלמידים יש בשתי הכיתות ביחד?',
    options:       [51, 23, 56, 46],
    correct:       51, // 28 + (28−5) = 28 + 23 = 51
    signature:     56, // 28 + 28 — ignores "5 less than"
    signatureCode: 'ERR_NUMBER_GRAB',
    visual:        null,
    phase:         'extension',
    cpaLayer:      'abstract',
  },

  // Tiebreaker for ambiguous ERR_MULT_FACT signal (e.g. E2 slow, VA correct but slow)
  'DIAG_XT_MULT_8X7': {
    itemId:        'DIAG_XT_MULT_8X7',
    skillCode:     'ARITH_MULT_6_9',
    skillHebrewKey: 'skill.ARITH_MULT_6_9',
    question:      'כמה זה 8 × 7?',
    options:       [56, 63, 49, 54],
    correct:       56,
    signature:     null,
    signatureCode: 'ERR_MULT_FACT',
    visual:        null,
    phase:         'extension',
    cpaLayer:      'abstract',
  },
};
