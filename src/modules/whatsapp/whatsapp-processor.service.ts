import { Injectable } from '@nestjs/common';
import { AIAdvancedService } from '../ai/ai-advanced.service';
import { AIService } from '../ai/ai.service';
import { SmartQueryService } from '../ai/smart-query.service';
import { CategoriesService } from '../categories/categories.service';
import { ExpensesService } from '../expenses/expenses.service';
import { UsersService } from '../users/users.service';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class WhatsAppProcessorService {
  constructor(
    private whatsappService: WhatsAppService,
    private aiService: AIService,
    private aiAdvancedService: AIAdvancedService,
    private smartQueryService: SmartQueryService,
    private usersService: UsersService,
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
  ) {}

  async processMessage(from: string, message: string): Promise<void> {
    try {
      console.log(`🤖 Processando mensagem de ${from}: ${message}`);

      // Verificar se é múltiplas despesas primeiro
      const multipleExpenses = this.detectMultipleExpenses(message);
      if (multipleExpenses.length > 1) {
        console.log(`🔄 Detectadas ${multipleExpenses.length} despesas múltiplas`);
        await this.handleMultipleExpensesCommand(from, message);
        return;
      }

      // Usar IA avançada para processar mensagem
      const intelligentResponse = await this.aiAdvancedService.processIntelligentMessage(message);
      
      console.log('🧠 Resposta inteligente:', intelligentResponse);

      switch (intelligentResponse.type) {
        case 'help':
          await this.handleHelpCommand(from);
          break;

        case 'expense':
          await this.handleExpenseCommand(from, intelligentResponse.data);
          break;

        case 'report':
          await this.handleSmartReportCommand(from, intelligentResponse.queryParams);
          break;

        case 'question':
          await this.handleSmartQuestionCommand(from, intelligentResponse.message || '', intelligentResponse.queryParams);
          break;

        default:
          await this.handleUnknownCommand(from, message);
          break;
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro interno. Tente novamente.');
    }
  }

  private async handleHelpCommand(from: string): Promise<void> {
    await this.whatsappService.sendHelpMessage(from);
  }

  private async handleSmartReportCommand(from: string, queryParams: any): Promise<void> {
    try {
      // Buscar usuário
      const user = await this.usersService.findOrCreateByPhone(from);
      
      // Processar consulta inteligente com nome do usuário
      const result = await this.smartQueryService.processSmartQuery(
        user.id, 
        queryParams, 
        'report', 
        user.name || 'Dhemes'
      );
      
      if (result.success) {
        await this.whatsappService.sendMessage(from, result.data);
      } else {
        await this.whatsappService.sendErrorMessage(from, result.message || 'Erro ao gerar relatório.');
      }
    } catch (error) {
      console.error('❌ Erro ao gerar relatório inteligente:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro ao gerar relatório.');
    }
  }

  private async handleSmartQuestionCommand(from: string, intelligentMessage: string, queryParams: any): Promise<void> {
    try {
      // Enviar mensagem inteligente primeiro
      if (intelligentMessage) {
        await this.whatsappService.sendMessage(from, intelligentMessage);
      }
      
      // Buscar usuário
      const user = await this.usersService.findOrCreateByPhone(from);
      
      // Processar pergunta inteligente com nome do usuário
      const result = await this.smartQueryService.processSmartQuery(
        user.id, 
        queryParams, 
        'question', 
        user.name || 'Dhemes'
      );
      
      if (result.success && result.message) {
        await this.whatsappService.sendMessage(from, result.message);
      }
    } catch (error) {
      console.error('❌ Erro ao processar pergunta inteligente:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro ao processar pergunta.');
    }
  }

  private async handleExpenseCommand(from: string, expenseData: any): Promise<void> {
    try {
      if (!expenseData || !expenseData.isValid) {
        await this.whatsappService.sendErrorMessage(from, 'Não consegui entender a despesa. Tente: "gastei 50 no mercado"');
        return;
      }

      // Buscar ou criar usuário
      const user = await this.usersService.findOrCreateByPhone(from);
      
      // Buscar categoria
      let category = await this.categoriesService.findByName(expenseData.category);
      if (!category) {
        // Criar categoria se não existir
        category = await this.categoriesService.create({ name: expenseData.category });
      }

      // Criar despesa
      const expense = await this.expensesService.create({
        user_id: user.id,
        description: expenseData.description,
        category_id: category.id,
        amount: expenseData.amount,
        date: expenseData.date,
      });

      // Enviar confirmação
      await this.whatsappService.sendExpenseConfirmation(
        from,
        expense.amount,
        category.name,
        expense.description
      );

      console.log(`✅ Despesa registrada: ${expense.description} - R$ ${expense.amount}`);
    } catch (error) {
      console.error('❌ Erro ao registrar despesa:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro ao registrar despesa.');
    }
  }

  private async handleMultipleExpensesCommand(from: string, message: string): Promise<void> {
    try {
      console.log(`🔄 Processando múltiplas despesas: ${message}`);
      
      // Detectar múltiplas despesas na mensagem
      const expensePatterns = this.detectMultipleExpenses(message);
      
      if (expensePatterns.length === 0) {
        await this.whatsappService.sendErrorMessage(from, 'Não consegui identificar despesas na mensagem.');
        return;
      }

      // Buscar ou criar usuário
      const user = await this.usersService.findOrCreateByPhone(from);
      
      let successCount = 0;
      let totalAmount = 0;
      const registeredExpenses: Array<{description: string, amount: number, category: string}> = [];

      // Processar cada despesa
      for (const expenseText of expensePatterns) {
        try {
          // Usar IA para processar cada despesa individual
          const expenseData = await this.aiAdvancedService.parseExpense(expenseText);
          
          if (expenseData && expenseData.isValid) {
            // Buscar categoria
            let category = await this.categoriesService.findByName(expenseData.category);
            if (!category) {
              category = await this.categoriesService.create({ name: expenseData.category });
            }

            // Criar despesa
            const expense = await this.expensesService.create({
              user_id: user.id,
              description: expenseData.description,
              category_id: category.id,
              amount: expenseData.amount,
              date: expenseData.date,
            });

            registeredExpenses.push({
              description: expense.description,
              amount: expense.amount,
              category: category.name
            });

            successCount++;
            totalAmount += expense.amount;
            
            console.log(`✅ Despesa registrada: ${expense.description} - R$ ${expense.amount}`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar despesa "${expenseText}":`, error);
        }
      }

      // Enviar resumo das despesas registradas
      if (successCount > 0) {
        let summary = `✅ ${successCount} despesa(s) registrada(s) com sucesso!\n\n`;
        summary += `💰 Total: R$ ${totalAmount.toFixed(2)}\n\n`;
        
        registeredExpenses.forEach((expense, index) => {
          summary += `${index + 1}. ${expense.description} - R$ ${expense.amount.toFixed(2)} (${expense.category})\n`;
        });

        await this.whatsappService.sendMessage(from, summary);
      } else {
        await this.whatsappService.sendErrorMessage(from, 'Nenhuma despesa válida foi encontrada na mensagem.');
      }
    } catch (error) {
      console.error('❌ Erro ao processar múltiplas despesas:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro ao processar despesas.');
    }
  }

  private detectMultipleExpenses(message: string): string[] {
    // Detectar padrões de múltiplas despesas
    const patterns: string[] = [];
    
    // Primeiro, verificar se há múltiplas despesas separadas por vírgula
    const commaCount = (message.match(/,/g) || []).length;
    if (commaCount > 0 && message.includes('gastei')) {
      // Dividir por vírgula e filtrar apenas as que contêm "gastei"
      const parts = message.split(',').map(part => part.trim());
      const expenseParts = parts.filter(part => part.toLowerCase().includes('gastei'));
      if (expenseParts.length > 1) {
        patterns.push(...expenseParts);
        return patterns;
      }
    }
    
    // Verificar se há múltiplas despesas separadas por ponto
    const dotCount = (message.match(/\./g) || []).length;
    if (dotCount > 0 && message.includes('gastei')) {
      // Dividir por ponto e filtrar apenas as que contêm "gastei"
      const parts = message.split('.').map(part => part.trim());
      const expenseParts = parts.filter(part => part.toLowerCase().includes('gastei'));
      if (expenseParts.length > 1) {
        patterns.push(...expenseParts);
        return patterns;
      }
    }
    
    // Verificar se há múltiplas despesas separadas por quebra de linha
    const newlineCount = (message.match(/\n/g) || []).length;
    if (newlineCount > 0 && message.includes('gastei')) {
      // Dividir por quebra de linha e filtrar apenas as que contêm "gastei"
      const parts = message.split('\n').map(part => part.trim());
      const expenseParts = parts.filter(part => part.toLowerCase().includes('gastei'));
      if (expenseParts.length > 1) {
        patterns.push(...expenseParts);
        return patterns;
      }
    }
    
    // Se não encontrou padrões múltiplos, verificar se é uma despesa única
    if (patterns.length === 0) {
      const singlePattern = /gastei\s+\d+(?:[.,]\d{2})?\s+[^,.\n]+/gi;
      const singleMatch = message.match(singlePattern);
      if (singleMatch) {
        patterns.push(...singleMatch);
      }
    }
    
    return patterns.map(pattern => pattern.trim());
  }

  private async handleUnknownCommand(from: string, message: string): Promise<void> {
    await this.whatsappService.sendMessage(
      from,
      `🤔 Não entendi: "${message}"\n\n💡 Digite "ajuda" para ver os comandos disponíveis.`
    );
  }
}
