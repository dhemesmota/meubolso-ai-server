import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoriesService } from '../modules/categories/categories.service';

async function seedCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoriesService = app.get(CategoriesService);

  try {
    console.log('🌱 Seeding initial categories...');
    await categoriesService.seedInitialCategories();
    console.log('✅ Categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await app.close();
  }
}

seedCategories();
