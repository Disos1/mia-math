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
  CPAMemory,
  PracticeItem,
} from '../types';
import { getItemPool, SKILLS_WITH_PRACTICE } from './items';
import { masteredSkills, skillsInProgress, probesDue } from './masteryTracker';
import { startLayerFor, isStruggling } from './cpaMemory';
import { skillsAtGrade, isUnlocked, findBlocker, type Grade } from './skillGraph';

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
  /** Cross-session CPA memory: start layers + struggle escalation flags. */
  cpaMemory?:         CPAMemory;
  /** For determinism in tests; defaults to new Date().toISOString() */
  now?:               string;
  /** For determinism in tests; defaults to Math.random */
  rng?:               () => number;
  /**
   * Cross-session memorization defense — itemIds the learner has recently seen.
   * The generator prefers fresh combos when this is supplied. Defaults to empty.
   */
  recentIds?:         Set<string>;
  /**
   * Curriculum year to teach toward. Defaults to 3, which reproduces the
   * pre-dual-track behaviour exactly — callers opt in to grade 4.
   */
  targetGrade?:       Grade;
  /**
   * Skills she can answer correctly but only slowly (computing, not recalling).
   * Blocks 'fluency' prerequisite edges — a fact she has to work out cannot
   * support an algorithm that calls it dozens of times.
   *
   * NOT YET SUPPLIED BY THE LIVE SESSION. `timeToAnswerMs` is recorded on every
   * attempt and syncs to Supabase, but nothing aggregates it into a per-skill
   * latency verdict yet, so the fluency gate is presently inert in production
   * and exercised only by tests. Wiring it is the next step before vertical
   * multiplication ships (January content) — measured 2026-07-31, her
   * multiplication facts average 18.2s vs 3.1s on fraction comparison, so the
   * signal is real and the gate will bite once connected.
   */
  slowSkills?:        ReadonlySet<string>;
  /** Override the adaptive current-grade share (0..1). Test seam. */
  currentGradeShare?: number;
}

// ─── Dual-track policy ────────────────────────────────────────────────────────

/**
 * Share of the *working* items (new material + blocked practice) spent on
 * current-grade content, the rest going to prerequisite repair.
 *
 * The research is explicit that no study fixes this number: "there is no
 * high-quality study establishing an exact percentage split… a design
 * recommendation, not an empirically validated constant." So it is a policy
 * knob, logged in composerReasoning, not a law.
 *
 * Starts at 60/40 and moves to 75/25 once every blocking prerequisite is
 * comfortably secure — at that point the repair stream has done its job and
 * should shrink rather than keep eating her session.
 */
export const CURRENT_GRADE_SHARE_INITIAL = 0.6;
export const CURRENT_GRADE_SHARE_SECURE  = 0.75;
/** Window accuracy at which a prerequisite counts as "secure enough to ease off". */
export const PREREQ_SECURE_ACCURACY = 0.85;

function adaptiveCurrentGradeShare(
  masteryMap: MasteryMap, prereqSkills: string[],
): number {
  if (prereqSkills.length === 0) return 1;
  const allSecure = prereqSkills.every(
    s => (masteryMap[s]?.firstAttemptAccuracy ?? 0) >= PREREQ_SECURE_ACCURACY,
  );
  return allSecure ? CURRENT_GRADE_SHARE_SECURE : CURRENT_GRADE_SHARE_INITIAL;
}

/** A prerequisite that is holding back a specific current-grade skill. */
interface Blocker {
  skill: string;
  /** Hebrew rationale from the graph edge — the tools-for-today framing. */
  why:   string;
  /** The current-grade skill it unblocks. */
  forSkill: string;
}

/**
 * Split the curriculum into what she should be learning now and what is stopping
 * her, using the prerequisite graph rather than the (static) diagnostic profile.
 *
 * Only skills that actually have a generator are returned: selecting a declared
 * but unbuilt skill would silently shrink the session to nothing.
 */
function selectTracks(args: {
  targetGrade: Grade;
  masteryMap:  MasteryMap;
  masteredSet: Set<string>;
  slowSkills:  ReadonlySet<string>;
}): { currentGrade: string[]; blockers: Blocker[] } {
  const { targetGrade, masteryMap, masteredSet, slowSkills } = args;
  const buildable = (s: string) => SKILLS_WITH_PRACTICE.includes(s);

  const candidates = skillsAtGrade(targetGrade).filter(s => !masteredSet.has(s));

  const currentGrade = candidates
    .filter(s => isUnlocked(s, masteryMap, slowSkills))
    .filter(buildable);

  // For everything still locked, find the one thing to fix first. Depth is
  // capped at 1 so a single session never drags her multiple layers down.
  const blockers: Blocker[] = [];
  const seen = new Set<string>();
  for (const s of candidates) {
    if (isUnlocked(s, masteryMap, slowSkills)) continue;
    const b = findBlocker(s, masteryMap, { slowSkills, maxDepth: 1 });
    if (b.depth === 0 || !b.via) continue;
    if (seen.has(b.skill) || !buildable(b.skill)) continue;
    // A blocker that is ITSELF unlocked current-grade content is not repair —
    // it is simply the next thing at her grade to learn, and belongs in the
    // current-grade stream. Counting it as a prerequisite would spend the whole
    // working budget on one skill and leave no real repair happening.
    if (currentGrade.includes(b.skill)) continue;
    seen.add(b.skill);
    blockers.push({ skill: b.skill, why: b.via.why, forSkill: s });
  }

  return { currentGrade, blockers };
}

