/**
 * CPA memory — cross-session persistence for the scaffolding engine. Opus task.
 *
 * The in-session CPA state machine (cpaState.ts) is deliberately ephemeral;
 * this module is its long-term memory. It answers two questions the session
 * composer asks at plan time:
 *
 *   1. What layer should this skill START at today?
 *      (yesterday's drop to pictorial must survive the session boundary)
 *
 *   2. Is the learner STUCK on this skill?
 *      (3 consecutive sessions below 55% first-attempt accuracy → escalate:
 *       drop the start layer one level and lead with a worked example)
 *
 * This closes the audited failure mode where a skill sat at ~45% accuracy for
 * 68 sessions with no reaction from the system.
 */

import type { CPAMemory, CPALayer } from '../types';

const KEY = (profileId: string) => `mia_cpa_memory::${profileId}`;

/** Sessions below the struggle threshold before escalation fires. */
export const STRUGGLE_SESSIONS_TO_ESCALATE = 3;
/** First-attempt accuracy below this marks a session as a struggle session. */
export const STRUGGLE_ACCURACY = 0.55;
/** Accuracy at/above this resets the struggle counter. */
export const RECOVERY_ACCURACY = 0.70;
/** Minimum first attempts on the skill in a session for it to count either way. */
export const MIN_ATTEMPTS_TO_JUDGE = 3;

const ORDER: CPALayer[] = ['concrete', 'pictorial', 'abstract'];

function dropLayer(layer: CPALayer): CPALayer {
  const i = ORDER.indexOf(layer);
  return i > 0 ? ORDER[i - 1] : layer;
}

export function loadCpaMemory(profileId: string): CPAMemory {
  try {
    const raw = localStorage.getItem(KEY(profileId));
    return raw ? (JSON.parse(raw) as CPAMemory) : {};
  } catch {
    return {};
  }
}

export function saveCpaMemory(profileId: string, memory: CPAMemory): void {
  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(memory));
  } catch {
    // Storage quota exceeded or disabled — silent failure, no crash
  }
}

/** Start layer for a skill: memory first, diagnostic hint second, abstract last. */
export function startLayerFor(
  memory:    CPAMemory,
  skillCode: string,
  diagnosticHint: CPALayer | undefined,
): CPALayer {
  return memory[skillCode]?.layer ?? diagnosticHint ?? 'abstract';
}

/** Has escalation marked this skill as needing a worked example first? */
export function isStruggling(memory: CPAMemory, skillCode: string): boolean {
  return (memory[skillCode]?.struggleSessions ?? 0) >= STRUGGLE_SESSIONS_TO_ESCALATE - 1;
}

/**
 * Fold one finished session into memory. Called from Session.finish().
 *
 * `endLayers` — the CPA layer each skill ended the session at.
 * `skillStats` — per-skill first-attempt counts for this session.
 *
 * Escalation: when the struggle counter reaches the threshold, the start
 * layer drops one level and the counter resets — the next session opens
 * with a scaffold instead of another round of the same failing drill.
 */
export function updateCpaMemoryAfterSession(
  memory:     CPAMemory,
  endLayers:  Record<string, CPALayer>,
  skillStats: Record<string, { attempts: number; correct: number }>,
): CPAMemory {
  const next: CPAMemory = { ...memory };

  for (const [skill, endLayer] of Object.entries(endLayers)) {
    const prior = next[skill] ?? { layer: endLayer, struggleSessions: 0 };
    let { struggleSessions } = prior;
    let layer = endLayer;

    const stats = skillStats[skill];
    if (stats && stats.attempts >= MIN_ATTEMPTS_TO_JUDGE) {
      const acc = stats.correct / stats.attempts;
      if (acc < STRUGGLE_ACCURACY) {
        struggleSessions += 1;
        if (struggleSessions >= STRUGGLE_SESSIONS_TO_ESCALATE) {
          layer = dropLayer(layer);
          struggleSessions = 0;
        }
      } else if (acc >= RECOVERY_ACCURACY) {
        struggleSessions = 0;
      }
    }

    next[skill] = { layer, struggleSessions };
  }

  return next;
}
