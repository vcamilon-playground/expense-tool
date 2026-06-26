import type {
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  Expense,
  ExpenseInput,
  IncomeSource,
  IncomeSourceInput,
  IncomeTransaction,
  IncomeTransactionKind,
  RecurringExpense,
  RecurringInput,
  Reminder,
  ReminderInput,
} from '@expense/shared';
import { supabase } from './supabase';
import { archiveCutoff, deleteCutoff, incomeSourceLabel } from './income-history';

// ---------- Categories ----------

export async function listCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: CategoryInput, userId: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ active: false }).eq('id', id);
  if (error) throw error;
}

// ---------- Expenses ----------

export async function listExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: ExpenseInput, userId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, patch: Partial<ExpenseInput>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Budgets ----------

export async function listBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(input: BudgetInput, userId: string): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert({ ...input, user_id: userId }, { onConflict: 'user_id,category_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBudget(id: string, monthly_limit: number): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .update({ monthly_limit })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Recurring ----------

export async function listDueRecurring(asOf: string, userId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .lte('next_charge_date', asOf)
    .order('next_charge_date');
  if (error) throw error;
  return data ?? [];
}

export async function listRecurring(userId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('next_charge_date');
  if (error) throw error;
  return data ?? [];
}

export async function createRecurring(
  input: RecurringInput,
  userId: string,
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurring(
  id: string,
  patch: Partial<RecurringInput>,
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Income Sources ----------

export async function listIncomeSources(userId: string): Promise<IncomeSource[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', userId)
    .order('type')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createIncomeSource(
  input: IncomeSourceInput,
  userId: string,
): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIncomeSource(
  id: string,
  patch: Partial<Pick<IncomeSource, 'name' | 'brand' | 'balance'>>,
): Promise<IncomeSource> {
  const { data: before, error: beforeErr } = await supabase
    .from('income_sources')
    .select('user_id, type, name, brand, balance')
    .eq('id', id)
    .single();
  if (beforeErr) throw beforeErr;

  const { data, error } = await supabase
    .from('income_sources')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Only a balance change is a money movement worth logging.
  if (patch.balance !== undefined && Number(patch.balance) !== Number(before.balance)) {
    await logIncomeTransaction({
      user_id: before.user_id,
      source_id: id,
      source_label: incomeSourceLabel(data),
      kind: 'edit',
      amount: Math.abs(Number(patch.balance) - Number(before.balance)),
      balance_before: Number(before.balance),
      balance_after: Number(patch.balance),
    });
  }
  return data;
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const { error } = await supabase.from('income_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function deductFromIncomeSource(
  id: string,
  amount: number,
  note?: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('user_id, type, name, brand, balance')
    .eq('id', id)
    .single();
  if (error) throw error;
  const balanceBefore = Number(data.balance);
  const { error: upErr } = await supabase
    .from('income_sources')
    .update({ balance: balanceBefore - amount })
    .eq('id', id);
  if (upErr) throw upErr;
  await logIncomeTransaction({
    user_id: data.user_id,
    source_id: id,
    source_label: incomeSourceLabel(data),
    kind: 'deduct',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceBefore - amount,
    note: note ?? null,
  });
}

export async function addToIncomeSource(
  id: string,
  amount: number,
  note?: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('user_id, type, name, brand, balance')
    .eq('id', id)
    .single();
  if (error) throw error;
  const balanceBefore = Number(data.balance);
  const { error: upErr } = await supabase
    .from('income_sources')
    .update({ balance: balanceBefore + amount })
    .eq('id', id);
  if (upErr) throw upErr;
  await logIncomeTransaction({
    user_id: data.user_id,
    source_id: id,
    source_label: incomeSourceLabel(data),
    kind: 'add',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceBefore + amount,
    note: note ?? null,
  });
}

export async function transferIncome(fromId: string, toId: string, amount: number): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('id, user_id, type, name, brand, balance')
    .in('id', [fromId, toId]);
  if (error) throw error;
  const from = data?.find((s) => s.id === fromId);
  const to = data?.find((s) => s.id === toId);
  if (!from || !to) throw new Error('Income source not found');

  const fromBefore = Number(from.balance);
  const { error: fromErr } = await supabase
    .from('income_sources')
    .update({ balance: fromBefore - amount })
    .eq('id', fromId);
  if (fromErr) throw fromErr;

  const { error: toErr } = await supabase
    .from('income_sources')
    .update({ balance: Number(to.balance) + amount })
    .eq('id', toId);
  if (toErr) throw toErr;

  await logIncomeTransaction({
    user_id: from.user_id,
    source_id: fromId,
    source_label: incomeSourceLabel(from),
    counterparty_id: toId,
    counterparty_label: incomeSourceLabel(to),
    kind: 'transfer',
    amount,
    balance_before: fromBefore,
    balance_after: fromBefore - amount,
  });
}

// ---------- Income Transactions (history) ----------

type IncomeTransactionLog = {
  user_id: string;
  source_id: string | null;
  source_label: string;
  kind: IncomeTransactionKind;
  amount: number;
  balance_before?: number | null;
  balance_after?: number | null;
  counterparty_id?: string | null;
  counterparty_label?: string | null;
  note?: string | null;
};

// Best-effort: the balance update is authoritative, so a history-write failure
// must never surface a false error after the money has already moved (and must
// not break income operations before the income_transactions migration is run).
async function logIncomeTransaction(entry: IncomeTransactionLog): Promise<void> {
  const { error } = await supabase.from('income_transactions').insert({
    user_id: entry.user_id,
    source_id: entry.source_id,
    source_label: entry.source_label,
    counterparty_id: entry.counterparty_id ?? null,
    counterparty_label: entry.counterparty_label ?? null,
    kind: entry.kind,
    amount: entry.amount,
    balance_before: entry.balance_before ?? null,
    balance_after: entry.balance_after ?? null,
    note: entry.note ?? null,
  });
  if (error) console.error('Failed to log income transaction', error);
}

// Mark transactions older than the 3-month cutoff as archived. Applied lazily
// when the history page loads, so no scheduled job is needed.
export async function archiveOldIncomeTransactions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('income_transactions')
    .update({ archived: true })
    .eq('user_id', userId)
    .eq('archived', false)
    .lt('created_at', archiveCutoff(new Date()).toISOString());
  if (error) throw error;
}

// Permanently delete transactions older than the 6-month cutoff. Applied lazily
// alongside archival, so no scheduled job is needed.
export async function deleteOldIncomeTransactions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('income_transactions')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', deleteCutoff(new Date()).toISOString());
  if (error) throw error;
}

export async function listIncomeTransactions(
  userId: string,
  includeArchived = false,
): Promise<IncomeTransaction[]> {
  let query = supabase
    .from('income_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!includeArchived) query = query.eq('archived', false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---------- Reminders ----------

export async function listReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('remind_date');
  if (error) throw error;
  return data ?? [];
}

export async function createReminder(input: ReminderInput, userId: string): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminder(
  id: string,
  patch: Partial<ReminderInput>,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;
}
