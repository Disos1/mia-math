interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function BigButton({
  children,
  onClick,
  color = '#C4A7E7',
  className = '',
  disabled = false,
}: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-shadow rounded-3xl px-8 py-4 text-white font-bold text-xl transition-all
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ background: disabled ? '#ccc' : color }}
    >
      {children}
    </button>
  );
}
