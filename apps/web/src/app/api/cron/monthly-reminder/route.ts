import { NextResponse } from 'next/server';
import { sendMonthlyReminderEmail, sendMonthlyReminderSMS } from '@/lib/notify';

export const runtime = 'nodejs';

function isLastDayOfMonth(): boolean {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getDate() === 1;
}

export async function GET(req: Request) {
  // Vercel sets Authorization: Bearer <CRON_SECRET> on all cron invocations.
  // When CRON_SECRET is set, reject any request that doesn't carry it.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Guard: the cron fires on days 28–31; only proceed on the actual last day.
  if (!isLastDayOfMonth()) {
    return NextResponse.json({
      sent: false,
      reason: 'Not the last day of the month — skipping.',
    });
  }

  const results: Record<string, string> = {};
  const errors: string[] = [];

  try {
    const r = await sendMonthlyReminderEmail();
    results.email = r.skipped ? 'skipped (not configured)' : 'sent';
  } catch (e) {
    results.email = 'error';
    errors.push(`email: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await sendMonthlyReminderSMS();
    results.sms = r.skipped ? 'skipped (not configured)' : 'sent';
  } catch (e) {
    results.sms = 'error';
    errors.push(`sms: ${e instanceof Error ? e.message : String(e)}`);
  }

  const status = errors.length > 0 ? 502 : 200;
  return NextResponse.json({ results, errors }, { status });
}
