import { useState } from 'react';
import type { Gender } from '../types';
import { BigButton }  from '../components/primitives/BigButton';
import { ParentGate } from '../components/layout/ParentGate';

interface Props {
  onDone:   (name: string, gender: Gender) => void;
  onParent: () => void;
}

/**
 * Shown once during onboarding (between avatar pick and diagnostic).
 * Collects the child's name and gender so the app uses the right
 * Hebrew forms and addresses the child by name.
 */
export function ChildSetup({ onDone, onParent }: Props) {
  const [name,   setName]   = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  const ready = name.trim().length > 0 && gender !== null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 fade-in"
      dir="rtl"
    >
      <div className="bg-white card-shadow rounded-3xl p-8 max-w-sm w-full">

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-[#2D3047] mb-2">
            נכיר קצת?
          </h2>
          <p className="text-gray-500 text-base">
            מה השם שלך?
          </p>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="הכנס את שמך…"
          maxLength={20}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3
            text-lg text-right outline-none focus:border-[#C4A7E7]
            transition-colors mb-6"
          autoFocus
        />

        {/* Gender picker */}
        <p className="text-gray-500 text-base text-center mb-3">
          את/ה…
        </p>
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setGender('f')}
            className="flex-1 py-3 rounded-2xl text-lg font-bold border-2 transition-all"
            style={{
              borderColor: gender === 'f' ? '#C4A7E7' : '#E5E7EB',
              background:  gender === 'f' ? '#F3EEFF' : 'white',
              color:       gender === 'f' ? '#7C3AED' : '#6B7280',
            }}
          >
            בת 👧
          </button>
          <button
            onClick={() => setGender('m')}
            className="flex-1 py-3 rounded-2xl text-lg font-bold border-2 transition-all"
            style={{
              borderColor: gender === 'm' ? '#93C5FD' : '#E5E7EB',
              background:  gender === 'm' ? '#EFF6FF' : 'white',
              color:       gender === 'm' ? '#1D4ED8' : '#6B7280',
            }}
          >
            בן 👦
          </button>
        </div>

        <BigButton
          onClick={() => ready && onDone(name.trim(), gender!)}
          color="#C4A7E7"
          disabled={!ready}
        >
          יאללה, נתחיל! 🚀
        </BigButton>
      </div>

      <ParentGate onOpen={onParent} />
    </div>
  );
}
