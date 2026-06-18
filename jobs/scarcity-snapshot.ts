/**
 * scarcity-snapshot — nightly job that builds scarcity context
 * for T3/T4 agents from BluKit /stats + /dump/tokens.json.
 *
 * Writes to agent_state.scarcity_snapshot for each T3/T4 token.
 * Run via cron: 0 2 * * *
 */

import sql from '../lib/db';
import { blukit } from '../lib/blukit';

interface ScarcitySnapshot {
  stageCount: number;
  lineageVibeCount: number;
  lineageName: string;
  vibeName: string;
  stageLabel: string;
  updatedAt: string;
}

async function run() {
  console.log('[scarcity-snapshot] Starting…');

  const stats = await blukit.stats();
  const dump = await fetch(`${process.env.BLUKIT_BASE_URL ?? 'https://blupix.app/api/blukit'}/dump/tokens.json`);
  const dumpData = await dump.json();
  const tokens = dumpData.items ?? [];

  // Get all T3/T4 tokens from agent_state (or from chronicle_events)
  const t3t4Rows = await sql`
    SELECT DISTINCT token_id FROM agent_state WHERE stage >= 3
    UNION
    SELECT DISTINCT keeper_id as token_id FROM chronicle_events WHERE new_stage >= 3
  `;

  for (const row of t3t4Rows) {
    const tokenId: number = row.token_id;
    const tokenData = tokens.find((t: { tokenId: number }) => t.tokenId === tokenId);
    if (!tokenData) continue;

    const { stage, lineage, vibe, lineageName, vibeName, stageLabel } = tokenData;
    if (stage < 3) continue;

    const stageCount: number = stats.stageCounts[String(stage)] ?? 0;

    // Count same lineage + vibe in same stage
    const lineageVibeCount = tokens.filter(
      (t: { stage: number; lineage: number; vibe: number }) =>
        t.stage === stage && t.lineage === lineage && t.vibe === vibe
    ).length;

    const snapshot: ScarcitySnapshot = {
      stageCount,
      lineageVibeCount,
      lineageName,
      vibeName,
      stageLabel,
      updatedAt: new Date().toISOString(),
    };

    await sql`
      INSERT INTO agent_state (token_id, stage, scarcity_snapshot, updated_at)
      VALUES (${tokenId}, ${stage}, ${JSON.stringify(snapshot)}, NOW())
      ON CONFLICT (token_id) DO UPDATE
      SET scarcity_snapshot = ${JSON.stringify(snapshot)}, updated_at = NOW()
    `;
  }

  console.log(`[scarcity-snapshot] Updated ${t3t4Rows.length} tokens.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[scarcity-snapshot] Fatal:', err);
  process.exit(1);
});
