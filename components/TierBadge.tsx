const TIER_COLORS: Record<number, string> = {
  0: 'bg-slate-700 text-slate-300 border-slate-600',
  1: 'bg-blue-900 text-blue-300 border-blue-700',
  2: 'bg-cyan-900 text-cyan-300 border-cyan-700',
  3: 'bg-violet-900 text-violet-300 border-violet-700',
  4: 'bg-yellow-900 border-yellow-600',
};

interface TierBadgeProps {
  stage: number;
  className?: string;
}

export function TierBadge({ stage, className = '' }: TierBadgeProps) {
  const colors = TIER_COLORS[stage] ?? TIER_COLORS[0];
  const label = stage === 0 ? 'T0' : `T${stage}`;

  if (stage === 4) {
    return (
      <span
        className={`font-pixel text-[10px] px-2 py-1 rounded border animate-t4-border ${colors} ${className}`}
      >
        <span className="animate-shimmer">T4</span>
      </span>
    );
  }

  return (
    <span
      className={`font-pixel text-[10px] px-2 py-1 rounded border ${colors} ${className}`}
    >
      {label}
    </span>
  );
}
