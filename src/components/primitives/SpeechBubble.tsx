import type { Avatar } from '../../types';
import { AvatarBadge } from './AvatarBadge';

interface Props {
  avatar: Avatar | null;
  children: React.ReactNode;
}

/**
 * Speech bubble from the avatar companion.
 * Positioned to the right of the avatar (RTL layout: avatar on right, bubble on left).
 */
export function SpeechBubble({ avatar, children }: Props) {
  return (
    <div className="flex items-end gap-3 fade-in">
      <div className="bg-white card-shadow rounded-2xl rounded-bl-sm px-5 py-3 max-w-md flex-1">
        <div className="text-lg text-gray-800 leading-relaxed">{children}</div>
      </div>
      <AvatarBadge avatar={avatar} size="md" />
    </div>
  );
}
