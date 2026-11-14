/**
 * Cloud copy of device-local learning state.
 *
 * Two pieces of state used to live only in one browser's localStorage:
 *   - CPA memory (`mia_cpa_memory::<profile>`): start layer + struggle counter
 *     per skill, i.e. the adaptive difficulty.
 *   - Mastered high-water (`mia_mastered_hw::<profile>`): the all-time maximum
 *     mastered-skill count that badges consume.
 *
 * They now ride on profiles.local_state so a new device or origin restores
 * them on sign-in. Rules:
 *   - cloud missing, local present  → upload
 *   - local missing, cloud present  → hydrate local
 *   - both present                  → high-water = max; CPA memory = newer by
 *                                     timestamp (ties keep each side as is)
 *   - local data is never deleted; a replaced CPA memory is kept under
 *     `mia_cpa_memory_prev::<profile>`.
 */

import type { CPAMemory } from '../types';
import { pullLocalState, pushLocalState, syncReady } from './sync';

export const CPA_KEY      = (profileId: string) => `mia_cpa_memory::${profileId}`;
export const CPA_AT_KEY   = (profileId: string) => `mia_cpa_memory_at::${profileId}`;
export const CPA_PREV_KEY = (profileId: string) => `mia_cpa_memory_prev::${profileId}`;
export const HW_KEY       = (profileId: string) => `mia_mastered_hw::${profileId}`;

export interface LocalStateSnapshot {
  cpaMemory:    CPAMemory | null;
  cpaUpdatedAt: string | null;
  masteredHw:   number | null;
}

export interface CloudLocalState extends LocalStateSnapshot {
  v: 1;
}

export interface MergeResult {
  local:        LocalStateSnapshot;
  cloud:        CloudLocalState;
  localChanged: boolean;
  cloudChanged: boolean;
}

// ─── Pure merge ───────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validCpa(v: unknown): CPAMemory | null {
  if (!isRecord(v)) return null;
  const out: CPAMemory = {};
  for (const [skill, m] of Object.entries(v)) {
    if (!isRecord(m)) continue;
    if (!['concrete', 'pictorial', 'abstract'].includes(String(m.layer))) continue;
    const s = Number(m.struggleSessions);
    out[skill] = { layer: m.layer as CPAMemory[string]['layer'], struggleSessions: Number.isFinite(s) && s >= 0 ? Math.floor(s) : 0 };
  }
  return Object.keys(out).length > 0 ? out : null;
}

function validCount(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number.NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function validTime(v: unknown): string | null {
  return typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
}

/** Parse whatever the cloud column holds; anything malformed reads as absent. */
export function parseCloudState(raw: unknown): LocalStateSnapshot | null {
  if (!isRecord(raw)) return null;
  return {
    cpaMemory:    validCpa(raw.cpaMemory),
    cpaUpdatedAt: validTime(raw.cpaUpdatedAt),
    masteredHw:   validCount(raw.masteredHw),
  };
}

const ts = (iso: string | null) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY);

export function mergeLocalState(local: LocalStateSnapshot, cloudRaw: unknown): MergeResult {
  const cloud = parseCloudState(cloudRaw) ?? { cpaMemory: null, cpaUpdatedAt: null, masteredHw: null };
  const nextLocal = { ...local };
  const nextCloud = { ...cloud };

  // High-water: all-time maximum on either side.
  const hws = [local.masteredHw, cloud.masteredHw].filter((n): n is number => n !== null);
  const hw  = hws.length > 0 ? Math.max(...hws) : null;
  nextLocal.masteredHw = hw;
  nextCloud.masteredHw = hw;

  // CPA memory: newer wins; a missing side takes the other.
  const hasLocal = local.cpaMemory !== null && Object.keys(local.cpaMemory).length > 0;
  const hasCloud = cloud.cpaMemory !== null;
  if (hasLocal && !hasCloud) {
    nextCloud.cpaMemory = local.cpaMemory; nextCloud.cpaUpdatedAt = local.cpaUpdatedAt;
  } else if (!hasLocal && hasCloud) {
    nextLocal.cpaMemory = cloud.cpaMemory; nextLocal.cpaUpdatedAt = cloud.cpaUpdatedAt;
  } else if (hasLocal && hasCloud) {
    if (ts(cloud.cpaUpdatedAt) > ts(local.cpaUpdatedAt)) {
      nextLocal.cpaMemory = cloud.cpaMemory; nextLocal.cpaUpdatedAt = cloud.cpaUpdatedAt;
    } else if (ts(local.cpaUpdatedAt) > ts(cloud.cpaUpdatedAt)) {
      nextCloud.cpaMemory = local.cpaMemory; nextCloud.cpaUpdatedAt = local.cpaUpdatedAt;
    }
    // Equal timestamps (including two legacy devices with none): leave both.
  }

  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const localChanged = nextLocal.masteredHw !== local.masteredHw
    || !same(nextLocal.cpaMemory, local.cpaMemory) || nextLocal.cpaUpdatedAt !== local.cpaUpdatedAt;
  const cloudChanged = cloudRaw === null || cloudRaw === undefined
    ? (nextCloud.masteredHw !== null || nextCloud.cpaMemory !== null)
    : (nextCloud.masteredHw !== cloud.masteredHw
      || !same(nextCloud.cpaMemory, cloud.cpaMemory) || nextCloud.cpaUpdatedAt !== cloud.cpaUpdatedAt);

  return { local: nextLocal, cloud: { v: 1, ...nextCloud }, localChanged, cloudChanged };
}

