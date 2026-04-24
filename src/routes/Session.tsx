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
  SessionMode,
  SessionPlan,
  SessionPlanItem,
  PracticeAttempt,
  MasteryMap,
  CPAState,
  PracticeItem,
} from '../types';
import type { AttemptLedger } from '../lib/masteryTracker';

import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import { MathText } from '../components/primitives/MathText';

import { composeSession, extendOpenPlan } from '../lib/sessionComposer';
import {
  applyAttemptToMastery,
  seedMasteryFromDiagnostic,
} from '../lib/masteryTracker';
import { initCPAState, onCorrect, onWrong } from '../lib/cpaState';
import {
  loadMasteryMap,
  saveMasteryMap,
  loadLedger,
  saveLedger,
  appendAttempts,
  appendSessionRecord,
} from '../lib/sessionStore';
import { updateProfile } from '../lib/profile';

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
  | { kind: 'show_answer' };  // 2nd wrong — flash the correct option green

// ─── Component ────────────────────────────────────────────────────────────────

type Screen = 'running' | 'end';

export function Session({ profile, mode, onComplete, onTrophyRoom }: Props) {
  // ── One-time init ──────────────────────────────────────────────────────────
  const initialMastery = useMemo<MasteryMap>(() => {
    const existing = loadMasteryMap(profile.profileId);
    if (Object.keys(existing).length > 0) return existing;
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

  // Compose the plan once per session
  const plan = useMemo<SessionPlan>(
    () => composeSession({
      profileId:         profile.profileId,
      gapProfile:        profile.gapProfileJson,
      masteryMap:        initialMastery,
      mode,
      sessionsCompleted: profile.sessionsCompleted,
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

  // `setAttempts` keeps React informed of attempt-count changes for potential
  // future UI; the authoritative list lives on attemptsRef.
  const [, setAttempts] = useState<PracticeAttempt[]>([]);

  const [cpaBySkill, setCpaBySkill] = useState<Record<string, CPAState>>({});
  const [skillsSeenThisSession]  = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<SessionFeedback>(null);

  // retryCount drives the PracticeItemView key — incrementing it remounts the
  // item with fresh selected/locked state so Mia can retry the same question.
  const [retryCount, setRetryCount] = useState(0);
  // isRetry tells PracticeItemView to show the skill hint panel.
  const [isRetry, setIsRetry] = useState(false);
  // wrongCountRef tracks wrong attempts on the current item without triggering
  // extra renders; reset whenever we advance to a new item.
  const wrongCountRef = useRef(0);

  const startedAtRef = useRef<string>(plan.startedAt);

  const currentItem = items[index] ?? null;
  const total       = plan.targetItems ?? items.length;

  // ── Answer handler ─────────────────────────────────────────────────────────
  const handleAnswer = (answer: string | number, timeToAnswerMs: number) => {
    if (!currentItem) return;
    const it = currentItem.item;

    const correct = answer === it.correct;
    const signatureHit =
      !correct && it.signatureCode && answer === it.signature ? it.signatureCode : null;

    // CPA state transition (tracked for mastery; not surfaced visually in Phase 2
    // since the plan is pre-composed and items don't swap by layer mid-session).
    const priorCpa = cpaBySkill[it.skillCode]
      ?? initCPAState(it.skillCode, it.cpaLayer);
    const nextCpa  = correct ? onCorrect(priorCpa) : onWrong(priorCpa);
    setCpaBySkill(prev => ({ ...prev, [it.skillCode]: nextCpa }));

    const firstAttempt = attemptsRef.current.every(
      a => !(a.itemId === it.itemId && a.sessionId === plan.sessionId)
    );

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
    const { masteryMap: nextMastery, ledger: nextLedger } = applyAttemptToMastery({
      profileId:            profile.profileId,
      attempt,
      masteryMap:           masteryRef.current,
      ledger:               ledgerRef.current,
      isNewSessionForSkill: isNewForSkill,
    });

    masteryRef.current  = nextMastery;
    ledgerRef.current   = nextLedger;
    attemptsRef.current = [...attemptsRef.current, attempt];
    setMasteryMap(nextMastery);
    setLedger(nextLedger);
    setAttempts(attemptsRef.current);

    if (correct) {
      setFeedback({ kind: 'correct' });
      setTimeout(() => {
        setFeedback(null);
        wrongCountRef.current = 0;
        setIsRetry(false);
        advance();
      }, 1000);
    } else {
      // Wrong: first mistake → show hint and let her retry.
      // Second mistake → flash correct answer and move on.
      wrongCountRef.current += 1;
      if (wrongCountRef.current >= 2) {
        setFeedback({ kind: 'show_answer' });
        setTimeout(() => {
          setFeedback(null);
          wrongCountRef.current = 0;
          setIsRetry(false);
          advance();
        }, 1500);
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

  const advance = () => {
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
      });
      if (more.length === 0) { finish(); return; }
      setItems(prev => [...prev, ...more.map((p, i) => ({ ...p, position: prev.length + i }))]);
      setIndex(nextIndex);
      return;
    }

    if (ranOutOfItems) {
      finish();
      return;
    }

    setIndex(nextIndex);
  };

  const finish = () => {
    // Use the ref so we always have the full list even if the last setAttempts
    // hasn't flushed through React's scheduler yet.
    const allAttempts  = attemptsRef.current;
    const correctCount = allAttempts.filter(a => a.correct).length;

    appendAttempts(profile.profileId, allAttempts);
    saveMasteryMap(profile.profileId, masteryRef.current);
    saveLedger(profile.profileId, ledgerRef.current);
    appendSessionRecord(profile.profileId, {
      sessionId:        plan.sessionId,
      profileId:        profile.profileId,
      mode:             plan.mode,
      startedAt:        startedAtRef.current,
      completedAt:      new Date().toISOString(),
      itemsAttempted:   allAttempts.length,
      itemsCorrect:     correctCount,
      primarySkillCode: plan.primarySkillCode,
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
        itemsCorrect={attemptsRef.current.filter(a => a.correct).length}
        itemsAttempted={attemptsRef.current.length}
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

  return (
    <PracticeItemView
      key={`${index}-${retryCount}`}  /* remount on new item OR retry */
      planItem={currentItem}
      index={index}
      total={total}
      mode={mode}
      feedback={feedback}
      isRetry={isRetry}
      onAnswer={handleAnswer}
      onOpenExit={mode === 'open' ? earlyExit : undefined}
    />
  );
}

// ─── Item view ────────────────────────────────────────────────────────────────

interface ItemViewProps {
  planItem:    SessionPlanItem;
  index:       number;
  total:       number;
  mode:        SessionMode;
  feedback:    SessionFeedback;
  isRetry:     boolean;
  onAnswer:    (answer: string | number, timeMs: number) => void;
  onOpenExit?: () => void;
}

function PracticeItemView({
  planItem, index, total, mode, feedback, isRetry, onAnswer, onOpenExit,
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

        {/* Item card */}
        <div className="bg-white card-shadow rounded-3xl p-6 mt-4">
          <div className="text-2xl leading-relaxed font-medium mb-5">
            <MathText>{item.question}</MathText>
          </div>

          {/* Fraction-circle visual — always shown for pictorial-layer items */}
          {item.visual?.type === 'fraction_circles' && (
            <div className="flex items-center justify-around my-4">
              <FractionCircle parts={item.visual.partsA} label={item.visual.labelA} />
              <FractionCircle parts={item.visual.partsB} label={item.visual.labelB} />
            </div>
          )}

          {/* Skill hint — shown on retry (after first wrong answer) */}
          {isRetry && <SkillHint item={item} />}

          {/* Options grid */}
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

function EndSession({ plan, itemsAttempted, itemsCorrect, onContinue, onTrophyRoom }: EndProps) {
  const g = { gender: 'f' as const };
  const skillLabelKey = `skill.${plan.primarySkillCode}` as LocaleKey;
  const accuracyPct   = itemsAttempted > 0
    ? Math.round((itemsCorrect / itemsAttempted) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in relative overflow-hidden">

      {/* Floating stars — positioned absolutely behind the card */}
      {STAR_POSITIONS.map((s, i) => (
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

        {/* Big celebration emoji — pops in */}
        <div className="pop-in text-7xl mb-2">🎉</div>

        <h2 className="text-3xl font-bold mb-1">{t('end_session.title', g)}</h2>
        <p className="text-gray-600 text-sm mb-6">
          {t('end_session.subtitle', { ...g, skill: t(skillLabelKey, g) })}
        </p>

        {/* Accuracy ring + score */}
        <div className="flex flex-col items-center mb-6">
          <AccuracyRing pct={accuracyPct} correct={itemsCorrect} total={itemsAttempted} />
        </div>

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

// ─── Inline fraction-circle visual (mirrors DiagnosticItem) ──────────────────

function FractionCircle({ parts, label }: { parts: number; label: string }) {
  const r = 50, cx = 60, cy = 60;
  const slices = Array.from({ length: parts }, (_, i) => {
    const a0 = (i * 2 * Math.PI) / parts - Math.PI / 2;
    const a1 = ((i + 1) * 2 * Math.PI) / parts - Math.PI / 2;
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={i === 0 ? '#FF9B7A' : '#FFE8DD'}
        stroke="#2D3047"
        strokeWidth="2"
      />
    );
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">{slices}</svg>
      <div className="text-2xl font-bold">{label}</div>
    </div>
  );
}

