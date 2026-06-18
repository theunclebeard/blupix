import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId) || tokenId < 1 || tokenId > 8192) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 });
  }

  try {
    // Fetch all chronicle events where this token is in the keeper lineage
    const rows = await sql`
      SELECT
        id,
        keeper_id,
        donor_id,
        new_stage,
        merged_at,
        tx_hash,
        donor_echo,
        chapter,
        selection_mode,
        holder_override
      FROM chronicle_events
      WHERE keeper_id = ${tokenId}
         OR donor_id  = ${tokenId}
      ORDER BY merged_at ASC
    `;

    // Build tree: each merge node where keeper_id = tokenId
    // For T4, we recursively fetch ancestors
    const directMerges = rows.filter((r) => r.keeper_id === tokenId);

    // Fetch donor token info from BluKit (best-effort, no hard fail)
    const nodes = await Promise.all(
      directMerges.map(async (row) => {
        // Try to get donor token info from a nested query
        const donorRows = await sql`
          SELECT
            c.id,
            c.keeper_id,
            c.donor_id,
            c.new_stage,
            c.merged_at,
            c.tx_hash,
            c.donor_echo,
            c.chapter
          FROM chronicle_events c
          WHERE c.keeper_id = ${row.donor_id}
          ORDER BY c.merged_at ASC
        `;

        return {
          id: row.id,
          keeperId: row.keeper_id,
          donorId: row.donor_id,
          newStage: row.new_stage,
          mergedAt: row.merged_at,
          txHash: row.tx_hash,
          donorEcho: row.donor_echo,
          chapter: row.chapter,
          donorVibe: null,
          donorFormName: null,
          donorLineageName: null,
          selectionMode: row.selection_mode,
          holderOverride: row.holder_override,
          children: donorRows.map((child) => ({
            id: child.id,
            keeperId: child.keeper_id,
            donorId: child.donor_id,
            newStage: child.new_stage,
            mergedAt: child.merged_at,
            txHash: child.tx_hash,
            donorEcho: child.donor_echo,
            chapter: child.chapter,
            donorVibe: null,
            donorFormName: null,
            donorLineageName: null,
            children: [],
          })),
        };
      })
    );

    return NextResponse.json({ tokenId, events: nodes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
