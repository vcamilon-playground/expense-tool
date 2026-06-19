import Groq from 'groq-sdk';
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

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function client(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function extractReceiptGroq(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg',
): Promise<ReceiptExtraction> {
  const categoryList = DEFAULT_CATEGORIES.map((c) => c.name).join(', ');
  const completion = await client().chat.completions.create({
    model: VISION_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RECEIPT_SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Categories to choose from: ${categoryList}\n\nExtract the receipt fields as JSON.`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  const parsed = tryParseJSON<ReceiptExtraction>(text);
  if (!parsed) throw new Error(`Failed to parse Groq output: ${text.slice(0, 200)}`);
  return parsed;
}

export async function generateInsightsGroq(
  expenses: Expense[],
  categories: { id: string; name: string }[] = [],
): Promise<MonthlyInsight> {
  const { month, thisMonth, compact, total } = buildInsightInput(expenses, categories);
  if (thisMonth.length === 0) {
    return emptyInsight(month);
  }

  const completion = await client().chat.completions.create({
    model: TEXT_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: INSIGHT_SYSTEM },
      { role: 'user', content: insightUserMessage(month, total, compact) },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  const parsed = tryParseJSON<MonthlyInsight>(text);
  if (!parsed) throw new Error(`Failed to parse Groq output: ${text.slice(0, 200)}`);
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
