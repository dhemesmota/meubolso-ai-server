import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { ExpensesService } from '../modules/expenses/expenses.service';
import { CategoriesService } from '../modules/categories/categories.service';

async function createTodayExpense() {
  console.log('💰 Criando despesa de hoje...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const expensesService = app.get(ExpensesService);
  const categoriesService = app.get(CategoriesService);

  try {
    // Buscar usuário
    const user = await usersService.findOrCreateByPhone('whatsapp:+553884117387');
    console.log('✅ Usuário encontrado:', user.id);

    // Buscar categoria
    let category = await categoriesService.findByName('Alimentação');
    if (!category) {
      category = await categoriesService.create({ name: 'Alimentação' });
    }
    console.log('✅ Categoria encontrada:', category.name);

    // Criar despesa de hoje
    const today = new Date().toISOString().split('T')[0];
    const expense = await expensesService.create({
      user_id: user.id,
      description: 'Teste de despesa de hoje',
      category_id: category.id,
      amount: 100.50,
      date: today,
    });

    console.log('✅ Despesa criada:', {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date
    });

    // Testar busca de despesas de hoje
    const todayExpenses = await expensesService.findByUserId(user.id, today, today);
    console.log(`\n📊 Despesas de hoje (${today}): ${todayExpenses.length}`);
    todayExpenses.forEach(expense => {
      console.log(`   - ${expense.description}: R$ ${expense.amount}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  await app.close();
  console.log('\n✅ Teste concluído!');
}

createTodayExpense().catch(console.error);
