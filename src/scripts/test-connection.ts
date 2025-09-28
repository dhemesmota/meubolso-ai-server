import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseService } from '../common/services/supabase.service';

async function testConnection() {
  console.log('🔌 Testando configuração do Supabase...');
  
  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    console.log('❌ SUPABASE_URL não configurada no arquivo .env');
    console.log('📝 Configure a URL do seu projeto Supabase no arquivo .env');
    console.log('📖 Veja o guia em: backend/docs/SUPABASE_SETUP.md');
    return;
  }
  
  if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
    console.log('❌ SUPABASE_ANON_KEY não configurada no arquivo .env');
    console.log('📝 Configure a chave anon do seu projeto Supabase no arquivo .env');
    console.log('📖 Veja o guia em: backend/docs/SUPABASE_SETUP.md');
    return;
  }

  console.log('✅ Variáveis de ambiente configuradas');
  console.log('🔗 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const supabaseService = app.get(SupabaseService);

    console.log('\n🔌 Testando conexão com Supabase...');
    
    // Testar conexão básica
    const { data, error } = await supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      console.log('💡 Dica: Execute os scripts SQL no Supabase Dashboard');
      return;
    }

    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    console.log('📊 Dados encontrados:', data?.length || 0, 'categorias');
    
    // Testar inserção de usuário
    console.log('\n🧪 Testando inserção de usuário...');
    const { data: userData, error: userError } = await supabaseService
      .getClient()
      .from('users')
      .insert([{ phone: '+553884117387', name: 'Teste' }])
      .select()
      .single();

    if (userError) {
      console.error('❌ Erro ao inserir usuário:', userError.message);
    } else {
      console.log('✅ Usuário inserido com sucesso:', userData);
      
      // Limpar usuário de teste
      await supabaseService
        .getClient()
        .from('users')
        .delete()
        .eq('id', userData.id);
      console.log('🧹 Usuário de teste removido');
    }

    await app.close();
    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('💡 Verifique se as tabelas foram criadas no Supabase');
  }
}

testConnection();
