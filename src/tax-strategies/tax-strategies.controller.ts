import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { TaxStrategiesService } from './tax-strategies.service';
import { CreateTaxStrategyDto, UpdateTaxStrategyDto } from './tax-strategies.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions/:transactionId/tax-strategies')
export class TaxStrategiesController {
  constructor(private taxStrategiesService: TaxStrategiesService) {}

  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @Post()
  create(@Param('transactionId') transactionId: string, @Body() dto: CreateTaxStrategyDto) {
    return this.taxStrategiesService.create(transactionId, dto);
  }

  @Get()
  findAll(@Param('transactionId') transactionId: string) {
    return this.taxStrategiesService.findByTransaction(transactionId);
  }

  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @Patch(':strategyId')
  update(
    @Param('transactionId') transactionId: string,
    @Param('strategyId') strategyId: string,
    @Body() dto: UpdateTaxStrategyDto,
  ) {
    return this.taxStrategiesService.update(transactionId, strategyId, dto);
  }
}
