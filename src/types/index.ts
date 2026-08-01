// ─── Identity ─────────────────────────────────────────────────────────────────

export type Gender = 'f' | 'm';

export type AvatarId = 'fox' | 'cat' | 'unicorn' | 'dragon' | 'owl' | 'whale';

export interface Avatar {
  id:        AvatarId;
  emoji:     string;
  nameKey:   string; // i18n key → t(nameKey, {gender})
  color:     string; // background hex
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  profileId:             string;
  avatarId:              AvatarId;
  gender:                Gender;
  displayName:           string;
  onboardingComplete:    boolean;
  diagnosticCompletedAt: string | null;
  diagnosticVersion:     number | null;
  gapProfileJson:        GapProfile | null;
  sessionsCompleted:     number; // used for re-diagnostic trigger (10-session rule)
  createdAt:             string;
}

// ─── Mastery ──────────────────────────────────────────────────────────────────

export type MasteryStatus = 'שליטה' | 'בתהליך' | 'טרם נלמד';

export interface MasteryRecord {
  profileId:             string;
  skillCode:             string;
  status:                MasteryStatus;
  firstAttemptAccuracy:  number;   // 0.0–1.0, rolling window of last 10 abstract-layer items
  itemCount:             number;   // total first-attempt items recorded
  sessionCount:          number;   // distinct sessions in which the skill appeared
  lastPracticedAt:       string;
  needsRetentionProbe:   boolean;
  retentionProbeDueAt:   string | null;
  /** Retention probes passed since graduation (0 → next is the 7-day probe,
   *  1 → next is the 30-day probe, 2 → retention confirmed). Local-only. */
  probesPassed?:         number;
}

// ─── Error signatures ─────────────────────────────────────────────────────────

export type ErrorSignatureCode =
  | 'ERR_REGROUP_ZERO'       // subtract smaller from larger across zeros
  | 'ERR_MULT_FACT'          // missing ×6–×9 multiplication facts
  | 'ERR_MULT_FACT_SLOW'     // computes rather than retrieves (correct but > 3 s)
  | 'ERR_FRACTION_BIAS'      // reads denominator as magnitude (⅓ > ½ because 3 > 2)
  | 'ERR_FRAC_QUANTITY_BIAS' // multiplies instead of divides (¼ of 20 = 80)
  | 'ERR_NUMBER_GRAB'        // grabs all numbers in a word problem without modelling
  | 'ERR_UNIT_MISMATCH'      // adds/concatenates quantities across different units
  // ── Grade 4 (validated deep research, 3/3 tool agreement, 2026-07-31) ──────
  | 'ERR_DIGIT_FOR_VALUE'    // reports the digit (7) instead of its value (70,000)
  | 'ERR_ZERO_PLACEHOLDER'   // drops internal zeros when writing a numeral
  | 'ERR_FIRST_DIGIT_CMP'    // 98,765 > 102,345 because 9 > 1
  | 'ERR_PLACE_SHIFT';       // expanded form assembled one column off

export type SignatureConfidence = 'confirmed' | 'suspected' | 'ruled_out';

export interface ErrorSignature {
  profileId:         string;
  signatureCode:     ErrorSignatureCode;
  confidence:        SignatureConfidence;
  firstDetectedAt:   string;
  lastVerifiedAt:    string;
  detectionEvidence: string[]; // item IDs
}

// ─── Diagnostic items ─────────────────────────────────────────────────────────

export type DiagnosticPhase   = 'entry' | 'verification' | 'extension';
export type DiagnosticSessionType = 'onboarding' | 'rediagnostic';
export type CPALayer = 'concrete' | 'pictorial' | 'abstract';

/**
 * Visual scaffold types for practice + diagnostic items.
 *
 * Phase 2 shipped with `fraction_circles`, `analog_clock`, and `base10_blocks`.
 * Phase 3 adds pictorial layer coverage across all nine skills by introducing
 * `fraction_bar`, `dot_array`, `bar_model`, and `number_line`, and extends the
 * existing types with optional annotations (regroup label, elapsed minutes).
 *
 * Renderers live in `src/components/visuals/`. A single `<VisualRenderer />`
 * dispatches on `type`, so adding a variant is a two-step job: extend this
 * union and add a case to the dispatcher.
 */
export type ItemVisual =
  /** Two side-by-side fraction circles for comparison (½ vs ⅓). */
  | { type: 'fraction_circles'; partsA: number; labelA: string; partsB: number; labelB: string }
  /** One circle split into N parts with K highlighted — used for "¼ of 20" type questions. */
  | { type: 'fraction_bar';     parts: number; highlighted: number; total?: number }
  /** Analog clock; optional arc shows elapsed minutes sweeping forward from `time`. */
  | { type: 'analog_clock';     time: string; elapsedMin?: number }
  /** Base-10 blocks: columns of hundred-squares, ten-rods, unit-cubes. `regroupLabel` shows a hint above the grid. */
  | { type: 'base10_blocks';    hundreds: number; tens: number; ones: number; regroupLabel?: string }
  /** Grid of dots (rows × cols). Optional `highlighted` count marks the first K dots for fraction-of-quantity. */
  | { type: 'dot_array';        rows: number; cols: number; highlighted?: number }
  /** Bar model — each row is a stacked horizontal bar; parts carry values or "?". */
  | { type: 'bar_model';        rows: Array<{ label?: string; parts: Array<{ size: number; label?: string; highlight?: boolean }> }> }
  /** Number line with optional jump arrow (for time / conversion / word problems). */
  | { type: 'number_line';      min: number; max: number; step: number; from?: number; to?: number; arrowLabel?: string };

