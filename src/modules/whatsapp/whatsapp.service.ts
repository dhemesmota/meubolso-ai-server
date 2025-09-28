import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

export interface WhatsAppMessage {
  from: string;
  text: {
    body: string;
  };
}

@Injectable()
export class WhatsAppService {
  private readonly client: twilio.Twilio;
  private readonly whatsappNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.whatsappNumber =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      // Garantir que o número tenha o prefixo whatsapp:
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      await this.client.messages.create({
        from: this.whatsappNumber,
        to: formattedTo,
        body: message,
      });

      console.log(`✅ Mensagem enviada para ${formattedTo}: ${message}`);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
      throw new Error(`Falha ao enviar mensagem: ${error.message}`);
    }
  }

  async sendExpenseConfirmation(
    to: string,
    amount: number,
    category: string,
    description: string,
  ): Promise<void> {
    const message = `✅ Despesa registrada com sucesso!\n\n💰 Valor: R$ ${amount.toFixed(2)}\n📂 Categoria: ${category}\n📝 Descrição: ${description}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}`;
    await this.sendMessage(to, message);
  }

  async sendReport(to: string, report: string): Promise<void> {
    const message = `📊 Relatório Financeiro\n\n${report}`;
    await this.sendMessage(to, message);
  }

  async sendHelpMessage(to: string): Promise<void> {
    const message = `🤖 MeuBolso.AI - Assistente Financeiro\n\n📝 Como usar:\n• "gastei 50 no mercado" - Registra despesa\n• "relatório mês" - Gera relatório mensal\n• "resumo" - Resumo por categoria\n• "ajuda" - Mostra esta mensagem\n\n💡 Exemplos:\n• "gastei 25 no uber"\n• "paguei 1200 de aluguel"\n• "comprei remédio por 45"`;
    await this.sendMessage(to, message);
  }

  async sendErrorMessage(to: string, error: string): Promise<void> {
    const message = `❌ Erro: ${error}\n\n💡 Digite "ajuda" para ver os comandos disponíveis.`;
    await this.sendMessage(to, message);
  }
}
