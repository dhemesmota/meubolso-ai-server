import { Injectable } from '@nestjs/common';
import { CreateExpenseDto, Expense, ExpenseReport } from '../../common/interfaces/expense.interface';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class ExpensesService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .insert([createExpenseDto])
      .select(`
        *,
        categories(name)
      `)
      .single();

    if (error) {
      throw new Error(`Error creating expense: ${error.message}`);
    }

    return data;
  }

  async findByUserId(userId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    let query = this.supabaseService
      .getClient()
      .from('expenses')
      .select(`
        *,
        categories(name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching expenses: ${error.message}`);
    }

    return data || [];
  }

  async getMonthlyReport(userId: string, year: number, month: number): Promise<ExpenseReport> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const expenses = await this.findByUserId(userId, startDate, endDate);

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Agrupar por categoria
    const categoryMap = new Map<string, number>();
    expenses.forEach(expense => {
      const categoryName = expense.categories?.name || 'Outros';
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + expense.amount);
    });

    const byCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // Top 3 maiores despesas
    const topExpenses = expenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map(expense => ({
        description: expense.description,
        amount: expense.amount,
        date: expense.date
      }));

    return {
      total,
      byCategory,
      topExpenses
    };
  }
}
