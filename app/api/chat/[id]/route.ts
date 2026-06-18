import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { blukit } from '@/lib/blukit';
import { getTierCapabilities } from '@/lib/tier-gate';
import { buildSystemPrompt } from '@/lib/agent-builder';
import sql from '@/lib/db';
import type { ChronicleNode, OwnershipRow } from '@/lib/agent-builder';

// Lazy singletons — instantiated on first request, not at build time
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

let _redis: Redis | null = null;
function getRedis() {
  if (!_redis) _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

function getPublicRatelimit() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'blupagent:public',
  });
}

function getHolderRatelimit() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'blupagent:holder',
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId) || tokenId < 1 || tokenId > 8192) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = body?.messages ?? [];
  const walletAddress: string | undefined = body?.walletAddress;

  // ── Fetch token ─────────────────────────────────────────────────────────────
  let token;
  try {
    token = await blukit.token(tokenId);
  } catch {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  const caps = getTierCapabilities(token.stage);

  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimitKey = walletAddress ?? ip;
  const limiter = caps.access === 'public' ? getPublicRatelimit() : getHolderRatelimit();
  const { success: rateLimitOk } = await limiter.limit(rateLimitKey);
  if (!rateLimitOk) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
  }

  // ── Wallet verification for holder-only tiers ────────────────────────────
  if (caps.access === 'holder') {
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet required for this tier' }, { status: 401 });
    }
    const ownerNorm = token.owner.toLowerCase();
    const callerNorm = walletAddress.toLowerCase();
    if (ownerNorm !== callerNorm) {
      return NextResponse.json({ error: 'Not the token owner' }, { status: 403 });
    }
  }

  // ── Turn limit enforcement ───────────────────────────────────────────────
  const userTurns = messages.filter((m) => m.role === 'user').length;
  if (caps.maxTurns !== Infinity && userTurns > caps.maxTurns) {
    return NextResponse.json({ error: 'Turn limit exceeded for this tier' }, { status: 429 });
  }

  // ── Fetch vibes ──────────────────────────────────────────────────────────
  const vibesData = await blukit.vibes();
  const vibe = vibesData.vibes.find((v) => v.id === token.vibe) ?? {
    id: token.vibe,
    name: token.vibeName,
    description: '',
    agentHint: '',
  };

  // ── Fetch chronicle (for T2+) ────────────────────────────────────────────
  let chronicle: ChronicleNode[] = [];
  if (token.stage >= 2) {
    const rows = await sql`
      SELECT
        keeper_id, donor_id, new_stage, merged_at, tx_hash,
        donor_echo, chapter
      FROM chronicle_events
      WHERE keeper_id = ${tokenId}
      ORDER BY merged_at ASC
    `;
    chronicle = rows.map((r) => ({
      keeperId: r.keeper_id,
      donorId: r.donor_id,
      newStage: r.new_stage,
      mergedAt: r.merged_at,
      txHash: r.tx_hash,
      donorEcho: r.donor_echo,
      chapter: r.chapter,
    }));
  }

  // ── Fetch ownership (T4 only) ────────────────────────────────────────────
  let ownership: OwnershipRow[] = [];
  let offersPublic = true;
  if (token.stage === 4) {
    const agentRow = await sql`
      SELECT display_name, bio_override, offers_public, scarcity_snapshot
      FROM agent_state WHERE token_id = ${tokenId}
    `;
    offersPublic = agentRow[0]?.offers_public ?? true;

    const ownerRows = await sql`
      SELECT from_address, to_address, transferred_at, sale_price_eth, listing_price_eth
      FROM ownership_events
      WHERE token_id = ${tokenId}
      ORDER BY transferred_at ASC
    `;
    ownership = ownerRows.map((r) => ({
      fromAddress: r.from_address,
      toAddress: r.to_address,
      transferredAt: r.transferred_at,
      salePriceEth: offersPublic ? r.sale_price_eth : null,
      listingPriceEth: offersPublic ? r.listing_price_eth : null,
    }));
  }

  // ── Fetch agent state ────────────────────────────────────────────────────
  const agentStateRows = await sql`
    SELECT display_name, bio_override, scarcity_snapshot
    FROM agent_state WHERE token_id = ${tokenId}
  `;
  const agentState = agentStateRows[0];
  const scarcity = agentState?.scarcity_snapshot ?? undefined;

  // ── Build system prompt ──────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    token,
    vibe,
    caps,
    chronicle,
    ownership,
    scarcity,
    displayName: agentState?.display_name,
    bioOverride: agentState?.bio_override,
    offersPublic,
  });

  // ── Stream LLM response ──────────────────────────────────────────────────
  const stream = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    max_tokens: caps.maxResponseTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20), // cap context to last 20 messages
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
        );
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
