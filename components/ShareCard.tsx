import { blukit } from '@/lib/blukit';

interface ShareCardProps {
  tokenId: number;
  stage: number;
  formName: string;
  lineageName: string;
  vibeName: string;
  ascensionCost: number;
  appUrl: string;
}

/**
 * ShareCard — server-rendered OG image markup for T4 tokens.
 * Embed via /api/og/[id] using @vercel/og (add in Phase 5).
 * For now, rendered as a styled div for in-page display.
 */
export function ShareCard({
  tokenId,
  stage,
  formName,
  lineageName,
  vibeName,
  ascensionCost,
  appUrl,
}: ShareCardProps) {
  const imageUrl = blukit.imageUrl(tokenId, 256);
  const tokenUrl = `${appUrl}/token/${tokenId}`;

  return (
    <div className="bg-[#0a1628] border-2 border-yellow-600 rounded-xl p-6 max-w-sm flex flex-col gap-4">
      {/* Art */}
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Blupet #${tokenId}`}
          width={128}
          height={128}
          className="rounded checkerboard"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Token info */}
      <div className="text-center space-y-1">
        <p className="font-pixel text-sm text-yellow-400">#{tokenId}</p>
        <p className="text-slate-300 text-sm">{formName} · {lineageName}</p>
        <p className="text-xs text-slate-500">{vibeName} vibe · T4</p>
      </div>

      {/* Stats */}
      <div className="flex justify-around text-center">
        <div>
          <p className="font-pixel text-xs text-[#4b9fe1]">{ascensionCost}</p>
          <p className="text-xs text-slate-500">burned</p>
        </div>
        <div>
          <p className="font-pixel text-xs text-yellow-400">T4</p>
          <p className="text-xs text-slate-500">final form</p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="font-pixel text-[9px] text-[#4b9fe1]">Ask #{tokenId} anything</p>
        <p className="text-xs text-slate-600 mt-1 break-all">{tokenUrl}</p>
      </div>
    </div>
  );
}
