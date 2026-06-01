import type {
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  Expense,
  ExpenseInput,
  RecurringExpense,
  RecurringInput,
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
