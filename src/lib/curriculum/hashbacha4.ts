/**
 * Mia's actual grade-4 textbook: ה.ש.ב.ח.ה ד' (הוצאת כ. בונוס).
 *
 * Source — the publisher's own pacing plan, not generic research:
 *   "פריסת תכנית לימודים במתמטיקה על-פי סדרת ספרי הלימוד מסדרת ה.ש.ב.ח.ה כיתה ד"
 *   hashbacha.org, uploaded 2025-08 (laid out on the תשפ"ו calendar).
 *   Booklets confirmed against the school's book list for תשפ"ז:
 *   מספרים בתחום המיליון · שברים פשוטים · כפל וחילוק · גאומטריה.
 *
 * Why this file exists (2026-09-19): the earlier plan was built on deep research
 * that assumed a different series (שבילים פלוס) and a September spent on
 * grade-3 review. The publisher's plan shows neither: new grade-4 material
 * starts on 1 September on THREE parallel strands — numbers, fractions and
 * geometry. Content decisions must come from this file, not from that research.
 *
 * `week` is the teaching-week index in the publisher's plan, counted from the
 * first week of school with the plan's own holiday gaps removed. It is used
 * only to ESTIMATE where the class is when the parent has not said; the parent
 * setting in classPosition.ts always wins.
 *
 * `skills` lists the app skills that practise the unit. An empty list means the
 * unit is not built yet — the composer skips it and the parent dashboard says so
 * honestly rather than implying coverage.
 */

export type StrandId = 'numbers' | 'fractions' | 'geometry';

export interface CurriculumUnit {
  /** Stable id: `<strand>.<slug>`. Stored in the parent's class-position setting. */
  id:     string;
  strand: StrandId;
  /** Booklet name as printed on the cover. */
  book:   string;
  /** Unit title as it appears in the publisher's plan. */
  title:  string;
  pages:  [number, number];
  /** Teaching-week index in the publisher's pacing (0 = first week of September). */
  week:   number;
  /** App skills that practise this unit. Empty = not built yet. */
  skills: string[];
}

export const STRAND_LABELS: Record<StrandId, string> = {
  numbers:   'מספרים וחשבון',
  fractions: 'שברים',
  geometry:  'גאומטריה',
};

const MIL = 'מספרים בתחום המיליון';
const MD  = 'כפל וחילוק';
const FR  = 'שברים פשוטים';
const GEO = 'גאומטריה';

/**
 * Units in teaching order, per strand. The numbers strand continues from the
 * million booklet straight into the multiplication-and-division booklet in
 * January; fractions and geometry run in parallel from the first day.
 */
