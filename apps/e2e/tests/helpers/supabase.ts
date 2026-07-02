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

async function post(table: string, data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
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
export const E2E_INCOME_NAME = 'E2E Alpha Bank';
export const E2E_INCOME_NAME_2 = 'E2E Beta Bank';
export const E2E_REMINDER_TITLE = 'E2E Test Reminder';

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
    const base = `monthly_limit=in.(${E2E_BUDGET_LIMIT},${E2E_BUDGET_LIMIT_EDITED})`;
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
  incomeSources: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `name=like.E2E*&user_id=eq.${uid}`
      : 'name=like.E2E*';
    return del('income_sources', filter);
  },
  reminders: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `title=like.E2E*&user_id=eq.${uid}`
      : 'title=like.E2E*';
    return del('reminders', filter);
  },
  // Income history rows are intentionally non-deletable in the app (they
  // survive source deletion). For test hygiene we still remove rows tagged with
  // an E2E source_label so the DB does not accumulate test transactions.
  incomeTransactions: () => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `source_label=like.E2E*&user_id=eq.${uid}`
      : 'source_label=like.E2E*';
    return del('income_transactions', filter);
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
  manyExpenses: (count: number, merchantPrefix = E2E_MERCHANT) => {
    const uid = loadE2EUserId();
    const occurred_at = new Date().toISOString().slice(0, 10);
    const rows = Array.from({ length: count }, (_, i) => ({
      user_id: uid,
      amount: i + 1,
      currency: 'PHP',
      occurred_at,
      source: 'manual',
      merchant: `${merchantPrefix}-${String(i).padStart(3, '0')}`,
      description: 'E2E grid pagination test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    }));
    return post('expenses', rows);
  },
  receiptExpense: (merchant: string) => {
    const uid = loadE2EUserId();
    return post('expenses', {
      user_id: uid,
      amount: 250,
      currency: 'PHP',
      occurred_at: new Date().toISOString().slice(0, 10),
      source: 'receipt',
      merchant,
      description: 'E2E grid receipt pill test',
      conversion_rate: null,
      category_id: null,
      receipt_url: null,
    });
  },
  overseasExpense: (merchant: string) => {
    const uid = loadE2EUserId();
    return post('expenses', {
      user_id: uid,
      amount: 10,
      currency: 'USD',
      occurred_at: new Date().toISOString().slice(0, 10),
      source: 'manual',
      merchant,
      description: 'E2E grid conversion test',
      conversion_rate: 56,
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
  // Creates a dedicated E2E category and a per-category budget against it.
  // Returns the category id, category name, and budget id so the regression
  // spec can locate the row in the table.
  categoryBudget: async (): Promise<{ categoryId: string; categoryName: string; budgetId: string }> => {
    const uid = loadE2EUserId();
    const cat = await postReturn<{ id: string }>('categories', {
      user_id: uid,
      name: E2E_CATEGORY_NAME,
      icon: '🧪',
    });
    const budget = await postReturn<{ id: string }>('budgets', {
      user_id: uid,
      monthly_limit: E2E_BUDGET_LIMIT,
      category_id: cat.id,
    });
    return { categoryId: cat.id, categoryName: E2E_CATEGORY_NAME, budgetId: budget.id };
  },
  incomeSource: (name: string, balance: number) => {
    const uid = loadE2EUserId();
    // A recognised brand so the edit modal's required company picker
    // pre-populates and the source can be updated without re-selecting a brand.
    return postReturn<{ id: string; balance: number }>('income_sources', {
      user_id: uid,
      type: 'bank',
      brand: 'BDO',
      name,
      balance,
    });
  },
  // Seeds an income history row dated > 3 months ago so it is treated as
  // archived (hidden by default, revealed by "Show archived"). The note is used
  // by the spec to locate the row. source_label is E2E-tagged for cleanup.
  archivedIncomeTransaction: (note: string, sourceLabel = `${E2E_INCOME_NAME} (archived seed)`) => {
    const uid = loadE2EUserId();
    const old = new Date();
    old.setMonth(old.getMonth() - 5);
    return postReturn<{ id: string }>('income_transactions', {
      user_id: uid,
      source_id: null,
      source_label: sourceLabel,
      kind: 'add',
      amount: 12.34,
      balance_before: 0,
      balance_after: 12.34,
      note,
      archived: true,
      created_at: old.toISOString(),
    });
  },
  reminder: (title: string, cadence: 'once' | 'weekly' | 'monthly' | 'yearly', remind_date: string) => {
    const uid = loadE2EUserId();
    return postReturn<{ id: string; remind_date: string }>('reminders', {
      user_id: uid,
      title,
      cadence,
      remind_date,
      active: true,
    });
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

// Maya Weekly Savings state lives in one `maya_savings` row per user
// (done_weeks integer[]). Tests establish a KNOWN done-set before navigating so
// assertions are deterministic regardless of the run date, then read the row
// back to confirm what the UI persisted. Reset removes the row entirely so the
// next first-visit test sees the seed path.
export const maya = {
  // Read the E2E user's done_weeks, or null when no row exists.
  get: async (): Promise<number[] | null> => {
    const uid = loadE2EUserId();
    if (!uid) return null;
    const rows = await get<{ done_weeks: number[] }>(
      'maya_savings',
      `user_id=eq.${uid}&select=done_weeks`,
    );
    return rows.length > 0 ? rows[0]!.done_weeks : null;
  },
  // Read the whole row set for the user (to assert "exactly one row" invariants).
  rows: async (): Promise<{ done_weeks: number[] }[]> => {
    const uid = loadE2EUserId();
    if (!uid) return [];
    return get<{ done_weeks: number[] }>('maya_savings', `user_id=eq.${uid}&select=done_weeks`);
  },
  // Force the row to a known done-set (delete-then-insert so we never depend on
  // whether a row already exists).
  set: async (doneWeeks: number[]): Promise<void> => {
    const uid = loadE2EUserId();
    if (!uid) {
      console.warn('[seed] skipped maya_savings — no E2E user id');
      return;
    }
    await del('maya_savings', `user_id=eq.${uid}`);
    await post('maya_savings', { user_id: uid, done_weeks: doneWeeks });
  },
  // Remove the row entirely (for first-visit-seed coverage and cleanup).
  reset: (): Promise<void> => {
    const uid = loadE2EUserId();
    const filter = uid ? `user_id=eq.${uid}` : 'user_id=is.null';
    return del('maya_savings', filter);
  },
};

export const categoryBudget = {
  // Sum of every per-category budget limit for the E2E user. The Budgets page
  // footer and the dashboard "Overall" row both display this total.
  sumLimits: async (): Promise<number> => {
    const uid = loadE2EUserId();
    const filter = uid
      ? `category_id=not.is.null&user_id=eq.${uid}&select=monthly_limit`
      : 'category_id=not.is.null&select=monthly_limit';
    const rows = await get<{ monthly_limit: number }>('budgets', filter);
    return rows.reduce((sum, r) => sum + Number(r.monthly_limit), 0);
  },
};
