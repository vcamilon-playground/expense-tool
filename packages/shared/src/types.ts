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
  name: string | null;
  balance: number;
  created_at?: string;
};

export type IncomeSourceInput = Omit<IncomeSource, 'id' | 'user_id' | 'created_at'>;

export type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  birth_date: string | null; // ISO date (YYYY-MM-DD)
  accent_color?: string;     // 'default' | 'yellow' | 'green' | 'red' | 'orange' | 'violet'
  theme?: string;            // 'light' | 'dark'
  created_at?: string;
};
