'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { TierBadge } from './TierBadge';
import { getTierCapabilities } from '@/lib/tier-gate';
import { blukit } from '@/lib/blukit';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatProps {
  tokenId: number;
  stage: number;
  vibeName: string;
  displayName?: string | null;
  walletAddress?: string;
}

export function AgentChat({ tokenId, stage, vibeName, displayName, walletAddress }: AgentChatProps) {
  const caps = getTierCapabilities(stage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnsLeft = caps.maxTurns === Infinity ? null : caps.maxTurns - messages.filter(m => m.role === 'user').length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || streaming) return;
    if (turnsLeft !== null && turnsLeft <= 0) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch(`/api/chat/${tokenId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          walletAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // SSE: parse "data: ..." lines
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? '';
              assistantContent += delta;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: assistantContent },
              ]);
            } catch {
              // non-JSON line, skip
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat error');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  const agentName = displayName ?? `#${tokenId}`;
  const requiresWallet = caps.access === 'holder' && !walletAddress;

  return (
    <div className="flex flex-col h-full border border-[#1e3a5f] rounded-lg bg-[#0d1c30] overflow-hidden">
      {/* Header — sprite with pulse ring while streaming */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3a5f]">
        {/* Sprite + pulse ring */}
        <div className={`relative flex-shrink-0 rounded overflow-hidden ${streaming ? 'animate-pulse-ring' : ''}`}
          style={{ width: 48, height: 48 }}>
          <div className="w-full h-full checkerboard rounded overflow-hidden">
            <Image
              src={blukit.imageUrl(tokenId, 96)}
              alt={agentName}
              width={48}
              height={48}
              className="object-contain"
              style={{ imageRendering: 'pixelated' }}
              unoptimized
            />
          </div>
          {/* Speaking indicator — pixel dot bounces below sprite */}
          {streaming && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-1 h-1 rounded-full bg-[#4b9fe1]"
                  style={{ animation: `bob 0.8s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-pixel text-xs text-white">{agentName}</span>
          <span className="ml-2 text-xs text-slate-500">{vibeName}</span>
          {streaming && (
            <span className="ml-2 text-xs text-[#4b9fe1] animate-pulse">speaking…</span>
          )}
        </div>
        <TierBadge stage={stage} />
        {turnsLeft !== null && (
          <span className="text-xs text-slate-500">{turnsLeft} turns left</span>
        )}
      </div>

      {/* Locked state */}
      {requiresWallet ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <span className="text-2xl">🔒</span>
          <p className="font-pixel text-xs text-slate-400">Holder-only chat</p>
          <p className="text-xs text-slate-500">Connect the wallet that owns #{tokenId} to talk to this agent.</p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center mt-8">
                Ask {agentName} anything…
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-[#12213a] text-slate-300 border border-[#1e3a5f]'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <span className="font-pixel text-[9px] text-[#4b9fe1] block mb-1">
                      {agentName}
                    </span>
                  )}
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="inline-block w-1 h-3 bg-[#4b9fe1] ml-1 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#1e3a5f] p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={turnsLeft === 0 ? 'Turn limit reached' : 'Ask anything…'}
              disabled={streaming || turnsLeft === 0}
              className="flex-1 bg-[#12213a] border border-[#1e3a5f] rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#4b9fe1] disabled:opacity-40"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim() || turnsLeft === 0}
              className="px-4 py-2 bg-[#4b9fe1] text-white rounded text-xs font-pixel hover:bg-[#3a8fd1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
