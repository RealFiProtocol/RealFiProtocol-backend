import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './users.dto';

const SELECT = { id: true, email: true, firstName: true, lastName: true, role: true, isBlocked: true, createdAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SELECT });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    await this.findOne(id);
    if (requesterId !== id && requesterRole !== 'ADMIN')
      throw new ForbiddenException('Cannot update another user');
    // Only admins can change role or block status
    if ((dto.role || dto.isBlocked !== undefined) && requesterRole !== 'ADMIN')
      throw new ForbiddenException('Insufficient permissions');
    return this.prisma.user.update({ where: { id }, data: dto, select: SELECT });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}
