import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { blukit } from '@/lib/blukit';
import { isPublicToken, getTierCapabilities } from '@/lib/tier-gate';
import { TokenSprite } from '@/components/TokenSprite';
import { TierBadge } from '@/components/TierBadge';
import { Chronicle } from '@/components/Chronicle';
import { Ownership } from '@/components/Ownership';
import { AgentChatWrapper } from './AgentChatWrapper';

interface TokenPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TokenPageProps): Promise<Metadata> {
  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId)) return {};

  try {
    const token = await blukit.token(tokenId);
    const name = `Blupet #${tokenId}${token.stage > 0 ? ` · ${token.formName}` : ''}`;
    return {
      title: `${name} — BluAgent`,
      description: token.stage === 4
        ? `T4 public oracle. Ask ${name} about its ascension history and all who held it.`
        : `${token.stageLabel} ${token.lineageName} · ${token.vibeName} vibe`,
      openGraph: {
        title: name,
        images: [token.image],
      },
    };
  } catch {
    return {};
  }
}

export default async function TokenPage({ params }: TokenPageProps) {
  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId) || tokenId < 1 || tokenId > 8192) notFound();

  let token;
  try {
    token = await blukit.token(tokenId);
  } catch {
    notFound();
  }

  const caps = getTierCapabilities(token.stage);
  const isPublic = isPublicToken(token.stage);

  // Fetch chronicle and ownership data from our API
  const [chronicleRes, ownershipRes, vibesRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/token/${tokenId}/chronicle`, { next: { revalidate: 60 } }),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/token/${tokenId}/ownership`, { next: { revalidate: 60 } }),
    blukit.vibes(),
  ]);

  const chronicleData = chronicleRes.ok ? await chronicleRes.json() : { events: [] };
  const ownershipData = ownershipRes.ok ? await ownershipRes.json() : { events: [], offersPublic: true, restricted: false };
  const vibe = vibesRes.vibes.find((v) => v.id === token.vibe);

  const isT4 = token.stage === 4;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-[#1e3a5f] px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-pixel text-sm text-[#4b9fe1]">BluAgent</Link>
        <span className="text-slate-600">/</span>
        <span className="font-pixel text-xs text-slate-400">#{tokenId}</span>
        {isPublic && (
          <span className="ml-auto font-pixel text-[9px] text-yellow-400 border border-yellow-700 px-2 py-1 rounded">
            PUBLIC ORACLE
          </span>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start gap-6 mb-10">
          <TokenSprite tokenId={tokenId} size={160} stage={token.stage} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-pixel text-xl text-white">#{tokenId}</h1>
              <TierBadge stage={token.stage} />
              {token.locked && <span className="font-pixel text-[9px] text-orange-400 border border-orange-700 px-2 py-1 rounded">LOCKED</span>}
            </div>
            {token.stage > 0 && (
              <div className="space-y-1">
                <p className="text-slate-300 text-sm">{token.formName} · {token.lineageName}</p>
                <p className="text-slate-500 text-xs">{token.vibeName} vibe</p>
              </div>
            )}
            {vibe && (
              <p className="text-slate-400 text-sm max-w-md leading-relaxed italic">
                &ldquo;{vibe.agentHint}&rdquo;
              </p>
            )}
            <div className="text-xs text-slate-600">
              Owner:{' '}
              <a
                href={`https://etherscan.io/address/${token.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4b9fe1] hover:underline"
              >
                {token.owner.slice(0, 6)}…{token.owner.slice(-4)}
              </a>
            </div>
          </div>
        </div>

        {/* T4 two-panel layout */}
        {isT4 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: chronicle + ownership */}
            <div className="space-y-10">
              <section>
                <Chronicle
                  events={chronicleData.events}
                  tokenId={tokenId}
                  stage={token.stage}
                />
              </section>
              <section>
                <Ownership
                  events={ownershipData.events}
                  offersPublic={ownershipData.offersPublic ?? true}
                />
              </section>
            </div>

            {/* Right: chat */}
            <div className="lg:sticky lg:top-6 h-fit">
              <div className="h-[600px]">
                <AgentChatWrapper
                  tokenId={tokenId}
                  stage={token.stage}
                  vibeName={token.vibeName}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Non-T4: single column */
          <div className="space-y-10">
            {token.stage > 0 && (
              <section>
                <Chronicle
                  events={chronicleData.events}
                  tokenId={tokenId}
                  stage={token.stage}
                />
              </section>
            )}

            {/* Holder-gated chat */}
            <section>
              <h3 className="font-pixel text-xs text-[#4b9fe1] mb-4">
                Agent Chat
                <span className="ml-2 text-slate-500 font-normal normal-case" style={{ fontFamily: 'system-ui' }}>
                  · {caps.label} · {caps.maxTurns} turns max
                </span>
              </h3>
              <div className="h-[400px]">
                <AgentChatWrapper
                  tokenId={tokenId}
                  stage={token.stage}
                  vibeName={token.vibeName}
                />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
