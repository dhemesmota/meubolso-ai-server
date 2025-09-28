export interface Expense {
  id: string;
  user_id: string;
  description: string;
  category_id: string;
  amount: number;
  date: string;
  created_at: string;
  categories?: {
    name: string;
  };
}

export interface CreateExpenseDto {
  user_id: string;
  description: string;
  category_id: string;
  amount: number;
  date: string;
}

export interface ExpenseReport {
  total: number;
  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
}
