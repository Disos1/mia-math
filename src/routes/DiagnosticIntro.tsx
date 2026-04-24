import { t } from '../i18n/t';
import type { Avatar } from '../types';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import { SpeechBubble } from '../components/primitives/SpeechBubble';
import { BigButton } from '../components/primitives/BigButton';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  avatar: Avatar;
  onStart: () => void;
  onParent: () => void;
}

export function DiagnosticIntro({ avatar, onStart, onParent }: Props) {
  const g = { gender: 'f' as const };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="mb-8">
        <AvatarBadge avatar={avatar} size="lg" />
      </div>
      <h2 className="text-3xl font-bold mb-6">{t('diag_intro.title', g)}</h2>
      <SpeechBubble avatar={avatar}>
        {t('diag_intro.speech', g)}
      </SpeechBubble>
      <div className="mt-10">
        <BigButton onClick={onStart} color="#FF9B7A">
          {t('diag_intro.cta', g)}
        </BigButton>
      </div>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
