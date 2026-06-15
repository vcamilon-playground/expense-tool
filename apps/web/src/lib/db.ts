import type {
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  Expense,
  ExpenseInput,
  IncomeSource,
  IncomeSourceInput,
  RecurringExpense,
  RecurringInput,
  Reminder,
  ReminderInput,
} from '@expense/shared';
import { supabase } from './supabase';

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
  patch: Partial<Pick<IncomeSource, 'name' | 'balance'>>,
): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const { error } = await supabase.from('income_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function deductFromIncomeSource(id: string, amount: number): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('balance')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { error: upErr } = await supabase
    .from('income_sources')
    .update({ balance: Number(data.balance) - amount })
    .eq('id', id);
  if (upErr) throw upErr;
}

export async function addToIncomeSource(id: string, amount: number): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('balance')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { error: upErr } = await supabase
    .from('income_sources')
    .update({ balance: Number(data.balance) + amount })
    .eq('id', id);
  if (upErr) throw upErr;
}

export async function transferIncome(fromId: string, toId: string, amount: number): Promise<void> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('id, balance')
    .in('id', [fromId, toId]);
  if (error) throw error;
  const from = data?.find((s) => s.id === fromId);
  const to = data?.find((s) => s.id === toId);
  if (!from || !to) throw new Error('Income source not found');

  const { error: fromErr } = await supabase
    .from('income_sources')
    .update({ balance: Number(from.balance) - amount })
    .eq('id', fromId);
  if (fromErr) throw fromErr;

  const { error: toErr } = await supabase
    .from('income_sources')
    .update({ balance: Number(to.balance) + amount })
    .eq('id', toId);
  if (toErr) throw toErr;
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
