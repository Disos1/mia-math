/**
 * CPA scaffolding state machine — Opus task.
 *
 * Concrete → Pictorial → Abstract, reversible. An error on the current layer
 * drops her to the next easier layer; two consecutive correct climbs to the
 * next harder layer. Mastery only counts at 'abstract' (enforced by the
 * mastery tracker — this module only manages layer transitions).
 *
 * This module is stateless. Caller holds the per-skill CPAState and
 * passes it through each transition function.
 *
 * In Phase 2 (this build) most practice items exist only at the 'abstract'
 * layer (pictorial/concrete variants arrive with Phase 3 item generator).
 * The state machine still tracks layer transitions so we can plug richer
 * items in later without restructuring the session runner.
 */

import type { CPAState, CPALayer } from '../types';

const ORDER: CPALayer[] = ['concrete', 'pictorial', 'abstract'];

/** Create a fresh state at the given starting layer. */
export function initCPAState(skillCode: string, startLayer: CPALayer): CPAState {
  return {
    skillCode,
    currentLayer:       startLayer,
    consecutiveCorrect: 0,
    consecutiveWrong:   0,
  };
}

/** One step down toward concrete; returns current layer if already there. */
function drop(layer: CPALayer): CPALayer {
  const i = ORDER.indexOf(layer);
  return i > 0 ? ORDER[i - 1] : layer;
}

/** One step up toward abstract; returns current layer if already there. */
function climb(layer: CPALayer): CPALayer {
  const i = ORDER.indexOf(layer);
  return i < ORDER.length - 1 ? ORDER[i + 1] : layer;
}

/**
 * Transition after a correct answer.
 *
 * Rule: 2 consecutive correct at current layer → climb one level and reset
 * streak counters.
 */
export function onCorrect(state: CPAState): CPAState {
  const nextCorrect = state.consecutiveCorrect + 1;
  if (nextCorrect >= 2 && state.currentLayer !== 'abstract') {
    return {
      ...state,
      currentLayer:       climb(state.currentLayer),
      consecutiveCorrect: 0,
      consecutiveWrong:   0,
    };
  }
  return {
    ...state,
    consecutiveCorrect: nextCorrect,
    consecutiveWrong:   0,
  };
}

/**
 * Transition after a wrong answer.
 *
 * Rule: 1 wrong at current layer → drop one level, reset streaks.
 * At 'concrete' (floor) the layer is held — the caller should instead switch
 * to a re-teach / hint flow.
 */
export function onWrong(state: CPAState): CPAState {
  return {
    ...state,
    currentLayer:       drop(state.currentLayer),
    consecutiveCorrect: 0,
    consecutiveWrong:   state.consecutiveWrong + 1,
  };
}

/** Did the most-recent transition drop her a layer? */
export function didDrop(prev: CPAState, next: CPAState): boolean {
  return ORDER.indexOf(next.currentLayer) < ORDER.indexOf(prev.currentLayer);
}

/** Did the most-recent transition climb a layer? */
export function didClimb(prev: CPAState, next: CPAState): boolean {
  return ORDER.indexOf(next.currentLayer) > ORDER.indexOf(prev.currentLayer);
}
