/**
 * Session composer — Opus task.
 *
 * Reads the gap profile + mastery state + mode and produces an ordered
 * SessionPlan. Per the Build Handoff (Phase 4), the target distribution for a
 * steady-state session is:
 *
 *   30%  new material        — the top-priority gap at its CPA start layer
 *   30%  blocked practice    — multiple items on the second-priority gap
 *   20%  spaced retrieval    — fact fluency (mult-fact drills) or a gap revisit
 *   20%  interleaved         — mixed practice on mastered / rule-out strengths
 *
 * First-session adaptation (honours gapProfile.sessionComposerNotes.startWith):
 *
 *   - 1 warm-up item on a known/strength skill → confidence before challenge
 *   - the new-material block is slightly shorter to reduce overwhelm
 *   - only one spaced-retrieval block (fact drills if mult-fact is active)
 *
 * This module is pure: input → plan. All persistence happens elsewhere.
 *
 * Design decisions documented in composerReasoning[] for debugging and
 * parent-dashboard transparency.
 */

import type {
  GapProfile,
  MasteryMap,
  SessionMode,
  SessionPlan,
  SessionPlanItem,
  SessionPhase,
  CPALayer,
} from '../types';
import { PRACTICE_ITEMS_BY_SKILL } from '../constants/practiceItems';
import { masteredSkills, skillsInProgress } from './masteryTracker';

// ─── Targets ──────────────────────────────────────────────────────────────────

/** Approx item counts per mode. Time ≈ 75 s/item, so 15 min ≈ 12 items. */
const TARGET_ITEMS: Record<SessionMode, number | null> = {
  time:     12,
  quantity: 20,
  open:     null, // generator extends on demand
};

/** Initial batch for 'open' mode (composer is re-called when the batch runs out). */
const OPEN_MODE_INITIAL_BATCH = 8;

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface ComposeArgs {
  profileId:          string;
  gapProfile:         GapProfile | null;
  masteryMap:         MasteryMap;
  mode:               SessionMode;
  sessionsCompleted:  number;
  /** For determinism in tests; defaults to Math.random */
  rng?:               () => number;
}

