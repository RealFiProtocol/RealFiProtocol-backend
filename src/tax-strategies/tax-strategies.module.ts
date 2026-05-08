import { Module } from '@nestjs/common';
import { TaxStrategiesService } from './tax-strategies.service';
import { TaxStrategiesController } from './tax-strategies.controller';

@Module({
  providers: [TaxStrategiesService],
  controllers: [TaxStrategiesController],
})
export class TaxStrategiesModule {}
