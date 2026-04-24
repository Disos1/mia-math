import type { Avatar } from '../types';

export const AVATARS: Avatar[] = [
  { id: 'fox',     emoji: '🦊', nameKey: 'avatar.fox',     color: '#FF9B7A' },
  { id: 'cat',     emoji: '🐱', nameKey: 'avatar.cat',     color: '#C4A7E7' },
  { id: 'unicorn', emoji: '🦄', nameKey: 'avatar.unicorn', color: '#F5A8D6' },
  { id: 'dragon',  emoji: '🐉', nameKey: 'avatar.dragon',  color: '#7DD3B0' },
  { id: 'owl',     emoji: '🦉', nameKey: 'avatar.owl',     color: '#FFD166' },
  { id: 'whale',   emoji: '🐋', nameKey: 'avatar.whale',   color: '#8FC0E8' },
];

export const AVATAR_BY_ID = Object.fromEntries(
  AVATARS.map(a => [a.id, a])
) as Record<string, Avatar>;