export function composeSession(args: ComposeArgs): SessionPlan {
  const rng       = args.rng       ?? Math.random;
  const recentIds = args.recentIds ?? new Set<string>();
  const cpaMemory = args.cpaMemory ?? {};
  const now       = args.now       ?? new Date().toISOString();
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

  // The gap profile is a snapshot from the diagnostic and never updates as Mia
  // masters skills. The mastery map IS live, so we cross-check it here and drop
  // anything she's already mastered from the gap-driven blocks (new material,
  // blocked practice, dedicated retrieval). Mastered skills still resurface in
  // light interleaving for retention — but they no longer dominate the session.
  const masteredSet    = new Set(masteredSkills(args.masteryMap));
  const isActive       = (s: string | null | undefined): s is string => !!s && !masteredSet.has(s);

  const gapsOrderedRaw = gap?.sessionComposerNotes.blockedPracticePriority ?? [];
  const gapsOrdered    = gapsOrderedRaw.filter(isActive);
  // Fall back to any in-progress (non-mastered) skill if every diagnostic gap
  // is now mastered, so the session always has fresh material to work on.
  const focusPool      = [...new Set([
    ...gapsOrdered,
    ...skillsInProgress(args.masteryMap).filter(s => !masteredSet.has(s)),
  ])];

  // ── Dual-track selection ────────────────────────────────────────────────────
  //
  // The diagnostic gap profile is a static snapshot and knows nothing about
  // grade 4, so on its own it can never schedule current-grade work: the skill
  // simply never appears in any pool. The graph supplies that half.
  //
  // targetGrade 3 leaves every pool exactly as it was, so this is additive.

  const targetGrade = args.targetGrade ?? 3;
  const slowSkills  = args.slowSkills  ?? new Set<string>();

  const tracks = targetGrade > 3
    ? selectTracks({ targetGrade, masteryMap: args.masteryMap, masteredSet, slowSkills })
    : { currentGrade: [] as string[], blockers: [] as Blocker[] };

  // Prerequisite work = graph blockers first (they gate current-grade progress),
  // then her own still-open earlier-grade gaps.
  const blockerSkills = tracks.blockers.map(b => b.skill);
  const prereqPool    = [...new Set([...blockerSkills, ...focusPool])];
  const whyFor        = new Map(tracks.blockers.map(b => [b.skill, b] as const));

  // The share adapts on the prerequisites actually being worked, not just the
  // graph blockers — her open earlier-grade gaps count too.
  const activePrereqs = prereqPool.filter(s => !tracks.currentGrade.includes(s));
  const currentShare  = args.currentGradeShare
    ?? (targetGrade > 3 ? adaptiveCurrentGradeShare(args.masteryMap, activePrereqs) : 0);

  if (targetGrade > 3) {
    reasoning.push(
      `Dual-track (grade ${targetGrade}): current-grade=[${tracks.currentGrade.join(',') || '—'}] ` +
      `blocked-by=[${tracks.blockers.map(b => `${b.skill}→${b.forSkill}`).join(',') || '—'}] ` +
      `share=${Math.round(currentShare * 100)}%`,
    );
  }

  const firstNew       = gap?.sessionComposerNotes.firstNewMaterial;
  // New material is current-grade work when any is unlocked; otherwise the
  // session is honestly all repair, which is the right answer when she is not
  // ready for her grade's content yet.
  const firstGap       = tracks.currentGrade[0]
    ?? (isActive(firstNew) ? firstNew : null) ?? focusPool[0] ?? null;
  const secondGap      = prereqPool.find(s => s !== firstGap) ?? null;
  const thirdGap       = prereqPool.find(s => s !== firstGap && s !== secondGap) ?? null;
  const hasMultFactGap =
    !masteredSet.has('ARITH_MULT_6_9') &&
    (gap?.strands.ARITH?.activeErrors?.some(e => e === 'ERR_MULT_FACT' || e === 'ERR_MULT_FACT_SLOW')
      ?? false);

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

  const masteredPool = masteredSkills(args.masteryMap);
  const dueProbes    = probesDue(args.masteryMap, now);

  const sizes = computeBlockSizes(targetItems, {
    isFirstSession,
    hasGap:       firstGap !== null,
    hasSecondGap: secondGap !== null,
    hasMultFact:  hasMultFactGap,
    hasStrength:  strengthPool.length > 0,
    hasMastered:  masteredPool.length > 0 || dueProbes.length > 0,
  });

  // Re-balance the two working blocks to hit the current-grade share. The
  // working budget (new material + blocked practice) is what the ratio governs;
  // retrieval and interleaving are retention and belong to neither track.
  if (targetGrade > 3 && tracks.currentGrade.length > 0) {
    const working = sizes.newMaterial + sizes.blocked;
    if (working > 0) {
      const wantCurrent = Math.max(1, Math.round(working * currentShare));
      // Only spend on prerequisites if there is something real to repair.
      const wantPrereq  = prereqPool.length > 0 ? working - wantCurrent : 0;
      sizes.newMaterial = working - wantPrereq;
      sizes.blocked     = wantPrereq;
      reasoning.push(
        `Working budget ${working} split ${sizes.newMaterial} current-grade / ${sizes.blocked} prerequisite`,
      );
    }
  }
  reasoning.push(
    `Block sizes: warmup=${sizes.warmup}, new=${sizes.newMaterial}, blocked=${sizes.blocked}, ` +
    `retrieval=${sizes.retrieval}, interleaved=${sizes.interleaved}; probes due: ${dueProbes.join(',') || '(none)'}`
  );

  // ── Emit the plan ──────────────────────────────────────────────────────────
  //
  // usedIds is threaded through every pick call so no item ever appears twice
  // in the same session regardless of which blocks overlap on the same skill.

  const usedIds = new Set<string>();

  // Start layer per skill: cross-session CPA memory wins over the (static)
  // diagnostic snapshot, so yesterday's drop to pictorial survives to today.
  const layerFor = (skill: string): CPALayer =>
    startLayerFor(cpaMemory, skill, gap?.cpaStartLayer[skill]);

  // Struggling skills open with a worked example (teach first, then practise)
  // at the easiest difficulty — the escalation path for the stuck-skill case.
  const markWorkedExample = (block: SessionPlanItem[], skill: string): void => {
    if (block.length > 0 && isStruggling(cpaMemory, skill)) {
      block[0] = { ...block[0], isWorkedExample: true };
      reasoning.push(`${skill} is struggling — leading its block with a worked example`);
    }
  };

  // 1. Warm-up
  if (sizes.warmup > 0 && strengthPool.length > 0) {
    const warmSkill = pickRandom(strengthPool, rng);
    plan.push(...pickItems(warmSkill, 'abstract', sizes.warmup, 'warmup', plan.length, rng, usedIds, recentIds));
  } else if (sizes.warmup > 0 && firstGap) {
    // No strength pool yet — warm up on an easy variant of top gap
    plan.push(...pickItems(firstGap, 'abstract', sizes.warmup, 'warmup', plan.length, rng, usedIds, recentIds, {
      preferDifficulty: 1,
    }));
    reasoning.push('No strength pool — warming up on easiest variant of top gap instead');
  }

  /** Tag a block with its track, and carry the graph's rationale for prereqs. */
  const tag = (block: SessionPlanItem[], skill: string): SessionPlanItem[] => {
    if (targetGrade <= 3) return block;
    // Current-grade membership wins: a skill at her grade is grade-level work,
    // whatever else it happens to unlock.
    if (tracks.currentGrade.includes(skill)) {
      return block.map(p => ({ ...p, track: 'current_grade' as const }));
    }
    const b = whyFor.get(skill);
    return block.map(p => ({
      ...p,
      track: 'prerequisite' as const,
      ...(b ? { prereqWhy: b.why, prereqFor: b.forSkill } : {}),
    }));
  };

  // 2. New material
  if (sizes.newMaterial > 0 && firstGap) {
    const struggling = isStruggling(cpaMemory, firstGap);
    const block = pickItems(firstGap, layerFor(firstGap), sizes.newMaterial, 'new_material', plan.length, rng, usedIds, recentIds,
      struggling ? { preferDifficulty: 1 } : {});
    markWorkedExample(block, firstGap);
    plan.push(...tag(block, firstGap));
  }

  // 3. Blocked practice — in a dual-track session this is the prerequisite
  //    stream: the specific thing standing between her and today's grade-level
  //    work, presented as equipment for it rather than as going backwards.
  if (sizes.blocked > 0) {
    // Must differ from the new-material skill, or the "two tracks" collapse into
    // one skill filling the whole session.
    const dualTrackPick = targetGrade > 3
      ? prereqPool.find(s => s !== firstGap)
      : undefined;
    const blockedSkill = dualTrackPick ?? secondGap ?? firstGap;
    if (blockedSkill) {
      const struggling = isStruggling(cpaMemory, blockedSkill);
      const block = pickItems(blockedSkill, layerFor(blockedSkill), sizes.blocked, 'blocked_practice', plan.length, rng, usedIds, recentIds,
        struggling ? { preferDifficulty: 1 } : {});
      if (blockedSkill !== firstGap) markWorkedExample(block, blockedSkill);
      plan.push(...tag(block, blockedSkill));
    }
  }

  // 4. Spaced retrieval — retention probes first (7/30-day checks on mastered
  //    skills), then genuine spacing: the mastered skill practised longest ago.
  if (sizes.retrieval > 0) {
    let retrievalBudget = sizes.retrieval;

    for (const probeSkill of dueProbes.slice(0, 2)) {
      if (retrievalBudget <= 0) break;
      const probeCount = Math.min(2, retrievalBudget);
      const probeItems = pickItems(probeSkill, 'abstract', probeCount, 'spaced_retrieval', plan.length, rng, usedIds, recentIds)
        .map(p => ({ ...p, isRetentionProbe: true }));
      plan.push(...probeItems);
      retrievalBudget -= probeItems.length;
      if (probeItems.length > 0) reasoning.push(`Retention probe: ${probeSkill} (${probeItems.length} items)`);
    }

    if (retrievalBudget > 0) {
      const spacedSkill = [...masteredPool]
        .filter(s => !dueProbes.includes(s))
        .sort((a, b) =>
          (args.masteryMap[a]?.lastPracticedAt ?? '').localeCompare(args.masteryMap[b]?.lastPracticedAt ?? ''))[0]
        ?? (hasMultFactGap ? 'ARITH_MULT_6_9' : (thirdGap ?? firstGap));
      if (spacedSkill) {
        plan.push(...pickItems(spacedSkill, 'abstract', retrievalBudget, 'spaced_retrieval', plan.length, rng, usedIds, recentIds));
      }
    }
  }

  // 5. Interleaved — mastered skills ONLY (mixing in a skill she hasn't secured
  //    forces strategy-selection before strategy-application exists; the audit
  //    found the old fallback served her hardest gap here). No mastered skills →
  //    the budget flows back into blocked practice on the top gap.
  if (sizes.interleaved > 0) {
    if (masteredPool.length > 0) {
      plan.push(...pickInterleaved(masteredPool, sizes.interleaved, plan.length, rng, usedIds, recentIds));
    } else if (firstGap) {
      plan.push(...pickItems(firstGap, layerFor(firstGap), sizes.interleaved, 'blocked_practice', plan.length, rng, usedIds, recentIds));
      reasoning.push('No mastered skills yet — interleaved budget reallocated to blocked practice');
    }
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
  /** Mastered skills (or due probes) exist — the only valid interleaved pool. */
  hasMastered:    boolean;
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

  let interleaved = ctx.hasMastered ? Math.round(budget * 0.20)
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
  recentIds:    Set<string>,
  opts: { preferDifficulty?: number } = {},
): SessionPlanItem[] {
  const pool = getItemPool(skillCode, { recentIds, rng });
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
  recentIds:     Set<string>,
): SessionPlanItem[] {
  if (skillPool.length === 0 || count === 0) return [];
  const out: SessionPlanItem[] = [];
  for (let i = 0; i < count; i++) {
    const skill = skillPool[i % skillPool.length];
    const pool  = getItemPool(skill, { recentIds, rng })
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

// ─── Runtime layer swap — Phase 3 ────────────────────────────────────────────
//
// Called by the session runner when the CPA state transitions mid-session and
// we want the next scheduled item to match the new layer. Returns the first
// fresh variant of `skillCode` at `desiredLayer`, or null if none exists.
//
// The caller is responsible for (a) adding the returned itemId to its usedIds
// set and (b) replacing the scheduled plan item in place. Callers must NOT
// mutate the returned PracticeItem.
export function pickVariantAtLayer(
  skillCode:    string,
  desiredLayer: CPALayer,
  usedIds:      Set<string>,
  rng: () => number = Math.random,
  recentIds:    Set<string> = new Set(),
): PracticeItem | null {
  const pool = getItemPool(skillCode, { recentIds, rng });
  const candidates = pool.filter(
    it => it.cpaLayer === desiredLayer && !usedIds.has(it.itemId),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
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
  recentIds?:  Set<string>;
}): SessionPlanItem[] {
  const rng         = args.rng       ?? Math.random;
  const recentIds   = args.recentIds ?? new Set<string>();
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
    const pool = getItemPool(skill, { recentIds, rng })
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
