/**
 * Hebrew word bank for word-problem templates.
 *
 * Names carry gender so the template can pick the correct verb conjugation.
 * Verbs are listed in (feminine, masculine) pairs; the template selects by
 * the chosen name's gender.
 *
 * SEMANTIC SAFETY (added 2026-07-31 after live bugs Mia hit):
 *   Verbs and objects used to be paired by index arithmetic, which produced
 *   sentences like "אורי אכל 32 ספרים" (ate 32 books) and — far worse — the
 *   neutral 3-step template applied a hardcoded נמכרו/נקנו list to every
 *   scenario, generating "בכיתה יש 40 ילדים. נמכרו 12, נקנו 5"
 *   (40 children in the class; 12 were sold, 5 bought).
 *
 *   Two rules now prevent this by construction:
 *     1. Every object declares a `kind`, and every verb declares which kinds it
 *        accepts. Generators must filter — see `subVerbsFor` / `addVerbsFor`.
 *     2. Neutral scenarios carry their OWN verbs. No generator may substitute a
 *        generic buy/sell list; people are never bought, sold, eaten or lost.
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

/**
 * What kind of thing is being counted. Decides which verbs may act on it.
 * People deliberately have no entry in OBJECTS — a child never "has 70 children";
 * people appear only in neutral scenarios, which carry their own verbs.
 */
export type ObjectKind = 'edible' | 'possession';

export interface CountObject {
  noun: string;
  kind: ObjectKind;
}

/** Verb conjugation pair plus the object kinds it may legally act on. */
export interface VerbPair {
  f:     string;
  m:     string;
  kinds: ObjectKind[];
}

/** "had" — to express possession at problem start. */
export const HAD: VerbPair = { f: 'היו ל', m: 'היו ל', kinds: ['edible', 'possession'] };

const BOTH: ObjectKind[] = ['edible', 'possession'];

/** Subtract verbs (gave/lost/sold/shared/ate) — feminine + masculine past. */
export const SUB_VERBS: VerbPair[] = [
  { f: 'נתנה',  m: 'נתן',  kinds: BOTH },          // gave
  { f: 'איבדה', m: 'איבד', kinds: ['possession'] }, // lost — you don't "lose" food in a counting problem
  { f: 'מכרה',  m: 'מכר',  kinds: BOTH },          // sold
  { f: 'חילקה', m: 'חילק', kinds: BOTH },          // shared out
  { f: 'אכלה',  m: 'אכל',  kinds: ['edible'] },    // ate — THE bug: never books
];

/** Add verbs (bought/received/found). */
export const ADD_VERBS: VerbPair[] = [
  { f: 'קנתה',  m: 'קנה',  kinds: BOTH },          // bought
  { f: 'קיבלה', m: 'קיבל', kinds: BOTH },          // received
  { f: 'מצאה',  m: 'מצא',  kinds: ['possession'] }, // found
];

/** Things a child can own and count. */
export const OBJECTS: CountObject[] = [
  { noun: 'בולים',    kind: 'possession' },  // stamps
  { noun: 'גולות',    kind: 'possession' },  // marbles
  { noun: 'כרטיסים',  kind: 'possession' },  // cards
  { noun: 'ממתקים',   kind: 'edible'     },  // candies
  { noun: 'מדבקות',   kind: 'possession' },  // stickers
  { noun: 'צעצועים',  kind: 'possession' },  // toys
  { noun: 'מטבעות',   kind: 'possession' },  // coins
  { noun: 'עפרונות',  kind: 'possession' },  // pencils
  { noun: 'ספרים',    kind: 'possession' },  // books
  { noun: 'תפוחים',   kind: 'edible'     },  // apples
  { noun: 'עוגיות',   kind: 'edible'     },  // cookies
  { noun: 'בלונים',   kind: 'possession' },  // balloons
];

/** Verbs that may legally act on this object. Never returns an empty list. */
export function subVerbsFor(kind: ObjectKind): VerbPair[] {
  return SUB_VERBS.filter(v => v.kinds.includes(kind));
}

export function addVerbsFor(kind: ObjectKind): VerbPair[] {
  return ADD_VERBS.filter(v => v.kinds.includes(kind));
}

/**
 * Neutral subject scenarios — no gender agreement needed on the subject.
 *
 * Each scenario supplies its own verbs, in plural 3rd-person/passive form.
 * At least three of each so a three-step chain never has to repeat or borrow.
 */
export interface NeutralScenario {
  subjectStart: string;
  object:       string;
  subVerbs:     string[];
  addVerbs:     string[];
}

export const NEUTRAL_SCENARIOS: NeutralScenario[] = [
  {
    subjectStart: 'בכיתה יש', object: 'ילדים',
    // People: they come and go. They are never sold, bought, lost or eaten.
    subVerbs: ['הלכו לטיול', 'יצאו הביתה', 'עברו לכיתה אחרת'],
    addVerbs: ['הצטרפו', 'הגיעו', 'חזרו'],
  },
  {
    subjectStart: 'במאפייה אפו', object: 'לחמניות',
    subVerbs: ['נמכרו', 'נאכלו', 'חולקו'],
    addVerbs: ['נאפו עוד', 'הוכנו', 'הגיעו'],
  },
  {
    subjectStart: 'בחנות יש', object: 'תפוחים',
    subVerbs: ['נמכרו', 'נלקחו', 'התקלקלו'],
    addVerbs: ['הגיעו עוד', 'נוספו', 'הובאו'],
  },
  {
    subjectStart: 'בגינה יש', object: 'פרחים',
    subVerbs: ['נקטפו', 'נבלו', 'נמכרו'],
    addVerbs: ['נשתלו עוד', 'פרחו', 'הגיעו'],
  },
  {
    subjectStart: 'בספרייה יש', object: 'ספרים',
    subVerbs: ['הושאלו', 'נלקחו', 'אבדו'],
    addVerbs: ['הוחזרו', 'נתרמו', 'נוספו'],
  },
  {
    subjectStart: 'במחסן יש', object: 'קופסאות',
    subVerbs: ['נלקחו', 'נשלחו', 'נפתחו'],
    addVerbs: ['נוספו', 'הגיעו', 'הובאו'],
  },
];
