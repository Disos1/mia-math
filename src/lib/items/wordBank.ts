/**
 * Hebrew word bank for word-problem templates.
 *
 * Names carry gender so the template can pick the correct verb conjugation.
 * Verbs are listed in (feminine, masculine) pairs; the template selects by
 * the chosen name's gender. Object/scenario lists are gender-neutral.
 */

export interface NamedActor {
  name:   string;
  gender: 'f' | 'm';
}

export const NAMES: NamedActor[] = [
  { name: 'ליאה',    gender: 'f' },
  { name: 'נועה',    gender: 'f' },
  { name: 'דנה',     gender: 'f' },
  { name: 'שירה',    gender: 'f' },
  { name: 'גל',      gender: 'f' },
  { name: 'אורה',    gender: 'f' },
  { name: 'נטע',     gender: 'f' },
  { name: 'הילה',    gender: 'f' },
  { name: 'יעל',     gender: 'f' },
  { name: 'תמר',     gender: 'f' },
  { name: 'יואב',    gender: 'm' },
  { name: 'אורי',    gender: 'm' },
  { name: 'אלון',    gender: 'm' },
  { name: 'יוני',    gender: 'm' },
  { name: 'אדם',     gender: 'm' },
  { name: 'תום',     gender: 'm' },
  { name: 'איתן',    gender: 'm' },
  { name: 'רן',      gender: 'm' },
  { name: 'אסף',     gender: 'm' },
  { name: 'נדב',     gender: 'm' },
];

/** Verb conjugation pair: feminine past-tense, masculine past-tense. */
export interface VerbPair { f: string; m: string; }

/** "had" — to express possession at problem start. */
export const HAD: VerbPair = { f: 'היו ל', m: 'היו ל' }; // both use "היו ל-{name}"

/** Subtract verbs (gave/lost/sold/used) — feminine + masculine past. */
export const SUB_VERBS: VerbPair[] = [
  { f: 'נתנה',     m: 'נתן'     }, // gave
  { f: 'איבדה',    m: 'איבד'    }, // lost
  { f: 'מכרה',     m: 'מכר'     }, // sold
  { f: 'חילקה',    m: 'חילק'    }, // divided / gave away
  { f: 'אכלה',     m: 'אכל'     }, // ate
];

/** Add verbs (got/found/bought/received). */
export const ADD_VERBS: VerbPair[] = [
  { f: 'קנתה',     m: 'קנה'     }, // bought
  { f: 'קיבלה',    m: 'קיבל'    }, // received
  { f: 'מצאה',     m: 'מצא'     }, // found
];

/** Object types for things-being-counted. Plural masculine grammatical gender for most. */
export const OBJECTS: string[] = [
  'בולים',       // stamps
  'גולות',       // marbles
  'כרטיסים',     // cards
  'ממתקים',      // candies
  'מדבקות',      // stickers (fem.)
  'צעצועים',     // toys
  'מטבעות',      // coins
  'עפרונות',     // pencils
  'ספרים',       // books
  'תפוחים',      // apples
  'גבישים',      // crystals
  'בלונים',      // balloons
];

/** Neutral subject scenarios — no gender agreement needed on the subject. */
export interface NeutralScenario {
  subjectStart: string;   // e.g. "בכיתה יש" / "במאפיה אפו"
  object:       string;   // e.g. "ילדים" / "לחמניות"
  /** verb-form to use for "subtracted" — typically passive/3rd-person. */
  subVerb:      string;   // e.g. "הלכו לטיול" / "מכרו"
  /** verb-form for "added". */
  addVerb:      string;   // e.g. "חזרו" / "אפו עוד"
}

export const NEUTRAL_SCENARIOS: NeutralScenario[] = [
  { subjectStart: 'בכיתה יש',      object: 'ילדים',     subVerb: 'הלכו לטיול',  addVerb: 'הצטרפו'    },
  { subjectStart: 'במאפיה אפו',    object: 'לחמניות',   subVerb: 'מכרו',        addVerb: 'אפו עוד'   },
  { subjectStart: 'בחנות יש',      object: 'תפוחים',    subVerb: 'נמכרו',       addVerb: 'הגיעו עוד' },
  { subjectStart: 'בגינה יש',      object: 'פרחים',     subVerb: 'נקטפו',       addVerb: 'נשתלו עוד' },
  { subjectStart: 'בספרייה יש',    object: 'ספרים',     subVerb: 'הושאלו',      addVerb: 'הוחזרו'    },
  { subjectStart: 'במחסן יש',      object: 'קופסאות',   subVerb: 'נלקחו',       addVerb: 'נוספו'     },
];
