import heF from './he_f.json';
import heM from './he_m.json';

export type Gender = 'f' | 'm';

// All valid keys are derived from the feminine locale file.
// The masculine file may be a subset; missing keys fall back to feminine.
export type LocaleKey = keyof typeof heF;

export interface TOptions {
  gender: Gender;
  [param: string]: string | number;
}

/**
 * Gender-aware string resolver.
 *
 * Every user-facing string in the app routes through this function.
 * A raw Hebrew literal in JSX is a bug — it can't be gender-switched later
 * without a code change.
 *
 * Usage:
 *   t('welcome.cta', { gender: profile.gender })
 *   t('diag_item.progress', { gender: 'f', current: 3, total: 10 })
 */
export function t(key: LocaleKey, options: TOptions): string {
  const locale = options.gender === 'm'
    ? (heM as Partial<Record<LocaleKey, string>>)
    : heF;

  // Fall back to feminine if masculine entry is missing
  const template = locale[key] ?? heF[key] ?? `[${key}]`;

  return template.replace(/\{(\w+)\}/g, (_, param: string) =>
    param in options ? String(options[param as keyof TOptions]) : `{${param}}`
  );
}
