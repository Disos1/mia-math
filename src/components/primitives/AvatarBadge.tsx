import type { Avatar } from '../../types';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-12 h-12 text-2xl',
  md: 'w-20 h-20 text-4xl',
  lg: 'w-32 h-32 text-6xl',
};

interface Props {
  avatar: Avatar | null;
  size?: Size;
}

export function AvatarBadge({ avatar, size = 'md' }: Props) {
  if (!avatar) return null;
  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center select-none flex-shrink-0`}
      style={{ background: avatar.color }}
    >
      <span role="img" aria-label={avatar.id}>{avatar.emoji}</span>
    </div>
  );
}
