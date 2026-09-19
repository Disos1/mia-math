/**
 * Where is Mia's class in the book, and where should she be?
 *
 * Two inputs, in priority order:
 *   1. The parent's setting — Dima can see her booklets, so his word wins.
 *   2. An estimate from the publisher's pacing, used only until he sets it,
 *      and always labelled as an estimate in the UI.
 *
 * Storage is device-local for now (a dedicated localStorage key, NOT inside the
 * profile object — the profile is overwritten from Supabase on every sign-in and
 * would silently drop the setting). Syncing it across Dima's phone and Mia's
 * iPad needs a `class_position` column; that migration is proposed, not applied.
 *
 * "Exceeding the pace" is implemented as pre-teaching: the new-material target
 * is the class's CURRENT unit until she has mastered it, then the NEXT one, up
 * to MAX_UNITS_AHEAD. Class then becomes her second exposure rather than her
 * first. Units the class has already passed that she has NOT mastered are not
 * new material — they go to the repair stream, so a gap behind the class never
 * stops her from keeping up with this week's lesson.
 */

import type { MasteryMap } from '../../types';
import { isMastered } from '../masteryTracker';
import { isUnlocked } from '../skillGraph';
import { SKILLS_WITH_PRACTICE } from '../items';
import {
  STRANDS, unitsOf, unitById, indexInStrand,
  type StrandId, type CurriculumUnit,
} from './hashbacha4';

// ─── Calendar (תשפ"ז) ────────────────────────────────────────────────────────

/** First day of school, תשפ"ז. */
export const SCHOOL_START = '2026-09-01';

/**
 * The Tishrei vacation removes roughly a week and a half of teaching in
 * September–October. Approximate on purpose: this only shifts the ESTIMATE,
 * and the estimate is only a fallback until the parent sets the position.
 */
const BREAKS: Array<[string, string]> = [
  ['2026-09-21', '2026-10-04'],   // Yom Kippur → end of Sukkot (approx.)
  ['2026-12-06', '2026-12-13'],   // Hanukkah (approx.)
  ['2027-04-13', '2027-04-29'],   // Passover (approx.)
];

/** How many units past the class's current one new material may reach. */
export const MAX_UNITS_AHEAD = 2;

const DAY = 24 * 60 * 60 * 1000;

/** Teaching weeks elapsed since school start, holidays removed. */
export function teachingWeek(nowIso: string): number {
  const start = new Date(SCHOOL_START).getTime();
  const now   = new Date(nowIso).getTime();
  if (now <= start) return 0;
  let days = (now - start) / DAY;
  for (const [a, b] of BREAKS) {
    const s = new Date(a).getTime(), e = new Date(b).getTime();
    if (now <= s) continue;
    days -= (Math.min(now, e) - s) / DAY;
  }
  return Math.max(0, Math.floor(days / 7));
}

// ─── Position ─────────────────────────────────────────────────────────────────

export interface ClassPosition {
  /** Current unit id per strand. */
  units:  Partial<Record<StrandId, string>>;
  /** Who said so. Estimates are shown to the parent as estimates. */
  source: Partial<Record<StrandId, 'parent' | 'estimate'>>;
  /** When the parent last confirmed, ISO. */
  setAt?: string;
}

/** The unit the publisher's pacing puts the class on this week. */
export function estimateUnit(strand: StrandId, nowIso: string): CurriculumUnit {
  const week  = teachingWeek(nowIso);
  const units = unitsOf(strand);
  let current = units[0];
  for (const u of units) if (u.week <= week) current = u;
  return current;
}

const KEY = (profileId: string) => `mia_class_position::${profileId}`;

function readStored(profileId: string): ClassPosition | null {
  try {
    const raw = localStorage.getItem(KEY(profileId));
    return raw ? (JSON.parse(raw) as ClassPosition) : null;
  } catch {
    return null;
  }
}

/** Parent setting where present, pacing estimate everywhere else. */
export function loadClassPosition(profileId: string, nowIso = new Date().toISOString()): ClassPosition {
  const stored = readStored(profileId);
  const out: ClassPosition = { units: {}, source: {}, setAt: stored?.setAt };
  for (const s of STRANDS) {
    const id = stored?.units[s];
    if (id && unitById(id)?.strand === s) {
      out.units[s] = id;  out.source[s] = 'parent';
    } else {
      out.units[s] = estimateUnit(s, nowIso).id;  out.source[s] = 'estimate';
    }
  }
  return out;
}

/** Record the parent's answer to "where is the class now?" for one strand. */
export function saveClassUnit(profileId: string, strand: StrandId, unitId: string): void {
  const stored = readStored(profileId) ?? { units: {}, source: {} };
  stored.units[strand]  = unitId;
  stored.source[strand] = 'parent';
  stored.setAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(stored));
  } catch {
    // Storage disabled — the estimate keeps working; nothing to crash over.
  }
}

// ─── Frontier ─────────────────────────────────────────────────────────────────

export interface FrontierTarget {
  strand:  StrandId;
  unit:    CurriculumUnit;
  skill:   string;
  /** Units past the class's current one (0 = with the class, 1–2 = pre-teaching). */
  aheadBy: number;
}

export interface BehindGap {
  strand: StrandId;
  unit:   CurriculumUnit;
  skill:  string;
}

