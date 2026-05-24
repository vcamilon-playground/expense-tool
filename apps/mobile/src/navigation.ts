import type { Expense, ReceiptExtraction } from '@expense/shared';

export type RootStackParamList = {
  ExpensesList: undefined;
  AddExpense: { editing?: Expense; prefill?: ReceiptExtraction } | undefined;
  ScanReceipt: undefined;
};
