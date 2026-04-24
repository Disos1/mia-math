import { t } from '../i18n/t';
import type { Avatar } from '../types';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import { SpeechBubble } from '../components/primitives/SpeechBubble';
import { BigButton } from '../components/primitives/BigButton';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  avatar:    Avatar;
  isRediag?: boolean;   // true → re-diagnostic (returning user), false → onboarding
  onStart:   () => void;
  onParent:  () => void;
}

export function DiagnosticIntro({ avatar, isRediag = false, onStart, onParent }: Props) {
  const g      = { gender: 'f' as const };
  const prefix = isRediag ? 'rediag_intro' : 'diag_intro';
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="mb-8">
        <AvatarBadge avatar={avatar} size="lg" />
      </div>
      <h2 className="text-3xl font-bold mb-6">
        {t(`${prefix}.title` as Parameters<typeof t>[0], g)}
      </h2>
      <SpeechBubble avatar={avatar}>
        {t(`${prefix}.speech` as Parameters<typeof t>[0], g)}
      </SpeechBubble>
      <div className="mt-10">
        <BigButton onClick={onStart} color="#FF9B7A">
          {t(`${prefix}.cta` as Parameters<typeof t>[0], g)}
        </BigButton>
      </div>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