/** How far ahead to look for weak skills the class is about to need. */
export const UPCOMING_WINDOW_WEEKS = 8;
/** Below this window accuracy a practised skill counts as weak. */
export const WEAK_ACCURACY = 0.8;

const buildable = (s: string) => SKILLS_WITH_PRACTICE.includes(s);

/**
 * Per strand: the one skill to teach next, starting at the class's current unit
 * and moving ahead only once that unit is mastered. Plus every unmastered skill
 * from units the class has already passed — those are repair, not new material.
 *
 * A skill may be listed under several units (place value spans four); mastery
 * of the skill clears all of them, so she is never asked to re-earn it per unit.
 */
export function curriculumFrontier(
  position:   ClassPosition,
  masteryMap: MasteryMap,
  slowSkills: ReadonlySet<string> = new Set(),
): { targets: FrontierTarget[]; behind: BehindGap[]; upcoming: BehindGap[] } {
  const targets:  FrontierTarget[] = [];
  const behind:   BehindGap[]      = [];
  const upcoming: BehindGap[]      = [];

  for (const strand of STRANDS) {
    const units    = unitsOf(strand);
    const classIdx = Math.max(0, indexInStrand(position.units[strand] ?? units[0].id));

    // Behind: passed units with unmastered, buildable skills.
    const seenBehind = new Set<string>();
    for (let i = 0; i < classIdx; i++) {
      for (const skill of units[i].skills) {
        if (!buildable(skill) || isMastered(masteryMap, skill) || seenBehind.has(skill)) continue;
        seenBehind.add(skill);
        behind.push({ strand, unit: units[i], skill });
      }
    }

    // Upcoming and weak: skills she HAS practised, is weak on, and the class will
    // reach within a few weeks. Her fraction-of-a-quantity fell to 30% over the
    // summer and the book reaches it in November — that is a repair job with a
    // deadline, not something to leave until the class gets there.
    const classWeek = units[classIdx].week;
    for (let i = classIdx + 1; i < units.length; i++) {
      if (units[i].week > classWeek + UPCOMING_WINDOW_WEEKS) break;
      for (const skill of units[i].skills) {
        const rec = masteryMap[skill];
        if (!buildable(skill) || !rec || rec.itemCount === 0) continue;
        if (isMastered(masteryMap, skill) || rec.firstAttemptAccuracy >= WEAK_ACCURACY) continue;
        if (upcoming.some(u => u.skill === skill)) continue;
        upcoming.push({ strand, unit: units[i], skill });
      }
    }

    // Target: first unmastered, unlocked skill from the class unit onward.
    search:
    for (let i = classIdx; i < units.length && i <= classIdx + MAX_UNITS_AHEAD; i++) {
      for (const skill of units[i].skills) {
        if (!buildable(skill) || isMastered(masteryMap, skill)) continue;
        if (!isUnlocked(skill, masteryMap, slowSkills)) continue;
        targets.push({ strand, unit: units[i], skill, aheadBy: i - classIdx });
        break search;
      }
    }
  }

  // Priority: stay with the class before running ahead of it. Within a tier,
  // callers rotate so all three strands advance across the week.
  targets.sort((a, b) => a.aheadBy - b.aheadBy);
  // Weakest first: the biggest gap needs the most runway.
  upcoming.sort((a, b) =>
    (masteryMap[a.skill]?.firstAttemptAccuracy ?? 0) - (masteryMap[b.skill]?.firstAttemptAccuracy ?? 0));
  return { targets, behind, upcoming };
}

/**
 * Her standing against the class, per strand — kept deliberately three-valued.
 *
 *   ahead     consecutive units from the class unit onward she has mastered
 *   gaps      passed units she HAS practised and not yet mastered — real gaps
 *   unchecked passed units the app has never given her
 *
 * `unchecked` exists because the obvious version lied: on 2026-09-19 it told the
 * parent Mia had "a topic to strengthen" in fractions and geometry, when those
 * units had simply been built that morning. She may know them perfectly from
 * class. Never-practised is unknown, not weak.
 */
export interface Standing { ahead: number; gaps: number; unchecked: number }

export function standingVsClass(
  position: ClassPosition, masteryMap: MasteryMap,
): Record<StrandId, Standing> {
  const out = {} as Record<StrandId, Standing>;
  for (const strand of STRANDS) {
    const units    = unitsOf(strand);
    const classIdx = Math.max(0, indexInStrand(position.units[strand] ?? units[0].id));
    const built    = (u: CurriculumUnit) => u.skills.filter(buildable);
    const done     = (u: CurriculumUnit) => built(u).length > 0 && built(u).every(s => isMastered(masteryMap, s));
    // Judge a passed unit only by its UNMASTERED skills: a unit half-mastered
    // and half never-seen is unchecked, not weak.
    const open     = (u: CurriculumUnit) => built(u).filter(s => !isMastered(masteryMap, s));
    const tried    = (s: string) => (masteryMap[s]?.itemCount ?? 0) > 0;

    let gaps = 0, unchecked = 0;
    for (let i = 0; i < classIdx; i++) {
      const o = open(units[i]);
      if (o.length === 0) continue;
      if (o.some(tried)) gaps++; else unchecked++;
    }

    let ahead = 0;
    for (let i = classIdx; i < units.length; i++) {
      if (built(units[i]).length === 0) break;   // cannot vouch past unbuilt material
      if (!done(units[i])) break;
      ahead++;
    }
    out[strand] = { ahead, gaps, unchecked };
  }
  return out;
}
