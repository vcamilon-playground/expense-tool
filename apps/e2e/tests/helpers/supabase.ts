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

// E2E user id — written by global-setup.ts after login
const USER_FILE = path.join(__dirname, '..', '..', 'e2e-user.json');
function loadE2EUserId(): string {
  if (process.env.E2E_USER_ID) return process.env.E2E_USER_ID;
  try {
    const data = JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'));
    return data.userId as string;
  } catch {
    console.warn('[helpers] e2e-user.json not found — run the full suite once to generate it');
    return '';
  }
}

export function getE2EUserId(): string {
  return loadE2EUserId();
}

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

async function postReturn<T>(table: string, data: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('[seed] SUPABASE_URL/SUPABASE_ANON_KEY not set');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`[seed] ${table}: HTTP ${res.status}`);
  const rows: T[] = await res.json();
  return rows[0]!;
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
    throw new Error(`[seed] ${table}: HTTP ${res.status}`);
  }
}

export const E2E_MERCHANT = 'E2E-TEST';
export const SMOKE_MERCHANT = 'SMOKE-TEST';
export const E2E_RECURRING_NAME = 'E2E Test Subscription';
export const E2E_BUDGET_LIMIT = 99999.99;
export const E2E_BUDGET_LIMIT_EDITED = 88888.88;
export const E2E_CATEGORY_NAME = 'E2E Test Category';

export const cleanup = {
  expenses: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `merchant=like.E2E*&user_id=eq.${uid}`
      : 'merchant=like.E2E*';
    return del('expenses', filter);
  },
  smokeExpenses: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `merchant=like.SMOKE*&user_id=eq.${uid}`
      : 'merchant=like.SMOKE*';
    return del('expenses', filter);
  },
  recurring: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `name=like.E2E*&user_id=eq.${uid}`
      : 'name=like.E2E*';
    return del('recurring_expenses', filter);
  },
  budget: () => {
    const uid = loadE2EUserId();
    const base = `category_id=is.null&monthly_limit=in.(${E2E_BUDGET_LIMIT},${E2E_BUDGET_LIMIT_EDITED})`;
    const filter = uid ? `${base}&user_id=eq.${uid}` : base;
    return del('budgets', filter);
  },
  category: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `name=like.E2E*&user_id=eq.${uid}`
      : 'name=like.E2E*';
    return del('categories', filter);
  },
};

export const seed = {
  expense: () => {
    const uid = loadE2EUserId();
    return post('expenses', {
      user_id: uid,
      amount: 1,
      currency: 'PHP',
      occurred_at: new Date().toISOString().slice(0, 10),
      source: 'manual',
      merchant: E2E_MERCHANT,
      description: 'E2E delete modal test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    });
  },
  smokeExpense: () => {
    const uid = loadE2EUserId();
    const now = new Date();
    const occurred_at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return post('expenses', {
      user_id: uid,
      amount: 1,
      currency: 'PHP',
      occurred_at,
      source: 'manual',
      merchant: SMOKE_MERCHANT,
      description: 'E2E smoke delete modal test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    });
  },
  pastExpense: () => {
    const uid = loadE2EUserId();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed LOCAL month
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 12 : month; // 1-indexed: Jan=1…Dec=12
    const occurred_at = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    return post('expenses', {
      user_id: uid,
      amount: 1,
      currency: 'PHP',
      occurred_at,
      source: 'manual',
      merchant: E2E_MERCHANT,
      description: 'E2E past-month lock test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    });
  },
  recurring: () => {
    const uid = loadE2EUserId();
    return post('recurring_expenses', {
      user_id: uid,
      name: E2E_RECURRING_NAME,
      amount: 1,
      cadence: 'monthly',
      next_charge_date: new Date().toISOString().slice(0, 10),
      active: true,
      category_id: null,
    });
  },
  recurringFuture: () => {
    const uid = loadE2EUserId();
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return post('recurring_expenses', {
      user_id: uid,
      name: E2E_RECURRING_NAME,
      amount: 5,
      cadence: 'monthly',
      next_charge_date: d.toISOString().slice(0, 10),
      active: true,
      category_id: null,
    });
  },
  budget: () => {
    const uid = loadE2EUserId();
    return post('budgets', { user_id: uid, monthly_limit: E2E_BUDGET_LIMIT, category_id: null });
  },
  categoryWithExpense: async () => {
    const uid = loadE2EUserId();
    const cat = await postReturn<{ id: string }>('categories', {
      user_id: uid,
      name: E2E_CATEGORY_NAME,
      icon: '🧪',
    });
    await post('expenses', {
      user_id: uid,
      amount: 1,
      currency: 'PHP',
      occurred_at: new Date().toISOString().slice(0, 10),
      source: 'manual',
      merchant: E2E_MERCHANT,
      description: 'E2E category deletion test',
      conversion_rate: null,
      category_id: cat.id,
      receipt_url: null,
    });
    return cat.id;
  },
};

export type OverallBudgetSnapshot = { id: string; monthly_limit: number } | null;

export const overallBudget = {
  get: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `category_id=is.null&user_id=eq.${uid}&select=id,monthly_limit`
      : 'category_id=is.null&select=id,monthly_limit';
    return get<{ id: string; monthly_limit: number }>('budgets', filter).then(
      (rows) => (rows.length > 0 ? rows[0] : null),
    );
  },
  restore: (id: string, monthly_limit: number) =>
    patch('budgets', `id=eq.${id}`, { monthly_limit }),
};
