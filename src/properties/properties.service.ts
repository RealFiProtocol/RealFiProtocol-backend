import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePropertyDto, ownerId: string) {
    return this.prisma.property.create({ data: { ...dto, ownerId } });
  }

  findAll() {
    return this.prisma.property.findMany({ include: { owner: { select: { id: true, firstName: true, lastName: true } } } });
  }

  async findOne(id: string) {
    const p = await this.prisma.property.findUnique({
      where: { id },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  async update(id: string, dto: UpdatePropertyDto, requesterId: string, requesterRole: string) {
    const p = await this.findOne(id);
    if (p.ownerId !== requesterId && requesterRole !== 'ADMIN' && requesterRole !== 'AGENT')
      throw new ForbiddenException('Cannot update this property');
    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const p = await this.findOne(id);
    if (p.ownerId !== requesterId && requesterRole !== 'ADMIN')
      throw new ForbiddenException('Cannot delete this property');
    await this.prisma.property.delete({ where: { id } });
    return { message: 'Property deleted' };
  }
}
