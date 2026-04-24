import { t } from '../i18n/t';
import { BigButton } from '../components/primitives/BigButton';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  onNext: () => void;
  onParent: () => void;
}

export function Welcome({ onNext, onParent }: Props) {
  const g = { gender: 'f' as const };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="text-7xl mb-6 sparkle">🌟</div>
      <h1 className="text-5xl font-black mb-3 text-center" style={{ color: '#2D3047' }}>
        {t('welcome.title', g)}
      </h1>
      <p className="text-2xl text-gray-700 mb-10 text-center max-w-md leading-relaxed">
        {t('welcome.subtitle', g)}
      </p>
      <BigButton onClick={onNext} color="#C4A7E7">
        {t('welcome.cta', g)}
      </BigButton>
      <ParentGate onOpen={onParent} />
    </div>
  );
}
