import { NextResponse } from 'next/server';
import { advanceDate } from '@expense/shared';
import { createExpense, listDueRecurring, updateRecurring } from '@/lib/db';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const due = await listDueRecurring(today);

  const processed: string[] = [];
  const errors: string[] = [];

  for (const item of due) {
    try {
      await createExpense({
        amount: item.amount,
        currency: 'PHP',
        conversion_rate: null,
        category_id: item.category_id,
        merchant: item.name,
        description: null,
        occurred_at: item.next_charge_date,
        receipt_url: null,
        source: 'recurring',
      });
      await updateRecurring(item.id, {
        next_charge_date: advanceDate(item.next_charge_date, item.cadence),
      });
      processed.push(item.name);
    } catch (e) {
      errors.push(`${item.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json(
    { today, processed, errors },
    { status: errors.length > 0 ? 502 : 200 },
  );
}
