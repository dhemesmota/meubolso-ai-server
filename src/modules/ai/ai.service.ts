import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
  date: string;
  isValid: boolean;
}

export interface AIResponse {
  type: 'expense' | 'report' | 'help' | 'unknown';
  data?: ParsedExpense;
  message?: string;
}

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processMessage(message: string): Promise<AIResponse> {
    try {
      // Detectar tipo de comando
      const command = this.detectCommand(message);
      
      if (command === 'help') {
        return { type: 'help' };
      }
      
      if (command === 'report') {
        return { type: 'report' };
      }
      
      if (command === 'expense') {
        const parsedExpense = await this.parseExpense(message);
        return { type: 'expense', data: parsedExpense };
      }
      
      return { type: 'unknown' };
    } catch (error) {
      console.error('❌ Erro ao processar mensagem com IA:', error);
      return { type: 'unknown' };
    }
  }

  private detectCommand(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
      return 'help';
    }
    
    if (lowerMessage.includes('relatório') || lowerMessage.includes('resumo') || lowerMessage.includes('relatorio')) {
      return 'report';
    }
    
    // Detectar se é uma despesa (contém números e palavras relacionadas a gastos)
    const expenseKeywords = ['gastei', 'paguei', 'comprei', 'gasto', 'despesa', 'valor', 'reais', 'r$'];
    const hasNumbers = /\d+/.test(message);
    const hasExpenseKeyword = expenseKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasNumbers && hasExpenseKeyword) {
      return 'expense';
    }
    
    return 'unknown';
  }

  private async parseExpense(message: string): Promise<ParsedExpense> {
    try {
      const prompt = `
Analise a seguinte mensagem e extraia informações sobre uma despesa.
Retorne APENAS um JSON válido com as seguintes chaves:
- amount: número (valor da despesa)
- category: string (categoria mais apropriada: Alimentação, Transporte, Moradia, Lazer, Saúde)
- description: string (descrição da despesa)
- date: string (data no formato YYYY-MM-DD, SEMPRE use o formato correto)
- isValid: boolean (true se conseguiu extrair informações válidas)

IMPORTANTE: A data deve SEMPRE estar no formato YYYY-MM-DD. Se não especificada, use a data de hoje.

Categorias disponíveis: Alimentação, Transporte, Moradia, Lazer, Saúde

Mensagem: "${message}"

Exemplo de resposta:
{
  "amount": 50,
  "category": "Alimentação", 
  "description": "mercado",
  "date": "2025-01-27",
  "isValid": true
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente que extrai informações de despesas de mensagens em português. Retorne apenas JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Resposta vazia da IA');
      }

      const parsed = JSON.parse(response);
      
      // Garantir que a data seja válida
      if (parsed.date === 'hoje' || parsed.date === 'today' || !parsed.date) {
        parsed.date = new Date().toISOString().split('T')[0];
      }
      
      return parsed as ParsedExpense;
    } catch (error) {
      console.error('❌ Erro ao fazer parse da despesa:', error);
      
      // Fallback: tentar extrair informações básicas com regex
      return this.fallbackParse(message);
    }
  }

  private fallbackParse(message: string): ParsedExpense {
    const lowerMessage = message.toLowerCase();
    
    // Extrair valor
    const amountMatch = message.match(/(\d+(?:[.,]\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
    
    // Detectar categoria por palavras-chave
    let category = 'Outros';
    if (lowerMessage.includes('mercado') || lowerMessage.includes('comida') || lowerMessage.includes('alimentação')) {
      category = 'Alimentação';
    } else if (lowerMessage.includes('uber') || lowerMessage.includes('transporte') || lowerMessage.includes('gasolina')) {
      category = 'Transporte';
    } else if (lowerMessage.includes('aluguel') || lowerMessage.includes('moradia') || lowerMessage.includes('casa')) {
      category = 'Moradia';
    } else if (lowerMessage.includes('lazer') || lowerMessage.includes('cinema') || lowerMessage.includes('diversão')) {
      category = 'Lazer';
    } else if (lowerMessage.includes('remédio') || lowerMessage.includes('saúde') || lowerMessage.includes('médico')) {
      category = 'Saúde';
    }
    
    // Extrair descrição
    const description = message.replace(/\d+/g, '').trim();
    
    return {
      amount,
      category,
      description: description || 'Despesa',
      date: new Date().toISOString().split('T')[0],
      isValid: amount > 0
    };
  }

  async generateReport(expenses: any[]): Promise<string> {
    try {
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const byCategory = expenses.reduce((acc, expense) => {
        const category = expense.categories?.name || 'Outros';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {});

      let report = `📊 Relatório Financeiro\n\n💰 Total gasto: R$ ${total.toFixed(2)}\n\n📂 Por categoria:\n`;
      
      Object.entries(byCategory).forEach(([category, amount]) => {
        const percentage = total > 0 ? ((amount as number) / total * 100).toFixed(1) : '0';
        report += `• ${category}: R$ ${(amount as number).toFixed(2)} (${percentage}%)\n`;
      });

      // Top 3 maiores despesas
      const topExpenses = expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      if (topExpenses.length > 0) {
        report += `\n🔝 Top 3 maiores despesas:\n`;
        topExpenses.forEach((expense, index) => {
          report += `${index + 1}. ${expense.description} - R$ ${expense.amount.toFixed(2)}\n`;
        });
      }

      return report;
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return '❌ Erro ao gerar relatório. Tente novamente.';
    }
  }
}
