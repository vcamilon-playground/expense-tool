import type { Expense, MonthlyInsight, ReceiptExtraction } from '@expense/shared';
import { extractReceiptAnthropic, generateInsightsAnthropic } from './providers/anthropic';
import { extractReceiptGemini, generateInsightsGemini } from './providers/gemini';

export type AIProvider = 'gemini' | 'anthropic';

export function currentProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();
  return raw === 'anthropic' ? 'anthropic' : 'gemini';
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export async function extractReceipt(
  imageBase64: string,
  mediaType: MediaType = 'image/jpeg',
): Promise<ReceiptExtraction> {
  return currentProvider() === 'anthropic'
    ? extractReceiptAnthropic(imageBase64, mediaType)
    : extractReceiptGemini(imageBase64, mediaType);
}

export async function generateInsights(expenses: Expense[]): Promise<MonthlyInsight> {
  return currentProvider() === 'anthropic'
    ? generateInsightsAnthropic(expenses)
    : generateInsightsGemini(expenses);
}
