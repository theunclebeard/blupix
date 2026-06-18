# BluAgent

Vibe-aligned AI agents and Ascension Chronicle for [Blupets](https://blupix.app).

> Every merge writes history. Every ascension unlocks a smarter agent.  
> Merge to remember the dead. Ascend to remember everyone who ever held you.

## What it does

- **Every Blupet gets an AI agent** — personality from on-chain vibe data
- **Agent depth scales with tier** — T0 cryptic → T4 full public oracle with merge + ownership memory
- **Ascension Chronicle** — every merge is recorded; T4 pages show the full genealogy tree + chapters
- **Ownership biography** — T4 agents know every wallet that ever held them, sale prices, hold durations
- **Post-merge enrichment** — on merge tx, LLM generates a donor echo (last words) + chapter paragraph

## Stack

- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind CSS
- **Wallet**: wagmi + viem + RainbowKit
- **Database**: Postgres (Supabase)
- **LLM**: OpenAI GPT-4o
- **Chain indexer**: Alchemy SDK (Ethereum mainnet)
- **Market indexer**: Reservoir API
- **Rate limiting**: Upstash Redis + @upstash/ratelimit
- **Blupets data**: [BluKit API](https://blupix.app/api/blukit)

## Tier capability matrix

| Tier | Chat access | Chronicle | Ownership | Context |
|------|------------|-----------|-----------|---------|
| T0 | Holder · 3 turns | None | None | Cryptic only |
| T1 | Holder · 10 turns | Self | Current owner | Vibe + self |
| T2 | Holder · 20 turns | Merge tree | Current owner | + Lineage |
| T3 | Holder · 40 turns | Merge tree | Count + hold | + Scarcity |
| T4 | **Public** · unlimited | Full tree | **Full timeline** | Everything |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env
cp .env.example .env.local
# Fill in: DATABASE_URL, ALCHEMY_API_KEY, RESERVOIR_API_KEY, OPENAI_API_KEY
# UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 3. Run DB migration
psql $DATABASE_URL -f db/migrations/001_initial.sql

# 4. Start dev server
npm run dev
```

## Indexers

Run these in separate processes (or deploy as separate services):

```bash
# Merge indexer — detects burns/ascensions, writes chronicle
npx ts-node --esm indexer/merge-indexer.ts

# Ownership indexer — indexes all Transfer events
npx ts-node --esm indexer/ownership-indexer.ts

# Market indexer — nightly Reservoir sync (run via cron: 0 2 * * *)
npx ts-node --esm indexer/market-indexer.ts

# Scarcity snapshot — nightly T3/T4 context (run via cron: 0 3 * * *)
npx ts-node --esm jobs/scarcity-snapshot.ts
```

## Key routes

| Route | Description |
|-------|-------------|
| `/` | Landing — connect wallet |
| `/wallet` | Your Blupets grid (wallet-gated) |
| `/token/[id]` | Token page — public for T4, holder-gated for T0–T3 |
| `POST /api/chat/[id]` | Streaming agent chat (tier-gated) |
| `GET /api/token/[id]/chronicle` | Merge tree |
| `GET /api/token/[id]/ownership` | Ownership timeline |
| `PATCH /api/token/[id]/agent` | Update T4 agent settings |

## Attribution

Token data, art, and evolution rules via [BluKit](https://blupix.app/blukit-guide.md).  
Blupets contracts on Ethereum mainnet — [blupix.app](https://blupix.app).

## Roadmap (v2)

- BluChallenge pre-merge game modes (Lonely / Duel / Survivor)
- Supply pyramid dashboard
- Shareable episode replay cards
- Vercel OG image generation for T4 share cards
