/**
 * "Where is the class in the book?" — the parent's lever for keeping the app in
 * step with school, and his 5-second read on whether Mia is ahead of it.
 *
 * One dropdown per strand. Until the parent picks, the position is the
 * publisher's pacing estimate and is labelled as such — an estimate presented as
 * fact is exactly the kind of quiet error this app has been bitten by before.
 *
 * Units the app cannot teach yet are marked, so a dropdown never implies
 * coverage that does not exist.
 */

import { useMemo, useState } from 'react';
import type { MasteryMap } from '../../types';
import { SKILLS_WITH_PRACTICE } from '../../lib/items';
import {
  STRANDS, STRAND_LABELS, unitsOf, unitById, type StrandId,
} from '../../lib/curriculum/hashbacha4';
import {
  loadClassPosition, saveClassUnit, standingVsClass, type Standing,
} from '../../lib/curriculum/classPosition';

interface Props {
  profileId:  string;
  masteryMap: MasteryMap;
}

const builtIn = (skills: string[]) => skills.some(s => SKILLS_WITH_PRACTICE.includes(s));

const topics = (n: number) => (n === 1 ? 'נושא אחד' : `${n} נושאים`);

/** One line per fact, most important first. Unknown is never reported as weak. */
function standingLines(s: Standing): Array<{ text: string; color: string }> {
  const lines: Array<{ text: string; color: string }> = [];
  if (s.gaps > 0)      lines.push({ text: `🌱 ${topics(s.gaps)} מהשבועות הקודמים לחזק`, color: '#D97706' });
  if (s.ahead > 0)     lines.push({ text: `🚀 לפני הכיתה ב${s.ahead === 1 ? 'נושא אחד' : `-${s.ahead} נושאים`}`, color: '#7C3AED' });
  if (s.unchecked > 0) lines.push({ text: `🔍 ${topics(s.unchecked)} מהשבועות הקודמים עוד ${s.unchecked === 1 ? 'לא נבדק' : 'לא נבדקו'} באפליקציה`, color: '#6B7280' });
  if (lines.length === 0) lines.push({ text: '✅ באותו מקום כמו הכיתה', color: '#16A34A' });
  return lines;
}

export function ClassAlignmentCard({ profileId, masteryMap }: Props) {
  const [position, setPosition] = useState(() => loadClassPosition(profileId));
  const standing = useMemo(() => standingVsClass(position, masteryMap), [position, masteryMap]);

  const onPick = (strand: StrandId, unitId: string) => {
    saveClassUnit(profileId, strand, unitId);
    setPosition(loadClassPosition(profileId));
  };

  return (
    <div className="bg-white card-shadow rounded-3xl p-5" style={{ borderTop: '4px solid #7C3AED' }}>
      <div className="text-sm font-bold text-[#2D3047]">📚 איפה הכיתה בספר?</div>
      <div className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
        ה.ש.ב.ח.ה ד׳ · האפליקציה מתרגלת את הנושא של הכיתה ומקדימה נושא או שניים קדימה.
      </div>

      {STRANDS.map(strand => {
        const currentId = position.units[strand]!;
        const current   = unitById(currentId);
        const isEst     = position.source[strand] === 'estimate';
        const lines     = standingLines(standing[strand]);
        return (
          <div key={strand} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-[#2D3047]">{STRAND_LABELS[strand]}</span>
              {isEst && <span className="text-[11px] text-amber-600">הערכה לפי תכנית ההוצאה — עדכנו</span>}
            </div>
            <select
              value={currentId}
              onChange={e => onPick(strand, e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm text-[#2D3047]"
              aria-label={`הנושא שהכיתה לומדת עכשיו ב${STRAND_LABELS[strand]}`}
            >
              {unitsOf(strand).map(u => (
                <option key={u.id} value={u.id}>
                  {u.title} (עמ׳ {u.pages[0]}–{u.pages[1]}){builtIn(u.skills) ? '' : ' · עוד לא באפליקציה'}
                </option>
              ))}
            </select>
            {lines.map(l => (
              <div key={l.text} className="text-xs font-semibold mt-1.5" style={{ color: l.color }}>{l.text}</div>
            ))}
            {current && !builtIn(current.skills) && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                הנושא הזה עוד לא קיים באפליקציה — בינתיים היא מתרגלת את מה שכן קיים.
              </div>
            )}
          </div>
        );
      })}

      <div className="text-[11px] text-gray-400 mt-4 leading-relaxed">
        נשמר במכשיר הזה. כדאי לעדכן פעם בשבוע-שבועיים, לפי החוברות שלה.
      </div>
    </div>
  );
}