/** @deprecated Kept for backward compatibility. Use `ItemVisual` instead. */
export type DiagnosticVisual = ItemVisual;

export interface DiagnosticItem {
  itemId:        string;
  skillCode:     string;
  skillHebrewKey: string;         // i18n key → t(skillHebrewKey, {gender})
  question:      string;          // raw Hebrew — must be passed through <MathText>
  options:       (string | number)[];
  correct:       string | number;
  signature:     string | number | null;
  signatureCode: ErrorSignatureCode | null;
  visual:        ItemVisual | null;
  phase:         DiagnosticPhase;
  cpaLayer:      CPALayer;
}

export interface DiagnosticAttempt {
  id:             string;
  profileId:      string;
  sessionId:      string;
  itemId:         string;
  skillCode:      string;
  answer:         string | number;
  correct:        boolean;
  signatureHit:   ErrorSignatureCode | null;
  timeToAnswerMs: number;
  sequenceNumber: number;
  phase:          DiagnosticPhase;
  createdAt:      string;
}

// ─── Phase 1 status flags (internal to diagnostic engine) ─────────────────────

export type EntryStatus =
  | 'clear'        // correct answer
  | 'clear_fast'   // correct and fast (< MULT_FACT_RETRIEVAL_THRESHOLD_MS)
  | 'clear_slow'   // correct but slow (≥ threshold) — used for ERR_MULT_FACT only
  | 'signature_hit' // wrong, and the specific misconception signature
  | 'wrong'         // wrong, any answer
  | 'wrong_other'   // wrong, non-signature answer
  | 'wrong_other_A' // wrong, non-signature, variant A
  | 'wrong_other_B' // wrong, non-signature, variant B

export interface Phase1Signals {
  REGROUP_ZERO_STATUS:  EntryStatus;
  MULT_FACT_STATUS:     EntryStatus;
  FRACTION_BIAS_STATUS: EntryStatus;
  NUMBER_GRAB_STATUS:   EntryStatus;
  UNIT_MISMATCH_STATUS: EntryStatus;
}

// ─── Gap profile ──────────────────────────────────────────────────────────────

export type StrandCode = 'ARITH' | 'FRAC' | 'PLACE_VALUE' | 'MEAS' | 'GEOM' | 'DATA' | 'PROPS';

export interface StrandStatus {
  status:       MasteryStatus;
  activeErrors: ErrorSignatureCode[];
  priority:     number; // lower = higher priority for session composer
}

export interface GapProfile {
  version:              number;
  computedAt:           string;
  diagnosticSessionId:  string;
  strands:              Partial<Record<StrandCode, StrandStatus>>;
  cpaStartLayer:        Partial<Record<string, CPALayer>>; // keyed by skillCode
  sessionComposerNotes: {
    startWith:                'easy_known_skill' | 'challenge_material';
    firstNewMaterial:         string; // skillCode
    blockedPracticePriority:  string[]; // skillCodes in priority order
  };
}

// ─── Diagnostic session ───────────────────────────────────────────────────────

export interface DiagnosticSession {
  sessionId:      string;
  profileId:      string;
  type:           DiagnosticSessionType;
  startedAt:      string;
  completedAt:    string | null;
  phase:          'entry' | 'verification' | 'extension' | 'complete';
  itemsAnswered:  number;
}

// ─── Session modes ────────────────────────────────────────────────────────────

export type SessionMode = 'time' | 'quantity' | 'open';

export type SessionPhase =
  | 'warmup'               // easy known skill to start, off-curve
  | 'new_material'
  | 'blocked_practice'
  | 'spaced_retrieval'
  | 'interleaved';

// ─── Practice items (post-diagnostic) ─────────────────────────────────────────
//
// Structurally identical to DiagnosticItem but semantically distinct.
// Kept as a separate type so the type system prevents accidentally
// pushing a diagnostic item into a practice session or vice versa.

/** How the learner produces her answer.
 *  'keypad' — she types the number on the RTL keypad (no options shown).
 *  'choice' — 4-option tap grid (only for skills where choosing IS the skill,
 *  e.g. comparing fractions). Defaults to 'choice' for back-compat. */
export type AnswerMode = 'choice' | 'keypad';

/** One step of a worked solution. Steps with an `answer` pause and ask the
 *  learner to type that intermediate result on the keypad; steps without one
 *  are explanation-only. */
