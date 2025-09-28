import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service';

async function testTwilio() {
  console.log('🧪 Testando integração com Twilio...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const whatsappService = app.get(WhatsAppService);

  try {
    // Testar envio de mensagem
    console.log('\n📤 Testando envio de mensagem...');
    
    // Substitua pelo seu número de WhatsApp para teste
    const testNumber = 'whatsapp:+553884117387'; // Substitua pelo seu número
    
    await whatsappService.sendMessage(
      testNumber,
      '🤖 Teste do MeuBolso.AI - Integração Twilio funcionando!'
    );
    
    console.log('✅ Mensagem de teste enviada com sucesso!');
    
    // Testar mensagens de confirmação
    console.log('\n📤 Testando mensagem de confirmação...');
    await whatsappService.sendExpenseConfirmation(
      testNumber,
      50.00,
      'Alimentação',
      'Mercado'
    );
    
    console.log('✅ Mensagem de confirmação enviada!');
    
    // Testar mensagem de ajuda
    console.log('\n📤 Testando mensagem de ajuda...');
    await whatsappService.sendHelpMessage(testNumber);
    
    console.log('✅ Mensagem de ajuda enviada!');
    
    console.log('\n🎉 Todos os testes do Twilio passaram!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\n💡 Verifique se:');
    console.log('1. As credenciais do Twilio estão corretas no .env');
    console.log('2. O número de teste está correto');
    console.log('3. O Twilio está configurado para WhatsApp');
  } finally {
    await app.close();
  }
}

testTwilio();
