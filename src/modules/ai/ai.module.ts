import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIAdvancedService } from './ai-advanced.service';
import { SmartQueryService } from './smart-query.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { CategoriesModule } from '../categories/categories.module';
import { SupabaseService } from '../../common/services/supabase.service';

@Module({
  imports: [ExpensesModule, CategoriesModule],
  providers: [AIService, AIAdvancedService, SmartQueryService, SupabaseService],
  exports: [AIService, AIAdvancedService, SmartQueryService],
})
export class AIModule {}
