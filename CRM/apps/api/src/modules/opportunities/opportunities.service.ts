import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { BusinessEventService } from '../../common/services/business-event.service';
import { WorkflowService } from '../workflow/workflow.service';
import { toJsonSerializable } from '../../common/utils/json-serialize.util';

const CLOSED_STAGES = new Set(['closed_won', 'closed_lost']);

const STAGE_ORDER = ['initial_contact', 'needs_analysis', 'proposal', 'negotiation'];

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
    private readonly bizEvent: BusinessEventService,
    private readonly workflow: WorkflowService,
  ) {}

  // ── Customer-scoped ──────────────────────────────────────────────────────

  async list(actor: CurrentUserPayload, customerId: string) {
    await this.assertCustomerAccess(actor, customerId);
    const items = await this.prisma.opportunity.findMany({
      where: { customerId: BigInt(customerId), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, name: true } } },
    });
    return items.map(this.serialize);
  }

  async create(actor: CurrentUserPayload, customerId: string, dto: CreateOpportunityDto) {
    await this.assertCustomerAccess(actor, customerId);

    // 防撞单：销售员不能在已有其他人进行中商机的客户上再建商机
    if (actor.role === 'sales') {
      const conflict = await this.prisma.opportunity.findFirst({
        where: {
          customerId: BigInt(customerId),
          deletedAt: null,
          stage: { notIn: ['closed_won', 'closed_lost'] },
          ownerId: { not: BigInt(actor.sub) },
        },
        include: { owner: { select: { name: true } } },
      });
      if (conflict) {
        throw new BadRequestException(
          `该客户已有 ${conflict.owner?.name ?? '其他销售'} 的进行中商机「${conflict.title}」，请联系主管处理`
        );
      }
    }

    const opp = await this.prisma.opportunity.create({
      data: {
        customerId: BigInt(customerId),
        title: dto.title,
        amount: dto.amount ?? 0,
        stage: dto.stage ?? 'initial_contact',
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        ownerId: BigInt(actor.sub),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    this.bizEvent.log({ objectType: 'customer', objectId: customerId, eventType: 'opportunity_created', title: `新建商机：${dto.title}`, createdBy: actor.sub });
    const idStr = opp.id.toString();
    void this.workflow
      .trigger('opportunity.created', 'opportunity', idStr, {
        ownerId: opp.ownerId.toString(),
        customerId,
        stage: opp.stage,
        title: opp.title,
        amount: String(opp.amount),
      })
      .catch((e) => this.logger.warn(`workflow trigger opportunity.created: ${e}`));
    return this.serialize(opp);
  }

  // ── Global ───────────────────────────────────────────────────────────────

  async globalList(actor: CurrentUserPayload, query: QueryOpportunitiesDto) {
    const { page = 1, pageSize = 20, stage, keyword, customerId } = query;
    const skip = (page - 1) * pageSize;

    const scopeWhere = this.buildOpportunityScope(actor);

    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      ...scopeWhere,
      ...(stage ? { stage } : {}),
      ...(customerId ? { customerId: BigInt(customerId) } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { customer: { name: { contains: keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: items.map(this.serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(actor: CurrentUserPayload, id: string) {
    await this.assertOpportunityAccess(actor, id);
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { opportunity: { select: { id: true, title: true } } },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, quoteNo: true, status: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!opp) throw new NotFoundException('商机不存在');
    const { orders, quotations, ...restOpp } = opp;
    return toJsonSerializable({
      ...this.serialize(restOpp),
      orders: orders.map((o: any) => {
        const { opportunity: oppRow, ...ordRest } = o;
        return {
          ...ordRest,
          id: o.id?.toString(),
          opportunityId: o.opportunityId?.toString(),
          customerId: o.customerId?.toString(),
          amount: o.amount?.toString?.() ?? o.amount,
          paidAmount: o.paidAmount?.toString?.() ?? o.paidAmount,
          opportunity: oppRow ? { id: oppRow.id?.toString(), title: oppRow.title } : undefined,
        };
      }),
      quotations: quotations.map((q: any) => ({
        ...q,
        id: q.id?.toString(),
        totalAmount: q.totalAmount?.toString?.() ?? q.totalAmount,
      })),
    });
  }

  async update(actor: CurrentUserPayload, id: string, dto: UpdateOpportunityDto) {
    const opp = await this.assertOpportunityAccess(actor, id);
    if (CLOSED_STAGES.has(opp.stage)) {
      throw new BadRequestException('已关闭的商机不能修改，请重新开启后操作');
    }
    const updated = await this.prisma.opportunity.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
        ...(dto.expectedCloseDate !== undefined
          ? { expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    if (dto.stage !== undefined && dto.stage !== opp.stage) {
      void this.workflow
        .trigger('opportunity.stage_changed', 'opportunity', id, { stage: dto.stage, previousStage: opp.stage, ownerId: updated.ownerId.toString() })
        .catch(() => undefined);
    }
    return this.serialize(updated);
  }

  async close(actor: CurrentUserPayload, id: string, dto: CloseOpportunityDto) {
    const opp = await this.assertOpportunityAccess(actor, id);
    const updated = await this.prisma.opportunity.update({
      where: { id: BigInt(id) },
      data: {
        stage: dto.outcome,
        closeReason: dto.reason ?? null,
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    // 赢单 → 自动创建 pending_payment 订单
    if (dto.outcome === 'closed_won') {
      const orderNo = `ORD-${Date.now()}-${id}`;
      await this.prisma.order.create({
        data: {
          customerId: opp.customerId,
          opportunityId: BigInt(id),
          orderNo,
          amount: opp.amount,
          paidAmount: 0,
          status: 'pending_payment',
        },
      });
    }

    const eventTitle = dto.outcome === 'closed_won'
      ? `商机赢单：${opp.title}${dto.reason ? `（${dto.reason}）` : ''}`
      : `商机输单：${opp.title}${dto.reason ? `（${dto.reason}）` : ''}`;
    this.bizEvent.log({ objectType: 'customer', objectId: opp.customerId.toString(), eventType: dto.outcome === 'closed_won' ? 'opportunity_won' : 'opportunity_lost', title: eventTitle, createdBy: actor.sub });

    void this.workflow
      .trigger('opportunity.closed', 'opportunity', id, {
        ownerId: updated.ownerId.toString(),
        customerId: updated.customerId.toString(),
        outcome: dto.outcome,
        title: updated.title,
        stage: updated.stage,
        amount: String(updated.amount),
      })
      .catch((e) => this.logger.warn(`workflow trigger opportunity.closed: ${e}`));

    return this.serialize(updated);
  }

  async uploadContract(actor: CurrentUserPayload, id: string, fileUrl: string) {
    const opp = await this.assertOpportunityAccess(actor, id);
    const updated = await this.prisma.opportunity.update({
      where: { id: BigInt(id) },
      data: { contractUrl: fileUrl, contractStatus: 'uploaded' },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    this.bizEvent.log({ objectType: 'customer', objectId: opp.customerId.toString(), eventType: 'contract_uploaded', title: `合同已上传：${opp.title}`, createdBy: actor.sub });
    return this.serialize(updated);
  }

  async markContractSigned(actor: CurrentUserPayload, id: string) {
    const opp = await this.assertOpportunityAccess(actor, id);
    const updated = await this.prisma.opportunity.update({
      where: { id: BigInt(id) },
      data: { contractStatus: 'signed' },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    this.bizEvent.log({ objectType: 'customer', objectId: opp.customerId.toString(), eventType: 'contract_signed', title: `合同已签署：${opp.title}`, createdBy: actor.sub });
    return this.serialize(updated);
  }

  async reopen(actor: CurrentUserPayload, id: string) {
    const opp = await this.assertOpportunityAccess(actor, id);
    if (!CLOSED_STAGES.has(opp.stage)) {
      throw new BadRequestException('商机未关闭');
    }
    const updated = await this.prisma.opportunity.update({
      where: { id: BigInt(id) },
      data: { stage: STAGE_ORDER[STAGE_ORDER.length - 1], closeReason: null },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    return this.serialize(updated);
  }

  async exportCsv(actor: CurrentUserPayload, query: QueryOpportunitiesDto): Promise<string> {
    const scopeWhere = this.buildOpportunityScope(actor);
    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      ...scopeWhere,
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.customerId ? { customerId: BigInt(query.customerId) } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: 'insensitive' } },
              { customer: { name: { contains: query.keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const STAGE_LABEL: Record<string, string> = {
      initial_contact: '初步接触', needs_analysis: '需求确认', proposal: '方案报价',
      negotiation: '谈判中', closed_won: '赢单', closed_lost: '输单',
    };
    const CONTRACT_LABEL: Record<string, string> = { none: '未上传', uploaded: '已上传', signed: '已签署' };

    const items = await this.prisma.opportunity.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    const header = ['商机名称', '客户', '金额', '阶段', '合同状态', '负责人', '预计成交日', '输单原因', '创建时间'];
    const rows = items.map((o: any) => [
      o.title,
      o.customer?.name ?? '',
      o.amount?.toString() ?? '0',
      STAGE_LABEL[o.stage] ?? o.stage,
      CONTRACT_LABEL[o.contractStatus ?? 'none'] ?? '未上传',
      o.owner?.name ?? '',
      o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString('zh-CN') : '',
      o.closeReason ?? '',
      new Date(o.createdAt).toLocaleDateString('zh-CN'),
    ]);

    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header, ...rows].map((r) => r.map(escape).join(','));
    return '﻿' + lines.join('\r\n');
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private buildOpportunityScope(actor: CurrentUserPayload): Prisma.OpportunityWhereInput {
    if (actor.role === 'admin') return {};
    if (actor.role === 'director' || actor.role === 'manager') {
      if (!actor.departmentId) return { ownerId: BigInt(actor.sub) };
      return { customer: { owner: { departmentId: BigInt(actor.departmentId) } } };
    }
    return { ownerId: BigInt(actor.sub) };
  }

  private async assertCustomerAccess(actor: CurrentUserPayload, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(customerId), deletedAt: null },
      include: { owner: true },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    this.scopeService.assertCanRead(actor, customer);
    return customer;
  }

  private async assertOpportunityAccess(actor: CurrentUserPayload, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: { customer: { include: { owner: { select: { id: true, name: true, departmentId: true } } } } },
    });
    if (!opp) throw new NotFoundException('商机不存在');
    this.scopeService.assertCanRead(actor, {
      ownerId: opp.customer.ownerId,
      owner: opp.customer.owner,
    });
    return opp;
  }

  private serialize(o: any) {
    const { orders: _ord, quotations: _quo, customer, owner, ...scalars } = o;
    const base = {
      ...scalars,
      id: o.id?.toString(),
      customerId: o.customerId?.toString(),
      ownerId: o.ownerId?.toString(),
      amount: o.amount?.toString?.() ?? o.amount,
      contractStatus: o.contractStatus ?? 'none',
      contractUrl: o.contractUrl ?? null,
      owner: owner ? { id: owner.id?.toString(), name: owner.name } : undefined,
      customer: customer ? { id: customer.id?.toString(), name: customer.name } : undefined,
    };
    return toJsonSerializable(base);
  }
}
