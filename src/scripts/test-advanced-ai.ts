import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIAdvancedService } from '../modules/ai/ai-advanced.service';
import { SmartQueryService } from '../modules/ai/smart-query.service';

async function testAdvancedAI() {
  console.log('🧠 Testando IA Avançada...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const aiAdvancedService = app.get(AIAdvancedService);
  const smartQueryService = app.get(SmartQueryService);

  // Testes de análise de intenção
  const testMessages = [
    'gastei 50 no mercado',
    'quanto gastei hoje',
    'quanto gastei esse mês',
    'qual minha maior despesa',
    'relatório da semana',
    'quanto gastei em alimentação',
    'ajuda',
    'resumo dos gastos'
  ];

  console.log('🔍 Testando análise de intenção:');
  for (const message of testMessages) {
    try {
      const response = await aiAdvancedService.processIntelligentMessage(message);
      console.log(`\n📝 "${message}"`);
      console.log(`   Tipo: ${response.type}`);
      console.log(`   Mensagem: ${response.message || 'N/A'}`);
      console.log(`   Query Params: ${JSON.stringify(response.queryParams || {})}`);
    } catch (error) {
      console.error(`❌ Erro ao processar "${message}":`, error.message);
    }
  }

  // Teste de consulta inteligente
  console.log('\n\n🔍 Testando consulta inteligente:');
  try {
    const result = await smartQueryService.processSmartQuery(
      'test-user-id',
      { period: 'month' },
      'report'
    );
    console.log('✅ Resultado da consulta:', result);
  } catch (error) {
    console.error('❌ Erro na consulta:', error.message);
  }

  await app.close();
  console.log('\n✅ Teste concluído!');
}

testAdvancedAI().catch(console.error);
