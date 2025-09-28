import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppProcessorService } from '../modules/whatsapp/whatsapp-processor.service';

async function testServer() {
  console.log('🚀 Testando servidor MeuBolso.AI...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const processorService = app.get(WhatsAppProcessorService);

  try {
    // Testar processamento de mensagens
    console.log('\n🧪 Testando processamento de mensagens...');
    
    const testMessages = [
      'gastei 50 no mercado',
      'paguei 25 de uber',
      'relatório mês',
      'ajuda'
    ];

    for (const message of testMessages) {
      console.log(`\n📨 Testando: "${message}"`);
      try {
        await processorService.processMessage('+553884117387', message);
        console.log('✅ Processado com sucesso');
      } catch (error) {
        console.log('❌ Erro:', error.message);
      }
    }

    console.log('\n🎉 Teste do servidor concluído!');
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await app.close();
  }
}

testServer();
