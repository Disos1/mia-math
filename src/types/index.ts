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
  firstAttemptAccuracy:  number;   // 0.0–1.0, rolling window of last 10 items
  itemCount:             number;   // total first-attempt items recorded
  sessionCount:          number;   // distinct sessions in which the skill appeared
  lastPracticedAt:       string;
  needsRetentionProbe:   boolean;
  retentionProbeDueAt:   string | null;
}

// ─── Error signatures ─────────────────────────────────────────────────────────

export type ErrorSignatureCode =
  | 'ERR_REGROUP_ZERO'       // subtract smaller from larger across zeros
  | 'ERR_MULT_FACT'          // missing ×6–×9 multiplication facts
  | 'ERR_MULT_FACT_SLOW'     // computes rather than retrieves (correct but > 3 s)
  | 'ERR_FRACTION_BIAS'      // reads denominator as magnitude (⅓ > ½ because 3 > 2)
  | 'ERR_FRAC_QUANTITY_BIAS' // multiplies instead of divides (¼ of 20 = 80)
  | 'ERR_NUMBER_GRAB'        // grabs all numbers in a word problem without modelling
  | 'ERR_UNIT_MISMATCH';     // adds/concatenates quantities across different units

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

export type DiagnosticVisual =
  | { type: 'fraction_circles'; partsA: number; labelA: string; partsB: number; labelB: string }
  | { type: 'analog_clock';     time: string }
  | { type: 'base10_blocks';    hundreds: number; tens: number; ones: number };

export interface DiagnosticItem {
  itemId:        string;
  skillCode:     string;
  skillHebrewKey: string;         // i18n key → t(skillHebrewKey, {gender})
  question:      string;          // raw Hebrew — must be passed through <MathText>
  options:       (string | number)[];
  correct:       string | number;
  signature:     string | number | null;
  signatureCode: ErrorSignatureCode | null;
  visual:        DiagnosticVisual | null;
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
  visual:         DiagnosticVisual | null;
  cpaLayer:       CPALayer;
  /** 1 (easiest) to 5 (hardest) within the skill. Used by the composer for adaptive sequencing. */
  difficulty:     number;
}

export interface SessionPlanItem {
  item:           PracticeItem;
  sessionPhase:   SessionPhase;
  /** 0-indexed position in the session plan */
  position:       number;
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
