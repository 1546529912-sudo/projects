import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
  ) {}

  /** 轻量计数，供顶栏 / 侧栏轮询，口径与 getSummary 一致 */
  async getCounts(actor: CurrentUserPayload) {
    const customerScope = this.scopeService.buildWhere(actor);
    const oppScope = this.buildOpportunityScope(actor);
    const { todayStart, todayEnd, in14Days, days30Ago, activeStageFilter } = this.reminderBoundaries();

    const [followUpToday, followUpOverdue, opportunityUpcoming, opportunityStale] = await Promise.all([
      this.prisma.customer.count({
        where: {
          deletedAt: null,
          ...customerScope,
          nextFollowUpAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.customer.count({
        where: {
          deletedAt: null,
          ...customerScope,
          nextFollowUpAt: { lt: todayStart },
          status: { notIn: ['won', 'lost'] },
        },
      }),
      this.prisma.opportunity.count({
        where: {
          deletedAt: null,
          ...activeStageFilter,
          ...oppScope,
          expectedCloseDate: { gte: todayStart, lte: in14Days },
        },
      }),
      this.prisma.opportunity.count({
        where: {
          deletedAt: null,
          ...activeStageFilter,
          ...oppScope,
          updatedAt: { lte: days30Ago },
        },
      }),
    ]);

    const attentionTotal = followUpToday + followUpOverdue + opportunityUpcoming + opportunityStale;
    return {
      followUpToday,
      followUpOverdue,
      opportunityUpcoming,
      opportunityStale,
      attentionTotal,
      /** 需要立即处理的跟进（逾期） */
      urgentFollowUp: followUpOverdue,
    };
  }

  async getSummary(actor: CurrentUserPayload) {
    const customerScope = this.scopeService.buildWhere(actor);
    const oppScope = this.buildOpportunityScope(actor);

    const { todayStart, todayEnd, in14Days, days30Ago, activeStageFilter } = this.reminderBoundaries();

    const [
      totalCustomers,
      openOppCount,
      openOppAmount,
      todayFollowUps,
      overdueFollowUps,
      upcomingOpportunities,
      staleOpportunities,
    ] = await Promise.all([
      // 1. 客户总数
      this.prisma.customer.count({ where: { deletedAt: null, ...customerScope } }),

      // 2. 进行中商机数
      this.prisma.opportunity.count({
        where: { deletedAt: null, ...activeStageFilter, ...oppScope },
      }),

      // 3. 进行中商机总金额
      this.prisma.opportunity.aggregate({
        where: { deletedAt: null, ...activeStageFilter, ...oppScope },
        _sum: { amount: true },
      }),

      // 4. 今日待跟进
      this.prisma.customer.findMany({
        where: {
          deletedAt: null,
          ...customerScope,
          nextFollowUpAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          id: true, name: true, nextFollowUpAt: true, status: true, level: true,
          owner: { select: { id: true, name: true } },
        },
        orderBy: { nextFollowUpAt: 'asc' },
        take: 10,
      }),

      // 5. 逾期待跟进
      this.prisma.customer.findMany({
        where: {
          deletedAt: null,
          ...customerScope,
          nextFollowUpAt: { lt: todayStart },
          status: { notIn: ['won', 'lost'] },
        },
        select: {
          id: true, name: true, nextFollowUpAt: true, status: true, level: true,
          owner: { select: { id: true, name: true } },
        },
        orderBy: { nextFollowUpAt: 'asc' },
        take: 10,
      }),

      // 6. 即将到期商机（14天内）
      this.prisma.opportunity.findMany({
        where: {
          deletedAt: null,
          ...activeStageFilter,
          ...oppScope,
          expectedCloseDate: { gte: todayStart, lte: in14Days },
        },
        select: {
          id: true, title: true, amount: true, stage: true, expectedCloseDate: true,
          customer: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: { expectedCloseDate: 'asc' },
        take: 5,
      }),

      // 7. 长期未推进商机（30天未更新）
      this.prisma.opportunity.findMany({
        where: {
          deletedAt: null,
          ...activeStageFilter,
          ...oppScope,
          updatedAt: { lte: days30Ago },
        },
        select: {
          id: true, title: true, amount: true, stage: true, updatedAt: true,
          customer: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
      }),
    ]);

    const serializeCustomer = (c: any) => ({
      ...c,
      id: c.id?.toString(),
      owner: c.owner ? { id: c.owner.id?.toString(), name: c.owner.name } : undefined,
    });

    const serializeOpp = (o: any) => ({
      ...o,
      id: o.id?.toString(),
      amount: o.amount?.toString(),
      customer: o.customer ? { id: o.customer.id?.toString(), name: o.customer.name } : undefined,
      owner: o.owner ? { id: o.owner.id?.toString(), name: o.owner.name } : undefined,
    });

    return {
      stats: {
        totalCustomers,
        openOppCount,
        openOppAmount: openOppAmount._sum.amount?.toString() ?? '0',
      },
      todayFollowUps: todayFollowUps.map(serializeCustomer),
      overdueFollowUps: overdueFollowUps.map(serializeCustomer),
      upcomingOpportunities: upcomingOpportunities.map(serializeOpp),
      staleOpportunities: staleOpportunities.map(serializeOpp),
    };
  }

  async globalSearch(actor: CurrentUserPayload, q: string) {
    if (!q || q.trim().length < 2) return { customers: [], opportunities: [], leads: [] };
    const kw = q.trim();
    const customerScope = this.scopeService.buildWhere(actor);
    const oppScope = this.buildOpportunityScope(actor);

    const [customers, opportunities, leads] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          deletedAt: null,
          ...customerScope,
          OR: [
            { name: { contains: kw, mode: 'insensitive' } },
            { companyName: { contains: kw, mode: 'insensitive' } },
            { primaryPhone: { contains: kw } },
            { primaryContactName: { contains: kw, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, companyName: true, status: true, level: true, primaryPhone: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.findMany({
        where: {
          deletedAt: null,
          ...oppScope,
          OR: [
            { title: { contains: kw, mode: 'insensitive' } },
            { customer: { name: { contains: kw, mode: 'insensitive' } } },
          ],
        },
        select: { id: true, title: true, stage: true, amount: true, customer: { select: { id: true, name: true } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      actor.role !== 'sales' ? Promise.resolve([]) : this.prisma.lead.findMany({
        where: {
          deletedAt: null,
          ownerId: BigInt(actor.sub),
          OR: [
            { name: { contains: kw, mode: 'insensitive' } },
            { companyName: { contains: kw, mode: 'insensitive' } },
            { phone: { contains: kw } },
          ],
        },
        select: { id: true, name: true, companyName: true, phone: true, status: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      customers: customers.map((c) => ({ ...c, id: c.id.toString() })),
      opportunities: opportunities.map((o) => ({
        ...o, id: o.id.toString(), amount: o.amount?.toString() ?? null,
        customer: o.customer ? { id: o.customer.id.toString(), name: o.customer.name } : null,
      })),
      leads: (leads as any[]).map((l) => ({ ...l, id: l.id.toString() })),
    };
  }

  private reminderBoundaries() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const in14Days = new Date(now); in14Days.setDate(now.getDate() + 14);
    const days30Ago = new Date(now); days30Ago.setDate(now.getDate() - 30);
    const activeStageFilter: Prisma.OpportunityWhereInput = {
      stage: { notIn: ['closed_won', 'closed_lost'] },
    };
    return { now, todayStart, todayEnd, in14Days, days30Ago, activeStageFilter };
  }

  private buildOpportunityScope(actor: CurrentUserPayload): Prisma.OpportunityWhereInput {
    if (actor.role === 'admin') return {};
    if (actor.role === 'director' || actor.role === 'manager') {
      if (!actor.departmentId) return { ownerId: BigInt(actor.sub) };
      return { customer: { owner: { departmentId: BigInt(actor.departmentId) } } };
    }
    return { ownerId: BigInt(actor.sub) };
  }
}
