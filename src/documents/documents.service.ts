import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDocumentDto, uploadedById: string) {
    return this.prisma.document.create({ data: { ...dto, uploadedById } });
  }

  findAll() {
    return this.prisma.document.findMany({
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const doc = await this.findOne(id);
    if (doc.uploadedById !== requesterId && requesterRole !== 'ADMIN')
      throw new ForbiddenException('Cannot delete this document');
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document deleted' };
  }
}
