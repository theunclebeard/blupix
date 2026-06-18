'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected && address) {
      router.push('/wallet');
    }
  }, [isConnected, address, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Blupix gradient header */}
      <div className="mb-12">
        <h1 className="font-pixel text-2xl sm:text-3xl text-[#4b9fe1] mb-4 leading-relaxed">
          BluAgent
        </h1>
        <p className="font-pixel text-xs text-[#6ab4f5] tracking-wider">
          Blupets · AI Agents · Ascension Chronicle
        </p>
      </div>

      {/* Taglines */}
      <div className="max-w-lg space-y-4 mb-14">
        <p className="text-slate-300 text-sm leading-relaxed">
          Every Blupet has a vibe-aligned AI agent that grows with each merge.
        </p>
        <p className="text-slate-400 text-xs leading-relaxed">
          T4 agents remember every token burned to create them — and every wallet that ever held them.
          Anyone can visit a T4 and talk to its oracle.
        </p>
      </div>

      {/* Tier preview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-14 w-full max-w-xl">
        {[
          { label: 'T0', cap: 'Mystery', color: 'border-slate-600 text-slate-400' },
          { label: 'T1', cap: 'Self only', color: 'border-blue-700 text-blue-400' },
          { label: 'T2', cap: '+ Lineage', color: 'border-cyan-700 text-cyan-400' },
          { label: 'T3', cap: '+ Scarcity', color: 'border-violet-700 text-violet-400' },
          { label: 'T4', cap: 'Public oracle', color: 'border-yellow-500 text-yellow-400' },
        ].map(({ label, cap, color }) => (
          <div
            key={label}
            className={`border ${color} rounded p-2 flex flex-col items-center gap-1 bg-[#12213a]`}
          >
            <span className="font-pixel text-xs">{label}</span>
            <span className="text-xs text-slate-400">{cap}</span>
          </div>
        ))}
      </div>

      {/* Connect */}
      <ConnectButton label="Connect wallet to begin" />

      <p className="mt-8 text-xs text-slate-600">
        No wallet? Browse any public{' '}
        <a href="/token/873" className="text-[#4b9fe1] hover:underline">
          T4 oracle
        </a>
        .
      </p>
    </main>
  );
}
