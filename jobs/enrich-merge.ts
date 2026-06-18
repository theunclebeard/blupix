/**
 * enrich-merge — async job triggered after a merge is detected.
 * Fetches both token states + vibes from BluKit,
 * generates donor_echo + chapter via LLM,
 * and updates chronicle_events + agent_state.
 */

import OpenAI from 'openai';
import sql from '../lib/db';
import { blukit } from '../lib/blukit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';

interface EnrichArgs {
  keeperId: number;
  donorId: number;
  newStage: number;
  txHash: string;
}

export async function enrichMerge({ keeperId, donorId, newStage, txHash }: EnrichArgs) {
  console.log(`[enrich-merge] Enriching tx=${txHash} keeper=${keeperId} donor=${donorId}`);

  const [keeperToken, donorToken, vibesData] = await Promise.all([
    blukit.token(keeperId),
    blukit.token(donorId).catch(() => null), // donor may 404 (burned)
    blukit.vibes(),
  ]);

  const keeperVibe = vibesData.vibes.find((v) => v.id === keeperToken.vibe);
  const donorVibe = donorToken ? vibesData.vibes.find((v) => v.id === donorToken.vibe) : null;

  const donorDesc = donorToken
    ? `#${donorId} (${donorToken.formName}, ${donorToken.lineageName}, ${donorVibe?.name ?? 'unknown'} vibe, T${donorToken.stage})`
    : `#${donorId} (burned, details unavailable)`;

  const keeperDesc = `#${keeperId} (${keeperToken.formName}, ${keeperToken.lineageName}, ${keeperVibe?.name ?? 'unknown'} vibe, now T${newStage})`;

  // ── Generate donor echo ──────────────────────────────────────────────────
  const echoRes = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 80,
    messages: [
      {
        role: 'system',
        content:
          `You write the final words of a Blupet about to be burned in a merge ceremony. ` +
          `One sentence, first-person, from the donor's vibe (${donorVibe?.name ?? 'unknown'}). ` +
          `Poetic, brief, in-character. No quotation marks.`,
      },
      {
        role: 'user',
        content: `Donor: ${donorDesc}. Keeper: ${keeperDesc}. Write the donor's last words.`,
      },
    ],
  });
  const donorEcho = echoRes.choices[0]?.message?.content?.trim() ?? null;

  // ── Generate merge chapter ───────────────────────────────────────────────
  const chapterRes = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 180,
    messages: [
      {
        role: 'system',
        content:
          `You write a short narrative paragraph about a Blupet merge event. ` +
          `2-3 sentences, third-person, mythic tone. ` +
          `Reference the donor's vibe, lineage, and the keeper's ascension to T${newStage}. No headers.`,
      },
      {
        role: 'user',
        content: `Donor: ${donorDesc}. Keeper ascended: ${keeperDesc}. Write the chapter.`,
      },
    ],
  });
  const chapter = chapterRes.choices[0]?.message?.content?.trim() ?? null;

  // ── Write enrichment to DB ───────────────────────────────────────────────
  await sql`
    UPDATE chronicle_events
    SET
      donor_echo = ${donorEcho},
      chapter    = ${chapter},
      stat_snapshot = ${JSON.stringify({
        keeperStage: keeperToken.stage,
        keeperVibe: keeperVibe?.name,
        keeperLineage: keeperToken.lineageName,
        donorStage: donorToken?.stage ?? null,
        donorVibe: donorVibe?.name ?? null,
        donorLineage: donorToken?.lineageName ?? null,
      })}
    WHERE tx_hash = ${txHash}
  `;

  // ── Update keeper agent_state ─────────────────────────────────────────────
  await sql`
    INSERT INTO agent_state (token_id, vibe_id, stage, updated_at)
    VALUES (${keeperId}, ${keeperToken.vibe}, ${keeperToken.stage}, NOW())
    ON CONFLICT (token_id) DO UPDATE
    SET stage = EXCLUDED.stage, vibe_id = EXCLUDED.vibe_id, updated_at = NOW()
  `;

  console.log(`[enrich-merge] Done tx=${txHash} echo="${donorEcho?.slice(0, 50)}…"`);
}
