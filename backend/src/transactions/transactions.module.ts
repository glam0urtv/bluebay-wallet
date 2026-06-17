import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { NFCSessionsService } from './nfc-sessions.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, NFCSessionsService],
  exports: [TransactionsService, NFCSessionsService],
})
export class TransactionsModule {}
