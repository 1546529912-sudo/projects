import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private assertAdmin(actor: CurrentUserPayload) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可操作');
  }

  // ── Users ────────────────────────────────────────────────────────────────

  async listUsers(actor: CurrentUserPayload, page = 1, pageSize = 20, keyword?: string) {
    this.assertAdmin(actor);
    const skip = (page - 1) * pageSize;
    const where = {
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              { phone: { contains: keyword } },
              { email: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: items.map(this.serializeUser),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async createUser(actor: CurrentUserPayload, dto: CreateUserDto) {
    this.assertAdmin(actor);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        role: dto.role as any,
        passwordHash,
        departmentId: dto.departmentId ? BigInt(dto.departmentId) : null,
        managerId: dto.managerId ? BigInt(dto.managerId) : null,
        salesRegion: dto.salesRegion ?? null,
        salesIndustry: dto.salesIndustry ?? null,
        salesGroup: dto.salesGroup ?? null,
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'create_user', resourceType: 'user', resourceId: user.id, afterData: { name: dto.name, role: dto.role } });
    return this.serializeUser(user);
  }

  async updateUser(actor: CurrentUserPayload, id: string, dto: UpdateUserDto) {
    this.assertAdmin(actor);
    const existing = await this.prisma.user.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!existing) throw new NotFoundException('用户不存在');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId ? BigInt(dto.departmentId) : null;
    if (dto.managerId !== undefined) data.managerId = dto.managerId ? BigInt(dto.managerId) : null;
    if (dto.salesRegion !== undefined) data.salesRegion = dto.salesRegion ?? null;
    if (dto.salesIndustry !== undefined) data.salesIndustry = dto.salesIndustry ?? null;
    if (dto.salesGroup !== undefined) data.salesGroup = dto.salesGroup ?? null;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data,
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    return this.serializeUser(updated);
  }

  async disableUser(actor: CurrentUserPayload, id: string) {
    this.assertAdmin(actor);
    if (id === actor.sub) throw new BadRequestException('不能禁用自己的账号');
    const updated = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { status: 'disabled' },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'disable_user', resourceType: 'user', resourceId: id, afterData: { status: 'disabled' } });
    return this.serializeUser(updated);
  }

  async enableUser(actor: CurrentUserPayload, id: string) {
    this.assertAdmin(actor);
    const updated = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { status: 'active', failedLoginCount: 0, lockedAt: null },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'enable_user', resourceType: 'user', resourceId: id, afterData: { status: 'active' } });
    return this.serializeUser(updated);
  }

  // ── Departments ──────────────────────────────────────────────────────────

  async listDepartments(actor: CurrentUserPayload) {
    this.assertAdmin(actor);
    const depts = await this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { parent: { select: { id: true, name: true } } },
    });
    return depts.map(this.serializeDept);
  }

  async createDepartment(actor: CurrentUserPayload, dto: CreateDepartmentDto) {
    this.assertAdmin(actor);
    const dept = await this.prisma.department.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
    return this.serializeDept(dept);
  }

  async deleteDepartment(actor: CurrentUserPayload, id: string) {
    this.assertAdmin(actor);
    const membersCount = await this.prisma.user.count({
      where: { departmentId: BigInt(id), deletedAt: null },
    });
    if (membersCount > 0) throw new BadRequestException('部门下还有成员，无法删除');
    await this.prisma.department.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ── Audit Logs ───────────────────────────────────────────────────────────

  async listAuditLogs(actor: CurrentUserPayload, page = 1, pageSize = 50) {
    this.assertAdmin(actor);
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      items: items.map((l) => ({
        id: l.id.toString(),
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId?.toString() ?? null,
        actor: l.actor ? { id: l.actor.id.toString(), name: l.actor.name } : null,
        afterData: l.afterData,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Handover (离职交接) ───────────────────────────────────────────────────

  async handoverUser(actor: CurrentUserPayload, fromUserId: string, toUserId: string) {
    this.assertAdmin(actor);
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: BigInt(fromUserId), deletedAt: null } }),
      this.prisma.user.findFirst({ where: { id: BigInt(toUserId), deletedAt: null, status: 'active' } }),
    ]);
    if (!fromUser) throw new NotFoundException('源用户不存在');
    if (!toUser) throw new NotFoundException('目标用户不存在或已被禁用');

    const [customerResult, oppResult] = await Promise.all([
      this.prisma.customer.updateMany({
        where: { ownerId: BigInt(fromUserId), deletedAt: null },
        data: { ownerId: BigInt(toUserId) },
      }),
      this.prisma.opportunity.updateMany({
        where: { ownerId: BigInt(fromUserId), deletedAt: null },
        data: { ownerId: BigInt(toUserId) },
      }),
    ]);

    this.audit.log({
      actorId: actor.sub,
      action: 'user_handover',
      resourceType: 'user',
      resourceId: fromUserId,
      afterData: { toUserId, customers: customerResult.count, opportunities: oppResult.count },
    });

    return {
      fromUserId,
      toUserId,
      transferredCustomers: customerResult.count,
      transferredOpportunities: oppResult.count,
    };
  }

  async disableWithHandover(actor: CurrentUserPayload, userId: string, toUserId?: string) {
    this.assertAdmin(actor);
    if (userId === actor.sub) throw new BadRequestException('不能禁用自己的账号');
    let handoverResult: any = null;
    if (toUserId) {
      handoverResult = await this.handoverUser(actor, userId, toUserId);
    }
    const updated = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { status: 'disabled' },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'disable_user', resourceType: 'user', resourceId: userId, afterData: { status: 'disabled' } });
    return { user: this.serializeUser(updated), handover: handoverResult };
  }

  // ── System Config ────────────────────────────────────────────────────────

  async getConfig(key: string) {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key } });
    return { key, value: cfg ? cfg.value : null };
  }

  async setConfig(actor: CurrentUserPayload, key: string, value: any) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可修改系统配置');
    const cfg = await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    this.audit.log({ actorId: actor.sub, action: 'set_system_config', resourceType: 'system_config', resourceId: key, afterData: { value } });
    return { key: cfg.key, value: cfg.value };
  }

  // ── Custom Fields ─────────────────────────────────────────────────────────

  async listCustomFields(entityType?: string) {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    const defs = await this.prisma.customFieldDef.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return defs.map((d) => ({ ...d, id: d.id.toString() }));
  }

  async createCustomField(actor: CurrentUserPayload, dto: { entityType: string; label: string; fieldKey: string; fieldType: string; options?: string; defaultValue?: string; conditionLogic?: any; required?: boolean; sortOrder?: number }) {
    this.assertAdmin(actor);
    const existing = await this.prisma.customFieldDef.findUnique({ where: { entityType_fieldKey: { entityType: dto.entityType, fieldKey: dto.fieldKey } } });
    if (existing) throw new BadRequestException('字段Key已存在');
    const def = await this.prisma.customFieldDef.create({
      data: {
        entityType: dto.entityType,
        label: dto.label,
        fieldKey: dto.fieldKey,
        fieldType: dto.fieldType,
        options: dto.options ?? null,
        defaultValue: dto.defaultValue ?? null,
        conditionLogic: dto.conditionLogic ?? null,
        required: dto.required ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'create_custom_field', resourceType: 'custom_field', resourceId: def.id.toString(), afterData: { entityType: dto.entityType, fieldKey: dto.fieldKey, label: dto.label } });
    return { ...def, id: def.id.toString() };
  }

  async updateCustomField(actor: CurrentUserPayload, id: string, dto: { label?: string; options?: string; defaultValue?: string | null; conditionLogic?: any; required?: boolean; sortOrder?: number; isActive?: boolean }) {
    this.assertAdmin(actor);
    // fieldKey is intentionally not updatable (backwards-compatibility protection)
    const def = await this.prisma.customFieldDef.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.options !== undefined ? { options: dto.options } : {}),
        ...(dto.defaultValue !== undefined ? { defaultValue: dto.defaultValue } : {}),
        ...(dto.conditionLogic !== undefined ? { conditionLogic: dto.conditionLogic } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'update_custom_field', resourceType: 'custom_field', resourceId: id, afterData: dto });
    return { ...def, id: def.id.toString() };
  }

  async deleteCustomField(actor: CurrentUserPayload, id: string) {
    this.assertAdmin(actor);
    // Soft-delete by deactivating; hard delete only if no data exists for this field
    await this.prisma.customFieldDef.update({ where: { id: BigInt(id) }, data: { isActive: false } });
    this.audit.log({ actorId: actor.sub, action: 'deactivate_custom_field', resourceType: 'custom_field', resourceId: id });
    return { deleted: true };
  }

  async checkEnumUsage(key: string, value: string): Promise<{ value: string; count: number; field: string }> {
    const fieldMap: Record<string, { model: string; field: string }> = {
      industry_types: { model: 'customer', field: 'industry' },
      company_sizes: { model: 'customer', field: 'companySize' },
      regions: { model: 'customer', field: 'region' },
    };
    const mapping = fieldMap[key];
    if (!mapping) return { value, count: 0, field: key };
    let count = 0;
    if (mapping.model === 'customer') {
      count = await this.prisma.customer.count({ where: { [mapping.field]: value, deletedAt: null } as any });
    }
    return { value, count, field: mapping.field };
  }

  // ── Serializers ──────────────────────────────────────────────────────────

  private serializeUser(u: any) {
    return {
      id: u.id?.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      departmentId: u.departmentId?.toString() ?? null,
      department: u.department ? { id: u.department.id?.toString(), name: u.department.name } : null,
      managerId: u.managerId?.toString() ?? null,
      manager: u.manager ? { id: u.manager.id?.toString(), name: u.manager.name } : null,
      salesRegion: u.salesRegion ?? null,
      salesIndustry: u.salesIndustry ?? null,
      salesGroup: u.salesGroup ?? null,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  }

  private serializeDept(d: any) {
    return {
      id: d.id?.toString(),
      name: d.name,
      parentId: d.parentId?.toString() ?? null,
      parent: d.parent ? { id: d.parent.id?.toString(), name: d.parent.name } : null,
      createdAt: d.createdAt,
    };
  }

  // ── Required Field Rules ─────────────────────────────────────────────────

  async listRequiredFieldRules(entityType?: string) {
    const rules = await this.prisma.requiredFieldRule.findMany({
      where: entityType ? { entityType } : {},
      orderBy: [{ entityType: 'asc' }, { fieldKey: 'asc' }],
    });
    return rules.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async createRequiredFieldRule(actor: CurrentUserPayload, dto: {
    entityType: string; fieldKey: string; fieldLabel: string;
    ruleType: string; stageValue?: string; roleValue?: string;
  }) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可配置必填规则');
    const rule = await this.prisma.requiredFieldRule.create({
      data: {
        entityType: dto.entityType,
        fieldKey: dto.fieldKey,
        fieldLabel: dto.fieldLabel,
        ruleType: dto.ruleType,
        stageValue: dto.stageValue ?? null,
        roleValue: dto.roleValue ?? null,
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'create_required_field_rule', resourceType: 'required_field_rule', resourceId: rule.id.toString(), afterData: dto });
    return { ...rule, id: rule.id.toString() };
  }

  async updateRequiredFieldRule(actor: CurrentUserPayload, id: string, dto: { isActive?: boolean; fieldLabel?: string }) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可配置必填规则');
    const rule = await this.prisma.requiredFieldRule.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.fieldLabel !== undefined ? { fieldLabel: dto.fieldLabel } : {}),
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'update_required_field_rule', resourceType: 'required_field_rule', resourceId: id, afterData: dto });
    return { ...rule, id: rule.id.toString() };
  }

  async deleteRequiredFieldRule(actor: CurrentUserPayload, id: string) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可配置必填规则');
    await this.prisma.requiredFieldRule.delete({ where: { id: BigInt(id) } });
    this.audit.log({ actorId: actor.sub, action: 'delete_required_field_rule', resourceType: 'required_field_rule', resourceId: id });
    return { deleted: true };
  }

  // ── Export Approvals ──────────────────────────────────────────────────────

  async listExportApprovals(actor: CurrentUserPayload, status?: string) {
    const where: any = {};
    if (status) where.status = status;
    // sales/manager only see their own requests; director/admin see all
    if (actor.role === 'manager' || actor.role === 'sales') where.requestedBy = BigInt(actor.sub);

    const items = await this.prisma.exportApproval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
    return items.map(this.serializeExportApproval);
  }

  async requestExportApproval(actor: CurrentUserPayload, dto: { scope?: string; filters?: Record<string, any> }) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员无权申请导出');
    if (actor.role === 'admin' || actor.role === 'director') throw new BadRequestException('管理员/总监可直接导出，无需审批');

    const approval = await this.prisma.exportApproval.create({
      data: {
        requestedBy: BigInt(actor.sub),
        scope: dto.scope ?? 'department',
        filters: (dto.filters ?? {}) as any,
        status: 'pending',
      },
      include: {
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    // Notify all admins
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['admin', 'director'] }, status: 'active', deletedAt: null },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'export_approval',
          title: '导出审批申请',
          body: `用户 #${actor.sub} 申请导出客户数据（范围：${dto.scope ?? 'department'}），请审批`,
          refType: 'export_approval',
          refId: approval.id,
          dedupKey: `export_approval:${approval.id}:admin:${admin.id}`,
        },
      });
    }

    return this.serializeExportApproval(approval);
  }

  async reviewExportApproval(actor: CurrentUserPayload, id: string, approved: boolean, note?: string) {
    if (actor.role !== 'admin' && actor.role !== 'director') throw new ForbiddenException('只有管理员/总监可审批导出申请');

    const approval = await this.prisma.exportApproval.findUnique({ where: { id: BigInt(id) } });
    if (!approval) throw new NotFoundException('审批记录不存在');
    if (approval.status !== 'pending') throw new BadRequestException('该申请已处理');

    const updated = await this.prisma.exportApproval.update({
      where: { id: BigInt(id) },
      data: {
        status: approved ? 'approved' : 'rejected',
        reviewedBy: BigInt(actor.sub),
        reviewNote: note ?? null,
        reviewedAt: new Date(),
      },
      include: {
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    // Notify the requester
    await this.prisma.notification.create({
      data: {
        userId: approval.requestedBy,
        type: 'export_approval',
        title: approved ? '导出申请已通过' : '导出申请已拒绝',
        body: approved
          ? `您的导出申请已获批准${note ? `，备注：${note}` : ''}，可前往导出页面下载`
          : `您的导出申请被拒绝${note ? `，原因：${note}` : ''}`,
        refType: 'export_approval',
        refId: BigInt(id),
        dedupKey: `export_approval:${id}:result:${Date.now()}`,
      },
    });

    return this.serializeExportApproval(updated);
  }

  // ── Custom Reports ──────────────────────────────────────────────────────────

  async listAdminCustomReports() {
    const reports = await this.prisma.customReport.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return reports.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async createCustomReport(actor: CurrentUserPayload, dto: {
    name: string; entityType: string; dimensions: string[];
    metrics: any[]; filters?: any; sortOrder?: number;
  }) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可创建报表');
    const report = await this.prisma.customReport.create({
      data: {
        name: dto.name,
        entityType: dto.entityType,
        dimensions: dto.dimensions,
        metrics: dto.metrics,
        filters: dto.filters ?? Prisma.DbNull,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({ actorId: actor.sub, action: 'create_custom_report', resourceType: 'custom_report', resourceId: report.id.toString(), afterData: { name: dto.name } });
    return { ...report, id: report.id.toString() };
  }

  async updateCustomReport(actor: CurrentUserPayload, id: string, dto: {
    name?: string; dimensions?: string[]; metrics?: any[]; filters?: any; sortOrder?: number; isActive?: boolean;
  }) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可修改报表');
    const report = await this.prisma.customReport.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.dimensions != null ? { dimensions: dto.dimensions } : {}),
        ...(dto.metrics != null ? { metrics: dto.metrics } : {}),
        ...(dto.filters !== undefined ? { filters: dto.filters ?? Prisma.DbNull } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
    await this.audit.log({ actorId: actor.sub, action: 'update_custom_report', resourceType: 'custom_report', resourceId: id, afterData: dto });
    return { ...report, id: report.id.toString() };
  }

  async deleteCustomReport(actor: CurrentUserPayload, id: string) {
    if (actor.role !== 'admin') throw new ForbiddenException('仅管理员可删除报表');
    await this.prisma.customReport.delete({ where: { id: BigInt(id) } });
    await this.audit.log({ actorId: actor.sub, action: 'delete_custom_report', resourceType: 'custom_report', resourceId: id });
    return { success: true };
  }

  private serializeExportApproval(a: any) {
    return {
      id: a.id?.toString(),
      requestedBy: a.requestedBy?.toString(),
      reviewedBy: a.reviewedBy?.toString() ?? null,
      scope: a.scope,
      filters: a.filters,
      status: a.status,
      reviewNote: a.reviewNote,
      reviewedAt: a.reviewedAt,
      createdAt: a.createdAt,
      requester: a.requester ? { id: a.requester.id?.toString(), name: a.requester.name } : null,
      reviewer: a.reviewer ? { id: a.reviewer.id?.toString(), name: a.reviewer.name } : null,
    };
  }
}
