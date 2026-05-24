import type {
  Budget,
  BudgetInput,
  Category,
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

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
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

export async function uploadReceipt(localUri: string, base64: string): Promise<string | null> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `r_${Date.now()}.${ext}`;
  const bytes = decode(base64);
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, bytes, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  if (error) {
    console.warn('receipt upload failed', error);
    return null;
  }
  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}

function decode(base64: string): Uint8Array {
  const binary = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
