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

export const E2E_MERCHANT = 'E2E-TEST';
export const E2E_RECURRING_NAME = 'E2E Test Subscription';

export const cleanup = {
  expenses: () => del('expenses', `merchant=eq.${E2E_MERCHANT}`),
  recurring: () => del('recurring_expenses', 'name=like.E2E*'),
};
