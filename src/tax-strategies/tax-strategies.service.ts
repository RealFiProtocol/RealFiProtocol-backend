import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaxStrategyDto, UpdateTaxStrategyDto } from './tax-strategies.dto';

@Injectable()
export class TaxStrategiesService {
  constructor(private prisma: PrismaService) {}

  async create(transactionId: string, dto: CreateTaxStrategyDto) {
    // Verify transaction exists
    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.prisma.taxStrategy.create({ data: { ...dto, transactionId } });
  }

  async findByTransaction(transactionId: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.prisma.taxStrategy.findMany({ where: { transactionId } });
  }

  async update(transactionId: string, strategyId: string, dto: UpdateTaxStrategyDto) {
    const s = await this.prisma.taxStrategy.findFirst({ where: { id: strategyId, transactionId } });
    if (!s) throw new NotFoundException('Tax strategy not found');
    return this.prisma.taxStrategy.update({ where: { id: strategyId }, data: dto });
  }
}
