import { GoogleGenerativeAI } from '@google/generative-ai';
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

const MODEL = 'gemini-2.0-flash';

function client(): GoogleGenerativeAI {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not set');
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

export async function extractReceiptGemini(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg',
): Promise<ReceiptExtraction> {
  const categoryList = DEFAULT_CATEGORIES.map((c) => c.name).join(', ');
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: RECEIPT_SYSTEM,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: mediaType, data: imageBase64 } },
    { text: `Categories to choose from: ${categoryList}\n\nExtract the receipt fields as JSON.` },
  ]);
  const text = result.response.text().trim();
  const parsed = tryParseJSON<ReceiptExtraction>(text);
  if (!parsed) throw new Error(`Failed to parse Gemini output: ${text.slice(0, 200)}`);
  return parsed;
}

export async function generateInsightsGemini(expenses: Expense[]): Promise<MonthlyInsight> {
  const { month, thisMonth, compact, total } = buildInsightInput(expenses);
  if (thisMonth.length === 0) {
    return emptyInsight(month);
  }

  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: INSIGHT_SYSTEM,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(insightUserMessage(month, total, compact));
  const text = result.response.text().trim();
  const parsed = tryParseJSON<MonthlyInsight>(text);
  if (!parsed) throw new Error(`Failed to parse Gemini output: ${text.slice(0, 200)}`);
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
