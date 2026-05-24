const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://your-app.vercel.app';

function monthLabel(): string {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
}

const EMAIL_SUBJECT = () => `📊 ${monthLabel()} — Time to Review Your Monthly Expenses`;

const EMAIL_HTML = () => `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2233;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#3b6fd4;margin:0 0 16px">📊 Monthly Expense Review</h2>
  <p>Hi there,</p>
  <p>It is time to review your <strong>${monthLabel()}</strong> expenses and insights.</p>
  <p>Please visit the <strong>Expense Web Tool</strong> to:</p>
  <ul style="line-height:1.8">
    <li>Check your budget status</li>
    <li>Review spending by category</li>
    <li>Generate your AI-powered monthly insight</li>
  </ul>
  <a href="${SITE_URL}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#3b6fd4;color:white;text-decoration:none;border-radius:8px;font-weight:600">
    Open Expense Tool →
  </a>
  <p style="color:#6b7a99;font-size:12px;margin-top:32px;border-top:1px solid #cdd5e0;padding-top:12px">
    This reminder is sent automatically on the last day of each month.
  </p>
</body>
</html>`;

const SMS_BODY = () =>
  `📊 It is time to review your ${monthLabel()} monthly expenses and insights. Please visit the Expense Web Tool for analysis: ${SITE_URL}`;

export async function sendMonthlyReminderEmail(): Promise<{ skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.RESEND_FROM ?? 'Expense Tool <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.warn('[notify:email] Skipped — RESEND_API_KEY or NOTIFY_EMAIL_TO not configured');
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: EMAIL_SUBJECT(),
      html: EMAIL_HTML(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  return {};
}

export async function sendMonthlyReminderSMS(): Promise<{ skipped?: boolean }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.NOTIFY_PHONE_TO;

  if (!sid || !token || !from || !to) {
    console.warn('[notify:sms] Skipped — Twilio env vars not fully configured');
    return { skipped: true };
  }

  const credentials = btoa(`${sid}:${token}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: SMS_BODY() }).toString(),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio ${res.status}: ${body}`);
  }

  return {};
}
