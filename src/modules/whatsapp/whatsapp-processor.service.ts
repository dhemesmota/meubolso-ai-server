import { Injectable } from '@nestjs/common';
import { AIResponse, AIService } from '../ai/ai.service';
import { AIAdvancedService } from '../ai/ai-advanced.service';
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
      
      // Processar consulta inteligente
      const result = await this.smartQueryService.processSmartQuery(user.id, queryParams, 'report');
      
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
      
      // Processar pergunta inteligente
      const result = await this.smartQueryService.processSmartQuery(user.id, queryParams, 'question');
      
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

  private async handleUnknownCommand(from: string, message: string): Promise<void> {
    await this.whatsappService.sendMessage(
      from,
      `🤔 Não entendi: "${message}"\n\n💡 Digite "ajuda" para ver os comandos disponíveis.`
    );
  }
}
