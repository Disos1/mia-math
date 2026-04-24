import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import { AVATARS } from '../constants/avatars';
import type { Avatar } from '../types';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  onPick: (avatar: Avatar) => void;
  onParent: () => void;
}

export function AvatarPicker({ onPick, onParent }: Props) {
  const g = { gender: 'f' as const };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <h2 className="text-3xl font-bold mb-2">{t('avatar.title', g)}</h2>
      <p className="text-lg text-gray-600 mb-10">{t('avatar.subtitle', g)}</p>
      <div className="grid grid-cols-3 gap-5 max-w-lg">
        {AVATARS.map(avatar => (
          <button
            key={avatar.id}
            onClick={() => onPick(avatar)}
            className="btn-shadow rounded-3xl p-5 bg-white hover:scale-105 transition-all active:scale-95"
          >
            <AvatarBadge avatar={avatar} size="lg" />
            <div className="mt-3 text-lg font-bold">
              {t(avatar.nameKey as LocaleKey, g)}
            </div>
          </button>
        ))}
      </div>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