export function composeSession(args: ComposeArgs): SessionPlan {
  const rng = args.rng ?? Math.random;
  const reasoning: string[] = [];
  const targetItems =
    args.mode === 'open'
      ? OPEN_MODE_INITIAL_BATCH
      : TARGET_ITEMS[args.mode]!;

  const isFirstSession = args.sessionsCompleted === 0;
  reasoning.push(
    isFirstSession
      ? `First session after diagnostic — easing in with warm-up + limited new material`
      : `Session #${args.sessionsCompleted + 1} — steady-state 30/30/20/20 composition`
  );

  const plan: SessionPlanItem[] = [];

  // ── Skill selection ─────────────────────────────────────────────────────────

  const gap            = args.gapProfile;
  const gapsOrdered    = gap?.sessionComposerNotes.blockedPracticePriority ?? [];
  const firstGap       = gap?.sessionComposerNotes.firstNewMaterial || gapsOrdered[0] || null;
  const secondGap      = gapsOrdered.find(s => s !== firstGap) ?? null;
  const thirdGap       = gapsOrdered.find(s => s !== firstGap && s !== secondGap) ?? null;
  const hasMultFactGap =
    gap?.strands.ARITH?.activeErrors?.some(e => e === 'ERR_MULT_FACT' || e === 'ERR_MULT_FACT_SLOW')
    ?? false;

  // Strengths = skills explicitly confirmed OR mastered, excluding any current gap
  const strengthsFromMastery = masteredSkills(args.masteryMap);
  const strengthsFromGap     = gap
    ? Object.values(gap.strands)
        .filter(s => s?.status === 'שליטה')
        .flatMap(() => [])   // strand status doesn't list skill codes — use mastery-map
    : [];
  void strengthsFromGap; // reserved for future strand→skill expansion

  // Fallback strengths: practice skills in the mastery map that aren't active gaps
  const gapSet       = new Set(gapsOrdered);
  const inProgressNG = skillsInProgress(args.masteryMap).filter(s => !gapSet.has(s));
  const strengthPool = [...new Set([...strengthsFromMastery, ...inProgressNG])];

  reasoning.push(
    `Top gap: ${firstGap ?? '(none)'}; second: ${secondGap ?? '(none)'}; ` +
    `mult-fact gap: ${hasMultFactGap}; strength pool: ${strengthPool.length}`
  );

  // ── Block sizes ─────────────────────────────────────────────────────────────
  //
  // For non-open modes we aim at the target; for open we emit an initial batch
  // that the composer extends later.

  const sizes = computeBlockSizes(targetItems, {
    isFirstSession,
    hasGap:       firstGap !== null,
    hasSecondGap: secondGap !== null,
    hasMultFact:  hasMultFactGap,
    hasStrength:  strengthPool.length > 0,
  });
  reasoning.push(
    `Block sizes: warmup=${sizes.warmup}, new=${sizes.newMaterial}, blocked=${sizes.blocked}, ` +
    `retrieval=${sizes.retrieval}, interleaved=${sizes.interleaved}`
  );

  // ── Emit the plan ──────────────────────────────────────────────────────────
  //
  // usedIds is threaded through every pick call so no item ever appears twice
  // in the same session regardless of which blocks overlap on the same skill.

  const usedIds = new Set<string>();

  // 1. Warm-up
  if (sizes.warmup > 0 && strengthPool.length > 0) {
    const warmSkill = pickRandom(strengthPool, rng);
    plan.push(...pickItems(warmSkill, 'abstract', sizes.warmup, 'warmup', plan.length, rng, usedIds));
  } else if (sizes.warmup > 0 && firstGap) {
    // No strength pool yet — warm up on an easy variant of top gap
    plan.push(...pickItems(firstGap, 'abstract', sizes.warmup, 'warmup', plan.length, rng, usedIds, {
      preferDifficulty: 1,
    }));
    reasoning.push('No strength pool — warming up on easiest variant of top gap instead');
  }

  // 2. New material
  if (sizes.newMaterial > 0 && firstGap) {
    const layer = gap?.cpaStartLayer[firstGap] ?? 'abstract';
    plan.push(...pickItems(firstGap, layer, sizes.newMaterial, 'new_material', plan.length, rng, usedIds));
  }

  // 3. Blocked practice
  if (sizes.blocked > 0) {
    const blockedSkill = secondGap ?? firstGap;
    if (blockedSkill) {
      const layer = gap?.cpaStartLayer[blockedSkill] ?? 'abstract';
      plan.push(...pickItems(blockedSkill, layer, sizes.blocked, 'blocked_practice', plan.length, rng, usedIds));
    }
  }

  // 4. Spaced retrieval
  if (sizes.retrieval > 0) {
    if (hasMultFactGap) {
      plan.push(...pickItems('ARITH_MULT_6_9', 'abstract', sizes.retrieval, 'spaced_retrieval', plan.length, rng, usedIds));
    } else {
      const retrievalSkill = thirdGap ?? firstGap;
      if (retrievalSkill) {
        plan.push(...pickItems(retrievalSkill, 'abstract', sizes.retrieval, 'spaced_retrieval', plan.length, rng, usedIds));
      }
    }
  }

  // 5. Interleaved
  if (sizes.interleaved > 0) {
    const pool = strengthPool.length > 0 ? strengthPool : (firstGap ? [firstGap] : []);
    plan.push(...pickInterleaved(pool, sizes.interleaved, plan.length, rng, usedIds));
  }

  // ── Primary skill for end-of-session summary ───────────────────────────────
  //
  // Choose the skill that appeared most in the plan, excluding warm-up.

  const primarySkillCode = pickPrimarySkill(plan) ?? firstGap ?? strengthPool[0] ?? 'ARITH_SUB_REGROUP_ZERO';

  return {
    sessionId:        crypto.randomUUID(),
    profileId:        args.profileId,
    mode:             args.mode,
    plannedItems:     plan,
    targetItems:      args.mode === 'open' ? null : targetItems,
    primarySkillCode,
    startedAt:        new Date().toISOString(),
    composerReasoning: reasoning,
  };
}

