import { describe, expect, it } from 'vitest';
import { isCronAuthorized, sha256Hex, timingSafeEqual } from '../../supabase/functions/daily-summary/cronAuth';
import source from '../../supabase/functions/daily-summary/index.ts?raw';

const SECRET = 'test-secret-not-real-0123456789abcdef';

describe('daily-summary cron auth', () => {
  it('hashes to lowercase SHA-256 hex', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('accepts only the matching secret', async () => {
    const stored = await sha256Hex(SECRET);
    expect(await isCronAuthorized(SECRET, stored)).toBe(true);
    expect(await isCronAuthorized(` ${SECRET}\n`, stored.toUpperCase())).toBe(true);
    expect(await isCronAuthorized(SECRET + 'x', stored)).toBe(false);
    expect(await isCronAuthorized('', stored)).toBe(false);
    expect(await isCronAuthorized(null, stored)).toBe(false);
  });

  it('fails closed when nothing valid is stored', async () => {
    expect(await isCronAuthorized(SECRET, null)).toBe(false);
    expect(await isCronAuthorized(SECRET, '')).toBe(false);
    expect(await isCronAuthorized(SECRET, 'not-a-hash')).toBe(false);
  });

  it('compares equal-length strings only', () => {
    expect(timingSafeEqual('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqual('abcd', 'abce')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('checks the secret before any email work', () => {
    const auth = source.indexOf('isCronAuthorized(req.headers.get(CRON_SECRET_HEADER)');
    expect(auth).toBeGreaterThan(0);
    expect(auth).toBeLessThan(source.indexOf('auth.admin.listUsers()'));
    expect(auth).toBeLessThan(source.indexOf('api.resend.com'));
  });
});
