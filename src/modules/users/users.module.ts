import { Module } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService, SupabaseService],
  exports: [UsersService],
})
export class UsersModule {}