// ─── Block sizing ────────────────────────────────────────────────────────────

interface SizingContext {
  isFirstSession: boolean;
  hasGap:         boolean;
  hasSecondGap:   boolean;
  hasMultFact:    boolean;
  hasStrength:    boolean;
}

interface BlockSizes {
  warmup:       number;
  newMaterial:  number;
  blocked:      number;
  retrieval:    number;
  interleaved:  number;
}

/**
 * Convert the 30/30/20/20 target into concrete integer counts for this session.
 *
 * First session tilts more heavily toward warm-up and new material; steady-state
 * sessions hit the handoff ratio exactly.
 *
 * If a category has no available skill (e.g., no second gap) its budget flows
 * to the remaining categories in priority order.
 */
function computeBlockSizes(target: number, ctx: SizingContext): BlockSizes {
  // Start with the ratios, then adjust.
  let warmup      = ctx.isFirstSession && ctx.hasStrength ? 1 : 0;
  const budget    = target - warmup;

  let newMaterial = ctx.isFirstSession
    ? Math.max(1, Math.round(budget * 0.40))  // first session: more new material
    : Math.round(budget * 0.30);

  let blocked     = ctx.hasSecondGap ? Math.round(budget * 0.30)
                                     : 0;

  let retrieval   = ctx.hasMultFact ? Math.round(budget * 0.20)
                                    : ctx.isFirstSession ? 0
                                    : Math.round(budget * 0.20);

  let interleaved = ctx.hasStrength ? Math.round(budget * 0.20)
                                    : 0;

  // Reconcile rounding: sum back to budget
  let sum = newMaterial + blocked + retrieval + interleaved;
  let diff = budget - sum;

  // Distribute leftover (positive or negative) with priority: new > blocked > retrieval > interleaved
  const bag = { newMaterial, blocked, retrieval, interleaved };
  const knobs: Array<keyof typeof bag> = ['newMaterial', 'blocked', 'retrieval', 'interleaved'];
  while (diff !== 0) {
    let moved = false;
    for (const k of knobs) {
      if (diff > 0) {
        bag[k]++; diff--; moved = true;
      } else if (bag[k] > 0) {
        bag[k]--; diff++; moved = true;
      }
      if (diff === 0) break;
    }
    if (!moved) break; // target already 0 — prevent infinite loop
  }
  ({ newMaterial, blocked, retrieval, interleaved } = bag);

  // If neither gap nor strength exist (fresh profile with no diagnostic),
  // everything collapses into newMaterial using any available items.
  if (!ctx.hasGap && !ctx.hasStrength) {
    return { warmup: 0, newMaterial: target, blocked: 0, retrieval: 0, interleaved: 0 };
  }

  return { warmup, newMaterial, blocked, retrieval, interleaved };
}

// ─── Item selection primitives ────────────────────────────────────────────────

/**
 * Pick up to `count` items for a skill, preferring:
 *   1. exact CPA layer match
 *   2. any layer (fall-through when desired layer has no fresh items)
 *   3. varied difficulties
 *
 * `usedIds` is a session-wide set that is mutated in-place: every item this
 * function emits is added to it so subsequent calls never repeat.
 */
