import { Injectable } from '@nestjs/common';
import { AIResponse, AIService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import { ExpensesService } from '../expenses/expenses.service';
import { UsersService } from '../users/users.service';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class WhatsAppProcessorService {
  constructor(
    private whatsappService: WhatsAppService,
    private aiService: AIService,
    private usersService: UsersService,
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
  ) {}

  async processMessage(from: string, message: string): Promise<void> {
    try {
      console.log(`🤖 Processando mensagem de ${from}: ${message}`);

      // Processar mensagem com IA
      const aiResponse: AIResponse = await this.aiService.processMessage(message);

      switch (aiResponse.type) {
        case 'help':
          await this.handleHelpCommand(from);
          break;

        case 'report':
          await this.handleReportCommand(from);
          break;

        case 'expense':
          await this.handleExpenseCommand(from, aiResponse.data);
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

  private async handleReportCommand(from: string): Promise<void> {
    try {
      // Buscar usuário
      const user = await this.usersService.findOrCreateByPhone(from);
      
      // Buscar despesas do mês atual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const expenses = await this.expensesService.findByUserId(user.id);
      
      if (expenses.length === 0) {
        await this.whatsappService.sendMessage(from, '📊 Nenhuma despesa registrada este mês.');
        return;
      }

      // Gerar relatório
      const report = await this.aiService.generateReport(expenses);
      await this.whatsappService.sendReport(from, report);
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      await this.whatsappService.sendErrorMessage(from, 'Erro ao gerar relatório.');
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
