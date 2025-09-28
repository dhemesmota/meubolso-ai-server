import { Module } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { CategoriesService } from './categories.service';

@Module({
  providers: [CategoriesService, SupabaseService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
