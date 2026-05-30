import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Recurring expense creation is now user-initiated: users confirm payment
  // on the Recurring page before an expense record is created.
  return NextResponse.json({ message: 'Recurring expenses are confirmed manually via the UI.' });
}
