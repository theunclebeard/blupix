import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { blukit } from '@/lib/blukit';
import { canViewFullOwnership } from '@/lib/tier-gate';

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
    const token = await blukit.token(tokenId);

    if (!canViewFullOwnership(token.stage)) {
      // For T1–T2: return only current owner
      if (token.stage <= 2) {
        return NextResponse.json({
          tokenId,
          stage: token.stage,
          restricted: true,
          currentOwner: token.owner,
          events: [],
        });
      }

      // For T3: return count + total hold stats but not full timeline
      const countRow = await sql`
        SELECT COUNT(*) as count FROM ownership_events WHERE token_id = ${tokenId}
      `;
      return NextResponse.json({
        tokenId,
        stage: token.stage,
        restricted: true,
        ownerCount: Number(countRow[0].count),
        currentOwner: token.owner,
        events: [],
      });
    }

    // T4: full ownership timeline
    const rows = await sql`
      SELECT
        id,
        from_address,
        to_address,
        transferred_at,
        sale_price_eth,
        listing_price_eth,
        ens_from,
        ens_to
      FROM ownership_events
      WHERE token_id = ${tokenId}
      ORDER BY transferred_at ASC
    `;

    // Check offers_public setting
    const agentRow = await sql`
      SELECT offers_public FROM agent_state WHERE token_id = ${tokenId}
    `;
    const offersPublic = agentRow[0]?.offers_public ?? true;

    const events = rows.map((r) => ({
      id: r.id,
      fromAddress: r.from_address,
      toAddress: r.to_address,
      transferredAt: r.transferred_at,
      salePriceEth: offersPublic ? r.sale_price_eth : null,
      listingPriceEth: offersPublic ? r.listing_price_eth : null,
      ensFrom: r.ens_from,
      ensTo: r.ens_to,
    }));

    return NextResponse.json({ tokenId, stage: token.stage, restricted: false, offersPublic, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
