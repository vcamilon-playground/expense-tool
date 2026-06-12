import Anthropic from '@anthropic-ai/sdk';
import {
  DEFAULT_CATEGORIES,
  type Expense,
  type MonthlyInsight,
  type ReceiptExtraction,
} from '@expense/shared';
import {
  RECEIPT_SYSTEM,
  INSIGHT_SYSTEM,
  buildInsightInput,
  insightUserMessage,
  tryParseJSON,
} from './prompts';

const MODEL = 'claude-opus-4-7';

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function extractReceiptAnthropic(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg',
): Promise<ReceiptExtraction> {
  const categoryList = DEFAULT_CATEGORIES.map((c) => c.name).join(', ');
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: RECEIPT_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: `Categories to choose from: ${categoryList}\n\nExtract the receipt fields as JSON.` },
        ],
      },
    ],
  });
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
  const parsed = tryParseJSON<ReceiptExtraction>(text);
  if (!parsed) throw new Error(`Failed to parse Anthropic output: ${text.slice(0, 200)}`);
  return parsed;
}

export async function generateInsightsAnthropic(expenses: Expense[]): Promise<MonthlyInsight> {
  const { month, thisMonth, compact, total } = buildInsightInput(expenses);
  if (thisMonth.length === 0) {
    return emptyInsight(month);
  }

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 900,
    system: INSIGHT_SYSTEM,
    messages: [{ role: 'user', content: insightUserMessage(month, total, compact) }],
  });
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
  const parsed = tryParseJSON<MonthlyInsight>(text);
  if (!parsed) throw new Error(`Failed to parse Anthropic output: ${text.slice(0, 200)}`);
  return { ...parsed, month, total };
}

function emptyInsight(month: string): MonthlyInsight {
  return {
    month,
    total: 0,
    headline: 'No expenses recorded yet this month.',
    observations: ['Add a few expenses to get a real read on your spending.'],
    recommendations: ['Set a monthly budget so you have something to track against.'],
  };
}
