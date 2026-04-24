import { t } from '../../i18n/t';

interface Props {
  onOpen: () => void;
  gender?: 'f' | 'm';
}

/**
 * Persistent parent-access entry point.
 *
 * Visible on every non-item screen (welcome, avatar, intro, results, trophy room, etc.)
 * NOT rendered during active diagnostic or session items — it would distract and
 * could let Mia cheat the diagnostic by calling a parent for answers.
 *
 * In production: tapping will open a PIN gate before showing the parent dashboard.
 * For Phase 0: tapping calls onOpen directly (PIN gate is Phase 7).
 */
export function ParentGate({ onOpen, gender = 'f' }: Props) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 start-4 bg-white/90 hover:bg-white rounded-full px-4 py-2
        text-sm font-medium text-gray-700 card-shadow z-50"
      aria-label="פתח מסך הורים"
    >
      {t('parent_gate.button', { gender })}
    </button>
  );
}
