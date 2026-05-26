import fs from 'fs';
import path from 'path';

// Load apps/e2e/.env into process.env so credentials are available in worker processes
const envFile = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1 || line.startsWith('#')) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function del(table: string, filter: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(`[cleanup] skipped ${table} — SUPABASE_URL/SUPABASE_ANON_KEY not set`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
  });
  if (!res.ok) {
    console.error(`[cleanup] ${table}: HTTP ${res.status}`);
  }
}

async function post(table: string, data: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(`[seed] skipped ${table} — SUPABASE_URL/SUPABASE_ANON_KEY not set`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`[seed] ${table}: HTTP ${res.status}`);
  }
}

export const E2E_MERCHANT = 'E2E-TEST';
export const E2E_RECURRING_NAME = 'E2E Test Subscription';

export const cleanup = {
  expenses: () => del('expenses', `merchant=eq.${E2E_MERCHANT}`),
  recurring: () => del('recurring_expenses', 'name=like.E2E*'),
};

export const seed = {
  expense: () =>
    post('expenses', {
      amount: 1,
      currency: 'PHP',
      occurred_at: new Date().toISOString().slice(0, 10),
      source: 'manual',
      merchant: E2E_MERCHANT,
      description: 'E2E delete modal test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    }),
  recurring: () =>
    post('recurring_expenses', {
      name: E2E_RECURRING_NAME,
      amount: 1,
      cadence: 'monthly',
      next_charge_date: new Date().toISOString().slice(0, 10),
      active: true,
      category_id: null,
    }),
};