export interface WorkedStep {
  text:    string;
  answer?: number;
}

export interface PracticeItem {
  itemId:         string;
  skillCode:      string;
  skillHebrewKey: string;
  question:       string;
  options:        (string | number)[];
  correct:        string | number;
  /** Same meaning as DiagnosticItem.signature — the wrong answer that indicates the target misconception */
  signature:      string | number | null;
  signatureCode:  ErrorSignatureCode | null;
  visual:         ItemVisual | null;
  cpaLayer:       CPALayer;
  /** 1 (easiest) to 5 (hardest) within the skill. Used by the composer for adaptive sequencing. */
  difficulty:     number;
  answerMode?:    AnswerMode;
  /** Worked-solution steps: shown as a step-ladder after the second miss, and
   *  as the walkthrough body of worked-example plan items. */
  steps?:         WorkedStep[];
}

/**
 * Which track an item belongs to in a dual-track session.
 *
 *   current_grade — what her class is doing now (the point of the session)
 *   prerequisite  — an earlier skill that is blocking current-grade work.
 *                   Framed to her as a tool for today, never as demotion.
 *   retention     — mastered material resurfacing for spacing/probes
 */
export type SkillTrack = 'current_grade' | 'prerequisite' | 'retention';

export interface SessionPlanItem {
  item:           PracticeItem;
  sessionPhase:   SessionPhase;
  /** 0-indexed position in the session plan */
  position:       number;
  /** Teaching slot: the item is walked through, not answered or scored. */
  isWorkedExample?:  boolean;
  /** 7/30-day retention probe: first-attempt outcome feeds probe logic. */
  isRetentionProbe?: boolean;
  /** Dual-track classification. Absent on legacy/grade-3-only plans. */
  track?:            SkillTrack;
  /**
   * For prerequisite items: the graph edge's reason, in Hebrew, e.g.
   * "כדי לכתוב מספרים גדולים צריך להבין ערך מקום". Shown to Mia so the easier
   * work reads as equipment for today's goal.
   */
  prereqWhy?:        string;
  /** The current-grade skill this prerequisite item unblocks. */
  prereqFor?:        string;
}

export interface SessionPlan {
  sessionId:          string;
  profileId:          string;
  mode:               SessionMode;
  /** Ordered items. For 'open' mode this is an initial batch; composer extends on demand. */
  plannedItems:       SessionPlanItem[];
  /** Target count for time/quantity; null for open mode */
  targetItems:        number | null;
  /** Skill the end-of-session card will highlight ("Today we worked on X") */
  primarySkillCode:   string;
  startedAt:          string;
  /** Debug/analytics: why the composer picked this shape */
  composerReasoning:  string[];
}

// ─── Session attempts & records ───────────────────────────────────────────────

export interface PracticeAttempt {
  id:             string;
  profileId:      string;
  sessionId:      string;
  itemId:         string;
  skillCode:      string;
  sessionPhase:   SessionPhase;
  cpaLayer:       CPALayer;
  answer:         string | number;
  correct:        boolean;
  /** First-attempt = no prior attempt on this item in this session. Rolling-window mastery counts first-attempts only. */
  firstAttempt:   boolean;
  signatureHit:   ErrorSignatureCode | null;
  timeToAnswerMs: number;
  sequenceNumber: number;
  createdAt:      string;
}

export interface SessionRecord {
  sessionId:        string;
  profileId:        string;
  mode:             SessionMode;
  startedAt:        string;
  completedAt:      string | null;
  itemsAttempted:   number;
  itemsCorrect:     number;
  primarySkillCode: string;
  /** Longest run of consecutive correct answers in this session (combo). Optional for back-compat. */
  maxCombo?:        number;
}

// ─── Mastery map ──────────────────────────────────────────────────────────────
//
// Keyed by skillCode. Represents Mia's current mastery state across all skills
// she's been exposed to (diagnostic seeds this; each session updates it).

export type MasteryMap = Record<string, MasteryRecord>;

// ─── CPA state ────────────────────────────────────────────────────────────────
//
// Per-skill in-session state for the CPA scaffolding engine.
// Lives only for the duration of a session; not persisted.

export interface CPAState {
  skillCode:          string;
  currentLayer:       CPALayer;
  consecutiveCorrect: number;
  consecutiveWrong:   number;
}

// ─── CPA memory (cross-session) ───────────────────────────────────────────────
//
// Persisted per skill so a layer drop survives the session boundary. Without
// this, a learner can fail a skill for weeks and every session restarts at
// the same layer with no escalation (the 68-sessions-at-45% failure mode).

export interface CpaSkillMemory {
  /** Layer to start the next session at for this skill. */
  layer:            CPALayer;
  /** Consecutive sessions with first-attempt accuracy on this skill < 55%.
   *  At 3 the composer escalates (layer drop + worked example first). */
  struggleSessions: number;
}

export type CPAMemory = Record<string, CpaSkillMemory>;
