import { t } from '../i18n/t';
import type { Avatar } from '../types';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import { BigButton } from '../components/primitives/BigButton';
import { ParentGate } from '../components/layout/ParentGate';
import type { LocaleKey } from '../i18n/t';

interface Props {
  avatar: Avatar;
  gaps: string[];
  strengths: string[];
  onNext: () => void;
  onParent: () => void;
}

export function DiagnosticResults({ avatar, gaps, strengths, onNext, onParent }: Props) {
  const g = { gender: 'f' as const };

  const allClear = gaps.length === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="bg-white card-shadow rounded-3xl p-8 max-w-lg w-full">

        <div className="flex items-center gap-3 mb-5">
          <AvatarBadge avatar={avatar} size="md" />
          <h2 className="text-3xl font-bold">{t('diag_results.title', g)}</h2>
        </div>

        <p className="text-lg text-gray-700 mb-5">
          {allClear ? t('diag_results.all_clear', g) : t('diag_results.subtitle', g)}
        </p>

        {!allClear && strengths.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2 font-medium">
              {t('diag_results.strengths', g)}
            </div>
            {strengths.map(skillCode => (
              <div key={skillCode} className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">✅</span>
                <span className="text-md">
                  {t(`skill.${skillCode}` as LocaleKey, g)}
                </span>
              </div>
            ))}
          </div>
        )}

        {gaps.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2 font-medium">
              {t('diag_results.work_on', g)}
            </div>
            {gaps.map(skillCode => (
              <div key={skillCode} className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">🌱</span>
                <span className="text-md">
                  {t(`skill.${skillCode}` as LocaleKey, g)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <BigButton onClick={onNext} color="#7DD3B0">
            {t('diag_results.cta', g)}
          </BigButton>
        </div>
      </div>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
