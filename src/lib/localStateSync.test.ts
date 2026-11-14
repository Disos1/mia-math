// @vitest-environment jsdom
/** Synthetic scenarios only. Never copy learner records into tests. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const cloud = vi.hoisted(() => ({ value: null as unknown, ready: true, pushes: [] as unknown[], pulls: 0 }));
vi.mock('./sync', () => ({
  syncReady:      () => cloud.ready,
  pullLocalState: vi.fn(async () => { cloud.pulls++; return cloud.value; }),
  pushLocalState: vi.fn(async (_p: string, s: unknown) => { cloud.pushes.push(s); cloud.value = s; return true; }),
}));

import {
  mergeLocalState, parseCloudState, readLocalSnapshot, reconcileLocalState,
  scheduleLocalStatePush, LOCAL_STATE_PUSH_DELAY_MS, CPA_KEY, CPA_AT_KEY, CPA_PREV_KEY, HW_KEY,
} from './localStateSync';
import { saveCpaMemory, loadCpaMemory } from './cpaMemory';
import { bumpMasteredHighWater } from './sessionStore';

const P = 'synthetic-profile';
const A = { SKILL_A: { layer: 'pictorial' as const, struggleSessions: 1 } };
const B = { SKILL_A: { layer: 'concrete' as const, struggleSessions: 0 }, SKILL_B: { layer: 'abstract' as const, struggleSessions: 2 } };
const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-02T10:00:00.000Z';
const empty = { cpaMemory: null, cpaUpdatedAt: null, masteredHw: null };

beforeEach(() => { localStorage.clear(); cloud.value = null; cloud.ready = true; cloud.pushes = []; cloud.pulls = 0; });
afterEach(() => { vi.useRealTimers(); });

describe('mergeLocalState', () => {
  it('uploads local state when the cloud has none', () => {
    const r = mergeLocalState({ cpaMemory: A, cpaUpdatedAt: null, masteredHw: 5 }, null);
    expect(r.cloudChanged).toBe(true);
    expect(r.localChanged).toBe(false);
    expect(r.cloud).toEqual({ v: 1, cpaMemory: A, cpaUpdatedAt: null, masteredHw: 5 });
  });

  it('hydrates a fresh device from the cloud', () => {
    const r = mergeLocalState(empty, { v: 1, cpaMemory: A, cpaUpdatedAt: T1, masteredHw: 7 });
    expect(r.localChanged).toBe(true);
    expect(r.cloudChanged).toBe(false);
    expect(r.local).toEqual({ cpaMemory: A, cpaUpdatedAt: T1, masteredHw: 7 });
  });

  it('takes the maximum high-water in both directions', () => {
    const up = mergeLocalState({ ...empty, masteredHw: 9 }, { v: 1, cpaMemory: null, cpaUpdatedAt: null, masteredHw: 4 });
    expect(up.cloud.masteredHw).toBe(9); expect(up.cloudChanged).toBe(true); expect(up.localChanged).toBe(false);
    const down = mergeLocalState({ ...empty, masteredHw: 3 }, { v: 1, cpaMemory: null, cpaUpdatedAt: null, masteredHw: 8 });
    expect(down.local.masteredHw).toBe(8); expect(down.localChanged).toBe(true); expect(down.cloudChanged).toBe(false);
  });

  it('keeps the newer CPA memory by timestamp', () => {
    const cloudNewer = mergeLocalState({ cpaMemory: A, cpaUpdatedAt: T1, masteredHw: null }, { v: 1, cpaMemory: B, cpaUpdatedAt: T2, masteredHw: null });
    expect(cloudNewer.local.cpaMemory).toEqual(B); expect(cloudNewer.cloudChanged).toBe(false);
    const localNewer = mergeLocalState({ cpaMemory: A, cpaUpdatedAt: T2, masteredHw: null }, { v: 1, cpaMemory: B, cpaUpdatedAt: T1, masteredHw: null });
    expect(localNewer.cloud.cpaMemory).toEqual(A); expect(localNewer.localChanged).toBe(false);
    // An untimestamped (legacy) device loses to any timestamped copy.
    const legacy = mergeLocalState({ cpaMemory: A, cpaUpdatedAt: null, masteredHw: null }, { v: 1, cpaMemory: B, cpaUpdatedAt: T1, masteredHw: null });
    expect(legacy.local.cpaMemory).toEqual(B);
  });

  it('leaves both sides alone on a timestamp tie', () => {
    const r = mergeLocalState({ cpaMemory: A, cpaUpdatedAt: null, masteredHw: null }, { v: 1, cpaMemory: B, cpaUpdatedAt: null, masteredHw: null });
    expect(r.localChanged).toBe(false); expect(r.cloudChanged).toBe(false);
  });

  it('treats malformed cloud data as absent and is a no-op when nothing exists', () => {
    expect(parseCloudState('garbage')).toBeNull();
    expect(parseCloudState({ cpaMemory: { X: { layer: 'bogus' } }, masteredHw: -1 })).toEqual(empty);
    const r = mergeLocalState(empty, null);
    expect(r.localChanged).toBe(false); expect(r.cloudChanged).toBe(false);
  });
});

describe('reconcileLocalState', () => {
  it('restores CPA memory and high-water on a new origin, never deleting local data', async () => {
    cloud.value = { v: 1, cpaMemory: B, cpaUpdatedAt: T2, masteredHw: 6 };
    localStorage.setItem(CPA_KEY(P), JSON.stringify(A));
    localStorage.setItem(CPA_AT_KEY(P), T1);
    await reconcileLocalState(P);
    expect(loadCpaMemory(P)).toEqual(B);
    expect(JSON.parse(localStorage.getItem(CPA_PREV_KEY(P))!)).toEqual(A);
    expect(localStorage.getItem(HW_KEY(P))).toBe('6');
    expect(cloud.pushes).toHaveLength(0);
  });

  it('uploads a device-only state once', async () => {
    localStorage.setItem(CPA_KEY(P), JSON.stringify(A));
    localStorage.setItem(HW_KEY(P), '4');
    await reconcileLocalState(P);
    expect(cloud.pushes).toEqual([{ v: 1, cpaMemory: A, cpaUpdatedAt: null, masteredHw: 4 }]);
    await reconcileLocalState(P);
    expect(cloud.pushes).toHaveLength(1);
    expect(readLocalSnapshot(P)).toEqual({ cpaMemory: A, cpaUpdatedAt: null, masteredHw: 4 });
  });

  it('does nothing when signed out or the column is missing', async () => {
    cloud.ready = false;
    localStorage.setItem(HW_KEY(P), '4');
    await reconcileLocalState(P);
    expect(cloud.pulls).toBe(0);
    cloud.ready = true; cloud.value = null; // missing column reads as null
    await reconcileLocalState(P);
    expect(localStorage.getItem(HW_KEY(P))).toBe('4');
  });
});

describe('write-through', () => {
  it('debounces CPA saves into one push carrying a timestamp', async () => {
    vi.useFakeTimers();
    saveCpaMemory(P, A);
    saveCpaMemory(P, B);
    expect(cloud.pulls).toBe(0);
    await vi.advanceTimersByTimeAsync(LOCAL_STATE_PUSH_DELAY_MS + 10);
    expect(cloud.pushes).toHaveLength(1);
    const pushed = cloud.pushes[0] as { cpaMemory: unknown; cpaUpdatedAt: string };
    expect(pushed.cpaMemory).toEqual(B);
    expect(Number.isFinite(Date.parse(pushed.cpaUpdatedAt))).toBe(true);
  });

  it('does not re-stamp unchanged CPA memory', () => {
    saveCpaMemory(P, A);
    localStorage.setItem(CPA_AT_KEY(P), T1);
    saveCpaMemory(P, A);
    expect(localStorage.getItem(CPA_AT_KEY(P))).toBe(T1);
  });

  it('pushes a raised badge high-water and keeps a higher cloud value', async () => {
    vi.useFakeTimers();
    cloud.value = { v: 1, cpaMemory: null, cpaUpdatedAt: null, masteredHw: 10 };
    expect(bumpMasteredHighWater(P, 3)).toBe(3);
    await vi.advanceTimersByTimeAsync(LOCAL_STATE_PUSH_DELAY_MS + 10);
    expect(cloud.pushes).toHaveLength(0); // cloud 10 already ≥ local 3
    cloud.value = { v: 1, cpaMemory: null, cpaUpdatedAt: null, masteredHw: 2 };
    bumpMasteredHighWater(P, 5);
    await vi.advanceTimersByTimeAsync(LOCAL_STATE_PUSH_DELAY_MS + 10);
    expect((cloud.pushes[0] as { masteredHw: number }).masteredHw).toBe(5);
  });

  it('skips scheduling when sync is not ready', async () => {
    vi.useFakeTimers();
    cloud.ready = false;
    scheduleLocalStatePush(P);
    await vi.advanceTimersByTimeAsync(LOCAL_STATE_PUSH_DELAY_MS + 10);
    expect(cloud.pulls).toBe(0);
  });
});
