import { NextResponse } from 'next/server';
import type { Category, Expense } from '@expense/shared';
import { generateInsights, currentProvider } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Body = { expenses: Expense[]; categories?: Category[] };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!Array.isArray(body.expenses)) {
    return NextResponse.json({ error: 'expenses array required' }, { status: 400 });
  }

  try {
    const result = await generateInsights(body.expenses, body.categories ?? []);
    return NextResponse.json({ provider: currentProvider(), ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'insight generation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
