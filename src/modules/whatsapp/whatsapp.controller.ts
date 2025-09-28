import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { WhatsAppProcessorService } from './whatsapp-processor.service';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly processorService: WhatsAppProcessorService,
  ) {}

  @Get('webhook')
  verifyWebhook() {
    // Twilio não precisa de verificação GET, apenas responde OK
    console.log('✅ Webhook Twilio acessado');
    return { status: 'ok' };
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    try {
      console.log('📨 Webhook Twilio recebido:', JSON.stringify(body, null, 2));

      // Twilio envia mensagens no formato diferente
      if (body.MessageSid && body.From && body.Body) {
        const message = {
          from: body.From,
          text: {
            body: body.Body
          }
        };
        
        await this.processMessage(message);
      }

      return { status: 'ok' };
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async processMessage(message: any) {
    const from = message.from;
    const text = message.text?.body;

    if (!text) {
      console.log('📨 Mensagem sem texto recebida');
      return;
    }

    console.log(`📨 Mensagem de ${from}: ${text}`);

    // Processar mensagem com IA e banco de dados
    await this.processorService.processMessage(from, text);
  }
}
