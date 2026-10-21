/**
 * Mia's actual grade-4 books: ה.ש.ב.ח.ה ד' (הוצאת כ. בונוס).
 *
 * Sources, in order of authority:
 *   1. The books' own tables of contents, photographed by Dima on 2026-10-18 —
 *      unit titles, order and page numbers below are copied from them.
 *   2. The publisher's plan, "פריסת תכנית לימודים במתמטיקה על-פי סדרת ספרי
 *      הלימוד מסדרת ה.ש.ב.ח.ה כיתה ד" (hashbacha.org, 2025-08): for every
 *      sub-topic it lists the skills the child is expected to acquire
 *      (מיומנויות נרכשות). The generators are built from those lists.
 *
 * What changed on 2026-10-18, and why it matters:
 *   • Her school teaches THREE books in parallel — numbers to a million,
 *     multiplication & division, geometry. The app had multiplication and
 *     division as a continuation of the numbers book in January, so it thought
 *     she was months away from a book she is in now.
 *   • Fractions is not being taught yet. Its strand is dormant by default: no
 *     new material from it until the parent says the class has started it.
 *     Grade-3 fraction skills she still needs stay repairable.
 *
 * `week` is NOT a calendar promise. The three books run side by side across the
 * year, so each unit's week is estimated from where its first page sits in its
 * book. It is used only when the parent has not said where the class is.
 *
 * `skills` lists the app skills that practise the unit. Order within a strand
 * is the teaching order, and the composer never skips past an unmastered unit.
 */

export type StrandId = 'numbers' | 'multdiv' | 'geometry' | 'fractions';

export interface CurriculumUnit {
  /** Stable id: `<strand>.<slug>`. Stored in the parent's class-position setting. */
  id:     string;
  strand: StrandId;
  /** Booklet name as printed on the cover. */
  book:   string;
  /** "נושא N" in the book. */
  topic:  number;
  /** Title exactly as printed in the book's table of contents. */
  title:  string;
  pages:  [number, number];
  /** Estimated teaching week (0 = first week of September). See the header. */
  week:   number;
  /** App skills that practise this unit. Empty = not built yet. */
  skills: string[];
}

export const STRAND_LABELS: Record<StrandId, string> = {
  numbers:   'מספרים בתחום המיליון',
  multdiv:   'כפל וחילוק',
  geometry:  'גאומטריה',
  fractions: 'שברים פשוטים',
};

/** Strands the class has not started until the parent says otherwise. */
export const DORMANT_BY_DEFAULT: ReadonlySet<StrandId> = new Set(['fractions']);

const MIL = 'מספרים בתחום המיליון';
const MD  = 'כפל וחילוק';
const GEO = 'גאומטריה';
const FR  = 'שברים פשוטים';

/** Teaching weeks in a school year, holidays removed. */
const YEAR_WEEKS = 32;

type Draft = Omit<CurriculumUnit, 'week' | 'strand' | 'book'>;

/**
 * Spread a book's units across the year by page position. The books are taught
 * in parallel, so a unit two-thirds of the way through its book is reached
 * about two-thirds of the way through the year.
 */
function book(strand: StrandId, name: string, lastPage: number, drafts: Draft[]): CurriculumUnit[] {
  const first = drafts[0].pages[0];
  return drafts.map(d => ({
    ...d, strand, book: name,
    week: Math.round(((d.pages[0] - first) / (lastPage - first)) * YEAR_WEEKS),
  }));
}

