import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    scopeWhere: Prisma.CustomerWhereInput,
    query: QueryCustomersDto,
  ) {
    const { page = 1, pageSize = 20, keyword, status, level, duplicateStatus, archived, sortBy, sortOrder, tagId } = query as any;
    const skip = (page - 1) * pageSize;

    const archivedFilter: Prisma.CustomerWhereInput =
      archived === 'only'    ? { archivedAt: { not: null } } :
      archived === 'include' ? {} :
      { archivedAt: null };

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...archivedFilter,
      ...scopeWhere,
      ...(status ? { status: status as any } : {}),
      ...(level ? { level: level as any } : {}),
      ...(duplicateStatus ? { duplicateStatus: duplicateStatus as any } : {}),
      ...(tagId ? { tags: { some: { tagId: BigInt(tagId) } } } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { companyName: { contains: keyword, mode: 'insensitive' } },
              { primaryContactName: { contains: keyword, mode: 'insensitive' } },
              { primaryPhone: { contains: keyword } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sortBy === 'level' ? { level: sortOrder ?? 'asc' }
      : sortBy === 'status' ? { status: sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          owner: { select: { id: true, name: true, role: true } },
          opportunities: {
            where: { deletedAt: null },
            select: { id: true, stage: true, title: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async findById(id: bigint) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, role: true, departmentId: true } },
        contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        followUps: {
          where: { deletedAt: null },
          orderBy: { followUpTime: 'desc' },
          take: 10,
          include: { owner: { select: { id: true, name: true } } },
        },
        opportunities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { id: true, name: true } } },
        },
        orders: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        statusHistories: { orderBy: { createdAt: 'desc' }, take: 20 },
        sourceLead: { select: { id: true, name: true, companyName: true, phone: true, createdAt: true } },
        collaborators: { select: { userId: true } },
      },
    });
  }

  async create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data, include: { owner: { select: { id: true, name: true } } } });
  }

  async update(id: bigint, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  async checkDuplicates(params: {
    phone?: string;
    email?: string;
    companyName?: string;
    contactName?: string;
    excludeId?: bigint;
  }) {
    const { phone, email, companyName, contactName, excludeId } = params;
    const conditions: Prisma.CustomerWhereInput[] = [];

    if (phone) conditions.push({ primaryPhone: phone });
    if (email) conditions.push({ primaryEmail: email });
    if (companyName && contactName) {
      conditions.push({ companyName, primaryContactName: contactName });
    }

    if (!conditions.length) return [];

    return this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: conditions,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        primaryPhone: true,
        primaryEmail: true,
        companyName: true,
        primaryContactName: true,
        ownerId: true,
      },
    });
  }
}
