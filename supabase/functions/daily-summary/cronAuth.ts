/**
 * Shared-secret check for the scheduled trigger.
 *
 * The GitHub Actions job sends the secret in the `x-cron-secret` header.
 * Only its SHA-256 hash is stored, in public.cron_secrets (RLS on, no policies,
 * no anon/authenticated grants; service_role has SELECT only).
 * Pure helpers so they can be unit-tested outside Deno.
 */

export const CRON_SECRET_HEADER = 'x-cron-secret';
export const CRON_SECRET_NAME = 'daily-summary';

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison for equal-length strings (hex digests here). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True only when a non-empty secret was provided and its hash matches the stored hash. */
export async function isCronAuthorized(
  provided: string | null | undefined,
  storedSha256: string | null | undefined,
): Promise<boolean> {
  const secret = (provided ?? '').trim();
  const stored = (storedSha256 ?? '').trim().toLowerCase();
  if (!secret || !/^[0-9a-f]{64}$/.test(stored)) return false;
  return timingSafeEqual(await sha256Hex(secret), stored);
}
