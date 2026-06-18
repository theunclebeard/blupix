import { NextResponse } from 'next/server';
import { blukit } from '@/lib/blukit';
import sql from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId) || tokenId < 1 || tokenId > 8192) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 });
  }

  // Only T4 tokens support holder customization
  let token;
  try {
    token = await blukit.token(tokenId);
  } catch {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (token.stage !== 4) {
    return NextResponse.json({ error: 'Holder customization available for T4 only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { walletAddress, displayName, bioOverride, offersPublic } = body as {
    walletAddress?: string;
    displayName?: string;
    bioOverride?: string;
    offersPublic?: boolean;
  };

  // Verify ownership
  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress required' }, { status: 401 });
  }
  if (token.owner.toLowerCase() !== walletAddress.toLowerCase()) {
    return NextResponse.json({ error: 'Not the token owner' }, { status: 403 });
  }

  // Validate display name length
  if (displayName !== undefined && displayName.length > 32) {
    return NextResponse.json({ error: 'Display name max 32 chars' }, { status: 400 });
  }
  if (bioOverride !== undefined && bioOverride.length > 280) {
    return NextResponse.json({ error: 'Bio max 280 chars' }, { status: 400 });
  }

  await sql`
    INSERT INTO agent_state (token_id, stage, vibe_id, display_name, bio_override, offers_public, updated_at)
    VALUES (
      ${tokenId},
      ${token.stage},
      ${token.vibe},
      ${displayName ?? null},
      ${bioOverride ?? null},
      ${offersPublic ?? true},
      NOW()
    )
    ON CONFLICT (token_id) DO UPDATE SET
      display_name  = COALESCE(${displayName ?? null}, agent_state.display_name),
      bio_override  = COALESCE(${bioOverride ?? null}, agent_state.bio_override),
      offers_public = ${offersPublic ?? sql`agent_state.offers_public`},
      updated_at    = NOW()
  `;

  return NextResponse.json({ ok: true });
}
