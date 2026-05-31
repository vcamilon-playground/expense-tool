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

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ active: false }).eq('id', id);
  if (error) throw error;
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(input).select().single();
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

export async function listBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(input, { onConflict: 'category_id' })
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

export async function listDueRecurring(asOf: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('active', true)
    .lte('next_charge_date', asOf)
    .order('next_charge_date');
  if (error) throw error;
  return data ?? [];
}

export async function listRecurring(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('next_charge_date');
  if (error) throw error;
  return data ?? [];
}

export async function createRecurring(input: RecurringInput): Promise<RecurringExpense> {
  const { data, error } = await supabase.from('recurring_expenses').insert(input).select().single();
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
