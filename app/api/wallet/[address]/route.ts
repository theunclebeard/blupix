import { NextResponse } from 'next/server';
import { blukit } from '@/lib/blukit';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  try {
    const data = await blukit.wallet(address);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'BluKit error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
