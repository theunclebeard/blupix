/**
 * Market indexer — nightly Reservoir API sync.
 * Backfills sale_price_eth and listing_price_eth on ownership_events.
 * For T4 tokens, also captures offer history.
 *
 * Run nightly via cron or Vercel cron jobs.
 */

import sql from '../lib/db';

const RESERVOIR_BASE = process.env.RESERVOIR_BASE_URL ?? 'https://api.reservoir.tools';
const RESERVOIR_KEY = process.env.RESERVOIR_API_KEY ?? '';
const BLUPETS_CORE = process.env.NEXT_PUBLIC_BLUPETS_CORE!;

async function reservoirGet(path: string) {
  const res = await fetch(`${RESERVOIR_BASE}${path}`, {
    headers: { 'x-api-key': RESERVOIR_KEY },
  });
  if (!res.ok) throw new Error(`Reservoir ${path}: ${res.statusText}`);
  return res.json();
}

async function syncTokenActivity(tokenId: number) {
  const contractToken = `${BLUPETS_CORE}:${tokenId}`;
  let continuation: string | null = null;

  do {
    const qs = `?token=${encodeURIComponent(contractToken)}&limit=100${continuation ? `&continuation=${continuation}` : ''}`;
    const data = await reservoirGet(`/tokens/${encodeURIComponent(contractToken)}/activity/v5${qs}`);

    for (const activity of data.activities ?? []) {
      if (activity.type !== 'sale') continue;

      const txHash: string = activity.txHash;
      const price: number = activity.price?.amount?.native ?? null;

      if (!txHash || !price) continue;

      await sql`
        UPDATE ownership_events
        SET sale_price_eth = ${price}
        WHERE tx_hash = ${txHash}
          AND token_id = ${tokenId}
          AND sale_price_eth IS NULL
      `;
    }

    continuation = data.continuation ?? null;
  } while (continuation);
}

async function syncAllT4Tokens() {
  // Get all T4 tokens from DB (those with chronicle_events reaching new_stage=4)
  const t4Rows = await sql`
    SELECT DISTINCT keeper_id as token_id
    FROM chronicle_events
    WHERE new_stage = 4
  `;

  for (const row of t4Rows) {
    try {
      await syncTokenActivity(row.token_id);
      console.log(`[market-indexer] Synced T4 token ${row.token_id}`);
    } catch (err) {
      console.error(`[market-indexer] Error syncing ${row.token_id}:`, err);
    }
  }
}

async function run() {
  console.log('[market-indexer] Starting nightly sync…');
  await syncAllT4Tokens();
  console.log('[market-indexer] Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[market-indexer] Fatal:', err);
  process.exit(1);
});
