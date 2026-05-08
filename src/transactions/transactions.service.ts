import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './transactions.dto';

const INCLUDE = {
  property: { select: { id: true, title: true, address: true } },
  buyer: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTransactionDto, buyerId: string) {
    return this.prisma.transaction.create({
      data: { ...dto, buyerId },
      include: INCLUDE,
    });
  }

  findAll() {
    return this.prisma.transaction.findMany({ include: INCLUDE });
  }

  async findOne(id: string) {
    const t = await this.prisma.transaction.findUnique({ where: { id }, include: INCLUDE });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  async update(id: string, dto: UpdateTransactionDto, requesterId: string, requesterRole: string) {
    const t = await this.findOne(id);
    if (t.buyerId !== requesterId && requesterRole !== 'ADMIN' && requesterRole !== 'AGENT')
      throw new ForbiddenException('Cannot update this transaction');
    return this.prisma.transaction.update({ where: { id }, data: dto, include: INCLUDE });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const t = await this.findOne(id);
    if (t.buyerId !== requesterId && requesterRole !== 'ADMIN')
      throw new ForbiddenException('Cannot delete this transaction');
    await this.prisma.transaction.delete({ where: { id } });
    return { message: 'Transaction deleted' };
  }
}
