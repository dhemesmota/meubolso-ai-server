import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseService } from '../common/services/supabase.service';
import { AIService } from '../modules/ai/ai.service';
import { WhatsAppProcessorService } from '../modules/whatsapp/whatsapp-processor.service';

async function debugIntegration() {
  console.log('🔍 Debug: Testando integração completa...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // 1. Testar Supabase
    console.log('\n1️⃣ Testando Supabase...');
    const supabaseService = app.get(SupabaseService);
    const { data: categories, error: catError } = await supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .limit(1);
    
    if (catError) {
      console.error('❌ Erro Supabase:', catError.message);
    } else {
      console.log('✅ Supabase OK:', categories?.length || 0, 'categorias');
    }

    // 2. Testar OpenAI
    console.log('\n2️⃣ Testando OpenAI...');
    const aiService = app.get(AIService);
    try {
      const aiResponse = await aiService.processMessage('gastei 50 no mercado');
      console.log('✅ OpenAI OK:', aiResponse);
    } catch (error) {
      console.error('❌ Erro OpenAI:', error.message);
    }

    // 3. Testar processamento completo
    console.log('\n3️⃣ Testando processamento completo...');
    const processorService = app.get(WhatsAppProcessorService);
    try {
      await processorService.processMessage('+553884117387', 'gastei 50 no mercado');
      console.log('✅ Processamento completo OK');
    } catch (error) {
      console.error('❌ Erro processamento:', error.message);
      console.error('Stack trace:', error.stack);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await app.close();
  }
}

debugIntegration();
