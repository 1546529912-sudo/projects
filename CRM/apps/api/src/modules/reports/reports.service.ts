import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import type { FunnelQueryDto } from './dto/funnel-query.dto';
import type { PerformanceQueryDto, SetTargetDto } from './dto/performance-query.dto';

// Ordered active stages
const ACTIVE_STAGES = [
  'initial_contact',
  'needs_analysis',
  'proposal',
  'negotiation',
] as const;

const STAGE_LABEL: Record<string, string> = {
  initial_contact: '初步接触',
  needs_analysis: '需求确认',
  proposal: '方案报价',
  negotiation: '谈判中',
  closed_won: '赢单',
  closed_lost: '输单',
};

const DEFAULT_STAGE_WIN_RATE: Record<string, number> = {
  initial_contact: 0.1,
  needs_analysis: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
  ) {}

  // ── Funnel ──────────────────────────────────────────────────────────────

  async getFunnel(actor: CurrentUserPayload, query: FunnelQueryDto) {
    const oppScope = this.buildOppScope(actor);
    const dateFilter = this.buildDateFilter(query);

    // Per-stage stats (snapshot: current state; flow: ever entered this stage in period)
    const stageStats = await Promise.all(
      ACTIVE_STAGES.map(async (stage) => {
        const where: Prisma.OpportunityWhereInput = {
          deletedAt: null,
          stage,
          ...oppScope,
          ...dateFilter,
        };
        const [count, agg] = await Promise.all([
          this.prisma.opportunity.count({ where }),
          this.prisma.opportunity.aggregate({ where, _sum: { amount: true } }),
        ]);
        return {
          stage,
          label: STAGE_LABEL[stage],
          count,
          amount: agg._sum.amount?.toString() ?? '0',
        };
      }),
    );

    // Closed stats
    const closedWonWhere: Prisma.OpportunityWhereInput = {
      deletedAt: null, stage: 'closed_won', ...oppScope, ...dateFilter,
    };
    const closedLostWhere: Prisma.OpportunityWhereInput = {
      deletedAt: null, stage: 'closed_lost', ...oppScope, ...dateFilter,
    };
    const [wonCount, wonAgg, lostCount] = await Promise.all([
      this.prisma.opportunity.count({ where: closedWonWhere }),
      this.prisma.opportunity.aggregate({ where: closedWonWhere, _sum: { amount: true } }),
      this.prisma.opportunity.count({ where: closedLostWhere }),
    ]);

    // Conversion rates between adjacent active stages
    const conversionRates: Array<{ from: string; to: string; rate: number }> = [];
    for (let i = 0; i < stageStats.length - 1; i++) {
      const from = stageStats[i];
      const to = stageStats[i + 1];
      const rate = from.count > 0 ? Math.round((to.count / from.count) * 100) : 0;
      conversionRates.push({ from: from.stage, to: to.stage, rate });
    }
    // Last active stage → won
    const lastActive = stageStats[stageStats.length - 1];
    const wonRate = lastActive.count > 0 ? Math.round((wonCount / lastActive.count) * 100) : 0;
    conversionRates.push({ from: lastActive.stage, to: 'closed_won', rate: wonRate });

    // Overall win rate vs first stage
    const firstCount = stageStats[0]?.count ?? 0;
    const overallWinRate = firstCount > 0 ? Math.round((wonCount / firstCount) * 100) : 0;

    return {
      stages: [
        ...stageStats,
        { stage: 'closed_won', label: '赢单', count: wonCount, amount: wonAgg._sum.amount?.toString() ?? '0' },
        { stage: 'closed_lost', label: '输单', count: lostCount, amount: '0' },
      ],
      conversionRates,
      overallWinRate,
    };
  }

  // ── Performance ─────────────────────────────────────────────────────────

  async getPerformance(actor: CurrentUserPayload, query: PerformanceQueryDto) {
    const { periodType = 'month', period } = query;
    const resolvedPeriod = period ?? this.currentPeriod(periodType);
    const { start, end } = this.periodBoundaries(periodType, resolvedPeriod);

    const oppScope = this.buildOppScope(actor);
    const customerScope = this.scopeService.buildWhere(actor);

    // Actual: paid_amount from orders within period
    const orderWhere: Prisma.OrderWhereInput = {
      deletedAt: null,
      updatedAt: { gte: start, lte: end },
      status: 'paid',
      customer: customerScope,
    };
    const actualAgg = await this.prisma.order.aggregate({
      where: orderWhere,
      _sum: { paidAmount: true },
    });
    const actual = Number(actualAgg._sum.paidAmount ?? 0);

    // Predicted: weighted sum of active opportunities expected to close this period
    const activeOpps = await this.prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ['closed_won', 'closed_lost'] },
        expectedCloseDate: { gte: start, lte: end },
        ...oppScope,
      },
      select: { stage: true, amount: true },
    });
    const winRateConfig = await this.prisma.systemConfig.findUnique({ where: { key: 'stage_win_rates' } });
    const STAGE_WIN_RATE: Record<string, number> = winRateConfig?.value
      ? { ...DEFAULT_STAGE_WIN_RATE, ...(winRateConfig.value as Record<string, number>) }
      : DEFAULT_STAGE_WIN_RATE;

    const predicted = activeOpps.reduce((sum, opp) => {
      const rate = STAGE_WIN_RATE[opp.stage] ?? 0;
      return sum + Number(opp.amount) * rate;
    }, 0);

    // Target
    const targetRecord = await this.prisma.salesTarget.findFirst({
      where: {
        period: resolvedPeriod,
        periodType,
        targetType: actor.role === 'sales' ? 'personal' : 'team',
        userId: actor.role === 'sales' ? BigInt(actor.sub) : null,
      },
    });
    const target = Number(targetRecord?.amount ?? 0);

    // Time progress
    const now = new Date();
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = Math.min(now.getTime() - start.getTime(), totalMs);
    const timeProgress = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 100;

    // Per-user breakdown (admin/manager see team; sales sees only self)
    const breakdown = await this.getBreakdown(actor, start, end);

    return {
      period: resolvedPeriod,
      periodType,
      target: target.toFixed(2),
      actual: actual.toFixed(2),
      predicted: predicted.toFixed(2),
      completionRate: target > 0 ? Math.round((actual / target) * 100) : 0,
      timeProgress,
      breakdown,
    };
  }

  async setTarget(actor: CurrentUserPayload, dto: SetTargetDto) {
    const userId = dto.targetType === 'personal' ? (dto.userId ? BigInt(dto.userId) : BigInt(actor.sub)) : null;
    const existing = await this.prisma.salesTarget.findFirst({
      where: {
        period: dto.period,
        periodType: dto.periodType,
        targetType: dto.targetType,
        userId: userId ?? undefined,
      },
    });
    if (existing) {
      await this.prisma.salesTarget.update({ where: { id: existing.id }, data: { amount: dto.amount } });
    } else {
      await this.prisma.salesTarget.create({
        data: { period: dto.period, periodType: dto.periodType, targetType: dto.targetType, userId, amount: dto.amount },
      });
    }
    return { ok: true };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async getBreakdown(actor: CurrentUserPayload, start: Date, end: Date) {
    if (actor.role === 'sales') return [];

    const userWhere: Prisma.UserWhereInput =
      (actor.role === 'director' || actor.role === 'manager') && actor.departmentId
        ? { departmentId: BigInt(actor.departmentId), deletedAt: null }
        : { deletedAt: null };

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, role: true },
      take: 50,
    });

    return Promise.all(
      users.map(async (u) => {
        const orderWhere: Prisma.OrderWhereInput = {
          deletedAt: null,
          updatedAt: { gte: start, lte: end },
          status: 'paid',
          customer: { ownerId: u.id },
        };
        const agg = await this.prisma.order.aggregate({ where: orderWhere, _sum: { paidAmount: true } });
        const actual = Number(agg._sum.paidAmount ?? 0);

        const targetRecord = await this.prisma.salesTarget.findFirst({
          where: { period: this.currentPeriod('month'), periodType: 'month', targetType: 'personal', userId: u.id },
        });
        const target = Number(targetRecord?.amount ?? 0);

        return {
          userId: u.id.toString(),
          userName: u.name,
          role: u.role,
          actual: actual.toFixed(2),
          target: target.toFixed(2),
          completionRate: target > 0 ? Math.round((actual / target) * 100) : 0,
        };
      }),
    );
  }

  // ── Efficiency Report ────────────────────────────────────────────────────

  async getEfficiency(actor: CurrentUserPayload, query: PerformanceQueryDto) {
    const { periodType = 'month', period } = query;
    const resolvedPeriod = period ?? this.currentPeriod(periodType);
    const { start, end } = this.periodBoundaries(periodType, resolvedPeriod);

    const userWhere: Prisma.UserWhereInput =
      actor.role === 'sales'
        ? { id: BigInt(actor.sub), deletedAt: null }
        : (actor.role === 'director' || actor.role === 'manager') && actor.departmentId
        ? { departmentId: BigInt(actor.departmentId), deletedAt: null }
        : { deletedAt: null };

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, role: true },
      take: 100,
    });

    const rows = await Promise.all(
      users.map(async (u) => {
        const dateRange = { gte: start, lte: end };
        const [leadCount, followUpCount, oppCreated, wonOpps, lostCount] = await Promise.all([
          this.prisma.lead.count({ where: { ownerId: u.id, createdAt: dateRange } }),
          this.prisma.followUpRecord.count({ where: { ownerId: u.id, followUpTime: dateRange } }),
          this.prisma.opportunity.count({ where: { ownerId: u.id, deletedAt: null, createdAt: dateRange } }),
          this.prisma.opportunity.findMany({
            where: { ownerId: u.id, deletedAt: null, stage: 'closed_won', updatedAt: dateRange },
            select: { amount: true },
          }),
          this.prisma.opportunity.count({ where: { ownerId: u.id, deletedAt: null, stage: 'closed_lost', updatedAt: dateRange } }),
        ]);
        const wonCount = wonOpps.length;
        const wonAmount = wonOpps.reduce((s, o) => s + Number(o.amount), 0);
        const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
        return {
          userId: u.id.toString(),
          userName: u.name,
          role: u.role,
          leadCount,
          followUpCount,
          oppCreated,
          wonCount,
          lostCount,
          winRate,
          wonAmount: wonAmount.toFixed(2),
        };
      }),
    );

    rows.sort((a, b) => b.wonCount - a.wonCount || b.followUpCount - a.followUpCount);
    return { period: resolvedPeriod, periodType, rows };
  }

  // ── Funnel by Product ───────────────────────────────────────────────────

  async getFunnelByProduct(actor: CurrentUserPayload) {
    const oppScope = this.buildOppScope(actor);

    const opps = await this.prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ['closed_won', 'closed_lost'] },
        ...oppScope,
      },
      select: {
        id: true,
        stage: true,
        amount: true,
        quotations: {
          select: {
            items: {
              where: { productId: { not: null } },
              select: { product: { select: { id: true, name: true } } },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    type Row = { count: number; amount: number };
    const map: Record<string, Record<string, Row>> = {};

    for (const opp of opps) {
      const product = opp.quotations[0]?.items[0]?.product?.name ?? '未关联产品';
      if (!map[product]) map[product] = {};
      if (!map[product][opp.stage]) map[product][opp.stage] = { count: 0, amount: 0 };
      map[product][opp.stage].count++;
      map[product][opp.stage].amount += Number(opp.amount);
    }

    return Object.entries(map).map(([product, stages]) => ({
      product,
      stages: Object.entries(stages).map(([stage, v]) => ({
        stage,
        label: STAGE_LABEL[stage] ?? stage,
        count: v.count,
        amount: v.amount.toFixed(2),
      })),
    }));
  }

  // ── Source Analysis ─────────────────────────────────────────────────────

  async getSourceFunnel(actor: CurrentUserPayload, startDate?: string, endDate?: string) {
    const dateRange: Prisma.DateTimeFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    const customerScope = this.scopeService.buildWhere(actor);
    const leadBase: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...this.buildLeadScope(actor),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const [leadRows, convertedLeadRows, customerRows, oppData, wonData] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['sourceCategory'], _count: { _all: true }, where: leadBase }),
      this.prisma.lead.groupBy({
        by: ['sourceCategory'],
        _count: { _all: true },
        where: { ...leadBase, status: 'converted' },
      }),
      this.prisma.customer.groupBy({
        by: ['sourceCategory'],
        _count: { _all: true },
        where: { deletedAt: null, ...customerScope, ...(dateRange ? { createdAt: dateRange } : {}) },
      }),
      this.prisma.customer.findMany({
        where: { deletedAt: null, ...customerScope },
        select: { sourceCategory: true, _count: { select: { opportunities: { where: { deletedAt: null } } } } },
      }),
      this.prisma.customer.findMany({
        where: { deletedAt: null, ...customerScope },
        select: {
          sourceCategory: true,
          _count: { select: { opportunities: { where: { deletedAt: null, stage: 'closed_won' } } } },
        },
      }),
    ]);

    // Aggregate opp counts by sourceCategory
    const oppBySrc: Record<string, number> = {};
    const wonBySrc: Record<string, number> = {};
    for (const c of oppData) {
      const src = c.sourceCategory ?? '未知来源';
      oppBySrc[src] = (oppBySrc[src] ?? 0) + c._count.opportunities;
    }
    for (const c of wonData) {
      const src = c.sourceCategory ?? '未知来源';
      wonBySrc[src] = (wonBySrc[src] ?? 0) + c._count.opportunities;
    }

    const sources = Array.from(new Set([
      ...leadRows.map((r) => r.sourceCategory ?? '未知来源'),
      ...customerRows.map((r) => r.sourceCategory ?? '未知来源'),
    ]));

    return sources.map((source) => {
      const lead = leadRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const converted = convertedLeadRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const cust = customerRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const leadCount = lead?._count._all ?? 0;
      const convertedCount = converted?._count._all ?? 0;
      const customerCount = cust?._count._all ?? 0;
      const oppCount = oppBySrc[source] ?? 0;
      const wonCount = wonBySrc[source] ?? 0;
      const conversionRate = leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0;
      const leadToCustomerRate = leadCount > 0 ? Math.round((customerCount / leadCount) * 100) : null;
      const customerToOppRate = customerCount > 0 ? Math.round((oppCount / customerCount) * 100) : null;
      const oppToWonRate = oppCount > 0 ? Math.round((wonCount / oppCount) * 100) : null;
      const leadToWonRate = leadCount > 0 ? Math.round((wonCount / leadCount) * 100) : null;
      return {
        source,
        leadCount,
        convertedCount,
        customerCount,
        oppCount,
        wonCount,
        conversionRate,
        leadToCustomerRate,
        customerToOppRate,
        oppToWonRate,
        leadToWonRate,
      };
    }).sort((a, b) => (b.leadCount + b.customerCount) - (a.leadCount + a.customerCount));
  }

  async getSource(actor: CurrentUserPayload, startDate?: string, endDate?: string) {
    const dateRange: Prisma.DateTimeFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    const customerScope = this.scopeService.buildWhere(actor);
    const leadBase: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...this.buildLeadScope(actor),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const [leadRows, convertedRows, customerRows] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['sourceCategory'], _count: { _all: true }, where: leadBase }),
      this.prisma.lead.groupBy({
        by: ['sourceCategory'],
        _count: { _all: true },
        where: { ...leadBase, status: 'converted' },
      }),
      this.prisma.customer.groupBy({
        by: ['sourceCategory'],
        _count: { _all: true },
        where: { deletedAt: null, ...customerScope, ...(dateRange ? { createdAt: dateRange } : {}) },
      }),
    ]);

    const sources = Array.from(new Set([
      ...leadRows.map((r) => r.sourceCategory ?? '未知来源'),
      ...customerRows.map((r) => r.sourceCategory ?? '未知来源'),
    ]));

    const rows = sources.map((source) => {
      const lead = leadRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const conv = convertedRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const cust = customerRows.find((r) => (r.sourceCategory ?? '未知来源') === source);
      const leadCount = lead?._count._all ?? 0;
      const convertedCount = conv?._count._all ?? 0;
      const customerCount = cust?._count._all ?? 0;
      const conversionRate = leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0;
      return { source, leadCount, convertedCount, customerCount, conversionRate };
    });

    rows.sort((a, b) => (b.leadCount + b.customerCount) - (a.leadCount + a.customerCount));
    return rows;
  }

  async getAttributionComparison(actor: CurrentUserPayload) {
    const customerScope = this.scopeService.buildWhere(actor);

    // For each won customer, get order amounts, customer's own source, and source lead's source
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, status: 'won', ...customerScope },
      select: {
        id: true,
        sourceCategory: true,
        sourceLead: { select: { sourceCategory: true } },
        orders: {
          where: { status: 'paid', deletedAt: null },
          select: { paidAmount: true },
        },
      },
    });

    // First-touch: credit the lead's source (or customer source if no lead)
    // Last-touch: credit the customer's direct source
    // Linear: average of first + last (or same if they match)
    const firstTouch: Record<string, number> = {};
    const lastTouch: Record<string, number> = {};
    const linearTouch: Record<string, number> = {};

    for (const customer of customers) {
      const orderTotal = customer.orders.reduce((s, o) => s + Number(o.paidAmount ?? 0), 0);
      if (orderTotal === 0) continue;

      const lastSrc = customer.sourceCategory ?? '未知来源';
      const firstSrc = customer.sourceLead?.sourceCategory ?? lastSrc;

      firstTouch[firstSrc] = (firstTouch[firstSrc] ?? 0) + orderTotal;
      lastTouch[lastSrc] = (lastTouch[lastSrc] ?? 0) + orderTotal;

      if (firstSrc === lastSrc) {
        linearTouch[firstSrc] = (linearTouch[firstSrc] ?? 0) + orderTotal;
      } else {
        linearTouch[firstSrc] = (linearTouch[firstSrc] ?? 0) + orderTotal / 2;
        linearTouch[lastSrc] = (linearTouch[lastSrc] ?? 0) + orderTotal / 2;
      }
    }

    const allSources = Array.from(new Set([
      ...Object.keys(firstTouch), ...Object.keys(lastTouch), ...Object.keys(linearTouch),
    ]));

    return allSources.map((source) => ({
      source,
      firstTouch: Math.round(firstTouch[source] ?? 0),
      lastTouch: Math.round(lastTouch[source] ?? 0),
      linearTouch: Math.round(linearTouch[source] ?? 0),
    })).sort((a, b) => b.firstTouch - a.firstTouch);
  }

  async getTeamActivity(
    actor: CurrentUserPayload,
    page = 1,
    limit = 20,
    userId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const where: Prisma.FollowUpRecordWhereInput = {
      deletedAt: null,
    };

    // Sales can only see their own; manager sees dept; admin sees all
    if (actor.role === 'sales') {
      where.ownerId = BigInt(actor.sub);
    } else if ((actor.role === 'director' || actor.role === 'manager') && actor.departmentId) {
      where.owner = { departmentId: BigInt(actor.departmentId) };
    }

    // Optional filter by specific user (manager/admin only)
    if (userId && actor.role !== 'sales') {
      where.ownerId = BigInt(userId);
    }

    if (dateFrom || dateTo) {
      where.followUpTime = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.followUpRecord.count({ where }),
      this.prisma.followUpRecord.findMany({
        where,
        orderBy: { followUpTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          content: true,
          followUpTime: true,
          nextFollowUpTime: true,
          customer: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      items: items.map((i: typeof items[number]) => ({
        id: i.id.toString(),
        content: i.content,
        followUpTime: i.followUpTime,
        nextFollowUpTime: i.nextFollowUpTime,
        customer: i.customer ? { id: i.customer.id.toString(), name: i.customer.name } : null,
        owner: i.owner ? { id: i.owner.id.toString(), name: i.owner.name } : null,
      })),
    };
  }

  async getTeamMembers(actor: CurrentUserPayload) {
    if (actor.role === 'sales') return [];
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      status: 'active',
    };
    if ((actor.role === 'director' || actor.role === 'manager') && actor.departmentId) {
      where.departmentId = BigInt(actor.departmentId);
    }
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({ id: u.id.toString(), name: u.name }));
  }

  async getSourceTrend(actor: CurrentUserPayload, months = 6) {
    const start = new Date();
    start.setMonth(start.getMonth() - months + 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const leads = await this.prisma.lead.findMany({
      where: { deletedAt: null, createdAt: { gte: start }, ...this.buildLeadScope(actor) },
      select: { sourceCategory: true, createdAt: true },
    });

    const monthKeys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const sources = Array.from(new Set(leads.map((l) => l.sourceCategory ?? '未知来源')));

    const series = sources.map((source) => {
      const data = monthKeys.map((mk) => {
        const count = leads.filter((l) => {
          const d = l.createdAt;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === mk && (l.sourceCategory ?? '未知来源') === source;
        }).length;
        return { month: mk, count };
      });
      return { source, data };
    });

    return { monthKeys, series };
  }

  private buildOppScope(actor: CurrentUserPayload): Prisma.OpportunityWhereInput {
    if (actor.role === 'admin') return {};
    if (actor.role === 'manager') {
      if (!actor.departmentId) return { ownerId: BigInt(actor.sub) };
      return { customer: { owner: { departmentId: BigInt(actor.departmentId) } } };
    }
    return { ownerId: BigInt(actor.sub) };
  }

  private buildLeadScope(actor: CurrentUserPayload): Prisma.LeadWhereInput {
    if (actor.role === 'admin') return {};
    if (actor.role === 'manager') {
      if (!actor.departmentId) return { ownerId: BigInt(actor.sub) };
      return { owner: { departmentId: BigInt(actor.departmentId) } };
    }
    return { ownerId: BigInt(actor.sub) };
  }

  private buildDateFilter(query: FunnelQueryDto): Prisma.OpportunityWhereInput {
    if (!query.startDate && !query.endDate) return {};
    const field = query.timeField === 'expected_close' ? 'expectedCloseDate' : 'createdAt';
    const filter: any = {};
    if (query.startDate) filter.gte = new Date(query.startDate);
    if (query.endDate) filter.lte = new Date(query.endDate);
    return { [field]: filter };
  }

  private currentPeriod(periodType: string): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    if (periodType === 'month') return `${y}-${m}`;
    if (periodType === 'quarter') return `${y}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    return `${y}`;
  }

  private periodBoundaries(periodType: string, period: string): { start: Date; end: Date } {
    if (periodType === 'month') {
      const [y, m] = period.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (periodType === 'quarter') {
      const [y, q] = period.split('-Q').map(Number);
      const startMonth = (q - 1) * 3;
      const start = new Date(y, startMonth, 1);
      const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    // year
    const y = Number(period);
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
  }

  // ── Custom Reports ──────────────────────────────────────────────────────────

  private readonly ALLOWED_DIMS: Record<string, string[]> = {
    customer: ['industry', 'region', 'companySize', 'level', 'status', 'sourceCategory'],
    opportunity: ['stage', 'industry', 'region'],
    order: ['status'],
  };

  async listCustomReports() {
    const reports = await this.prisma.customReport.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return reports.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async runCustomReport(actor: CurrentUserPayload, id: string) {
    const report = await this.prisma.customReport.findFirst({ where: { id: BigInt(id), isActive: true } });
    if (!report) throw new NotFoundException('报表不存在');

    const allowed = this.ALLOWED_DIMS[report.entityType] ?? [];
    const dims = report.dimensions.filter((d) => allowed.includes(d));
    const metrics = report.metrics as Array<{ field: string; agg: string; label?: string }>;

    if (report.entityType === 'customer') {
      const scopeWhere: Prisma.CustomerWhereInput =
        actor.role === 'admin' ? { deletedAt: null }
        : actor.role === 'manager' && actor.departmentId
          ? { deletedAt: null, owner: { departmentId: BigInt(actor.departmentId) } }
          : { deletedAt: null, ownerId: BigInt(actor.sub) };

      if (dims.length === 0) {
        const total = await this.prisma.customer.count({ where: scopeWhere });
        return { reportId: id, name: report.name, dimensions: dims, rows: [{ count: total }] };
      }

      const grouped = await this.prisma.customer.groupBy({
        by: dims as any,
        _count: { _all: true },
        _sum: metrics.some((m) => m.field === 'order_amount') ? undefined : undefined,
        where: scopeWhere,
        orderBy: { _count: { id: 'desc' } },
      });

      const rows = grouped.map((g: any) => {
        const row: Record<string, any> = {};
        for (const d of dims) row[d] = g[d] ?? null;
        row['count'] = g._count._all;
        return row;
      });
      return { reportId: id, name: report.name, dimensions: dims, metrics: metrics.map((m) => m.field), rows };
    }

    if (report.entityType === 'opportunity') {
      const oppScope = this.buildOppScope(actor);
      const scopeWhere: Prisma.OpportunityWhereInput = { deletedAt: null, ...oppScope };

      if (dims.length === 0) {
        const total = await this.prisma.opportunity.count({ where: scopeWhere });
        return { reportId: id, name: report.name, dimensions: dims, rows: [{ count: total }] };
      }

      const grouped = await this.prisma.opportunity.groupBy({
        by: dims as any,
        _count: { _all: true },
        _sum: metrics.some((m) => m.field === 'amount') ? { amount: true } : undefined,
        where: scopeWhere,
        orderBy: { _count: { id: 'desc' } },
      });

      const rows = grouped.map((g: any) => {
        const row: Record<string, any> = {};
        for (const d of dims) row[d] = g[d] ?? null;
        row['count'] = g._count._all;
        if (g._sum?.amount != null) row['total_amount'] = g._sum.amount.toString();
        return row;
      });
      return { reportId: id, name: report.name, dimensions: dims, metrics: metrics.map((m) => m.field), rows };
    }

    if (report.entityType === 'order') {
      const orderScope: Prisma.OrderWhereInput = actor.role === 'admin' ? { deletedAt: null }
        : actor.role === 'manager' && actor.departmentId
          ? { deletedAt: null, customer: { owner: { departmentId: BigInt(actor.departmentId) } } }
          : { deletedAt: null, customer: { ownerId: BigInt(actor.sub) } };

      const grouped = await this.prisma.order.groupBy({
        by: (dims.length > 0 ? dims : ['status']) as any,
        _count: { _all: true },
        _sum: metrics.some((m) => m.field === 'amount') ? { amount: true } : undefined,
        where: orderScope,
        orderBy: { _count: { id: 'desc' } },
      });

      const rows = grouped.map((g: any) => {
        const row: Record<string, any> = {};
        for (const d of (dims.length > 0 ? dims : ['status'])) row[d] = g[d] ?? null;
        row['count'] = g._count._all;
        if (g._sum?.amount != null) row['total_amount'] = g._sum.amount.toString();
        return row;
      });
      return { reportId: id, name: report.name, dimensions: dims.length > 0 ? dims : ['status'], metrics: metrics.map((m) => m.field), rows };
    }

    return { reportId: id, name: report.name, rows: [] };
  }
}
