import { NextResponse } from 'next/server';
import { currentProvider } from '@/lib/ai';

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  anthropic: 'Claude',
  groq: 'Groq',
};

export function GET() {
  const provider = currentProvider();
  return NextResponse.json({
    provider,
    providerLabel: PROVIDER_LABELS[provider] ?? 'AI',
  });
}
