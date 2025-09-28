import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIAdvancedService } from '../modules/ai/ai-advanced.service';
import { SmartQueryService } from '../modules/ai/smart-query.service';
import { UsersService } from '../modules/users/users.service';

async function testPersonalizedAI() {
  console.log('🧠 Testando IA Personalizada...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const aiAdvancedService = app.get(AIAdvancedService);
  const smartQueryService = app.get(SmartQueryService);
  const usersService = app.get(UsersService);

  try {
    // Buscar usuário
    const user = await usersService.findOrCreateByPhone('whatsapp:+553884117387');
    console.log('✅ Usuário encontrado:', user.name || 'Dhemes');

    // Teste 1: Formatação e conversão de moedas
    console.log('\n1️⃣ Testando formatação e conversão de moedas:');
    const testMessages = [
      'gastei 50 dolares no uber',
      'paguei $25 no mercado',
      'comprei algo por 100 usd',
      'gastei 50 reais no supermercado'
    ];

    for (const message of testMessages) {
      try {
        const result = await aiAdvancedService.parseExpense(message);
        console.log(`\n📝 "${message}"`);
        console.log(`   Valor: R$ ${result.amount}`);
        console.log(`   Descrição: ${result.description}`);
        console.log(`   Categoria: ${result.category}`);
        console.log(`   Data: ${result.date}`);
      } catch (error) {
        console.error(`❌ Erro ao processar "${message}":`, error.message);
      }
    }

    // Teste 2: Relatório personalizado
    console.log('\n\n2️⃣ Testando relatório personalizado:');
    try {
      const result = await smartQueryService.processSmartQuery(
        user.id,
        { period: 'today' },
        'report',
        user.name || 'Dhemes'
      );
      
      if (result.success) {
        console.log('✅ Relatório personalizado:');
        console.log(result.data);
      } else {
        console.log('❌ Erro no relatório:', result.message);
      }
    } catch (error) {
      console.error('❌ Erro no teste de relatório:', error.message);
    }

    // Teste 3: Análise de intenção melhorada
    console.log('\n\n3️⃣ Testando análise de intenção:');
    const testQueries = [
      'quanto gastei hoje',
      'relatório do mês',
      'qual minha maior despesa',
      'resumo dos gastos'
    ];

    for (const query of testQueries) {
      try {
        const response = await aiAdvancedService.processIntelligentMessage(query);
        console.log(`\n📝 "${query}"`);
        console.log(`   Tipo: ${response.type}`);
        console.log(`   Mensagem: ${response.message || 'N/A'}`);
        console.log(`   Query Params: ${JSON.stringify(response.queryParams || {})}`);
      } catch (error) {
        console.error(`❌ Erro ao processar "${query}":`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }

  await app.close();
  console.log('\n✅ Teste concluído!');
}

testPersonalizedAI().catch(console.error);
