'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TokenSprite, UnrevealedSprite } from '@/components/TokenSprite';
import { TierBadge } from '@/components/TierBadge';
import type { BluToken, BluWalletInventory } from '@/lib/blukit';

function LonelyState({ token }: { token: BluToken }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      {/* Bobbing lonely sprite */}
      <div className="relative animate-bob" style={{ display: 'inline-block' }}>
        <TokenSprite tokenId={token.tokenId} size={120} />
        {/* Flower held out to empty slot */}
        <span className="absolute -bottom-2 -right-3 text-2xl" style={{ animation: 'bob 3s ease-in-out 0.4s infinite' }}>🌹</span>
        {/* Shadow grows/shrinks with bob */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#4b9fe1] rounded-full opacity-10"
          style={{
            width: 80,
            height: 12,
            animation: 'bob 2.6s ease-in-out infinite',
            filter: 'blur(4px)',
          }}
        />
      </div>
      <div className="space-y-2">
        <p className="font-pixel text-sm text-[#4b9fe1]">#{token.tokenId} is waiting…</p>
        <p className="text-slate-400 text-sm italic max-w-xs">
          &ldquo;One Blupet. Zero merge partners. Infinite sadness.&rdquo;
        </p>
      </div>
      <div className="bg-[#12213a] border border-[#1e3a5f] rounded-lg p-4 max-w-sm text-sm text-slate-300">
        <p className="mb-3 font-pixel text-xs text-[#4b9fe1]">Match needed</p>
        <p>
          Acquire a compatible Blupet to unlock{' '}
          <span className="text-white font-semibold">The Duel</span> and start merging.
        </p>
      </div>
      <Link
        href={`/token/${token.tokenId}`}
        className="font-pixel text-xs text-[#4b9fe1] hover:text-white border border-[#4b9fe1] hover:border-white px-4 py-2 rounded transition-colors"
      >
        Talk to #{token.tokenId}
      </Link>
    </div>
  );
}

function TokenCard({ token }: { token: BluToken }) {
  return (
    <Link href={`/token/${token.tokenId}`}>
      <div className="bg-[#12213a] border border-[#1e3a5f] hover:border-[#4b9fe1] rounded-lg p-4 flex flex-col gap-3 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between">
          <TierBadge stage={token.stage} />
          {token.locked && (
            <span className="text-xs text-orange-400 font-pixel">LOCKED</span>
          )}
          {token.pending && (
            <span className="text-xs text-yellow-400 font-pixel">PENDING</span>
          )}
        </div>

        <div className="flex justify-center">
          {token.stage === 0
            ? <UnrevealedSprite size={96} />
            : <TokenSprite tokenId={token.tokenId} size={96} stage={token.stage} />
          }
        </div>

        <div className="text-center space-y-1">
          <p className="font-pixel text-xs text-white group-hover:text-[#4b9fe1] transition-colors">
            #{token.tokenId}
          </p>
          {token.stage > 0 && (
            <>
              <p className="text-xs text-slate-400">{token.formName}</p>
              <p className="text-xs text-slate-500">{token.lineageName} · {token.vibeName}</p>
            </>
          )}
        </div>

        <div className="font-pixel text-[9px] text-center text-[#4b9fe1] opacity-0 group-hover:opacity-100 transition-opacity">
          Talk to agent →
        </div>
      </div>
    </Link>
  );
}

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [inventory, setInventory] = useState<BluWalletInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    if (!address) return;

    setLoading(true);
    setError(null);
    fetch(`/api/wallet/${address}`)
      .then((r) => r.json())
      .then((data) => setInventory(data))
      .catch(() => setError('Failed to load wallet'))
      .finally(() => setLoading(false));
  }, [address, isConnected, router]);

  if (!isConnected) return null;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-[#1e3a5f] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-pixel text-sm text-[#4b9fe1]">
          BluAgent
        </Link>
        <ConnectButton accountStatus="address" showBalance={false} />
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-pixel text-lg text-white mb-8">Your Blupets</h2>

        {loading && (
          <div className="text-slate-400 font-pixel text-xs animate-pulse">Loading wallet…</div>
        )}

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        {inventory && inventory.count === 0 && (
          <div className="text-slate-400 text-sm text-center py-20">
            No Blupets found in this wallet.
          </div>
        )}

        {/* Lonely state — exactly 1 token */}
        {inventory && inventory.count === 1 && (
          <LonelyState token={inventory.tokens[0]} />
        )}

        {/* Grid — 2+ tokens */}
        {inventory && inventory.count >= 2 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {inventory.tokens.map((t) => (
              <TokenCard key={t.tokenId} token={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
