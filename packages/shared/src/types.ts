export type Category = {
  id: string;
  name: string;
  icon: string | null;
  active: boolean;
  created_at?: string;
};

export type CategoryInput = Pick<Category, 'name' | 'icon'>;

export type ExpenseSource = 'manual' | 'receipt' | 'recurring';

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  conversion_rate: number | null; // rate to PHP; null when currency is already PHP
  category_id: string | null;
  merchant: string | null;
  description: string | null;
  occurred_at: string; // ISO date (YYYY-MM-DD)
  receipt_url: string | null;
  source: ExpenseSource;
  created_at?: string;
  updated_at?: string;
};

export type ExpenseInput = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;

export type Budget = {
  id: string;
  category_id: string | null; // null = overall budget
  monthly_limit: number;
  created_at?: string;
  updated_at?: string;
};

export type BudgetInput = Omit<Budget, 'id' | 'created_at' | 'updated_at'>;

export type RecurringCadence = 'weekly' | 'monthly' | 'yearly';

export type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  category_id: string | null;
  cadence: RecurringCadence;
  next_charge_date: string; // ISO date
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RecurringInput = Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>;

export type ReceiptExtraction = {
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  occurred_at: string | null;
  category_guess: string | null;
  description: string | null;
  confidence: 'low' | 'medium' | 'high';
};

export type MonthlyInsight = {
  month: string; // YYYY-MM
  total: number;
  headline: string;
  observations: string[];
  recommendations: string[];
};

export type IncomeType = 'bank' | 'ewallet' | 'cash';

export type IncomeSource = {
  id: string;
  user_id: string;
  type: IncomeType;
  name: string | null; // display alias (e.g. "Payroll"); falls back to brand
  brand: string | null; // canonical company (e.g. "BPI", "GCash") that drives the logo
  balance: number;
  created_at?: string;
};

export type IncomeSourceInput = Omit<IncomeSource, 'id' | 'user_id' | 'created_at'>;

// Money movements recorded against income sources. Rows are retained even after
// the source they reference is deleted (source_id becomes null, but the
// snapshot labels persist), and are archived after 3 months.
export type IncomeTransactionKind = 'deduct' | 'add' | 'transfer' | 'edit';

export type IncomeTransaction = {
  id: string;
  user_id: string;
  source_id: string | null; // null once the referenced source is deleted
  source_label: string; // snapshot of the source name, retained after deletion
  counterparty_id: string | null; // transfer destination (null otherwise)
  counterparty_label: string | null; // snapshot of the destination name
  kind: IncomeTransactionKind;
  amount: number; // positive magnitude of the movement
  balance_before: number | null; // source balance before the movement
  balance_after: number | null; // source balance after the movement
  note: string | null; // free context, e.g. the expense merchant for a deduction
  archived: boolean;
  created_at: string;
};

export type ReminderCadence = 'once' | 'weekly' | 'monthly' | 'yearly';

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  remind_date: string; // ISO date (YYYY-MM-DD)
  cadence: ReminderCadence;
  active: boolean;
  created_at?: string;
};

export type ReminderInput = Omit<Reminder, 'id' | 'user_id' | 'created_at'>;

export type User = {
  id: string;
  username: string;
  email?: string | null;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  birth_date: string | null; // ISO date (YYYY-MM-DD)
  accent_color?: string;     // 'default' | 'yellow' | 'green' | 'red' | 'orange' | 'violet'
  theme?: string;            // 'light' | 'dark'
  created_at?: string;
};
