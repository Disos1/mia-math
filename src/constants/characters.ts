/**
 * Pre-approved character name pool for word problems.
 * The item generator receives a randomly selected name as a parameter.
 * the learner's actual name never enters an LLM prompt.
 *
 * Names are an approved, fixed word-problem vocabulary, not profile data.
 */
export const GIRL_NAMES = [
  // Approved vocabulary
  'מיה', 'מיכל', 'אליס', 'נטשה', 'סבטה', 'אולגה',
  // Common Israeli girls' names
  'דנה', 'שירה', 'נועה', 'רות', 'לימור', 'אורית',
  'מאיה', 'יעל', 'ליאור', 'גל', 'תמר', 'רוני',
] as const;

export const BOY_NAMES = [
  // Approved vocabulary
  'דימה', 'ליאו', 'סשה', 'סרגיי',
  // Common Israeli boys' names
  'אמיר', 'יוסי', 'אורי', 'גיל', 'דוד', 'עידן',
  'אביב', 'נתן', 'אלון', 'רן', 'עמית', 'שי',
] as const;

export type GirlName = typeof GIRL_NAMES[number];
export type BoyName  = typeof BOY_NAMES[number];

export function randomGirlName(): GirlName {
  return GIRL_NAMES[Math.floor(Math.random() * GIRL_NAMES.length)];
}

export function randomBoyName(): BoyName {
  return BOY_NAMES[Math.floor(Math.random() * BOY_NAMES.length)];
}