export const HASHBACHA_4: CurriculumUnit[] = [
  // ── Numbers: מספרים בתחום המיליון (≈34 h, Sep → early Jan) ───────────────
  { id: 'numbers.represent_a',   strand: 'numbers', book: MIL, week: 0,  pages: [7, 23],    title: 'ייצוגים של מספרים בתחום המיליון (א)', skills: ['PLACE_VALUE_TO_MILLION'] },
  { id: 'numbers.represent_b',   strand: 'numbers', book: MIL, week: 1,  pages: [24, 32],   title: 'ייצוגים של מספרים בתחום המיליון (ב)', skills: ['PLACE_VALUE_TO_MILLION'] },
  { id: 'numbers.digit_value',   strand: 'numbers', book: MIL, week: 2,  pages: [33, 42],   title: 'הערך שספרה מייצגת במספר',            skills: ['PLACE_VALUE_TO_MILLION'] },
  { id: 'numbers.compare',       strand: 'numbers', book: MIL, week: 3,  pages: [43, 49],   title: 'השוואה בין מספרים',                   skills: ['PLACE_VALUE_TO_MILLION', 'NUM_ORDER_LINE'] },
  { id: 'numbers.order_line',    strand: 'numbers', book: MIL, week: 4,  pages: [50, 57],   title: 'סדר בין מספרים — ישר המספרים וסדרות', skills: ['NUM_ORDER_LINE'] },
  { id: 'numbers.rounding',      strand: 'numbers', book: MIL, week: 5,  pages: [58, 70],   title: 'עיגול מספרים',                        skills: ['NUM_ROUNDING'] },
  { id: 'numbers.addition',      strand: 'numbers', book: MIL, week: 6,  pages: [73, 85],   title: 'חיבור בתחום המיליון',                 skills: ['ARITH_ADD_SUB_LARGE'] },
  { id: 'numbers.subtraction',   strand: 'numbers', book: MIL, week: 7,  pages: [86, 98],   title: 'חיסור בתחום המיליון',                 skills: ['ARITH_ADD_SUB_LARGE'] },
  { id: 'numbers.add_sub_link',  strand: 'numbers', book: MIL, week: 8,  pages: [99, 112],  title: 'הקשר בין חיבור לחיסור והשפעת שינוי',  skills: ['NUM_ADD_SUB_LINK'] },
  { id: 'numbers.order_ops',     strand: 'numbers', book: MIL, week: 9,  pages: [113, 125], title: 'סדר פעולות בחיבור וחיסור וסוגריים',   skills: ['NUM_ORDER_OPS'] },
  { id: 'numbers.word_problems', strand: 'numbers', book: MIL, week: 10, pages: [125, 137], title: 'בעיות מילוליות במספרים גדולים',       skills: ['NUM_WORD_LARGE'] },
  { id: 'numbers.negative',      strand: 'numbers', book: MIL, week: 11, pages: [139, 150], title: 'מספרים שליליים',                      skills: ['NUM_NEGATIVE'] },
  { id: 'numbers.diagrams',      strand: 'numbers', book: MIL, week: 12, pages: [151, 165], title: 'דיאגרמות',                            skills: ['DATA_DIAGRAMS'] },
  { id: 'numbers.probability',   strand: 'numbers', book: MIL, week: 13, pages: [166, 180], title: 'ניתוח סיכויים',                       skills: ['DATA_CHANCE'] },
  { id: 'numbers.gematria',      strand: 'numbers', book: MIL, week: 15, pages: [181, 192], title: 'שיטת א"ב העברי וגימטריה',            skills: ['NUM_GEMATRIA'] },
  // ── Numbers continued: כפל וחילוק (≈33 h, Jan → Jun) ─────────────────────
  { id: 'numbers.mult_round',    strand: 'numbers', book: MD,  week: 16, pages: [7, 40],    title: 'כפל וחילוק בעשרות, מאות ואלפים שלמים', skills: ['MULT_BY_TENS'] },
  { id: 'numbers.mult_div_link', strand: 'numbers', book: MD,  week: 20, pages: [41, 58],   title: 'הקשר בין כפל לחילוק וסוגריים',        skills: ['MULT_DIV_LINK'] },
  { id: 'numbers.mult_vertical', strand: 'numbers', book: MD,  week: 23, pages: [67, 114],  title: 'כפל בגורם דו-ספרתי ובמאונך',          skills: ['ARITH_MULT_VERTICAL'] },
  { id: 'numbers.div_one_digit', strand: 'numbers', book: MD,  week: 28, pages: [117, 127], title: 'חילוק במחלק חד-ספרתי',                skills: ['DIV_ONE_DIGIT'] },
  { id: 'numbers.long_division', strand: 'numbers', book: MD,  week: 29, pages: [128, 154], title: 'חילוק ארוך',                          skills: ['ARITH_DIV_LONG'] },
  { id: 'numbers.divisibility',  strand: 'numbers', book: MD,  week: 32, pages: [155, 181], title: 'סימני התחלקות',                       skills: ['NUM_DIVISIBILITY'] },
  { id: 'numbers.primes',        strand: 'numbers', book: MD,  week: 34, pages: [182, 214], title: 'ראשוניים, פריקים ופירוק לגורמים',     skills: ['NUM_PRIMES'] },

  // ── Fractions: שברים פשוטים (≈26 h, Sep → Mar) ───────────────────────────
  { id: 'fractions.part_whole',   strand: 'fractions', book: FR, week: 0,  pages: [7, 19],    title: 'השבר כחלק משלם',                  skills: ['FRAC_PART_WHOLE'] },
  { id: 'fractions.compare',      strand: 'fractions', book: FR, week: 2,  pages: [20, 28],   title: 'השוואת שברים',                    skills: ['FRAC_COMPARE_SAME', 'FRAC_COMPARE_UNIT'] },
  { id: 'fractions.whole',        strand: 'fractions', book: FR, week: 5,  pages: [29, 40],   title: 'הרכבת השלם והשוואה לפי השלמה ל-1', skills: ['FRAC_COMPLETE_WHOLE'] },
  { id: 'fractions.improper',     strand: 'fractions', book: FR, week: 7,  pages: [41, 53],   title: 'שברים גדולים מ-1 ומספרים מעורבים', skills: ['FRAC_IMPROPER'] },
  // Deliberately after the whole/improper units: in the book, fraction-of-a-
  // quantity is November content, which is why her 30% on it is a repair job
  // with a deadline rather than an emergency.
  { id: 'fractions.of_quantity',  strand: 'fractions', book: FR, week: 9,  pages: [54, 66],   title: 'השבר כחלק מכמות',                 skills: ['FRAC_OF_QUANTITY'] },
  { id: 'fractions.add_sub_same', strand: 'fractions', book: FR, week: 11, pages: [69, 98],   title: 'חיבור וחיסור שברים בעלי מכנים שווים', skills: ['FRAC_ADD_SUB_SAME'] },
  { id: 'fractions.mixed_a',      strand: 'fractions', book: FR, week: 16, pages: [99, 108],  title: 'חיבור וחיסור מספרים מעורבים (א)',   skills: ['FRAC_MIXED_ADD_SUB'] },
  { id: 'fractions.equivalent',   strand: 'fractions', book: FR, week: 18, pages: [111, 120], title: 'שמות שונים לשבר',                 skills: ['FRAC_EQUIVALENT'] },
  { id: 'fractions.add_sub_diff', strand: 'fractions', book: FR, week: 20, pages: [121, 148], title: 'חיבור וחיסור שברים במכנים שונים',  skills: ['FRAC_ADD_SUB_DIFF'] },

  // ── Geometry: גאומטריה (≈38 h, 2 lessons a week all year) ────────────────
  { id: 'geometry.polygons',     strand: 'geometry', book: GEO, week: 0,  pages: [7, 20],    title: 'מצולעים ואלכסונים',              skills: ['GEOM_POLYGONS'] },
  { id: 'geometry.parallel',     strand: 'geometry', book: GEO, week: 2,  pages: [21, 30],   title: 'צלעות מקבילות וצלעות מאונכות',    skills: ['GEOM_PARALLEL_PERP'] },
  { id: 'geometry.rect_square',  strand: 'geometry', book: GEO, week: 6,  pages: [31, 42],   title: 'מלבן וריבוע',                     skills: ['GEOM_RECT_SQUARE'] },
  { id: 'geometry.triangles',    strand: 'geometry', book: GEO, week: 8,  pages: [43, 58],   title: 'משולשים — צלעות וזוויות',         skills: ['GEOM_TRIANGLES'] },
  { id: 'geometry.length',       strand: 'geometry', book: GEO, week: 10, pages: [61, 69],   title: 'מידות אורך — מ"מ, ס"מ, מטר',     skills: ['MEAS_UNIT_CONVERT_CM'] },
  { id: 'geometry.perimeter',    strand: 'geometry', book: GEO, week: 12, pages: [70, 89],   title: 'היקף מצולע והיקף מלבן',           skills: ['GEOM_PERIMETER'] },
  { id: 'geometry.area',         strand: 'geometry', book: GEO, week: 16, pages: [90, 122],  title: 'שטח בסמ"ר ובמ"ר',                skills: ['GEOM_AREA'] },
  { id: 'geometry.symmetry',     strand: 'geometry', book: GEO, week: 24, pages: [125, 145], title: 'סימטריה שיקופית וסיבובית',        skills: ['GEOM_SYMMETRY'] },
  { id: 'geometry.boxes',        strand: 'geometry', book: GEO, week: 28, pages: [146, 224], title: 'תיבות, נפח ולוח השנה',           skills: ['GEOM_SOLIDS'] },
];

export const STRANDS: StrandId[] = ['numbers', 'fractions', 'geometry'];

/** Units of one strand in teaching order. */
export function unitsOf(strand: StrandId): CurriculumUnit[] {
  return HASHBACHA_4.filter(u => u.strand === strand);
}

export function unitById(id: string): CurriculumUnit | undefined {
  return HASHBACHA_4.find(u => u.id === id);
}

/** Position of a unit inside its strand (0-based), or -1. */
export function indexInStrand(unitId: string): number {
  const u = unitById(unitId);
  return u ? unitsOf(u.strand).findIndex(x => x.id === unitId) : -1;
}
