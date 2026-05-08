import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DocumentsModule } from './documents/documents.module';
import { TaxStrategiesModule } from './tax-strategies/tax-strategies.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    TransactionsModule,
    DocumentsModule,
    TaxStrategiesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
