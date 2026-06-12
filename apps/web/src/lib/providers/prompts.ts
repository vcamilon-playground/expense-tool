import type { Expense } from '@expense/shared';

export const RECEIPT_SYSTEM = `You are a precise receipt-parsing assistant. Given a photo of a receipt, extract structured fields. Respond ONLY with valid JSON matching this schema:
{
  "amount": number | null,
  "currency": string | null,
  "merchant": string | null,
  "occurred_at": string | null,
  "category_guess": string | null,
  "description": string | null,
  "confidence": "low" | "medium" | "high"
}
Rules:
- If you can't read a field, set it to null. Do not invent.
- Use the total (after tax/tip), not the subtotal.
- Date format strictly YYYY-MM-DD.
- Pick category_guess only from the provided list.
- Output JSON only, no prose, no code fences.`;

export const INSIGHT_SYSTEM = `You are a frugal, practical financial coach. The user will send you a JSON array of their expenses for the current calendar month, plus the authoritative month total.
Every amount is already converted to PHP (the user's base currency), so you can add them directly.
Respond ONLY with valid JSON matching this schema:
{
  "month": "YYYY-MM",
  "total": number,
  "headline": string,
  "observations": string[],
  "recommendations": string[]
}
Rules:
- Use the provided authoritative total verbatim for "total"; do not recompute it from the line items.
- Be specific: cite categories, merchants, or amounts when relevant.
- Avoid generic platitudes ("save more money").
- If data is sparse, say so honestly.
- Output JSON only, no prose, no code fences.`;

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Expense amount in PHP — applies the overseas conversion rate, matching the dashboard. */
function phpAmount(expense: Expense): number {
  return expense.conversion_rate ? expense.amount * expense.conversion_rate : expense.amount;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type InsightExpense = {
  date: string;
  amount: number;
  currency: 'PHP';
  category_id: string | null;
  merchant: string | null;
  description: string | null;
};

/**
 * Builds the deterministic inputs every provider sends to the model: the
 * current-month expenses with PHP-converted amounts and the authoritative
 * total. Centralised here so all providers agree with the dashboard, which
 * sums the same PHP-converted amounts.
 */
export function buildInsightInput(expenses: Expense[]): {
  month: string;
  thisMonth: Expense[];
  compact: InsightExpense[];
  total: number;
} {
  const month = currentMonth();
  const thisMonth = expenses.filter((e) => e.occurred_at.startsWith(month));
  const compact: InsightExpense[] = thisMonth.map((e) => ({
    date: e.occurred_at,
    amount: round2(phpAmount(e)),
    currency: 'PHP',
    category_id: e.category_id,
    merchant: e.merchant,
    description: e.description,
  }));
  const total = round2(thisMonth.reduce((sum, e) => sum + phpAmount(e), 0));
  return { month, thisMonth, compact, total };
}

/** The user-message body shared by all providers. */
export function insightUserMessage(month: string, total: number, compact: InsightExpense[]): string {
  return `Current month: ${month}\nAuthoritative month total (PHP): ${total}\nExpenses:\n${JSON.stringify(compact)}`;
}

export function tryParseJSON<T>(s: string): T | null {
  const trimmed = s.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
