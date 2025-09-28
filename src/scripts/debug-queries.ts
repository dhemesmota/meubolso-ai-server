import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { ExpensesService } from '../modules/expenses/expenses.service';
import { SmartQueryService } from '../modules/ai/smart-query.service';

async function debugQueries() {
  console.log('🔍 Debug: Testando consultas...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const expensesService = app.get(ExpensesService);
  const smartQueryService = app.get(SmartQueryService);

  try {
    // 1. Testar busca de usuário
    console.log('1️⃣ Testando busca de usuário...');
    const user = await usersService.findOrCreateByPhone('whatsapp:+553884117387');
    console.log('✅ Usuário encontrado:', user);

    // 2. Testar busca de despesas
    console.log('\n2️⃣ Testando busca de despesas...');
    const expenses = await expensesService.findByUserId(user.id);
    console.log(`✅ Despesas encontradas: ${expenses.length}`);
    expenses.forEach(expense => {
      console.log(`   - ${expense.description}: R$ ${expense.amount} (${expense.date})`);
    });

    // 3. Testar consulta inteligente - hoje
    console.log('\n3️⃣ Testando consulta "hoje"...');
    const todayResult = await smartQueryService.processSmartQuery(
      user.id,
      { period: 'today' },
      'report'
    );
    console.log('✅ Resultado hoje:', todayResult);

    // 4. Testar consulta inteligente - mês
    console.log('\n4️⃣ Testando consulta "mês"...');
    const monthResult = await smartQueryService.processSmartQuery(
      user.id,
      { period: 'month' },
      'report'
    );
    console.log('✅ Resultado mês:', monthResult);

    // 5. Testar busca por data específica
    console.log('\n5️⃣ Testando busca por data específica...');
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = await expensesService.findByUserId(user.id, today, today);
    console.log(`✅ Despesas de hoje (${today}): ${todayExpenses.length}`);
    todayExpenses.forEach(expense => {
      console.log(`   - ${expense.description}: R$ ${expense.amount}`);
    });

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }

  await app.close();
  console.log('\n✅ Debug concluído!');
}

debugQueries().catch(console.error);
