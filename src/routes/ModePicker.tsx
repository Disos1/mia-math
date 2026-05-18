import { t } from '../i18n/t';
import type { SessionMode } from '../types';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  onPick:       (mode: SessionMode) => void;
  onParent:     () => void;
  onTrophyRoom: () => void;
}

const MODES: { id: SessionMode; icon: string; nameKey: string; descKey: string }[] = [
  { id: 'time',     icon: '⏱️', nameKey: 'mode_picker.time.name',     descKey: 'mode_picker.time.desc'     },
  { id: 'quantity', icon: '🎯', nameKey: 'mode_picker.quantity.name', descKey: 'mode_picker.quantity.desc' },
  { id: 'open',     icon: '🌟', nameKey: 'mode_picker.open.name',     descKey: 'mode_picker.open.desc'     },
];

export function ModePicker({ onPick, onParent, onTrophyRoom }: Props) {
  const g = { gender: 'f' as const };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <h2 className="text-3xl font-bold mb-2">{t('mode_picker.title', g)}</h2>
      <p className="text-lg text-gray-600 mb-8">{t('mode_picker.subtitle', g)}</p>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="btn-shadow bg-white rounded-3xl p-5 text-right flex items-center gap-4
              hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <div className="text-5xl">{m.icon}</div>
            <div>
              <div className="text-xl font-bold">
                {t(m.nameKey as Parameters<typeof t>[0], g)}
              </div>
              <div className="text-md text-gray-600">
                {t(m.descKey as Parameters<typeof t>[0], g)}
              </div>
            </div>
          </button>
        ))}

        {/* Trophy Room shortcut — always accessible, not just post-session */}
        <button
          onClick={onTrophyRoom}
          className="btn-shadow bg-white rounded-3xl p-4 text-right flex items-center gap-4
            hover:scale-[1.02] transition-all active:scale-[0.98]"
          style={{ border: '2px solid #FFD78A' }}
        >
          <div className="text-4xl">🏆</div>
          <div>
            <div className="text-lg font-bold" style={{ color: '#D96000' }}>חדר הגביעים</div>
            <div className="text-sm text-gray-500">כוכבים, עיטורים והישגים</div>
          </div>
        </button>
      </div>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
