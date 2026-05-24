import { NextResponse } from 'next/server';
import { extractReceipt, currentProvider } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Body = {
  imageBase64: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.imageBase64) {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
  }

  try {
    const result = await extractReceipt(body.imageBase64, body.mediaType ?? 'image/jpeg');
    return NextResponse.json({ provider: currentProvider(), ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'extraction failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