function pickItems(
  skillCode:    string,
  desiredLayer: CPALayer,
  count:        number,
  phase:        SessionPhase,
  startPosition: number,
  rng:          () => number,
  usedIds:      Set<string>,
  opts: { preferDifficulty?: number } = {},
): SessionPlanItem[] {
  const pool = PRACTICE_ITEMS_BY_SKILL[skillCode] ?? [];
  if (pool.length === 0 || count === 0) return [];

  // Filter out items already used anywhere in this session
  const fresh      = pool.filter(it => !usedIds.has(it.itemId));
  const exactLayer = fresh.filter(it => it.cpaLayer === desiredLayer);
  let candidates   = exactLayer.length > 0 ? exactLayer : fresh;

  if (candidates.length === 0) return [];  // pool exhausted for this session

  if (opts.preferDifficulty !== undefined) {
    const pref = opts.preferDifficulty;
    candidates = [...candidates].sort(
      (a, b) => Math.abs(a.difficulty - pref) - Math.abs(b.difficulty - pref),
    );
  } else {
    candidates = shuffle(candidates, rng);
  }

  const chosen = candidates.slice(0, count);
  for (const it of chosen) usedIds.add(it.itemId);   // mark used

  return chosen.map((item, i) => ({
    item,
    sessionPhase: phase,
    position:     startPosition + i,
  }));
}

/**
 * Pick `count` items from a pool of skills, alternating skills.
 * Respects the session-wide `usedIds` set and mutates it.
 */
function pickInterleaved(
  skillPool:     string[],
  count:         number,
  startPosition: number,
  rng:           () => number,
  usedIds:       Set<string>,
): SessionPlanItem[] {
  if (skillPool.length === 0 || count === 0) return [];
  const out: SessionPlanItem[] = [];
  for (let i = 0; i < count; i++) {
    const skill = skillPool[i % skillPool.length];
    const pool  = (PRACTICE_ITEMS_BY_SKILL[skill] ?? [])
                    .filter(it => !usedIds.has(it.itemId));
    if (pool.length === 0) continue;
    const item  = pool[Math.floor(rng() * pool.length)];
    usedIds.add(item.itemId);
    out.push({
      item,
      sessionPhase: 'interleaved',
      position:     startPosition + out.length,
    });
  }
  return out;
}

/** Which skill occupies the biggest share of the plan (ignoring warm-up)? */
function pickPrimarySkill(plan: SessionPlanItem[]): string | null {
  const counts = new Map<string, number>();
  for (const p of plan) {
    if (p.sessionPhase === 'warmup') continue;
    counts.set(p.item.skillCode, (counts.get(p.item.skillCode) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [skill, c] of counts) {
    if (c > bestCount) { best = skill; bestCount = c; }
  }
  return best;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Open-mode extension ─────────────────────────────────────────────────────
//
// When the session is in 'open' mode and the plan runs out, call this to
// generate more items. Keeps interleaving the in-progress skills with
// occasional retrieval on mastered ones.

export function extendOpenPlan(args: {
  gapProfile:  GapProfile | null;
  masteryMap:  MasteryMap;
  rng?:        () => number;
  extraCount?: number;
}): SessionPlanItem[] {
  const rng         = args.rng ?? Math.random;
  const n           = args.extraCount ?? OPEN_MODE_INITIAL_BATCH;
  const gapsOrdered = args.gapProfile?.sessionComposerNotes.blockedPracticePriority ?? [];
  const strengthPool = [...masteredSkills(args.masteryMap)];

  const usedIds = new Set<string>();
  const plan: SessionPlanItem[] = [];
  for (let i = 0; i < n; i++) {
    // Round-robin: gap, gap, strength, gap, gap, strength…
    const useStrength = (i % 3 === 2) && strengthPool.length > 0;
    const skill = useStrength
      ? strengthPool[i % strengthPool.length]
      : gapsOrdered[i % Math.max(1, gapsOrdered.length)];
    if (!skill) continue;
    const pool = (PRACTICE_ITEMS_BY_SKILL[skill] ?? [])
                   .filter(it => !usedIds.has(it.itemId));
    if (pool.length === 0) continue;
    const item = pool[Math.floor(rng() * pool.length)];
    usedIds.add(item.itemId);
    plan.push({
      item,
      sessionPhase: useStrength ? 'interleaved' : 'blocked_practice',
      position:     i,
    });
  }
  return plan;
}
