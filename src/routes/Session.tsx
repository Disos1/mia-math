/**
 * Session — runs one practice session end-to-end.
 *
 * Flow:
 *   1. composeSession(profile, mode) → SessionPlan
 *   2. render SessionPlan[index] one by one
 *   3. on answer: update CPAState, append PracticeAttempt, apply mastery,
 *      advance index
 *   4. when plan exhausted (time/quantity) or user taps exit (open):
 *      persist session record, show end-of-session card
 *
 * Kept intentionally single-file for now; parts that grow (PracticeItemCard,
 * EndSession card) can extract later.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Profile,
  Gender,
  SessionMode,
  SessionPlan,
  SessionPlanItem,
  PracticeAttempt,
  MasteryMap,
  CPAState,
  CPALayer,
  PracticeItem,
  ErrorSignatureCode,
} from '../types';
import type { AttemptLedger } from '../lib/masteryTracker';

import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import { MathText } from '../components/primitives/MathText';
import { NumPad } from '../components/primitives/NumPad';
import { VisualRenderer } from '../components/visuals/VisualRenderer';

import { composeSession, extendOpenPlan, pickVariantAtLayer } from '../lib/sessionComposer';
import {
  applyAttemptToMastery,
  applyProbeResult,
  ensureProbeSchedules,
  seedMasteryFromDiagnostic,
} from '../lib/masteryTracker';
import { loadCpaMemory, saveCpaMemory, updateCpaMemoryAfterSession } from '../lib/cpaMemory';
import { initCPAState, onCorrect, onWrong } from '../lib/cpaState';
import {
  loadMasteryMap,
  saveMasteryMap,
  loadLedger,
  saveLedger,
  appendAttempts,
  upsertSessionRecord,
} from '../lib/sessionStore';
import { loadRecentItemIds, appendRecentItemIds } from '../lib/items/recentItems';
import { updateProfile } from '../lib/profile';
import { starsForSession, COMBO_BONUS_1, MIN_ITEMS_FOR_STARS } from '../lib/trophies';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profile:      Profile;
  mode:         SessionMode;
  onComplete:   () => void;
  onTrophyRoom: () => void;
  onParent:     () => void; // reserved; not shown during live items
}

// ─── Feedback type (module-level so PracticeItemView can share it) ────────────
//
// In Phase 2 the plan is pre-composed with fixed items, so CPA layer-transition
// messages ("try with a picture", "back to numbers") are not surfaced in the UI —
// showing them without actually changing the presented item is misleading.
// CPA state is still tracked internally for future use by the mastery system.
// Phase 3 re-introduces these messages alongside the dynamic item generator.

type SessionFeedback =
  | null
  | { kind: 'correct' }
  | { kind: 'wrong' }
  | { kind: 'show_answer' }   // 2nd wrong, no steps — flash the correct answer
  | { kind: 'step_ladder' };  // 2nd wrong, steps exist — solve it together, step by step

// ─── Score tally ──────────────────────────────────────────────────────────────
//
// Accuracy and stars are per-ITEM, not per-attempt. attemptsRef holds every tap
// including retries, so counting raw rows would deflate accuracy (a mistake then
// a correct retry would read as 50% on that single item). We count one row per
// item — the FIRST attempt — which is also exactly what mastery + combo use.

function tallyAttempts(attempts: PracticeAttempt[]): { attempted: number; correct: number } {
  const firsts = attempts.filter(a => a.firstAttempt);
  return { attempted: firsts.length, correct: firsts.filter(a => a.correct).length };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Screen = 'running' | 'end';

export function Session({ profile, mode, onComplete, onTrophyRoom }: Props) {
  // ── One-time init ──────────────────────────────────────────────────────────
  const initialMastery = useMemo<MasteryMap>(() => {
    const existing = loadMasteryMap(profile.profileId);
    // Self-heal: pre-probe שליטה records (potential false mastery) get an
    // immediate retention probe scheduled so the label re-earns itself.
    if (Object.keys(existing).length > 0) {
      return ensureProbeSchedules(existing, new Date().toISOString());
    }
    // First session after diagnostic — seed from gap profile
    if (profile.gapProfileJson) {
      const gaps = profile.gapProfileJson.sessionComposerNotes.blockedPracticePriority;
      // Strengths: any skill status 'שליטה' in strands — but strands don't expose
      // skill codes. Fallback: treat skills-with-practice not in gaps as unprobed
      // (mastery map stays empty for them, which is what we want).
      return seedMasteryFromDiagnostic(
        profile.profileId,
        gaps,
        /* strengths: */ [],
        profile.diagnosticCompletedAt ?? new Date().toISOString()
      );
    }
    return {};
  }, [profile.profileId, profile.gapProfileJson, profile.diagnosticCompletedAt]);

  const [masteryMap, setMasteryMap] = useState<MasteryMap>(initialMastery);
  // `setLedger` is kept so React knows when ledger changes; the ref below is the
  // source of truth for finish(). The value itself is not read during render.
  const [, setLedger]               = useState<AttemptLedger>(() => loadLedger(profile.profileId));

  // Persist the seeded mastery once if this is first session
  useEffect(() => {
    if (Object.keys(loadMasteryMap(profile.profileId)).length === 0
        && Object.keys(initialMastery).length > 0) {
      saveMasteryMap(profile.profileId, initialMastery);
    }
  }, [profile.profileId, initialMastery]);

  // Recent items buffer — itemIds the learner has seen across recent sessions.
  // The composer/generator prefer fresh combos when this is non-empty.
  // Loaded once at mount (snapshot); appended at finish() / visibilitychange.
  const recentIdsRef = useRef<Set<string>>(loadRecentItemIds(profile.profileId));

  // Cross-session CPA memory — start layers + struggle counters. Loaded once;
  // folded back in at finish()/visibilitychange.
  const cpaMemoryRef = useRef(loadCpaMemory(profile.profileId));

  // Compose the plan once per session
  const plan = useMemo<SessionPlan>(
    () => composeSession({
      profileId:         profile.profileId,
      gapProfile:        profile.gapProfileJson,
      masteryMap:        initialMastery,
      mode,
      sessionsCompleted: profile.sessionsCompleted,
      cpaMemory:         cpaMemoryRef.current,
      recentIds:         recentIdsRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []   // intentionally empty: compose once, on mount
  );

  // ── Session state ──────────────────────────────────────────────────────────
  const [screen, setScreen]     = useState<Screen>('running');
  const [items, setItems]       = useState<SessionPlanItem[]>(plan.plannedItems);
  const [index, setIndex]       = useState(0);

  // Refs are the source of truth for finish() — avoids stale-closure issues
  // when setTimeout fires after React has scheduled but not yet flushed updates.
  // Note: useRef is NOT lazy like useState, so loadLedger runs every render —
  // React ignores all but the first call, and loadLedger is a cheap localStorage
  // read, so the extra cost is negligible.
  const attemptsRef   = useRef<PracticeAttempt[]>([]);
  const masteryRef    = useRef<MasteryMap>(initialMastery);
  const ledgerRef     = useRef<AttemptLedger>(loadLedger(profile.profileId));

  // CPA state ref — consulted from advance() when scheduling the next item.
  // A parallel `cpaBySkill` React state exists in case future UI wants to
  // surface current layer per skill; the ref is the source of truth for the
  // layer-swap logic running inside setTimeout callbacks.
  const cpaBySkillRef = useRef<Record<string, CPAState>>({});

  // Every itemId currently scheduled in the plan (or already seen) — used by
  // pickVariantAtLayer to avoid proposing a swap candidate the learner already
  // answered or has queued ahead. Seeded from plan.plannedItems on mount.
  const usedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const s = new Set<string>();
    for (const p of plan.plannedItems) s.add(p.item.itemId);
    usedIdsRef.current = s;
  }, [plan]);

  // `setAttempts` keeps React informed of attempt-count changes for potential
  // future UI; the authoritative list lives on attemptsRef.
  const [, setAttempts] = useState<PracticeAttempt[]>([]);

  const [cpaBySkill, setCpaBySkill] = useState<Record<string, CPAState>>({});
  const [skillsSeenThisSession]  = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<SessionFeedback>(null);

  // When the layer-swap logic replaces the upcoming item, we stash the
  // transition here so PracticeItemView can render the matching banner
  // ("let's try with a picture" / "back to numbers") above the question.
  // Cleared when the learner taps an option.
  const [layerTransition, setLayerTransition] =
    useState<{ from: CPALayer; to: CPALayer } | null>(null);

  // retryCount drives the PracticeItemView key — incrementing it remounts the
  // item with fresh selected/locked state so Mia can retry the same question.
  const [retryCount, setRetryCount] = useState(0);
  // isRetry tells PracticeItemView to show the skill hint panel.
  const [isRetry, setIsRetry] = useState(false);
  // Misconception mirror: when her wrong answer matched a known error
  // signature, the retry hint speaks to THAT error, not a generic tip.
  const [lastSigHit, setLastSigHit] = useState<ErrorSignatureCode | null>(null);
  // wrongCountRef tracks wrong attempts on the current item without triggering
  // extra renders; reset whenever we advance to a new item.
  const wrongCountRef = useRef(0);

  // Combo: consecutive first-attempt-correct answers. A wrong answer (on any
  // attempt) resets it to 0. comboRef is the live source of truth; maxComboRef
  // is the session high-water mark persisted into the record for star bonuses;
  // `combo` is the rendered value driving the on-screen 🔥 badge.
  const comboRef    = useRef(0);
  const maxComboRef = useRef(0);
  const [combo, setCombo] = useState(0);

  const startedAtRef = useRef<string>(plan.startedAt);

  // Save a draft record immediately so the parent dashboard can see that a
  // session is in progress even if the app is closed before finish() runs.
  useEffect(() => {
    upsertSessionRecord(profile.profileId, {
      sessionId:        plan.sessionId,
      profileId:        profile.profileId,
      mode:             plan.mode,
      startedAt:        startedAtRef.current,
      completedAt:      null,
      itemsAttempted:   0,
      itemsCorrect:     0,
      primarySkillCode: plan.primarySkillCode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount

  // Fold this session's outcome into cross-session CPA memory: final layer per
  // skill + per-skill first-attempt stats (feeds the struggle escalator).
  // Runs at finish() AND on abandonment — quitting a hard session must not
  // dodge struggle tracking.
  const persistCpaMemory = () => {
    const endLayers: Record<string, CPALayer> = {};
    for (const [skill, cpa] of Object.entries(cpaBySkillRef.current)) {
      endLayers[skill] = cpa.currentLayer;
    }
    const skillStats: Record<string, { attempts: number; correct: number }> = {};
    for (const a of attemptsRef.current) {
      if (!a.firstAttempt) continue;
      const s = (skillStats[a.skillCode] ??= { attempts: 0, correct: 0 });
      s.attempts += 1;
      if (a.correct) s.correct += 1;
    }
    cpaMemoryRef.current = updateCpaMemoryAfterSession(cpaMemoryRef.current, endLayers, skillStats);
    saveCpaMemory(profile.profileId, cpaMemoryRef.current);
  };

  // When the tab is hidden (app backgrounded / tab switched / browser closed),
  // flush whatever progress exists so the parent dashboard stays current.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const attempts = attemptsRef.current;
      if (attempts.length === 0) return;
      const { attempted, correct } = tallyAttempts(attempts);
      upsertSessionRecord(profile.profileId, {
        sessionId:        plan.sessionId,
        profileId:        profile.profileId,
        mode:             plan.mode,
        startedAt:        startedAtRef.current,
        completedAt:      null,
        itemsAttempted:   attempted,
        itemsCorrect:     correct,
        primarySkillCode: plan.primarySkillCode,
        maxCombo:         maxComboRef.current,
      });
      saveMasteryMap(profile.profileId, masteryRef.current);
      saveLedger(profile.profileId, ledgerRef.current);
      appendRecentItemIds(profile.profileId, attempts.map(a => a.itemId));
      persistCpaMemory();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // refs are stable, no deps needed

  const currentItem = items[index] ?? null;
  const total       = plan.targetItems ?? items.length;

  // ── Answer handler ─────────────────────────────────────────────────────────
  const handleAnswer = (answer: string | number, timeToAnswerMs: number) => {
    if (!currentItem) return;
    const it = currentItem.item;

    const correct = answer === it.correct;
    const signatureHit =
      !correct && it.signatureCode && answer === it.signature ? it.signatureCode : null;

    const firstAttempt = attemptsRef.current.every(
      a => !(a.itemId === it.itemId && a.sessionId === plan.sessionId)
    );

    // CPA layer transitions only fire on first-attempt answers. A correct retry
    // shouldn't climb the layer back up (that would mask the help she needed),
    // and a wrong retry shouldn't double-drop (she's already been dropped once
    // on the first miss). The retry UX handles re-exposure at the same layer;
    // the layer swap for the *next* item lives in advance().
    const priorCpa = cpaBySkillRef.current[it.skillCode]
      ?? cpaBySkill[it.skillCode]
      ?? initCPAState(it.skillCode, it.cpaLayer);
    const nextCpa  = firstAttempt
      ? (correct ? onCorrect(priorCpa) : onWrong(priorCpa))
      : priorCpa;
    if (firstAttempt) {
      cpaBySkillRef.current = { ...cpaBySkillRef.current, [it.skillCode]: nextCpa };
      setCpaBySkill(prev => ({ ...prev, [it.skillCode]: nextCpa }));
    }

    const attempt: PracticeAttempt = {
      id:             crypto.randomUUID(),
      profileId:      profile.profileId,
      sessionId:      plan.sessionId,
      itemId:         it.itemId,
      skillCode:      it.skillCode,
      sessionPhase:   currentItem.sessionPhase,
      cpaLayer:       priorCpa.currentLayer,
      answer,
      correct,
      firstAttempt,
      signatureHit,
      timeToAnswerMs,
      sequenceNumber: index,
      createdAt:      new Date().toISOString(),
    };

    const isNewForSkill = !skillsSeenThisSession.has(it.skillCode);
    skillsSeenThisSession.add(it.skillCode);

    // Use refs for mastery/ledger so each answer builds on the previous one
    // even across multiple rapid state updates in the same render cycle.
    let { masteryMap: nextMastery, ledger: nextLedger } = applyAttemptToMastery({
      profileId:            profile.profileId,
      attempt,
      masteryMap:           masteryRef.current,
      ledger:               ledgerRef.current,
      isNewSessionForSkill: isNewForSkill,
    });

    // Retention probe: the first attempt on a probe item decides whether the
    // mastery label survives (pass → next probe window; fail → back to practice).
    if (currentItem.isRetentionProbe && firstAttempt) {
      nextMastery = applyProbeResult(nextMastery, it.skillCode, correct, attempt.createdAt);
    }

    masteryRef.current  = nextMastery;
    ledgerRef.current   = nextLedger;
    attemptsRef.current = [...attemptsRef.current, attempt];
    setMasteryMap(nextMastery);
    setLedger(nextLedger);
    setAttempts(attemptsRef.current);

    // Combo: a first-attempt-correct extends the streak; any wrong answer
    // (first try or retry) breaks it. Rewards getting it right without guessing.
    if (correct && firstAttempt) {
      comboRef.current += 1;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      setCombo(comboRef.current);
    } else if (!correct) {
      comboRef.current = 0;
      setCombo(0);
    }

    if (correct) {
      setFeedback({ kind: 'correct' });
      setLastSigHit(null);
      setTimeout(() => {
        setFeedback(null);
        wrongCountRef.current = 0;
        setIsRetry(false);
        advance();
      }, 1000);
    } else {
      setLastSigHit(attempt.signatureHit);
      // Wrong: first mistake → show hint and let her retry.
      // Second mistake → solve it TOGETHER via the step ladder (she types every
      // partial result herself), falling back to an answer flash only for
      // items that carry no steps.
      wrongCountRef.current += 1;
      if (wrongCountRef.current >= 2) {
        if (it.steps && it.steps.length > 0) {
          // Brief "wrong" beat first, then the ladder takes over.
          setFeedback({ kind: 'wrong' });
          setTimeout(() => setFeedback({ kind: 'step_ladder' }), 900);
          // advance happens when the ladder completes (see onLadderDone)
        } else {
          setFeedback({ kind: 'show_answer' });
          setTimeout(() => {
            setFeedback(null);
            wrongCountRef.current = 0;
            setIsRetry(false);
            advance();
          }, 1500);
        }
      } else {
        setFeedback({ kind: 'wrong' });
        setTimeout(() => {
          setFeedback(null);
          setIsRetry(true);          // hint panel visible on retry
          setRetryCount(c => c + 1); // remounts PracticeItemView → fresh buttons
        }, 900);
      }
    }
  };

  /** Step ladder finished — she reproduced the solution herself; move on. */
  const onLadderDone = () => {
    setFeedback(null);
    wrongCountRef.current = 0;
    setIsRetry(false);
    advance();
  };

  /** Worked-example slot acknowledged — not scored, just advance. */
  const onWorkedExampleDone = () => {
    setFeedback(null);
    wrongCountRef.current = 0;
    setIsRetry(false);
    advance();
  };

  const advance = () => {
    setLastSigHit(null);
    const nextIndex = index + 1;
    const reachedTarget = plan.targetItems !== null && nextIndex >= plan.targetItems;
    const ranOutOfItems = nextIndex >= items.length;

    if (reachedTarget) {
      finish();
      return;
    }

    if (ranOutOfItems && mode === 'open') {
      // Extend for open mode
      const more = extendOpenPlan({
        gapProfile: profile.gapProfileJson,
        masteryMap,
        recentIds:  recentIdsRef.current,
      });
      if (more.length === 0) { finish(); return; }
      const extras = more.map((p, i) => ({ ...p, position: items.length + i }));
      // Track the newly queued items so variant-picking won't propose them
      for (const e of extras) usedIdsRef.current.add(e.item.itemId);
      const nextItems = [...items, ...extras];
      setItems(nextItems);
      maybeSwapLayer(nextItems, nextIndex);
      setIndex(nextIndex);
      return;
    }

    if (ranOutOfItems) {
      finish();
      return;
    }

    maybeSwapLayer(items, nextIndex);
    setIndex(nextIndex);
  };

  /**
   * If the upcoming item's CPA layer no longer matches the learner's current
   * layer for that skill (because a wrong/correct on the previous item moved
   * her), swap it for a fresh variant at the right layer and stage the
   * transition banner. No-op when:
   *   - there's no recorded CPA state for the upcoming skill yet
   *   - the layers already agree
   *   - no fresh variant exists at the desired layer (we keep the original)
   */
  const maybeSwapLayer = (currentItems: SessionPlanItem[], nextIndex: number) => {
    const upcoming = currentItems[nextIndex];
    if (!upcoming) { setLayerTransition(null); return; }

    const cpa = cpaBySkillRef.current[upcoming.item.skillCode];
    if (!cpa || cpa.currentLayer === upcoming.item.cpaLayer) {
      setLayerTransition(null);
      return;
    }

    const replacement = pickVariantAtLayer(
      upcoming.item.skillCode,
      cpa.currentLayer,
      usedIdsRef.current,
      undefined,
      recentIdsRef.current,
    );

    if (!replacement) {
      // No fresh variant — quietly keep the original item, no banner.
      setLayerTransition(null);
      return;
    }

    usedIdsRef.current.add(replacement.itemId);
    setItems(prev => prev.map((it, i) =>
      i === nextIndex ? { ...it, item: replacement } : it,
    ));
    setLayerTransition({
      from: upcoming.item.cpaLayer,
      to:   cpa.currentLayer,
    });
  };

  const finish = () => {
    // Use the ref so we always have the full list even if the last setAttempts
    // hasn't flushed through React's scheduler yet.
    const allAttempts            = attemptsRef.current;
    const { attempted, correct } = tallyAttempts(allAttempts);

    appendAttempts(profile.profileId, allAttempts);
    saveMasteryMap(profile.profileId, masteryRef.current);
    saveLedger(profile.profileId, ledgerRef.current);
    appendRecentItemIds(profile.profileId, allAttempts.map(a => a.itemId));
    persistCpaMemory();
    upsertSessionRecord(profile.profileId, {
      sessionId:        plan.sessionId,
      profileId:        profile.profileId,
      mode:             plan.mode,
      startedAt:        startedAtRef.current,
      completedAt:      new Date().toISOString(),
      itemsAttempted:   attempted,
      itemsCorrect:     correct,
      primarySkillCode: plan.primarySkillCode,
      maxCombo:         maxComboRef.current,
    });

    try {
      updateProfile({ sessionsCompleted: profile.sessionsCompleted + 1 });
    } catch {
      // Profile may have been cleared (e.g., parent reset mid-session) — safe to ignore.
    }
    setScreen('end');
  };

  const earlyExit = () => finish();

  // ── Render ─────────────────────────────────────────────────────────────────

  if (screen === 'end') {
    return (
      <EndSession
        plan={plan}
        itemsCorrect={tallyAttempts(attemptsRef.current).correct}
        itemsAttempted={tallyAttempts(attemptsRef.current).attempted}
        maxCombo={maxComboRef.current}
        gender={profile.gender}
        name={profile.displayName}
        onContinue={onComplete}
        onTrophyRoom={onTrophyRoom}
      />
    );
  }

  if (!currentItem) {
    // Shouldn't happen — defensive
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white card-shadow rounded-3xl p-8 text-center max-w-md">
          <p className="text-gray-600">{t('end_session.no_trophies', { gender: 'f' })}</p>
          <button onClick={onComplete} className="mt-4 text-blue-500 underline">
            {t('end_session.parent', { gender: 'f' })}
          </button>
        </div>
      </div>
    );
  }

  // Teaching slot: worked example is walked through, never answered or scored.
  if (currentItem.isWorkedExample) {
    return (
      <WorkedExampleView
        key={`we-${index}`}
        planItem={currentItem}
        gender={profile.gender}
        onDone={onWorkedExampleDone}
      />
    );
  }

  // Second miss on an item with steps: solve it together — she types every
  // partial result herself, ending by producing the full answer.
  if (feedback?.kind === 'step_ladder') {
    return (
      <StepLadder
        key={`ladder-${index}`}
        item={currentItem.item}
        gender={profile.gender}
        onDone={onLadderDone}
      />
    );
  }

  return (
    <PracticeItemView
      key={`${index}-${retryCount}`}  /* remount on new item OR retry */
      planItem={currentItem}
      index={index}
      total={total}
      mode={mode}
      combo={combo}
      feedback={feedback}
      isRetry={isRetry}
      sigHit={lastSigHit}
      layerTransition={layerTransition}
      onAnswer={handleAnswer}
      onOpenExit={mode === 'open' ? earlyExit : undefined}
    />
  );
}

// ─── Layer-transition message mapping ─────────────────────────────────────────
//
// Maps a {from, to} CPA layer pair to the i18n key of the banner to show.
// Drops to pictorial / concrete use their specific message; any climb uses
// the shared "great — back to numbers" copy.

const LAYER_ORDER: CPALayer[] = ['concrete', 'pictorial', 'abstract'];

function transitionMessageKey(from: CPALayer, to: CPALayer): LocaleKey | null {
  const dropped = LAYER_ORDER.indexOf(to) < LAYER_ORDER.indexOf(from);
  const climbed = LAYER_ORDER.indexOf(to) > LAYER_ORDER.indexOf(from);
  if (dropped && to === 'pictorial') return 'cpa.drop_pictorial';
  if (dropped && to === 'concrete')  return 'cpa.drop_concrete';
  if (climbed)                        return 'cpa.climb_back';
  return null;
}

// ─── Item view ────────────────────────────────────────────────────────────────

interface ItemViewProps {
  planItem:         SessionPlanItem;
  index:            number;
  total:            number;
  mode:             SessionMode;
  combo:            number;
  feedback:         SessionFeedback;
  isRetry:          boolean;
  sigHit?:          ErrorSignatureCode | null;
  layerTransition?: { from: CPALayer; to: CPALayer } | null;
  onAnswer:         (answer: string | number, timeMs: number) => void;
  onOpenExit?:      () => void;
}

function PracticeItemView({
  planItem, index, total, mode, combo, feedback, isRetry, sigHit, layerTransition, onAnswer, onOpenExit,
}: ItemViewProps) {
  const { item, sessionPhase } = planItem;

  const [selected, setSelected] = useState<string | number | null>(null);
  const [locked, setLocked]     = useState(false);
  const mountedAt = useRef(Date.now());

  // Shuffle options per item (same pattern as DiagnosticItem)
  const [options] = useState(() => [...item.options].sort(() => Math.random() - 0.5));

  useEffect(() => { mountedAt.current = Date.now(); }, []);

  const handleTap = (opt: string | number) => {
    if (locked) return;
    const elapsed = Date.now() - mountedAt.current;
    setSelected(opt);
    setLocked(true);
    onAnswer(opt, elapsed);
  };

  const optionBg = (opt: string | number): string => {
    if (feedback?.kind === 'show_answer') {
      // Flash the correct answer green; keep the wrong pick red; others neutral.
      if (opt === item.correct) return '#B8E5C9';
      if (opt === selected)     return '#FFCFC9';
      return '#F5EFE6';
    }
    if (!locked || selected !== opt) return '#F5EFE6';
    return opt === item.correct ? '#B8E5C9' : '#FFCFC9';
  };

  // Build the progress label. For time/quantity modes we show position/total.
  // For open mode we show current position only.
  const progressLabel = mode === 'open'
    ? t('diag_item.progress', { gender: 'f', current: index + 1, total: index + 1 })
    : t('diag_item.progress', { gender: 'f', current: index + 1, total });

  const phaseLabelKey: LocaleKey =
    sessionPhase === 'new_material'      ? 'session.phase.new_material' :
    sessionPhase === 'blocked_practice'  ? 'session.phase.blocked_practice' :
    sessionPhase === 'spaced_retrieval'  ? 'session.phase.spaced_retrieval' :
    sessionPhase === 'interleaved'       ? 'session.phase.interleaved' :
                                           'session.phase.new_material';
  // 'warmup' falls through to new_material label — it's a smooth lead-in,
  // not a visible phase change.

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="w-full max-w-md flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          {mode === 'time' ? (
            /* Time mode: compact ring shows items-done / total */
            <ProgressRing done={index} total={total} />
          ) : (
            <span className="text-sm text-gray-500 font-medium">{progressLabel}</span>
          )}
          {sessionPhase !== 'warmup' && (
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {t(phaseLabelKey, { gender: 'f' })}
            </span>
          )}
        </div>

        {/* Combo badge — consecutive first-try-correct streak. Appears at 2,
            and turns "hot" once it clears the bonus-star threshold. Keyed on the
            combo value so it re-pops on every increment. */}
        {combo >= 2 && (() => {
          const hot = combo >= COMBO_BONUS_1;
          return (
            <div
              key={combo}
              className="pop-in self-center flex items-center gap-2 rounded-full px-4 py-1.5 font-extrabold"
              style={{
                background: hot ? '#FFE0B0' : '#FFF0D6',
                color:      hot ? '#D96000' : '#B8860B',
                boxShadow:  hot ? '0 0 0 2px #FFB347' : 'none',
              }}
            >
              <span className="text-lg" style={{ lineHeight: 1 }}>🔥</span>
              <span className="text-base">{t('session.combo', { gender: 'f', count: combo })}</span>
            </div>
          );
        })()}

        {/* Progress bar — quantity mode only; time uses the ring, open has none */}
        {mode === 'quantity' && (
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full"
                style={{
                  background:
                    i < index ? '#C4A7E7' : i === index ? '#FF9B7A' : '#E5E0D8',
                }}
              />
            ))}
          </div>
        )}

        {/* CPA layer-transition banner — "let's try with a picture" etc.
            Visible until the next advance() recomputes the banner state. */}
        {layerTransition && (() => {
          const key = transitionMessageKey(layerTransition.from, layerTransition.to);
          if (!key) return null;
          return (
            <div className="bg-[#FFF3D6] border border-[#FFD78A] rounded-2xl px-4 py-3 text-center text-sm font-semibold text-[#2D3047] fade-in">
              {t(key, { gender: 'f' })}
            </div>
          );
        })()}

        {/* Item card */}
        <div className="bg-white card-shadow rounded-3xl p-6 mt-4">
          <div className="text-2xl leading-relaxed font-medium mb-5">
            <MathText>{item.question}</MathText>
          </div>

          {/* Visual scaffold — renders whenever the item carries visual data,
              which in practice means cpaLayer is 'pictorial' or 'concrete'.
              Abstract items carry visual: null so the renderer is a no-op. */}
          <VisualRenderer visual={item.visual} />

          {/* IMPROVE self-questioning for word problems (Mevarech & Kramarski),
              faded by CPA layer: full three-question panel at the scaffolded
              (pictorial) layer, slim one-line reminder at abstract. */}
          {(item.skillCode === 'ARITH_WORD_2STEP' || item.skillCode === 'ARITH_WORD_3STEP') && (
            item.cpaLayer === 'pictorial' ? (
              <div className="bg-[#F3EEFF] border border-[#DCD0F0] rounded-2xl p-4 mb-4">
                <div className="text-xs font-bold text-[#7C3AED] mb-2">{t('session.improve_title', { gender: 'f' })}</div>
                <div className="text-sm text-[#2D3047] leading-relaxed">
                  <div>1️⃣ {t('session.improve_q1', { gender: 'f' })}</div>
                  <div>2️⃣ {t('session.improve_q2', { gender: 'f' })}</div>
                  <div>3️⃣ {t('session.improve_q3', { gender: 'f' })}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 mb-3 text-center">
                {t('session.improve_slim', { gender: 'f' })}
              </div>
            )
          )}

          {/* Misconception mirror — her wrong answer matched a known error
              signature, so the retry hint names THAT error specifically. */}
          {isRetry && sigHit && (
            <div className="bg-[#FFEDE8] border border-[#FFC9BC] rounded-2xl p-4 mt-3 fade-in">
              <div className="flex gap-2 items-start">
                <span className="text-xl mt-0.5 shrink-0">🪞</span>
                <div className="text-sm text-[#2D3047] leading-relaxed text-right flex-1 font-medium">
                  {t(`sig.${sigHit}` as LocaleKey, { gender: 'f' })}
                </div>
              </div>
            </div>
          )}

          {/* Skill hint — shown on retry (after first wrong answer) */}
          {isRetry && <SkillHint item={item} />}

          {item.answerMode === 'keypad' ? (
            /* Constructed response: she TYPES the answer — nothing to guess from. */
            <div className="mt-2">
              {locked && feedback?.kind === 'correct' && (
                <div className="text-center text-3xl font-black mb-2 pop-in" style={{ color: '#16A34A' }}>
                  <MathText>{`${selected} ✓`}</MathText>
                </div>
              )}
              {locked && feedback?.kind === 'wrong' && (
                <div className="text-center text-3xl font-black mb-2" style={{ color: '#DC2626' }}>
                  <MathText>{`${selected} ✗`}</MathText>
                </div>
              )}
              {feedback?.kind === 'show_answer' && (
                <div className="bg-[#B8E5C9] rounded-2xl py-3 text-center text-xl font-bold mb-2">
                  {t('session.answer_was', { gender: 'f', answer: String(item.correct) })}
                </div>
              )}
              {!locked && <NumPad onSubmit={v => handleTap(v)} maxLength={4} />}
            </div>
          ) : (
            /* Options grid — only for skills where choosing IS the skill */
            <div className="grid grid-cols-2 gap-3">
              {options.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => handleTap(opt)}
                  disabled={locked}
                  className={`btn-shadow rounded-2xl py-4 text-2xl font-bold transition-colors
                    ${locked && selected === opt ? 'bounce' : ''}`}
                  style={{ background: optionBg(opt) }}
                >
                  <MathText>{String(opt)}</MathText>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Open-mode exit button, shown between items (never on first item) */}
        {onOpenExit && index > 0 && !locked && (
          <button
            onClick={onOpenExit}
            className="text-sm text-gray-500 underline self-center mt-4"
          >
            {t('session.open_exit', { gender: 'f' })}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── End-of-session card ──────────────────────────────────────────────────────

interface EndProps {
  plan:           SessionPlan;
  itemsAttempted: number;
  itemsCorrect:   number;
  maxCombo:       number;
  gender:         'f' | 'm';
  name:           string;
  onContinue:     () => void;
  onTrophyRoom:   () => void;
}

const STAR_POSITIONS = [
  { top: '8%',  left: '10%', delay: '0s',    size: '1.4rem' },
  { top: '6%',  left: '72%', delay: '0.15s', size: '1.1rem' },
  { top: '14%', left: '88%', delay: '0.3s',  size: '1.6rem' },
  { top: '78%', left: '6%',  delay: '0.1s',  size: '1.2rem' },
  { top: '82%', left: '84%', delay: '0.25s', size: '1.5rem' },
];

function EndSession({ plan, itemsAttempted, itemsCorrect, maxCombo, gender, name, onContinue, onTrophyRoom }: EndProps) {
  const g = { gender, name };
  const skillLabelKey = `skill.${plan.primarySkillCode}` as LocaleKey;
  const accuracyPct   = itemsAttempted > 0
    ? Math.round((itemsCorrect / itemsAttempted) * 100)
    : 0;

  // Stars earned this session — same rule as the trophy room (real startedAt,
  // so the item floor applies identically in both places). A guessed session
  // earns 0 with a gentle "slow down"; a too-short session earns 0 with an
  // honest "stars start at 8 items" — different message, different cause.
  const starsEarned = starsForSession({
    sessionId: plan.sessionId, profileId: '', mode: plan.mode,
    startedAt: plan.startedAt, completedAt: null,
    itemsAttempted, itemsCorrect,
    primarySkillCode: plan.primarySkillCode,
    maxCombo,
  });
  const earnedStars  = starsEarned > 0;
  const shortSession = itemsAttempted > 0 && itemsAttempted < MIN_ITEMS_FOR_STARS;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in relative overflow-hidden">

      {/* Floating stars — only when she actually earned some */}
      {earnedStars && STAR_POSITIONS.map((s, i) => (
        <span
          key={i}
          className="float-up absolute pointer-events-none select-none"
          style={{
            top: s.top, left: s.left,
            fontSize: s.size,
            animationDelay: s.delay,
            animationDuration: '1.4s',
          }}
        >
          ⭐
        </span>
      ))}

      <div className="bg-white card-shadow rounded-3xl p-8 max-w-md w-full text-center relative z-10">

        {/* Big emoji — celebration when stars earned, encouragement otherwise */}
        <div className="pop-in text-7xl mb-2">{earnedStars ? '🎉' : '💪'}</div>

        <h2 className="text-3xl font-bold mb-1">
          {earnedStars ? t('end_session.title', g)
            : shortSession ? t('end_session.short_title', g)
            : t('end_session.try_slower_title', g)}
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          {earnedStars
            ? t('end_session.subtitle', { ...g, skill: t(skillLabelKey, g) })
            : shortSession
              ? t('end_session.short_subtitle', { ...g, min: MIN_ITEMS_FOR_STARS })
              : t('end_session.try_slower_subtitle', g)}
        </p>

        {/* Accuracy ring + score */}
        <div className="flex flex-col items-center mb-4">
          <AccuracyRing pct={accuracyPct} correct={itemsCorrect} total={itemsAttempted} />
        </div>

        {/* Stars earned this session */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {earnedStars ? (
            <span className="text-3xl" style={{ letterSpacing: '0.1em' }}>
              {'⭐'.repeat(starsEarned)}
            </span>
          ) : (
            <span className="text-sm text-gray-500">
              {shortSession ? t('end_session.zero_stars_short', { ...g, min: MIN_ITEMS_FOR_STARS }) : t('end_session.zero_stars', g)}
            </span>
          )}
        </div>

        {/* Best combo — positive reinforcement when she sustained focus */}
        {maxCombo >= 3 && (
          <p className="text-sm font-bold mb-6" style={{ color: '#D96000' }}>
            🔥 {t('end_session.best_combo', { ...g, count: maxCombo })}
          </p>
        )}
        {maxCombo < 3 && <div className="mb-6" />}

        <button
          onClick={onContinue}
          className="btn-shadow bg-[#FF9B7A] text-white rounded-2xl px-6 py-4 text-xl font-bold w-full"
        >
          {t('end_session.again', g)} 🚀
        </button>

        <button
          onClick={onTrophyRoom}
          className="mt-3 bg-white border-2 border-[#FFD78A] text-[#2D3047] rounded-2xl px-6 py-3 text-base font-bold w-full"
        >
          {t('end_session.trophy_room', g)}
        </button>
      </div>
    </div>
  );
}

// ─── Step ladder (second miss → solve it together) ────────────────────────────
//
// Replaces the old "flash the answer for 1.5s" with guided re-construction:
// the same problem decomposes into micro-steps, and the learner types every
// partial result herself. She always exits a failure by PRODUCING the correct
// answer with her own fingers — an errorless-learning exit, not a reveal.

/** Teach-mode rendering of a step: "כמה זה 13 − 8?" → "13 − 8 = 5". */
function teachLine(text: string, answer?: number): string {
  if (answer === undefined) return text;
  const m = text.match(/כמה זה (.+)\?/);
  return m ? `${m[1]} = ${answer}` : `${text} ${answer}`;
}

function StepLadder({ item, gender, onDone }: {
  item:   PracticeItem;
  gender: Gender;
  onDone: () => void;
}) {
  const steps = item.steps ?? [];
  const g = { gender };
  const [idx, setIdx]           = useState(0);
  const [wrongValue, setWrong]  = useState<number | null>(null);

  const step   = steps[idx];
  const isLast = idx >= steps.length - 1;

  const next = () => {
    setWrong(null);
    if (isLast) onDone();
    else setIdx(i => i + 1);
  };

  const submit = (v: number) => {
    if (step.answer === undefined) return;
    if (v === step.answer) next();
    else setWrong(v);
  };

  // Unreachable when steps is non-empty (the only way this mounts), but never
  // call onDone during render — just render nothing.
  if (!step) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="w-full max-w-md flex flex-col gap-4">

        <div className="bg-[#FFF3D6] border border-[#FFD78A] rounded-2xl px-4 py-3 text-center text-base font-bold text-[#2D3047]">
          🪜 {t('session.step_ladder_intro', g)}
        </div>

        <div className="bg-white card-shadow rounded-3xl p-6">
          <div className="text-lg leading-relaxed text-gray-400 mb-4">
            <MathText>{item.question}</MathText>
          </div>

          {/* Completed steps stay visible so the solution accumulates */}
          {steps.slice(0, idx).map((s, i) => (
            <div key={i} className="flex gap-2 items-start text-sm text-gray-500 mb-1.5">
              <span className="shrink-0" style={{ color: '#16A34A' }}>✓</span>
              <MathText>{teachLine(s.text, s.answer)}</MathText>
            </div>
          ))}

          {/* Current step */}
          <div className="text-xl font-bold my-4 text-[#2D3047]">
            <MathText>{step.text}</MathText>
          </div>

          {step.answer !== undefined && wrongValue === null && (
            /* key={idx}: each step gets a FRESH pad — the previous step's
               digits must never leak into the next entry. */
            <NumPad key={idx} onSubmit={submit} maxLength={4} />
          )}

          {wrongValue !== null && step.answer !== undefined && (
            <div className="text-center fade-in">
              <div className="text-2xl font-bold mb-1 line-through" style={{ color: '#DC2626' }}>
                <MathText>{String(wrongValue)}</MathText>
              </div>
              <div className="text-xl font-bold mb-4" style={{ color: '#16A34A' }}>
                {t('session.step_correct_is', { ...g, answer: step.answer })}
              </div>
              <button
                onClick={next}
                className="btn-shadow bg-[#C4A7E7] text-white rounded-2xl px-6 py-3 text-lg font-bold w-full"
              >
                {t('session.step_got_it', g)}
              </button>
            </div>
          )}

          {step.answer === undefined && (
            <button
              onClick={next}
              className="btn-shadow bg-[#C4A7E7] text-white rounded-2xl px-6 py-3 text-lg font-bold w-full"
            >
              {t('session.step_continue', g)}
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: i <= idx ? '#C4A7E7' : '#E5E0D8' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Worked example (teaching slot — never answered, never scored) ────────────
//
// Struggling skills open their block with one of these: the full solution
// revealed step by step at the learner's own pace, then "עכשיו תורי!" hands
// control back for the faded practice that follows.

function WorkedExampleView({ planItem, gender, onDone }: {
  planItem: SessionPlanItem;
  gender:   Gender;
  onDone:   () => void;
}) {
  const { item } = planItem;
  const steps = item.steps ?? [];
  const g = { gender };
  const [revealed, setRevealed] = useState(steps.length > 0 ? 1 : 0);
  const allShown = revealed >= steps.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="w-full max-w-md flex flex-col gap-4">

        <div className="bg-[#EAF4FF] border border-[#BBD9F7] rounded-2xl px-4 py-3 text-center text-base font-bold text-[#2D3047]">
          🧑‍🏫 {t('session.worked_example_title', g)}
        </div>

        <div className="bg-white card-shadow rounded-3xl p-6">
          <div className="text-2xl leading-relaxed font-medium mb-4">
            <MathText>{item.question}</MathText>
          </div>

          <VisualRenderer visual={item.visual} />

          {steps.slice(0, revealed).map((s, i) => (
            <div key={i} className="bg-[#F8F4ED] rounded-xl px-4 py-3 mb-2 fade-in text-base">
              <MathText>{teachLine(s.text, s.answer)}</MathText>
            </div>
          ))}

          <button
            onClick={() => (allShown ? onDone() : setRevealed(r => r + 1))}
            className={`btn-shadow rounded-2xl px-6 py-4 text-xl font-bold w-full mt-3 text-white ${
              allShown ? 'bg-[#FF9B7A]' : 'bg-[#C4A7E7]'
            }`}
          >
            {allShown ? t('session.worked_example_done', g) : t('session.worked_example_next', g)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skill hint (shown on retry after first wrong answer) ─────────────────────
//
// Provides a visual/conceptual scaffold for each skill so Mia has a way to
// think about the problem before her second attempt. The hint is specific to
// the skill's target misconception, not a generic "try again" prompt.

function SkillHint({ item }: { item: PracticeItem }) {
  const wrap = (icon: string, content: React.ReactNode) => (
    <div className="bg-[#FFF9EF] border border-[#F0E6D3] rounded-2xl p-4 mt-3 fade-in">
      <div className="flex gap-2 items-start">
        <span className="text-xl mt-0.5 shrink-0">{icon}</span>
        <div className="text-sm text-[#2D3047] leading-relaxed text-right flex-1">
          {content}
        </div>
      </div>
    </div>
  );

  if (item.skillCode === 'ARITH_MULT_6_9') {
    // Parse factors from question "כמה זה A × B?" and show repeated addition.
    const m = item.question.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const [small, large] = a <= b ? [a, b] : [b, a];
      const terms = Array<string>(small).fill(String(large));
      return wrap('🔢', (
        <>
          <div className="font-medium mb-1">כפל = חיבור חוזר:</div>
          <div className="font-mono text-base tracking-wide">
            {terms.join(' + ')} = <span className="text-[#C4A7E7] font-bold">?</span>
          </div>
        </>
      ));
    }
  }

  if (item.skillCode === 'ARITH_SUB_REGROUP_ZERO') {
    return wrap('📦', (
      <>
        <div className="font-medium mb-1">כשיש 0 — לווים:</div>
        <div>מאה אחת = <strong>10 עשרות</strong></div>
        <div>עשרת אחת = <strong>10 יחידות</strong></div>
        <div className="mt-1 text-xs text-gray-500">פרקי את המספר הגדול, ואז חסרי שלב-שלב</div>
      </>
    ));
  }

  if (item.skillCode === 'FRAC_COMPARE_UNIT') {
    return wrap('🍕', (
      <>
        <div className="font-medium mb-1">כלל השברים:</div>
        <div>מכנה <strong>גדול</strong> → חלק <strong>קטן</strong></div>
        <div className="font-bold mt-1">½ &gt; ⅓ &gt; ¼ &gt; ⅕ &gt; ⅙</div>
        <div className="text-xs text-gray-500 mt-1">פיצה שחתוכה ל-2 — כל חתיכה גדולה מפיצה שחתוכה ל-4</div>
      </>
    ));
  }

  if (item.skillCode === 'FRAC_OF_QUANTITY') {
    return wrap('➗', (
      <>
        <div className="font-medium mb-1">שבר מתוך כמות = חלוקה:</div>
        <div>חצי מ-N = N ÷ 2</div>
        <div>שליש מ-N = N ÷ 3</div>
        <div>רבע מ-N = N ÷ 4</div>
        <div className="text-xs text-gray-500 mt-1">חלקים — לא כופלים!</div>
      </>
    ));
  }

  if (item.skillCode === 'ARITH_WORD_2STEP' || item.skillCode === 'ARITH_WORD_3STEP') {
    return wrap('📖', (
      <>
        <div className="font-medium mb-1">שאלה בשלבים — קראי לאט:</div>
        <div>1️⃣ מה קרה ראשון? חשבי</div>
        <div>2️⃣ מה קרה אחרי? הוסיפי/חסרי</div>
        <div>3️⃣ מה השאלה בסוף?</div>
      </>
    ));
  }

  if (item.skillCode === 'MEAS_UNIT_CONVERT_CM') {
    return wrap('📏', (
      <>
        <div className="font-bold text-base mb-1">1 מ׳ = 100 ס״מ</div>
        <div>מטרים × 100 + סנטימטרים</div>
        <div className="text-xs text-gray-500 mt-1 font-mono">
          3 מ׳ + 20 ס״מ = 300 + 20 = 320 ס״מ
        </div>
      </>
    ));
  }

  if (item.skillCode === 'MEAS_UNIT_CONVERT_M') {
    return wrap('🗺️', (
      <>
        <div className="font-bold text-base mb-1">1 ק״מ = 1000 מ׳</div>
        <div>קילומטרים × 1000 + מטרים</div>
        <div className="text-xs text-gray-500 mt-1 font-mono">
          2 ק״מ + 300 מ׳ = 2000 + 300 = 2300 מ׳
        </div>
      </>
    ));
  }

  if (item.skillCode === 'MEAS_TIME_CROSS_HOUR') {
    return wrap('⏰', (
      <>
        <div className="font-medium mb-1">כשעוברים שעה:</div>
        <div>1️⃣ כמה דקות עד השעה העגולה?</div>
        <div>2️⃣ כמה דקות נשארו אחרי?</div>
        <div className="text-xs text-gray-500 mt-1">למשל: 2:40 + 30 דק׳ → 20 דק׳ עד 3:00, ואז עוד 10</div>
      </>
    ));
  }

  return null;
}

// ─── Progress ring (time mode header) ─────────────────────────────────────────
//
// A thin SVG arc that fills clockwise as items are answered.
// Sits in the top-left header replacing the text counter for time mode.

function ProgressRing({ done, total }: { done: number; total: number }) {
  const R   = 18;
  const C   = 2 * Math.PI * R;          // circumference ≈ 113 px
  const pct = total > 0 ? done / total : 0;
  const offset = C * (1 - pct);         // unfilled portion

  return (
    <div className="flex items-center gap-2">
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx="22" cy="22" r={R}
          fill="none" stroke="#E5E0D8" strokeWidth="4"
        />
        {/* Filled arc */}
        <circle
          cx="22" cy="22" r={R}
          fill="none" stroke="#C4A7E7" strokeWidth="4"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
      <span className="text-sm text-gray-500 font-medium">{done + 1}/{total}</span>
    </div>
  );
}

// ─── Accuracy ring (end-of-session card) ──────────────────────────────────────
//
// Large SVG ring showing accuracy %, with correct/total label inside.

function AccuracyRing({ pct, correct, total }: { pct: number; correct: number; total: number }) {
  const R   = 52;
  const C   = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);

  // Choose ring colour based on accuracy
  const color =
    pct >= 80 ? '#B8E5C9' :   // green
    pct >= 55 ? '#FFD98E' :   // amber
                '#FFCFC9';    // pink

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#E5E0D8" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={R}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      {/* Centre label */}
      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-black" style={{ color: '#2D3047' }}>{pct}%</span>
        <span className="text-sm text-gray-500 mt-0.5">{correct}/{total}</span>
      </div>
    </div>
  );
}