export const HASHBACHA_4: CurriculumUnit[] = [
  // ── מספרים בתחום המיליון ─────────────────────────────────────────────────
  ...book('numbers', MIL, 192, [
    // פרק א' ייצוגים של מספרים בתחום המיליון
    { id: 'numbers.represent_a',    topic: 1,  pages: [7, 23],    title: 'ייצוגים של מספרים טבעיים בתחום המיליון (א)', skills: ['PLACE_VALUE_TO_MILLION', 'NUM_READ_WRITE', 'DATA_DIAGRAMS'] },
    { id: 'numbers.represent_b',    topic: 2,  pages: [24, 32],   title: 'ייצוגים של מספרים טבעיים בתחום המיליון (ב)', skills: ['PLACE_VALUE_TO_MILLION', 'NUM_READ_WRITE'] },
    { id: 'numbers.digit_value',    topic: 3,  pages: [33, 42],   title: 'הערך שספרה מייצגת במספר',               skills: ['PLACE_VALUE_TO_MILLION', 'NUM_DIGIT_CARDS'] },
    { id: 'numbers.compare',        topic: 4,  pages: [43, 49],   title: 'השוואה בין מספרים',                      skills: ['NUM_COMPARE'] },
    { id: 'numbers.order_line',     topic: 5,  pages: [50, 57],   title: 'סדר בין מספרים',                         skills: ['NUM_ORDER_LINE'] },
    { id: 'numbers.rounding',       topic: 6,  pages: [58, 70],   title: 'עיגול מספרים',                           skills: ['NUM_ROUNDING'] },
    // פרק ב' חיבור וחיסור בתחום המיליון
    { id: 'numbers.addition',       topic: 7,  pages: [73, 85],   title: 'חיבור בתחום ה-1,000,000',                skills: ['NUM_ADD_LARGE'] },
    { id: 'numbers.subtraction',    topic: 8,  pages: [86, 98],   title: 'חיסור בתחום ה-1,000,000',                skills: ['ARITH_ADD_SUB_LARGE'] },
    { id: 'numbers.add_sub_link',   topic: 9,  pages: [99, 105],  title: 'הקשר בין חיבור לחיסור',                  skills: ['NUM_ADD_SUB_LINK'] },
    { id: 'numbers.change_effect',  topic: 10, pages: [106, 112], title: 'השפעת השינוי במרכיבים של תרגילי חיבור וחיסור על תוצאותיהם', skills: ['NUM_CHANGE_EFFECT'] },
    { id: 'numbers.order_ops',      topic: 11, pages: [113, 124], title: 'סדר הפעולות בתרגילי חיבור וחיסור ושימוש בסוגריים', skills: ['NUM_ORDER_OPS'] },
    { id: 'numbers.word_problems',  topic: 12, pages: [125, 137], title: 'בעיות מילוליות',                         skills: ['NUM_WORD_LARGE'] },
    // פרק ג' מספרים שליליים, דיאגרמות, ניתוח סיכויים וגימטרייה
    { id: 'numbers.negative',       topic: 13, pages: [139, 150], title: 'מספרים שליליים והשימושים בהם',          skills: ['NUM_NEGATIVE'] },
    { id: 'numbers.diagrams',       topic: 14, pages: [151, 165], title: 'דיאגרמות',                               skills: ['DATA_DIAGRAMS'] },
    { id: 'numbers.probability',    topic: 15, pages: [166, 172], title: 'ניתוח סיכויים',                          skills: ['DATA_CHANCE'] },
    { id: 'numbers.chance_compare', topic: 16, pages: [173, 180], title: 'השוואה בין סיכויים',                     skills: ['DATA_CHANCE_COMPARE'] },
    { id: 'numbers.gematria',       topic: 17, pages: [181, 192], title: 'שיטת הא"ב העברי וגימטרייה',              skills: ['NUM_GEMATRIA'] },
  ]),

  // ── כפל וחילוק ───────────────────────────────────────────────────────────
  ...book('multdiv', MD, 204, [
    // פרק א' כפל וחילוק בעשרות שלמות ובמאות שלמות
    { id: 'multdiv.times_10',       topic: 1,  pages: [7, 12],    title: 'כפל ב-10, כפל ב-100 וכפל ב-1,000',      skills: ['MULT_BY_10_100_1000'] },
    { id: 'multdiv.times_tens',     topic: 2,  pages: [13, 20],   title: 'כפל בעשרות שלמות, במאות שלמות ובאלפים שלמים', skills: ['MULT_BY_TENS'] },
    { id: 'multdiv.div_tens_digit', topic: 3,  pages: [21, 29],   title: 'חילוק במחלק חד-ספרתי, ב-10, ב-100 וב-1,000', skills: ['DIV_TENS_BY_DIGIT'] },
    { id: 'multdiv.div_by_tens',    topic: 4,  pages: [30, 40],   title: 'חילוק בעשרות שלמות ובמאות שלמות',       skills: ['DIV_BY_TENS'] },
    { id: 'multdiv.mult_div_link',  topic: 5,  pages: [41, 48],   title: 'הקשר בין כפל לבין חילוק',                skills: ['MULT_DIV_LINK'] },
    { id: 'multdiv.order_ops',      topic: 6,  pages: [49, 58],   title: 'סדר פעולות החשבון ושימוש בסוגריים',     skills: ['NUM_ORDER_OPS_MULT'] },
    { id: 'multdiv.zero_one',       topic: 7,  pages: [59, 64],   title: 'תכונות ה-0 וה-1',                        skills: ['NUM_ZERO_ONE'] },
    // פרק ב' כפל
    { id: 'multdiv.two_digit',      topic: 8,  pages: [67, 77],   title: 'כפל בגורם דו-ספרתי',                     skills: ['MULT_TWO_DIGIT'] },
    { id: 'multdiv.vertical_a',     topic: 9,  pages: [78, 88],   title: 'כפל בגורם דו-ספרתי במאונך (א)',          skills: ['ARITH_MULT_VERTICAL'] },
    { id: 'multdiv.vertical_b',     topic: 10, pages: [89, 97],   title: 'כפל בגורם דו-ספרתי במאונך (ב)',          skills: ['MULT_VERTICAL_3BY2'] },
    { id: 'multdiv.more_mult',      topic: 11, pages: [98, 104],  title: 'עוד על כפל',                             skills: ['MULT_PROPERTIES'] },
    { id: 'multdiv.powers',         topic: 12, pages: [105, 114], title: 'מכפלה של גורמים שווים - חזקות',          skills: ['NUM_POWERS'] },
    // פרק ג' חילוק
    { id: 'multdiv.div_one_digit',  topic: 13, pages: [117, 127], title: 'חילוק במחלק חד-ספרתי',                   skills: ['DIV_ONE_DIGIT'] },
    { id: 'multdiv.long_div_a',     topic: 14, pages: [128, 139], title: 'חילוק בדרך של חילוק ארוך (א)',           skills: ['ARITH_DIV_LONG'] },
    { id: 'multdiv.long_div_b',     topic: 15, pages: [140, 154], title: 'חילוק בדרך של חילוק ארוך (ב)',           skills: ['DIV_LONG_B'] },
    // פרק ד' סימני התחלקות, מספרים פריקים וראשוניים ופירוק לגורמים ראשוניים
    { id: 'multdiv.div_3_9',        topic: 16, pages: [157, 165], title: 'סימני התחלקות ב-3 וב-9',                 skills: ['NUM_DIV_3_9'] },
    { id: 'multdiv.div_6',          topic: 17, pages: [166, 171], title: 'סימני התחלקות ב-6',                      skills: ['NUM_DIV_6'] },
    { id: 'multdiv.div_more',       topic: 18, pages: [172, 181], title: 'עוד על סימני התחלקות',                   skills: ['NUM_DIVISIBILITY'] },
    { id: 'multdiv.primes',         topic: 19, pages: [182, 191], title: 'מספרים ראשוניים ומספרים פריקים',         skills: ['NUM_PRIMES'] },
    { id: 'multdiv.factorise',      topic: 20, pages: [192, 204], title: 'פירוק לגורמים ראשוניים',                 skills: ['NUM_FACTORISE'] },
  ]),

  // ── גאומטריה ─────────────────────────────────────────────────────────────
  ...book('geometry', GEO, 224, [
    // פרק א' מצולעים
    { id: 'geometry.polygons',       topic: 1,  pages: [7, 20],    title: 'אלכסונים',                              skills: ['GEOM_POLYGONS'] },
    { id: 'geometry.parallel',       topic: 2,  pages: [21, 30],   title: 'צלעות מקבילות וצלעות מאונכות',          skills: ['GEOM_PARALLEL_PERP'] },
    { id: 'geometry.rect_square',    topic: 3,  pages: [31, 42],   title: 'מלבן וריבוע',                           skills: ['GEOM_RECT_SQUARE'] },
    { id: 'geometry.triangles',      topic: 4,  pages: [43, 58],   title: 'תכונות של צלעות ושל זוויות במשולש',    skills: ['GEOM_TRIANGLES'] },
    // פרק ב' מדידות
    { id: 'geometry.length',         topic: 5,  pages: [61, 69],   title: 'מידות אורך',                            skills: ['MEAS_LENGTH_MM'] },
    { id: 'geometry.perimeter',      topic: 6,  pages: [70, 77],   title: 'היקף מצולע',                            skills: ['GEOM_PERIMETER'] },
    { id: 'geometry.perimeter_rect', topic: 7,  pages: [78, 89],   title: 'היקף מלבן',                             skills: ['GEOM_PERIMETER_RECT'] },
    { id: 'geometry.area_grid',      topic: 8,  pages: [90, 95],   title: 'שטח מצולע בסמ"ר',                      skills: ['GEOM_AREA_GRID'] },
    { id: 'geometry.area',           topic: 9,  pages: [96, 106],  title: 'שטח מלבן בסמ"ר',                       skills: ['GEOM_AREA'] },
    { id: 'geometry.area_m2',        topic: 10, pages: [107, 114], title: 'שטח מצולע במטר רבוע (מ"ר)',            skills: ['GEOM_AREA_M2'] },
    { id: 'geometry.perim_area',     topic: 11, pages: [115, 122], title: 'עוד על היקף ועל שטח של מלבן',           skills: ['GEOM_PERIM_AREA'] },
    // פרק ג' סימטרייה
    { id: 'geometry.symmetry',       topic: 12, pages: [125, 136], title: 'סימטרייה שיקופית',                      skills: ['GEOM_SYMMETRY'] },
    { id: 'geometry.symmetry_rot',   topic: 13, pages: [137, 145], title: 'סימטרייה סיבובית',                      skills: ['GEOM_SYMMETRY_ROT'] },
    // פרק ד' תיבות
    { id: 'geometry.box_parts',      topic: 14, pages: [149, 161], title: 'פאות, צלעות וקודקודים בתיבה ופריסת תיבה', skills: ['GEOM_SOLIDS'] },
    { id: 'geometry.surface_area',   topic: 15, pages: [162, 170], title: 'שטח פנים של תיבה',                      skills: ['GEOM_SURFACE_AREA'] },
    { id: 'geometry.box_diagonals',  topic: 16, pages: [171, 175], title: 'אלכסונים בתיבה',                        skills: ['GEOM_BOX_DIAGONALS'] },
    { id: 'geometry.volume_cubes',   topic: 17, pages: [176, 182], title: 'חישוב נפח בקוביות',                     skills: ['GEOM_VOLUME_CUBES'] },
    { id: 'geometry.volume_box',     topic: 18, pages: [183, 193], title: 'חישוב נפח תיבה ביחידות מידה מוסכמות',   skills: ['GEOM_VOLUME'] },
    { id: 'geometry.volume_units',   topic: 19, pages: [194, 198], title: 'יחידות נפח',                            skills: ['GEOM_VOLUME_UNITS'] },
    { id: 'geometry.surface_volume', topic: 20, pages: [199, 209], title: 'עוד על שטח פנים ועל נפח של תיבה',       skills: ['GEOM_SURFACE_VOLUME'] },
    { id: 'geometry.weight_volume',  topic: 21, pages: [210, 212], title: 'הקשר בין משקל לנפח',                    skills: ['GEOM_WEIGHT_VOLUME'] },
    // פרק ה' לוח השנה וחישובי זמן
    { id: 'geometry.calendar',       topic: 22, pages: [213, 224], title: 'לוח השנה וחישובי זמן',                  skills: ['MEAS_CALENDAR'] },
  ]),

  // ── שברים פשוטים — dormant until the class starts it ─────────────────────
  ...book('fractions', FR, 148, [
    { id: 'fractions.part_whole',   topic: 1, pages: [7, 19],    title: 'השבר כחלק משלם',                     skills: ['FRAC_PART_WHOLE'] },
    { id: 'fractions.compare',      topic: 2, pages: [20, 28],   title: 'השוואת שברים',                       skills: ['FRAC_COMPARE_SAME', 'FRAC_COMPARE_UNIT'] },
    { id: 'fractions.whole',        topic: 3, pages: [29, 40],   title: 'הרכבת השלם והשוואה לפי השלמה ל-1',   skills: ['FRAC_COMPLETE_WHOLE'] },
    { id: 'fractions.improper',     topic: 4, pages: [41, 53],   title: 'שברים גדולים מ-1 ומספרים מעורבים',   skills: ['FRAC_IMPROPER'] },
    { id: 'fractions.of_quantity',  topic: 5, pages: [54, 66],   title: 'השבר כחלק מכמות',                    skills: ['FRAC_OF_QUANTITY'] },
    { id: 'fractions.add_sub_same', topic: 6, pages: [69, 98],   title: 'חיבור וחיסור שברים בעלי מכנים שווים', skills: ['FRAC_ADD_SUB_SAME'] },
    { id: 'fractions.mixed_a',      topic: 7, pages: [99, 108],  title: 'חיבור וחיסור מספרים מעורבים (א)',     skills: ['FRAC_MIXED_ADD_SUB'] },
    { id: 'fractions.equivalent',   topic: 8, pages: [111, 120], title: 'שמות שונים לשבר',                    skills: ['FRAC_EQUIVALENT'] },
    { id: 'fractions.add_sub_diff', topic: 9, pages: [121, 148], title: 'חיבור וחיסור שברים במכנים שונים',     skills: ['FRAC_ADD_SUB_DIFF'] },
  ]),
];

/** Active strands first, in the order the parent card shows them. */
export const STRANDS: StrandId[] = ['numbers', 'multdiv', 'geometry', 'fractions'];

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