// ─── localStorage access ─────────────────────────────────────────────────────

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch { return null; }
}

export function readLocalSnapshot(profileId: string): LocalStateSnapshot {
  let at: string | null = null;
  try { at = validTime(localStorage.getItem(CPA_AT_KEY(profileId))); } catch { /* storage off */ }
  return {
    cpaMemory:    validCpa(readJson(CPA_KEY(profileId))),
    cpaUpdatedAt: at,
    masteredHw:   validCount(readJson(HW_KEY(profileId))),
  };
}

/** Write only what changed. Never removes a key; keeps the replaced CPA memory. */
export function writeLocalSnapshot(profileId: string, before: LocalStateSnapshot, next: LocalStateSnapshot): void {
  try {
    if (next.masteredHw !== null && next.masteredHw !== before.masteredHw) {
      localStorage.setItem(HW_KEY(profileId), JSON.stringify(next.masteredHw));
    }
    if (next.cpaMemory !== null && JSON.stringify(next.cpaMemory) !== JSON.stringify(before.cpaMemory)) {
      const prevRaw = localStorage.getItem(CPA_KEY(profileId));
      if (prevRaw !== null) localStorage.setItem(CPA_PREV_KEY(profileId), prevRaw);
      localStorage.setItem(CPA_KEY(profileId), JSON.stringify(next.cpaMemory));
    }
    if (next.cpaUpdatedAt !== null && next.cpaUpdatedAt !== before.cpaUpdatedAt) {
      localStorage.setItem(CPA_AT_KEY(profileId), next.cpaUpdatedAt);
    }
  } catch { /* quota or disabled storage: keep running on what we have */ }
}

// ─── Orchestration ───────────────────────────────────────────────────────────

/**
 * Sign-in / app-load reconciliation: pull, merge, hydrate local, push if the
 * cloud is behind. Call before a session starts so the composer sees restored
 * CPA memory. Never throws.
 */
export async function reconcileLocalState(profileId: string): Promise<void> {
  if (!syncReady()) return;
  try {
    const cloudRaw = await pullLocalState(profileId);
    const before   = readLocalSnapshot(profileId);
    const merged   = mergeLocalState(before, cloudRaw);
    if (merged.localChanged) writeLocalSnapshot(profileId, before, merged.local);
    if (merged.cloudChanged) await pushLocalState(profileId, merged.cloud);
  } catch (err) {
    console.warn('[sync] reconcileLocalState failed:', err);
  }
}

/**
 * Write-through after a local change. Pulls first so one device never clobbers
 * the other's newer field; never rewrites local mid-session.
 */
export async function pushLocalStateNow(profileId: string): Promise<void> {
  if (!syncReady()) return;
  try {
    const cloudRaw = await pullLocalState(profileId);
    const merged   = mergeLocalState(readLocalSnapshot(profileId), cloudRaw);
    if (merged.cloudChanged) await pushLocalState(profileId, merged.cloud);
  } catch (err) {
    console.warn('[sync] pushLocalState failed:', err);
  }
}

export const LOCAL_STATE_PUSH_DELAY_MS = 3000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounced write-through: a burst of per-answer saves becomes one push. */
export function scheduleLocalStatePush(profileId: string): void {
  if (!syncReady()) return;
  const existing = timers.get(profileId);
  if (existing) clearTimeout(existing);
  timers.set(profileId, setTimeout(() => {
    timers.delete(profileId);
    void pushLocalStateNow(profileId);
  }, LOCAL_STATE_PUSH_DELAY_MS));
}
