import Image from 'next/image';
import { blukit } from '@/lib/blukit';

interface TokenSpriteProps {
  tokenId: number;
  size?: number;
  className?: string;
  showCheckerboard?: boolean;
  stage?: number;
}

export function TokenSprite({
  tokenId,
  size = 128,
  className = '',
  showCheckerboard = true,
  stage,
}: TokenSpriteProps) {
  const src = blukit.imageUrl(tokenId, Math.min(size * 2, 512));
  const isT4 = stage === 4;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded overflow-hidden
        ${showCheckerboard ? 'checkerboard' : ''}
        ${isT4 ? 'animate-t4-border border-2' : ''}
        ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`Blupet #${tokenId}`}
        width={size}
        height={size}
        className="object-contain"
        style={{ imageRendering: 'pixelated' }}
        unoptimized
      />
      {/* T4 gold corner sparkles */}
      {isT4 && (
        <>
          <span className="absolute top-0.5 left-0.5 text-[8px] opacity-70" style={{ animation: 'bob 2s ease-in-out 0s infinite' }}>✦</span>
          <span className="absolute top-0.5 right-0.5 text-[8px] opacity-70" style={{ animation: 'bob 2s ease-in-out 0.3s infinite' }}>✦</span>
          <span className="absolute bottom-0.5 left-0.5 text-[8px] opacity-70" style={{ animation: 'bob 2s ease-in-out 0.6s infinite' }}>✦</span>
          <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-70" style={{ animation: 'bob 2s ease-in-out 0.9s infinite' }}>✦</span>
        </>
      )}
    </div>
  );
}

interface UnrevealedSpriteProps {
  size?: number;
  className?: string;
}

export function UnrevealedSprite({ size = 128, className = '' }: UnrevealedSpriteProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded overflow-hidden checkerboard ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-pixel text-slate-400 select-none"
        style={{ fontSize: Math.max(size * 0.15, 10) }}
      >
        ?
      </span>
    </div>
  );
}
