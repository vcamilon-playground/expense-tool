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

async function get<T>(table: string, filter: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) return [];
  return res.json();
}

async function patch(table: string, filter: string, data: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(`[patch] skipped ${table} — SUPABASE_URL/SUPABASE_ANON_KEY not set`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) console.error(`[patch] ${table}: HTTP ${res.status}`);
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
export const E2E_BUDGET_LIMIT = 99999.99;
export const E2E_BUDGET_LIMIT_EDITED = 88888.88;

export const cleanup = {
  expenses: () => del('expenses', `merchant=eq.${E2E_MERCHANT}`),
  recurring: () => del('recurring_expenses', 'name=like.E2E*'),
  budget: () =>
    del('budgets', `category_id=is.null&monthly_limit=in.(${E2E_BUDGET_LIMIT},${E2E_BUDGET_LIMIT_EDITED})`),
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
  budget: () => post('budgets', { monthly_limit: E2E_BUDGET_LIMIT, category_id: null }),
};

export type OverallBudgetSnapshot = { id: string; monthly_limit: number } | null;

export const overallBudget = {
  get: () =>
    get<{ id: string; monthly_limit: number }>(
      'budgets',
      'category_id=is.null&select=id,monthly_limit',
    ).then((rows) => (rows.length > 0 ? rows[0] : null)),
  restore: (id: string, monthly_limit: number) =>
    patch('budgets', `id=eq.${id}`, { monthly_limit }),
};
