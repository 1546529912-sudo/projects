import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Controller('bi')
export class BiExportController {
  constructor(private readonly prisma: PrismaService) {}

  private async checkApiKey(key: string | undefined) {
    if (!key) throw new UnauthorizedException('缺少 x-api-key');
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'external_api_key' } });
    if (!cfg || cfg.value !== key) throw new UnauthorizedException('API Key 无效');
  }

  @Public()
  @Get('customers')
  async customers(
    @Headers('x-api-key') apiKey: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '500',
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    await this.checkApiKey(apiKey);
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { deletedAt: null };
    if (updatedAfter) where.updatedAt = { gte: new Date(updatedAfter) };

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where, skip, take: Number(pageSize),
        orderBy: { id: 'asc' },
        select: {
          id: true, name: true, shortName: true, companyName: true,
          primaryContactName: true, primaryPhone: true, primaryEmail: true,
          level: true, status: true, industry: true, companySize: true, region: true,
          sourceCategory: true, sourceDetail: true, customFields: true,
          ownerId: true, owner: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
      }),
    ]);

    return {
      data: items.map((c) => ({ ...c, id: c.id.toString(), ownerId: c.ownerId.toString(), owner: c.owner ? { ...c.owner, id: c.owner.id.toString() } : null })),
      pagination: { page: Number(page), pageSize: Number(pageSize), total },
    };
  }

  @Public()
  @Get('leads')
  async leads(
    @Headers('x-api-key') apiKey: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '500',
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    await this.checkApiKey(apiKey);
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { deletedAt: null };
    if (updatedAfter) where.updatedAt = { gte: new Date(updatedAfter) };

    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where, skip, take: Number(pageSize),
        orderBy: { id: 'asc' },
        select: {
          id: true, name: true, companyName: true, contactName: true,
          phone: true, email: true, sourceCategory: true, sourceDetail: true,
          status: true, ownerId: true, owner: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
      }),
    ]);

    return {
      data: items.map((l) => ({ ...l, id: l.id.toString(), ownerId: l.ownerId.toString(), owner: l.owner ? { ...l.owner, id: l.owner.id.toString() } : null })),
      pagination: { page: Number(page), pageSize: Number(pageSize), total },
    };
  }

  @Public()
  @Get('orders')
  async orders(
    @Headers('x-api-key') apiKey: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '500',
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    await this.checkApiKey(apiKey);
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { deletedAt: null };
    if (updatedAfter) where.updatedAt = { gte: new Date(updatedAfter) };

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where, skip, take: Number(pageSize),
        orderBy: { id: 'asc' },
        select: {
          id: true, orderNo: true, status: true,
          amount: true, paidAmount: true, currency: true,
          customerId: true, customer: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
      }),
    ]);

    return {
      data: items.map((o) => ({
        ...o,
        id: o.id.toString(),
        customerId: o.customerId.toString(),
        customer: o.customer ? { ...o.customer, id: o.customer.id.toString() } : null,
        amount: Number(o.amount),
        paidAmount: Number(o.paidAmount),
      })),
      pagination: { page: Number(page), pageSize: Number(pageSize), total },
    };
  }

  @Public()
  @Get('opportunities')
  async opportunities(
    @Headers('x-api-key') apiKey: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '500',
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    await this.checkApiKey(apiKey);
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { deletedAt: null };
    if (updatedAfter) where.updatedAt = { gte: new Date(updatedAfter) };

    const [total, items] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({
        where, skip, take: Number(pageSize),
        orderBy: { id: 'asc' },
        select: {
          id: true, name: true, stage: true, amount: true, probability: true,
          expectedCloseDate: true, closedAt: true, closeReason: true,
          customerId: true, customer: { select: { id: true, name: true } },
          ownerId: true, owner: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
      }),
    ]);

    return {
      data: items.map((o) => ({
        ...o,
        id: o.id.toString(),
        customerId: o.customerId.toString(),
        ownerId: o.ownerId.toString(),
        customer: o.customer ? { ...o.customer, id: o.customer.id.toString() } : null,
        owner: o.owner ? { ...o.owner, id: o.owner.id.toString() } : null,
        amount: o.amount !== null ? Number(o.amount) : null,
      })),
      pagination: { page: Number(page), pageSize: Number(pageSize), total },
    };
  }
}
