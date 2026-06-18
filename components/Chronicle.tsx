import { TokenSprite } from './TokenSprite';
import { TierBadge } from './TierBadge';

export interface ChronicleEventData {
  id: string;
  keeperId: number;
  donorId: number;
  newStage: number;
  mergedAt: string;
  txHash: string;
  donorEcho: string | null;
  chapter: string | null;
  donorVibe: string | null;
  donorFormName: string | null;
  donorLineageName: string | null;
  children: ChronicleEventData[];
}

interface ChronicleNodeProps {
  node: ChronicleEventData;
  depth?: number;
}

function ChronicleNode({ node, depth = 0 }: ChronicleNodeProps) {
  const date = new Date(node.mergedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`pl-${depth > 0 ? 4 : 0} border-l border-[#1e3a5f] ml-2`}>
      {/* Donor row — dissolved/desaturated to show burn */}
      <div className="flex items-start gap-3 py-3">
        <div className="flex-shrink-0 relative donor-sprite">
          <TokenSprite tokenId={node.donorId} size={48} />
          {/* Fire overlay fades in on top */}
          <span
            className="absolute -top-1 -right-1 text-sm"
            style={{ animation: 'bob 1.8s ease-in-out infinite' }}
          >
            🔥
          </span>
          {/* Ash overlay */}
          <div className="absolute inset-0 rounded bg-slate-900 opacity-30 pointer-events-none" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-pixel text-xs text-slate-400">#{node.donorId}</span>
            {node.donorFormName && (
              <span className="text-xs text-slate-500">{node.donorFormName}</span>
            )}
            {node.donorVibe && (
              <span className="text-xs text-slate-500 italic">{node.donorVibe}</span>
            )}
            <span className="text-xs text-slate-600">burned {date}</span>
          </div>
          {node.donorEcho && (
            <p className="mt-1 text-xs text-slate-400 italic">
              &ldquo;{node.donorEcho}&rdquo;
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <span className="text-slate-600">→</span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <TierBadge stage={node.newStage} />
          <a
            href={`https://etherscan.io/tx/${node.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#4b9fe1] hover:underline"
          >
            tx ↗
          </a>
        </div>
      </div>

      {/* Chapter paragraph */}
      {node.chapter && (
        <div className="ml-14 mb-3 bg-[#0d1c30] border border-[#1e3a5f] rounded p-3 text-xs text-slate-400 leading-relaxed italic">
          {node.chapter}
        </div>
      )}

      {/* Recursive children */}
      {node.children.map((child) => (
        <ChronicleNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

interface ChronicleProps {
  events: ChronicleEventData[];
  tokenId: number;
  stage: number;
}

export function Chronicle({ events, tokenId, stage }: ChronicleProps) {
  if (!events.length) {
    return (
      <div className="text-slate-500 text-sm py-4">
        {stage === 0
          ? 'Unrevealed — no merge history yet.'
          : 'No merges recorded yet.'}
      </div>
    );
  }

  const burnCount = countBurns(events);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-pixel text-xs text-[#4b9fe1]">Ascension Chronicle</h3>
        <span className="text-xs text-slate-500">{burnCount} burned</span>
      </div>
      <div className="space-y-1">
        {events.map((event) => (
          <ChronicleNode key={event.id} node={event} />
        ))}
      </div>
      {/* Keeper */}
      <div className="flex items-center gap-3 mt-4 pl-2 border-l-2 border-yellow-600">
        <TokenSprite tokenId={tokenId} size={48} />
        <div>
          <span className="font-pixel text-xs text-yellow-400">★ #{tokenId}</span>
          <p className="text-xs text-slate-400">Keeper · {stage === 4 ? 'Final Form' : `T${stage}`}</p>
        </div>
      </div>
    </div>
  );
}

function countBurns(events: ChronicleEventData[]): number {
  return events.reduce((acc, e) => acc + 1 + countBurns(e.children), 0);
}
