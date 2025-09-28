import { Module } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { ExpensesService } from './expenses.service';

@Module({
  providers: [ExpensesService, SupabaseService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
