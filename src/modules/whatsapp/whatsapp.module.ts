import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { UsersModule } from '../users/users.module';
import { WhatsAppProcessorService } from './whatsapp-processor.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [UsersModule, ExpensesModule, CategoriesModule, AIModule],
  providers: [WhatsAppService, WhatsAppProcessorService],
  controllers: [WhatsAppController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
