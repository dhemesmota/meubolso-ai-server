import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { ExpensesService } from '../expenses/expenses.service';
import { CategoriesService } from '../categories/categories.service';

export interface SmartQueryResult {
  success: boolean;
  data?: any;
  message?: string;
  type: 'expense' | 'report' | 'question' | 'help';
}

@Injectable()
export class SmartQueryService {
  constructor(
    private supabaseService: SupabaseService,
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
  ) {}

  async processSmartQuery(userId: string, queryParams: any, questionType: string, userName?: string): Promise<SmartQueryResult> {
    try {
      console.log('🔍 Processando consulta inteligente:', { userId, queryParams, questionType, userName });

      switch (questionType) {
        case 'report':
          return await this.processReportQuery(userId, queryParams, userName);
        
        case 'question':
          return await this.processQuestionQuery(userId, queryParams, userName);
        
        default:
          return {
            success: false,
            message: 'Tipo de consulta não reconhecido',
            type: 'question'
          };
      }
    } catch (error) {
      console.error('❌ Erro no processamento de consulta:', error);
      return {
        success: false,
        message: 'Erro ao processar consulta',
        type: 'question'
      };
    }
  }

  private async processReportQuery(userId: string, queryParams: any, userName?: string): Promise<SmartQueryResult> {
    try {
      const { period, startDate, endDate, category } = queryParams;
      
      let expenses;
      
      if (period === 'today') {
        const today = new Date().toISOString().split('T')[0];
        expenses = await this.expensesService.findByUserId(userId, today, today);
      } else if (period === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        expenses = await this.expensesService.findByUserId(userId, weekAgo, today);
      } else if (period === 'month') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        expenses = await this.expensesService.findByUserId(userId);
        // Filtrar por mês atual
        expenses = expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
        });
      } else if (startDate && endDate) {
        expenses = await this.expensesService.findByUserId(userId, startDate, endDate);
      } else {
        expenses = await this.expensesService.findByUserId(userId);
      }

      // Filtrar por categoria se especificada
      if (category) {
        const categoryObj = await this.categoriesService.findByName(category);
        if (categoryObj) {
          expenses = expenses.filter(expense => expense.category_id === categoryObj.id);
        }
      }

      const report = await this.generateSmartReport(expenses, queryParams, userName);
      
      return {
        success: true,
        data: report,
        type: 'report'
      };
    } catch (error) {
      console.error('❌ Erro ao processar relatório:', error);
      return {
        success: false,
        message: 'Erro ao gerar relatório',
        type: 'report'
      };
    }
  }

  private async processQuestionQuery(userId: string, queryParams: any, userName?: string): Promise<SmartQueryResult> {
    try {
      const expenses = await this.expensesService.findByUserId(userId);
      
      // Analisar a pergunta e gerar resposta inteligente
      const answer = await this.generateSmartAnswer(expenses, queryParams);
      
      return {
        success: true,
        message: answer,
        type: 'question'
      };
    } catch (error) {
      console.error('❌ Erro ao processar pergunta:', error);
      return {
        success: false,
        message: 'Erro ao processar pergunta',
        type: 'question'
      };
    }
  }

  private async generateSmartReport(expenses: any[], queryParams: any, userName?: string): Promise<string> {
    if (expenses.length === 0) {
      const greeting = userName ? `Olá ${userName}! ` : '';
      return `${greeting}📊 Nenhuma despesa encontrada no período especificado.`;
    }

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

    // Gerar relatório personalizado e humano
    const greeting = userName ? `Olá ${userName}! ` : '';
    const period = this.getPeriodDescription(queryParams);
    
    let report = `${greeting}📊 Relatório Financeiro - ${period}\n\n`;
    
    // Introdução personalizada
    if (userName) {
      report += `💰 ${userName}, você gastou R$ ${total.toFixed(2)} ${period.toLowerCase()}.\n\n`;
    } else {
      report += `💰 Total gasto: R$ ${total.toFixed(2)}\n\n`;
    }

    // Detalhamento por categoria
    report += `📂 Detalhamento por categoria:\n`;
    byCategory.forEach(({ category, amount, percentage }) => {
      const emoji = this.getCategoryEmoji(category);
      report += `${emoji} ${category}: R$ ${amount.toFixed(2)} (${percentage.toFixed(1)}%)\n`;
    });

    // Top despesas
    if (topExpenses.length > 0) {
      report += `\n🔝 Maiores despesas:\n`;
      topExpenses.forEach((expense, index) => {
        report += `${index + 1}. ${expense.description} - R$ ${expense.amount.toFixed(2)}\n`;
      });
    }

    // Insights mais sugestivos
    const insights = this.generatePersonalizedInsights(expenses, byCategory, total, userName);
    if (insights) {
      report += `\n💡 ${insights}`;
    }

    return report;
  }

  private async generateSmartAnswer(expenses: any[], queryParams: any): Promise<string> {
    if (expenses.length === 0) {
      return '📊 Nenhuma despesa registrada ainda.';
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const avgPerDay = total / 30; // Média por dia (assumindo mês)
    
    // Maior despesa
    const maxExpense = expenses.reduce((max, expense) => 
      expense.amount > max.amount ? expense : max, expenses[0]);
    
    // Categoria com mais gastos
    const categoryMap = new Map<string, number>();
    expenses.forEach(expense => {
      const categoryName = expense.categories?.name || 'Outros';
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + expense.amount);
    });
    
    const topCategory = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])[0];

    let answer = `📊 Resumo dos seus gastos:\n\n`;
    answer += `💰 Total: R$ ${total.toFixed(2)}\n`;
    answer += `📈 Média diária: R$ ${avgPerDay.toFixed(2)}\n`;
    answer += `🔝 Maior despesa: ${maxExpense.description} - R$ ${maxExpense.amount.toFixed(2)}\n`;
    
    if (topCategory) {
      answer += `📂 Categoria principal: ${topCategory[0]} (R$ ${topCategory[1].toFixed(2)})\n`;
    }

    // Adicionar insights
    const insights = this.generateInsights(expenses, Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100
    })), total);
    
    if (insights) {
      answer += `\n💡 ${insights}`;
    }

    return answer;
  }

  private getPeriodDescription(queryParams: any): string {
    if (queryParams.period === 'today') return 'Hoje';
    if (queryParams.period === 'week') return 'Esta Semana';
    if (queryParams.period === 'month') return 'Este Mês';
    if (queryParams.period === 'year') return 'Este Ano';
    return 'Período Específico';
  }

  private getCategoryEmoji(category: string): string {
    const emojiMap: { [key: string]: string } = {
      'Alimentação': '🍽️',
      'Transporte': '🚗',
      'Moradia': '🏠',
      'Lazer': '🎬',
      'Saúde': '🏥',
      'Educação': '📚',
      'Vestuário': '👕',
      'Outros': '📦'
    };
    return emojiMap[category] || '📦';
  }

  private generatePersonalizedInsights(expenses: any[], byCategory: any[], total: number, userName?: string): string {
    const insights: string[] = [];
    const name = userName || 'você';
    
    // Insight sobre categoria dominante
    if (byCategory.length > 0) {
      const topCategory = byCategory[0];
      if (topCategory.percentage > 50) {
        insights.push(`${name} está gastando muito com ${topCategory.category} (${topCategory.percentage.toFixed(1)}%). Considere diversificar seus gastos.`);
      } else if (topCategory.percentage > 30) {
        insights.push(`${topCategory.category} é sua principal categoria de gastos (${topCategory.percentage.toFixed(1)}%).`);
      }
    }
    
    // Insight sobre frequência
    const today = new Date();
    const thisWeek = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const diffTime = today.getTime() - expenseDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
    
    if (thisWeek.length > 5) {
      insights.push(`${name} tem feito muitas despesas esta semana (${thisWeek.length}). Que tal planejar melhor os gastos?`);
    }
    
    // Insight sobre valores
    const avgExpense = total / expenses.length;
    if (avgExpense > 200) {
      insights.push(`Suas despesas têm valores altos em média (R$ ${avgExpense.toFixed(2)}). Considere buscar alternativas mais econômicas.`);
    } else if (avgExpense < 50) {
      insights.push(`Ótimo controle! Suas despesas têm valores moderados (R$ ${avgExpense.toFixed(2)} em média).`);
    }
    
    // Sugestões baseadas nos gastos
    if (byCategory.length > 0) {
      const foodCategory = byCategory.find(cat => cat.category === 'Alimentação');
      if (foodCategory && foodCategory.percentage > 40) {
        insights.push(`Dica: ${foodCategory.percentage.toFixed(1)}% em alimentação é alto. Que tal cozinhar mais em casa?`);
      }
      
      const transportCategory = byCategory.find(cat => cat.category === 'Transporte');
      if (transportCategory && transportCategory.percentage > 30) {
        insights.push(`Transporte representa ${transportCategory.percentage.toFixed(1)}%. Considere usar transporte público ou carona.`);
      }
    }
    
    return insights.join(' ');
  }

  private generateInsights(expenses: any[], byCategory: any[], total: number): string {
    const insights: string[] = [];
    
    // Insight sobre categoria dominante
    if (byCategory.length > 0) {
      const topCategory = byCategory[0];
      if (topCategory.percentage > 50) {
        insights.push(`${topCategory.category} representa ${topCategory.percentage.toFixed(1)}% dos seus gastos`);
      }
    }
    
    // Insight sobre frequência
    const today = new Date();
    const thisWeek = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const diffTime = today.getTime() - expenseDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
    
    if (thisWeek.length > 5) {
      insights.push('Você tem feito muitas despesas esta semana');
    }
    
    // Insight sobre valores
    const avgExpense = total / expenses.length;
    if (avgExpense > 100) {
      insights.push('Suas despesas têm valores altos em média');
    }
    
    return insights.join('. ');
  }
}
