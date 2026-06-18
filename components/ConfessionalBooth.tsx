import { TokenSprite } from './TokenSprite';
import { TierBadge } from './TierBadge';

const VIBE_BORDER_COLORS: Record<string, string> = {
  Bold:       'border-red-500',
  Timid:      'border-blue-400',
  Mysterious: 'border-purple-500',
  Cheerful:   'border-yellow-400',
  Stoic:      'border-gray-400',
  Fierce:     'border-orange-500',
  Gentle:     'border-green-400',
  Cunning:    'border-amber-500',
};

function vibeBorderColor(vibeName: string): string {
  return VIBE_BORDER_COLORS[vibeName] ?? 'border-[#4b9fe1]';
}

interface ConfessionalBoothProps {
  tokenId: number;
  stage: number;
  vibeName: string;
  formName: string;
  lineageName: string;
  quote: string;
  archetype?: string;
}

export function ConfessionalBooth({
  tokenId,
  stage,
  vibeName,
  formName,
  lineageName,
  quote,
  archetype,
}: ConfessionalBoothProps) {
  const borderColor = vibeBorderColor(vibeName);

  return (
    <div className={`border-2 ${borderColor} rounded-lg bg-[#12213a] p-4 flex flex-col gap-3 max-w-xs`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <TokenSprite tokenId={tokenId} size={64} />
        <div className="flex flex-col gap-1">
          <span className="font-pixel text-xs text-white">#{tokenId}</span>
          <span className="text-xs text-slate-400">{formName} · {lineageName}</span>
          <div className="flex items-center gap-2">
            <TierBadge stage={stage} />
            {archetype && (
              <span className="text-xs text-slate-500">{archetype}</span>
            )}
          </div>
        </div>
      </div>

      {/* Vibe label */}
      <div className={`font-pixel text-[9px] uppercase tracking-widest ${borderColor.replace('border-', 'text-')}`}>
        {vibeName}
      </div>

      {/* Quote bubble */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded p-3 text-sm text-slate-300 italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </div>
    </div>
  );
}
