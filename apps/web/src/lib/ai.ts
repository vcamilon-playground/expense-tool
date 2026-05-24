import type { Expense, MonthlyInsight, ReceiptExtraction } from '@expense/shared';
import { extractReceiptAnthropic, generateInsightsAnthropic } from './providers/anthropic';
import { extractReceiptGemini, generateInsightsGemini } from './providers/gemini';
import { extractReceiptGroq, generateInsightsGroq } from './providers/groq';

export type AIProvider = 'gemini' | 'anthropic' | 'groq';

export function currentProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER ?? 'groq').toLowerCase();
  if (raw === 'anthropic') return 'anthropic';
  if (raw === 'gemini') return 'gemini';
  return 'groq';
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export async function extractReceipt(
  imageBase64: string,
  mediaType: MediaType = 'image/jpeg',
): Promise<ReceiptExtraction> {
  switch (currentProvider()) {
    case 'anthropic':
      return extractReceiptAnthropic(imageBase64, mediaType);
    case 'gemini':
      return extractReceiptGemini(imageBase64, mediaType);
    case 'groq':
      return extractReceiptGroq(imageBase64, mediaType);
  }
}

export async function generateInsights(expenses: Expense[]): Promise<MonthlyInsight> {
  switch (currentProvider()) {
    case 'anthropic':
      return generateInsightsAnthropic(expenses);
    case 'gemini':
      return generateInsightsGemini(expenses);
    case 'groq':
      return generateInsightsGroq(expenses);
  }
}
