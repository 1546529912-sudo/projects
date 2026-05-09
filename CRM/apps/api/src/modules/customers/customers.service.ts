import * as XLSX from 'xlsx';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import { CustomersRepository } from './customers.repository';
import { AuditLogService } from '../../common/services/audit-log.service';
import { BusinessEventService } from '../../common/services/business-event.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { InlineFieldsDto } from './dto/inline-fields.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { WorkflowService } from '../workflow/workflow.service';
import { toJsonSerializable } from '../../common/utils/json-serialize.util';

const STATUS_LABEL: Record<string, string> = {
  following: '跟进中', interested: '有意向', negotiating: '谈判中', won: '已成交', lost: '已丢失',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  following: ['interested', 'negotiating', 'won', 'lost'],
  interested: ['negotiating', 'won', 'lost'],
  negotiating: ['won', 'lost'],
  won: ['negotiating', 'following', 'interested'],  // requires manager approval for sales
  lost: ['following', 'interested'],
};

const LEAD_IMPORT_SOURCE_MAP: Record<string, string> = {
  转介绍: 'referral',
  社交: 'social',
  展会: 'exhibition',
  广告: 'ad',
  来访: 'inbound',
  其他: 'other',
};

function normalizeLeadImportSource(raw: string): string {
  const s = raw.trim();
  if (!s) return 'other';
  if (LEAD_IMPORT_SOURCE_MAP[s]) return LEAD_IMPORT_SOURCE_MAP[s];
  return s;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly repo: CustomersRepository,
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
    private readonly audit: AuditLogService,
    private readonly bizEvent: BusinessEventService,
    private readonly workflow: WorkflowService,
  ) {}

  async list(actor: CurrentUserPayload, query: QueryCustomersDto) {
    const scopeWhere = this.scopeService.buildWhere(actor);
    const result = await this.repo.findMany(scopeWhere, query);
    return {
      items: result.items.map(this.serialize),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };
  }

  async detail(actor: CurrentUserPayload, id: string) {
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException();
    const collaboratorUserIds = (customer.collaborators ?? []).map((c: any) => c.userId.toString());
    this.scopeService.assertCanRead(actor, customer, collaboratorUserIds);
    return this.serialize(customer);
  }

  private async generateAutoNumbers(entityType: string, existingFields: Record<string, any> = {}): Promise<Record<string, any>> {
    const defs = await this.prisma.customFieldDef.findMany({
      where: { entityType, fieldType: 'autonumber', isActive: true },
    });
    const result: Record<string, any> = { ...existingFields };
    for (const def of defs) {
      if (result[def.fieldKey]) continue; // already has a value
      const seqKey = `autonumber_seq_${entityType}_${def.fieldKey}`;
      const cfgRow = await this.prisma.systemConfig.upsert({
        where: { key: seqKey },
        create: { key: seqKey, value: 1 },
        update: { value: { increment: 1 } as any },
      });
      const seq = Number(cfgRow.value);
      // Pattern in options, e.g. "CUST-{seq:4}" → "CUST-0001"
      const pattern = def.options ?? '{seq:4}';
      const match = pattern.match(/\{seq:(\d+)\}/);
      const width = match ? parseInt(match[1]) : 4;
      const seqStr = String(seq).padStart(width, '0');
      result[def.fieldKey] = pattern.replace(/\{seq:\d+\}/, seqStr);
    }
    return result;
  }

  async create(actor: CurrentUserPayload, dto: CreateCustomerDto) {
    if (actor.role !== 'admin' && actor.role !== 'director') {
      throw new BadRequestException(
        '客户须由线索「转化为客户」生成：请先在「线索管理」录入线索，再在线索详情中转化为客户。（管理员/总监可直接建档，用于历史数据或例外处理。）',
      );
    }
    const ownerId = BigInt(dto.ownerId ?? actor.sub);
    const mergedCustomFields = await this.generateAutoNumbers('customer', dto.customFields ?? {});
    const customer = await this.repo.create({
      name: dto.name,
      shortName: dto.shortName,
      companyName: dto.companyName,
      primaryContactName: dto.primaryContactName,
      primaryPhone: dto.primaryPhone,
      primaryEmail: dto.primaryEmail,
      level: (dto.level ?? 'C') as any,
      sourceCategory: dto.sourceCategory,
      sourceDetail: dto.sourceDetail,
      industry: dto.industry,
      companySize: dto.companySize,
      region: dto.region,
      owner: { connect: { id: ownerId } },
      ...(Object.keys(mergedCustomFields).length > 0 ? { customFields: mergedCustomFields } : {}),
    });
    const idStr = customer.id.toString();
    void this.workflow
      .trigger('customer.created', 'customer', idStr, {
        ownerId: customer.ownerId?.toString() ?? ownerId.toString(),
        status: customer.status,
        level: customer.level ?? '',
        region: customer.region ?? '',
        name: customer.name,
      })
      .catch((e) => this.logger.warn(`workflow trigger customer.created: ${e}`));
    return this.serialize(customer);
  }

  async update(actor: CurrentUserPayload, id: string, dto: UpdateCustomerDto) {
    const existing = await this.assertExistsAndCanWrite(actor, id);

    // Sales role cannot modify source fields
    if (actor.role === 'sales' && (dto.sourceCategory !== undefined || dto.sourceDetail !== undefined)) {
      throw new ForbiddenException('销售员无权修改来源信息，请联系主管');
    }

    const updated = await this.repo.update(BigInt(id), {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
      ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
      ...(dto.primaryContactName !== undefined ? { primaryContactName: dto.primaryContactName } : {}),
      ...(dto.primaryPhone !== undefined ? { primaryPhone: dto.primaryPhone } : {}),
      ...(dto.primaryEmail !== undefined ? { primaryEmail: dto.primaryEmail } : {}),
      ...(dto.level !== undefined ? { level: dto.level as any } : {}),
      ...(dto.sourceCategory !== undefined ? { sourceCategory: dto.sourceCategory } : {}),
      ...(dto.sourceDetail !== undefined ? { sourceDetail: dto.sourceDetail } : {}),
      ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
      ...(dto.companySize !== undefined ? { companySize: dto.companySize } : {}),
      ...(dto.region !== undefined ? { region: dto.region } : {}),
      ...(dto.ownerId !== undefined ? { owner: { connect: { id: BigInt(dto.ownerId) } } } : {}),
    });
    return this.serialize(updated);
  }

  async inlineFields(actor: CurrentUserPayload, id: string, dto: InlineFieldsDto) {
    await this.assertExistsAndCanWrite(actor, id);
    const updated = await this.repo.update(BigInt(id), {
      ...(dto.level !== undefined ? { level: dto.level as any } : {}),
      ...(dto.ownerId !== undefined ? { owner: { connect: { id: BigInt(dto.ownerId) } } } : {}),
    });
    return this.serialize(updated);
  }

  async updateBant(actor: CurrentUserPayload, id: string, dto: { bantBudget?: number; bantAuthority?: number; bantNeed?: number; bantTimeline?: number; bantNotes?: string }) {
    await this.assertExistsAndCanWrite(actor, id);
    const updated = await this.prisma.customer.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.bantBudget !== undefined ? { bantBudget: dto.bantBudget } : {}),
        ...(dto.bantAuthority !== undefined ? { bantAuthority: dto.bantAuthority } : {}),
        ...(dto.bantNeed !== undefined ? { bantNeed: dto.bantNeed } : {}),
        ...(dto.bantTimeline !== undefined ? { bantTimeline: dto.bantTimeline } : {}),
        ...(dto.bantNotes !== undefined ? { bantNotes: dto.bantNotes } : {}),
      },
    });
    const total = (updated.bantBudget ?? 0) + (updated.bantAuthority ?? 0) + (updated.bantNeed ?? 0) + (updated.bantTimeline ?? 0);
    const suggestedLevel = total >= 13 ? 'A' : total >= 9 ? 'B' : total >= 5 ? 'C' : 'D';
    return {
      bantBudget: updated.bantBudget,
      bantAuthority: updated.bantAuthority,
      bantNeed: updated.bantNeed,
      bantTimeline: updated.bantTimeline,
      bantNotes: updated.bantNotes,
      totalScore: total,
      suggestedLevel,
    };
  }

  async updateScotsman(actor: CurrentUserPayload, id: string, dto: {
    scotsmanSituation?: number; scotsmanCompetition?: number; scotsmanOpportunity?: number;
    scotsmanTimescale?: number; scotsmanSize?: number; scotsmanMotivation?: number;
    scotsmanAuthority?: number; scotsmanNeed?: number; scotsmanNotes?: string;
  }) {
    await this.assertExistsAndCanWrite(actor, id);
    const updated = await this.prisma.customer.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.scotsmanSituation !== undefined ? { scotsmanSituation: dto.scotsmanSituation } : {}),
        ...(dto.scotsmanCompetition !== undefined ? { scotsmanCompetition: dto.scotsmanCompetition } : {}),
        ...(dto.scotsmanOpportunity !== undefined ? { scotsmanOpportunity: dto.scotsmanOpportunity } : {}),
        ...(dto.scotsmanTimescale !== undefined ? { scotsmanTimescale: dto.scotsmanTimescale } : {}),
        ...(dto.scotsmanSize !== undefined ? { scotsmanSize: dto.scotsmanSize } : {}),
        ...(dto.scotsmanMotivation !== undefined ? { scotsmanMotivation: dto.scotsmanMotivation } : {}),
        ...(dto.scotsmanAuthority !== undefined ? { scotsmanAuthority: dto.scotsmanAuthority } : {}),
        ...(dto.scotsmanNeed !== undefined ? { scotsmanNeed: dto.scotsmanNeed } : {}),
        ...(dto.scotsmanNotes !== undefined ? { scotsmanNotes: dto.scotsmanNotes } : {}),
      },
    });
    const fields = [updated.scotsmanSituation, updated.scotsmanCompetition, updated.scotsmanOpportunity,
      updated.scotsmanTimescale, updated.scotsmanSize, updated.scotsmanMotivation,
      updated.scotsmanAuthority, updated.scotsmanNeed];
    const filled = fields.filter((v) => v !== null && v !== undefined);
    const totalScore = filled.reduce((s, v) => s + (v ?? 0), 0);
    const maxScore = filled.length * 5;
    return {
      scotsmanSituation: updated.scotsmanSituation,
      scotsmanCompetition: updated.scotsmanCompetition,
      scotsmanOpportunity: updated.scotsmanOpportunity,
      scotsmanTimescale: updated.scotsmanTimescale,
      scotsmanSize: updated.scotsmanSize,
      scotsmanMotivation: updated.scotsmanMotivation,
      scotsmanAuthority: updated.scotsmanAuthority,
      scotsmanNeed: updated.scotsmanNeed,
      scotsmanNotes: updated.scotsmanNotes,
      totalScore,
      maxScore,
    };
  }

  async changeStatus(actor: CurrentUserPayload, id: string, dto: ChangeStatusDto) {
    const customer = await this.assertExistsAndCanWrite(actor, id);
    const allowed = ALLOWED_TRANSITIONS[customer.status as string] ?? [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(`不允许从 ${customer.status} 流转到 ${dto.toStatus}`);
    }

    // Rollback from "won" requires manager approval for sales role
    const isRollback = customer.status === 'won';
    if (isRollback && actor.role === 'sales') {
      await this.prisma.statusRollbackRequest.create({
        data: {
          customerId: BigInt(id),
          fromStatus: customer.status as string,
          toStatus: dto.toStatus,
          reason: dto.reason,
          requestedBy: BigInt(actor.sub),
        },
      });
      this.bizEvent.log({
        objectType: 'customer',
        objectId: id,
        eventType: 'status_rollback_requested',
        title: `申请状态回退：已成交 → ${STATUS_LABEL[dto.toStatus] ?? dto.toStatus}，待主管审批`,
        createdBy: actor.sub,
      });
      return { pendingApproval: true };
    }

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: BigInt(id) },
        data: { status: dto.toStatus as any },
      }),
      this.prisma.customerStatusHistory.create({
        data: {
          customerId: BigInt(id),
          fromStatus: customer.status as string,
          toStatus: dto.toStatus,
          triggerType: dto.triggerType as any,
          reason: dto.reason,
          changedBy: BigInt(actor.sub),
        },
      }),
    ]);
    this.bizEvent.log({
      objectType: 'customer',
      objectId: id,
      eventType: 'status_changed',
      title: `状态变更：${STATUS_LABEL[customer.status as string] ?? customer.status} → ${STATUS_LABEL[dto.toStatus] ?? dto.toStatus}`,
      createdBy: actor.sub,
    });
    void this.workflow
      .trigger('customer.status_changed', 'customer', id, {
        ownerId: customer.ownerId?.toString(),
        fromStatus: customer.status as string,
        status: dto.toStatus,
        region: customer.region ?? '',
        level: customer.level ?? '',
        name: customer.name,
      })
      .catch((e) => this.logger.warn(`workflow trigger customer.status_changed: ${e}`));
    return this.detail(actor, id);
  }

  async listRollbackRequests(actor: CurrentUserPayload, status?: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const where = { ...(status ? { status } : {}) };
    const items = await this.prisma.statusRollbackRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, status: true } },
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
    return toJsonSerializable(
      items.map((r) => ({
        id: r.id.toString(),
        customerId: r.customerId.toString(),
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        reason: r.reason,
        status: r.status,
        requestedBy: r.requestedBy.toString(),
        reviewedBy: r.reviewedBy != null ? r.reviewedBy.toString() : null,
        reviewNote: r.reviewNote,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        customer: r.customer
          ? { id: r.customer.id.toString(), name: r.customer.name, status: r.customer.status }
          : null,
        requester: r.requester ? { id: r.requester.id.toString(), name: r.requester.name } : null,
        reviewer: r.reviewer ? { id: r.reviewer.id.toString(), name: r.reviewer.name } : null,
      })),
    );
  }

  async reviewRollbackRequest(actor: CurrentUserPayload, requestId: string, approved: boolean, note?: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const req = await this.prisma.statusRollbackRequest.findFirst({
      where: { id: BigInt(requestId), status: 'pending' },
    });
    if (!req) throw new NotFoundException('审批请求不存在或已处理');

    const newStatus = approved ? 'approved' : 'rejected';
    await this.prisma.statusRollbackRequest.update({
      where: { id: BigInt(requestId) },
      data: { status: newStatus, reviewedBy: BigInt(actor.sub), reviewNote: note, reviewedAt: new Date() },
    });

    if (approved) {
      await this.prisma.$transaction([
        this.prisma.customer.update({ where: { id: req.customerId }, data: { status: req.toStatus as any } }),
        this.prisma.customerStatusHistory.create({
          data: {
            customerId: req.customerId,
            fromStatus: req.fromStatus,
            toStatus: req.toStatus,
            triggerType: 'manual',
            reason: `主管 ${actor.sub} 审批通过：${note ?? ''}`,
            changedBy: BigInt(actor.sub),
          },
        }),
      ]);
      this.bizEvent.log({
        objectType: 'customer',
        objectId: req.customerId.toString(),
        eventType: 'status_rollback_approved',
        title: `状态回退审批通过：已成交 → ${STATUS_LABEL[req.toStatus] ?? req.toStatus}`,
        createdBy: actor.sub,
      });
    } else {
      this.bizEvent.log({
        objectType: 'customer',
        objectId: req.customerId.toString(),
        eventType: 'status_rollback_rejected',
        title: `状态回退申请被拒绝，客户状态保持不变`,
        createdBy: actor.sub,
      });
    }

    return { ok: true, approved };
  }

  async checkDuplicates(params: {
    phone?: string;
    email?: string;
    companyName?: string;
    contactName?: string;
    excludeCustomerId?: string;
  }, actor: CurrentUserPayload) {
    const matches = await this.repo.checkDuplicates({
      phone: params.phone,
      email: params.email,
      companyName: params.companyName,
      contactName: params.contactName,
      excludeId: params.excludeCustomerId ? BigInt(params.excludeCustomerId) : undefined,
    });

    return matches.map((m) => ({
      id: m.id.toString(),
      name: m.name,
      primaryPhone: m.primaryPhone,
      primaryEmail: m.primaryEmail,
      companyName: m.companyName,
      primaryContactName: m.primaryContactName,
      isOwn: m.ownerId.toString() === actor.sub,
    }));
  }

  async exportCsv(actor: CurrentUserPayload, query: QueryCustomersDto, approvalId?: string): Promise<string> {
    if (actor.role === 'sales') throw new ForbiddenException('销售员无权导出');

    // manager (team leader) must have an approved export approval token; director/admin can export directly
    if (actor.role === 'manager') {
      if (!approvalId) throw new ForbiddenException('主管导出需提供审批记录 ID');
      const approval = await this.prisma.exportApproval.findFirst({
        where: { id: BigInt(approvalId), requestedBy: BigInt(actor.sub), status: 'approved' },
      });
      if (!approval) throw new ForbiddenException('找不到有效的导出审批，请重新申请');
      // Mark used immediately to prevent re-use
      await this.prisma.exportApproval.update({
        where: { id: BigInt(approvalId) },
        data: { status: 'used' },
      });
    }

    const scopeWhere = this.scopeService.buildWhere(actor);
    const result = await this.repo.findMany(scopeWhere, { ...query, page: 1, pageSize: 5000 });

    const LEVEL_LABEL: Record<string, string> = { A: 'A级', B: 'B级', C: 'C级', D: 'D级' };

    const header = ['客户名称', '简称', '公司名称', '联系人', '手机号', '邮箱', '级别', '状态', '负责人', '创建时间'];
    const rows = result.items.map((c: any) => [
      c.name,
      c.shortName ?? '',
      c.companyName ?? '',
      c.primaryContactName ?? '',
      c.primaryPhone ?? '',
      c.primaryEmail ?? '',
      LEVEL_LABEL[c.level] ?? c.level,
      STATUS_LABEL[c.status] ?? c.status,
      c.owner?.name ?? '',
      new Date(c.createdAt).toLocaleDateString('zh-CN'),
    ]);

    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header, ...rows].map((r) => r.map(escape).join(','));

    void this.audit.log({
      actorId: actor.sub,
      action: 'export_customers',
      resourceType: 'customer',
      afterData: { count: rows.length, approvalId: approvalId ?? null, scope: 'bulk' },
    });

    return '﻿' + lines.join('\r\n'); // BOM for Excel
  }

  async transfer(actor: CurrentUserPayload, id: string, newOwnerId: string) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员不能转移客户');
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    if (actor.role === 'manager' || actor.role === 'director') {
      this.scopeService.assertCanWrite(actor, customer);
    }
    const updated = await this.repo.update(BigInt(id), {
      owner: { connect: { id: BigInt(newOwnerId) } },
    });
    this.audit.log({
      actorId: actor.sub,
      action: 'transfer_customer',
      resourceType: 'customer',
      resourceId: id,
      beforeData: { ownerId: customer.ownerId.toString() },
      afterData: { ownerId: newOwnerId },
    });
    void this.workflow
      .trigger('customer.assigned', 'customer', id, { ownerId: newOwnerId, region: (updated as any).region, industry: (updated as any).industry })
      .catch((e) => this.logger.warn(`workflow trigger customer.assigned: ${e}`));
    return this.serialize(updated);
  }

  async batchTransfer(actor: CurrentUserPayload, fromUserId: string, toUserId: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const result = await this.prisma.customer.updateMany({
      where: { ownerId: BigInt(fromUserId), deletedAt: null },
      data: { ownerId: BigInt(toUserId) },
    });
    this.audit.log({
      actorId: actor.sub,
      action: 'batch_transfer_customers',
      resourceType: 'user',
      resourceId: fromUserId,
      afterData: { toUserId, count: result.count },
    });
    return { transferred: result.count };
  }

  async archive(actor: CurrentUserPayload, id: string, reason: string) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员不能归档客户');
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    if (customer.archivedAt) throw new BadRequestException('客户已归档');
    const updated = await this.repo.update(BigInt(id), {
      archivedAt: new Date(),
      archiveReason: reason,
    });
    this.bizEvent.log({ objectType: 'customer', objectId: id, eventType: 'customer_archived', title: `客户已归档：${reason}`, createdBy: actor.sub });
    return this.serialize(updated);
  }

  async unarchive(actor: CurrentUserPayload, id: string) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员不能操作归档');
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    if (!customer.archivedAt) throw new BadRequestException('客户未归档');
    const updated = await this.repo.update(BigInt(id), {
      archivedAt: null,
      archiveReason: null,
    });
    this.bizEvent.log({ objectType: 'customer', objectId: id, eventType: 'customer_unarchived', title: '客户已解除归档', createdBy: actor.sub });
    return this.serialize(updated);
  }

  async listBusinessEvents(_actor: CurrentUserPayload, id: string) {
    return this.bizEvent.listByCustomer(id);
  }

  async listSuspectedDuplicates(actor: CurrentUserPayload, page = 1, pageSize = 20) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where: { duplicateStatus: 'suspected', deletedAt: null } }),
      this.prisma.customer.findMany({
        where: { duplicateStatus: 'suspected', deletedAt: null },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true } } },
      }),
    ]);
    return { total, items: items.map(this.serialize.bind(this)) };
  }

  async ignoreDuplicate(actor: CurrentUserPayload, id: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const updated = await this.repo.update(BigInt(id), { duplicateStatus: 'ignored' as any });
    return this.serialize(updated);
  }

  async confirmDuplicate(actor: CurrentUserPayload, id: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const updated = await this.repo.update(BigInt(id), { duplicateStatus: 'confirmed' as any });
    return this.serialize(updated);
  }

  async deleteDuplicate(actor: CurrentUserPayload, id: string, transferToId?: string) {
    if (actor.role === 'sales') throw new ForbiddenException('仅主管或管理员可删除重复客户');
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');

    const followUpCount = await this.prisma.followUpRecord.count({
      where: { customerId: BigInt(id), deletedAt: null },
    });

    if (transferToId) {
      const target = await this.repo.findById(BigInt(transferToId));
      if (!target) throw new NotFoundException('转移目标客户不存在');
      await this.prisma.followUpRecord.updateMany({
        where: { customerId: BigInt(id), deletedAt: null },
        data: { customerId: BigInt(transferToId) },
      });
      this.bizEvent.log({
        objectType: 'customer',
        objectId: transferToId,
        eventType: 'follow_up_transferred',
        title: `从重复客户「${customer.name}」转移了 ${followUpCount} 条跟进记录`,
        createdBy: actor.sub,
      });
    }

    await this.repo.update(BigInt(id), { deletedAt: new Date() });
    void this.audit.log({
      actorId: actor.sub,
      action: 'delete_customer',
      resourceType: 'customer',
      resourceId: id,
      beforeData: { name: customer.name },
      afterData: { reason: 'duplicate', transferToId: transferToId ?? null },
    });
    return { deleted: true, followUpCount, transferred: !!transferToId };
  }

  async mergeCustomers(actor: CurrentUserPayload, masterId: string, mergeId: string) {
    if (actor.role === 'sales') throw new ForbiddenException('仅主管或管理员可合并客户');
    const master = await this.repo.findById(BigInt(masterId));
    if (!master) throw new NotFoundException('主客户不存在');
    const duplicate = await this.repo.findById(BigInt(mergeId));
    if (!duplicate) throw new NotFoundException('被合并客户不存在');
    if (masterId === mergeId) throw new BadRequestException('不能将客户合并到自身');

    await this.prisma.$transaction(async (tx) => {
      // Transfer follow-up records
      await tx.followUpRecord.updateMany({
        where: { customerId: BigInt(mergeId), deletedAt: null },
        data: { customerId: BigInt(masterId) },
      });
      // Transfer contacts
      await tx.contact.updateMany({
        where: { customerId: BigInt(mergeId), deletedAt: null },
        data: { customerId: BigInt(masterId) },
      });
      // Transfer opportunities
      await tx.opportunity.updateMany({
        where: { customerId: BigInt(mergeId), deletedAt: null },
        data: { customerId: BigInt(masterId) },
      });
      // Soft-delete the merged customer
      await tx.customer.update({
        where: { id: BigInt(mergeId) },
        data: { deletedAt: new Date(), duplicateStatus: 'merged' as any },
      });
      // Mark master as confirmed (no longer suspected)
      await tx.customer.update({
        where: { id: BigInt(masterId) },
        data: { duplicateStatus: 'confirmed' as any },
      });
    });

    this.bizEvent.log({
      objectType: 'customer',
      objectId: masterId,
      eventType: 'customer_merged',
      title: `已将客户「${duplicate.name}」合并到本客户，记录已整合`,
      createdBy: actor.sub,
    });

    this.audit.log({
      actorId: actor.sub,
      action: 'merge_customers',
      resourceType: 'customer',
      resourceId: masterId,
      afterData: { mergedId: mergeId, mergedName: duplicate.name },
    });

    return { merged: true, masterId, mergeId };
  }

  async getMergeSuggestion(actor: CurrentUserPayload, id: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: { _count: { select: { followUps: true } } },
    });
    if (!customer) throw new NotFoundException('客户不存在');

    // Find similar customers by phone or email or company name
    const orClauses: any[] = [];
    if (customer.primaryPhone) orClauses.push({ primaryPhone: customer.primaryPhone });
    if (customer.primaryEmail) orClauses.push({ primaryEmail: customer.primaryEmail });
    if (customer.companyName) orClauses.push({ companyName: customer.companyName });

    if (orClauses.length === 0) return { suggestion: null, candidates: [] };

    const candidates = await this.prisma.customer.findMany({
      where: {
        AND: [
          { deletedAt: null },
          { id: { not: BigInt(id) } },
          { OR: orClauses },
        ],
      },
      include: { _count: { select: { followUps: true } } },
      take: 5,
    });

    if (candidates.length === 0) return { suggestion: null, candidates: [] };

    const score = (c: any) => {
      const levelScore = { A: 4, B: 3, C: 2, D: 1 }[c.level as string] ?? 1;
      const statusScore = { won: 5, negotiating: 4, interested: 3, following: 2, lost: 1 }[c.status as string] ?? 1;
      const completeness = [c.primaryPhone, c.primaryEmail, c.companyName, c.primaryContactName, c.region]
        .filter(Boolean).length;
      return (c._count.followUps * 10) + (levelScore * 3) + (statusScore * 2) + completeness;
    };

    const selfScore = score(customer);
    const sorted = [...candidates].sort((a, b) => score(b) - score(a));
    const best = sorted[0];
    const bestScore = score(best);

    // Recommend keeping the one with higher score as primary
    const recommendedPrimary = bestScore >= selfScore ? best : customer;
    const recommendedMerge = recommendedPrimary.id === customer.id ? best : customer;

    return {
      suggestion: {
        primaryId: recommendedPrimary.id.toString(),
        primaryName: recommendedPrimary.name,
        mergeId: recommendedMerge.id.toString(),
        mergeName: recommendedMerge.name,
        reason: bestScore >= selfScore
          ? `「${best.name}」跟进记录更多或数据更完整，建议作为主记录保留`
          : `当前客户数据更完整，建议保留为主记录`,
      },
      candidates: sorted.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        level: c.level,
        status: c.status,
        followUpCount: c._count.followUps,
        score: score(c),
      })),
    };
  }

  async listCollaborators(actor: CurrentUserPayload, id: string) {
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    this.scopeService.assertCanRead(actor, customer);
    const collabs = await this.prisma.customerCollaborator.findMany({
      where: { customerId: BigInt(id) },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return collabs.map((c) => ({
      id: c.id.toString(),
      userId: c.userId.toString(),
      user: { ...c.user, id: c.user.id.toString() },
      createdAt: c.createdAt,
    }));
  }

  async addCollaborator(actor: CurrentUserPayload, id: string, userId: string) {
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    if (actor.role === 'sales' && customer.ownerId.toString() !== actor.sub) {
      throw new ForbiddenException('只有客户负责人或主管才能添加协作者');
    }
    if (userId === customer.ownerId.toString()) {
      throw new BadRequestException('负责人已是客户归属人，无需添加为协作者');
    }
    const user = await this.prisma.user.findUnique({ where: { id: BigInt(userId) } });
    if (!user) throw new NotFoundException('用户不存在');
    const existing = await this.prisma.customerCollaborator.findUnique({
      where: { customerId_userId: { customerId: BigInt(id), userId: BigInt(userId) } },
    });
    if (existing) throw new BadRequestException('该用户已是协作者');
    const collab = await this.prisma.customerCollaborator.create({
      data: { customerId: BigInt(id), userId: BigInt(userId), addedById: BigInt(actor.sub) },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return { id: collab.id.toString(), userId: collab.userId.toString(), user: { ...collab.user, id: collab.user.id.toString() }, createdAt: collab.createdAt };
  }

  async removeCollaborator(actor: CurrentUserPayload, id: string, userId: string) {
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException('客户不存在');
    if (actor.role === 'sales' && customer.ownerId.toString() !== actor.sub) {
      throw new ForbiddenException('只有客户负责人或主管才能移除协作者');
    }
    await this.prisma.customerCollaborator.deleteMany({
      where: { customerId: BigInt(id), userId: BigInt(userId) },
    });
    return { removed: true };
  }

  private async assertExistsAndCanWrite(actor: CurrentUserPayload, id: string) {
    const customer = await this.repo.findById(BigInt(id));
    if (!customer) throw new NotFoundException();
    this.scopeService.assertCanWrite(actor, customer);
    return customer;
  }

  private serialize(customer: any) {
    if (!customer) return null;
    const {
      id,
      ownerId,
      sourceLeadId,
      owner,
      contacts,
      followUps,
      opportunities,
      orders,
      statusHistories,
      sourceLead,
      collaborators,
      ...scalars
    } = customer;
    const out = {
      ...scalars,
      id: id?.toString(),
      ownerId: ownerId?.toString(),
      sourceLeadId: sourceLeadId?.toString() ?? null,
      collaborators: (collaborators ?? []).map((x: { userId: bigint }) => ({
        userId: x.userId?.toString(),
      })),
      owner: owner
        ? { id: owner.id?.toString(), name: owner.name, role: owner.role }
        : undefined,
      contacts: contacts?.map((c: any) => ({
        ...c,
        id: c.id?.toString(),
        customerId: c.customerId?.toString(),
      })),
      followUps: followUps?.map((f: any) => ({
        ...f,
        id: f.id?.toString(),
        customerId: f.customerId?.toString(),
        contactId: f.contactId?.toString() ?? null,
        ownerId: f.ownerId?.toString(),
        owner: f.owner ? { id: f.owner.id?.toString(), name: f.owner.name } : undefined,
      })),
      opportunities: opportunities?.map((o: any) => ({
        ...o,
        id: o.id?.toString(),
        customerId: o.customerId?.toString(),
        ownerId: o.ownerId?.toString(),
        amount: o.amount?.toString?.() ?? o.amount,
        owner: o.owner ? { ...o.owner, id: o.owner.id?.toString() } : undefined,
      })),
      orders: orders?.map((o: any) => ({
        ...o,
        id: o.id?.toString(),
        customerId: o.customerId?.toString(),
        opportunityId: o.opportunityId?.toString() ?? null,
        amount: o.amount?.toString?.() ?? o.amount,
        paidAmount: o.paidAmount?.toString?.() ?? o.paidAmount,
      })),
      statusHistories: statusHistories?.map((h: any) => ({
        ...h,
        id: h.id?.toString(),
        customerId: h.customerId?.toString(),
        changedBy: h.changedBy?.toString() ?? null,
      })),
      sourceLead: sourceLead
        ? { ...sourceLead, id: sourceLead.id?.toString() }
        : null,
    };
    return toJsonSerializable(out);
  }

  buildImportTemplate(): Buffer {
    const headers = [['客户名称', '简称', '公司名称', '联系人姓名', '手机号', '邮箱', '级别(A/B/C/D)', '来源大类', '来源详情']];
    const example = [['张三科技', '张三', '张三科技有限公司', '张三', '13800138000', 'zhang@example.com', 'B', 'referral', '老客户推荐']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '客户导入模板');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  private async leadImportDuplicateHints(params: {
    phone?: string;
    email?: string;
    companyName?: string;
    contactName?: string;
  }): Promise<boolean> {
    if (params.phone) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({
          where: { phone: params.phone, deletedAt: null },
          select: { id: true },
          take: 1,
        }),
        this.prisma.customer.findMany({
          where: { primaryPhone: params.phone, deletedAt: null },
          select: { id: true },
          take: 1,
        }),
      ]);
      if (leads.length || customers.length) return true;
    }
    if (params.email) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({
          where: { email: params.email, deletedAt: null },
          select: { id: true },
          take: 1,
        }),
        this.prisma.customer.findMany({
          where: { primaryEmail: params.email, deletedAt: null },
          select: { id: true },
          take: 1,
        }),
      ]);
      if (leads.length || customers.length) return true;
    }
    if (params.companyName && params.contactName) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({
          where: { companyName: params.companyName, contactName: params.contactName, deletedAt: null },
          select: { id: true },
          take: 1,
        }),
        this.prisma.customer.findMany({
          where: {
            companyName: params.companyName,
            primaryContactName: params.contactName,
            deletedAt: null,
          },
          select: { id: true },
          take: 1,
        }),
      ]);
      if (leads.length || customers.length) return true;
    }
    return false;
  }

  async importCustomers(actor: CurrentUserPayload, buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const results = {
      total: rows.length,
      imported: 0,
      duplicates: 0,
      errors: [] as Array<{ row: number; reason: string }>,
      importedAsLeads: true as const,
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const custName = String(r['客户名称'] ?? r['name'] ?? '').trim();
      const nameField = String(r['姓名'] ?? '').trim();
      const shortName = String(r['简称'] ?? r['shortName'] ?? '').trim();
      const companyName = String(r['公司名称'] ?? r['company'] ?? '').trim();
      const contactName = String(r['联系人姓名'] ?? r['contact'] ?? '').trim();
      const phone = String(r['手机号'] ?? r['phone'] ?? '').trim();
      const email = String(r['邮箱'] ?? r['email'] ?? '').trim();
      const srcRaw = String(r['来源'] ?? '').trim();
      const sourceCategoryRaw = String(r['来源大类'] ?? r['sourceCategory'] ?? '').trim();
      const sourceDetail = String(r['来源详情'] ?? r['sourceDetail'] ?? '').trim() || null;
      const sourceCategory = normalizeLeadImportSource(srcRaw || sourceCategoryRaw);

      const leadCompany = companyName || custName || null;
      const leadContact = contactName || nameField || shortName || null;
      const leadName = nameField || contactName || shortName || custName || null;

      if (!leadCompany && !phone && !leadContact) {
        results.errors.push({ row: i + 2, reason: '客户名称/公司名称/联系人、手机号至少填一项' });
        continue;
      }

      try {
        const hasDuplicate = await this.leadImportDuplicateHints({
          phone: phone || undefined,
          email: email || undefined,
          companyName: leadCompany || undefined,
          contactName: leadContact || undefined,
        });

        await this.prisma.lead.create({
          data: {
            name: leadName || null,
            companyName: leadCompany,
            contactName: leadContact,
            phone: phone || null,
            email: email || null,
            sourceCategory: sourceCategory || null,
            sourceDetail,
            status: hasDuplicate ? 'duplicate_suspected' : 'new',
            ownerId: BigInt(actor.sub),
          },
        });

        if (hasDuplicate) results.duplicates++;
        else results.imported++;
      } catch {
        results.errors.push({ row: i + 2, reason: '写入失败' });
      }
    }

    return results;
  }
}
