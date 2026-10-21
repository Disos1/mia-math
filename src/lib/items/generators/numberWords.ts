/**
 * Hebrew number words, 0 … 1,000,000 — as the numbers booklet writes them
 * (topics 1–2: "קריאת מספר בספרות וכתיבת מספר במילים").
 *
 * The rules a fourth-grader is taught:
 *   - Counting numbers are feminine: שלוש מאות ארבעים וחמש.
 *   - The count of thousands is masculine: ארבעים וחמישה אלף.
 *   - 1–10 thousand have their own forms: אלף, אלפיים, שלושת אלפים … עשרת אלפים.
 *   - "ו" joins the LAST word of a group: שלוש מאות ארבעים וחמש. After the
 *     thousands it appears only when one word follows (מאתיים אלף ושלושים);
 *     with several, the group carries its own (שש מאות אלף שמונים ושתיים).
 */

const FEM_UNITS  = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const FEM_TEENS  = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה',
                    'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const MASC_UNITS = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'];
const MASC_TEENS = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר',
                    'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר'];
const TENS       = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
const HUNDREDS   = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות',
                    'שבע מאות', 'שמונה מאות', 'תשע מאות'];
/** 3–10 thousand: construct state + אלפים. */
const THOUSANDS_CONSTRUCT = ['', '', '', 'שלושת', 'ארבעת', 'חמשת', 'ששת', 'שבעת', 'שמונת', 'תשעת', 'עשרת'];

/** The words of 1–999, before joining. */
function groupWords(n: number, masculine: boolean): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100), r = n % 100;
  if (h) out.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) out.push((masculine ? MASC_TEENS : FEM_TEENS)[r - 10]);
  else {
    if (r >= 20) out.push(TENS[Math.floor(r / 10)]);
    if (r % 10) out.push((masculine ? MASC_UNITS : FEM_UNITS)[r % 10]);
  }
  return out;
}

/** "ו" before the last word. */
const join = (words: string[]) =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(' ')} ו${words[words.length - 1]}`;

function thousandsWords(t: number): string {
  if (t === 1) return 'אלף';
  if (t === 2) return 'אלפיים';
  if (t <= 10) return `${THOUSANDS_CONSTRUCT[t]} אלפים`;
  return `${join(groupWords(t, true))} אלף`;
}

export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new RangeError(`numberWords: ${n}`);
  if (n === 0) return 'אפס';
  if (n === 1_000_000) return 'מיליון';
  const t = Math.floor(n / 1000), r = n % 1000;
  const rest = groupWords(r, false);
  if (t === 0) return join(rest);
  const th = thousandsWords(t);
  if (rest.length === 0) return th;
  if (rest.length === 1) return `${th} ו${rest[0]}`;
  return `${th} ${join(rest)}`;
}
