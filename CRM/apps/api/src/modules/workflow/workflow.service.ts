import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { WebhookService } from '../webhook/webhook.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export interface WorkflowCondition {
  field: string;   // e.g. "status", "level", "region"
  operator: 'eq' | 'neq' | 'contains' | 'in';
  value: string | string[];
}

export interface WorkflowAction {
  type: 'notify_owner' | 'notify_manager' | 'notify_admin' | 'assign_by_region' | 'assign_by_industry' | 'assign_to' | 'call_webhook';
  config: Record<string, any>;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditLogService,
    private readonly webhooks: WebhookService,
  ) {}

  // ── Rule CRUD ─────────────────────────────────────────────────────────────

  async listRules() {
    const rules = await this.prisma.workflowRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { executions: true } } },
    });
    return rules.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async createRule(actor: CurrentUserPayload, dto: { name: string; description?: string; trigger: string; conditions: WorkflowCondition[]; actions: WorkflowAction[] }) {
    const rule = await this.prisma.workflowRule.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        trigger: dto.trigger,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        isActive: false,
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'create_workflow_rule', resourceType: 'workflow_rule', resourceId: rule.id.toString(), afterData: { name: dto.name, trigger: dto.trigger } });
    return { ...rule, id: rule.id.toString() };
  }

  async updateRule(actor: CurrentUserPayload, id: string, dto: { name?: string; description?: string; trigger?: string; conditions?: WorkflowCondition[]; actions?: WorkflowAction[]; isActive?: boolean }) {
    const rule = await this.prisma.workflowRule.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.conditions !== undefined ? { conditions: dto.conditions as any } : {}),
        ...(dto.actions !== undefined ? { actions: dto.actions as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    this.audit.log({ actorId: actor.sub, action: 'update_workflow_rule', resourceType: 'workflow_rule', resourceId: id, afterData: { isActive: dto.isActive, name: dto.name } });
    return { ...rule, id: rule.id.toString() };
  }

  async deleteRule(actor: CurrentUserPayload, id: string) {
    await this.prisma.workflowRule.delete({ where: { id: BigInt(id) } });
    this.audit.log({ actorId: actor.sub, action: 'delete_workflow_rule', resourceType: 'workflow_rule', resourceId: id });
    return { deleted: true };
  }

  async listExecutions(ruleId?: string) {
    const execs = await this.prisma.workflowExecution.findMany({
      where: ruleId ? { ruleId: BigInt(ruleId) } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { rule: { select: { id: true, name: true } } },
    });
    return execs.map((e) => ({
      ...e,
      id: e.id.toString(),
      ruleId: e.ruleId.toString(),
      rule: e.rule ? { ...e.rule, id: e.rule.id.toString() } : null,
    }));
  }

  // ── Trigger Execution ─────────────────────────────────────────────────────

  async trigger(event: string, entityType: string, entityId: string, context: Record<string, any>) {
    const rules = await this.prisma.workflowRule.findMany({
      where: { trigger: event, isActive: true },
    });

    for (const rule of rules) {
      // Anti-loop: skip if this rule fired for this entity more than 3 times in the last hour
      const recentCount = await this.prisma.workflowExecution.count({
        where: {
          ruleId: rule.id,
          entityId,
          entityType,
          status: 'success',
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recentCount >= 3) {
        this.logger.warn(`Anti-loop: rule ${rule.id} skipped for ${entityType}#${entityId} (fired ${recentCount}x in last hour)`);
        await this.recordExecution(rule.id, event, entityType, entityId, 'loop_blocked', 'Anti-loop: max triggers reached');
        continue;
      }

      const conditions = ((rule.conditions as unknown) as WorkflowCondition[] | null) ?? [];
      const actions = ((rule.actions as unknown) as WorkflowAction[] | null) ?? [];

      const matched = this.evaluateConditions(conditions, context);

      if (!matched) {
        await this.recordExecution(rule.id, event, entityType, entityId, 'skipped', null);
        continue;
      }

      try {
        await this.executeActions(actions, entityId, entityType, context);
        await this.recordExecution(rule.id, event, entityType, entityId, 'success', null);
      } catch (err: any) {
        this.logger.error(`Workflow rule ${rule.id} failed: ${err.message}`);
        await this.recordExecution(rule.id, event, entityType, entityId, 'failed', err.message);
        await this.notifyAdminsOfFailure(rule.id.toString(), rule.name, err.message);
      }
    }
  }

  private async notifyAdminsOfFailure(ruleId: string, ruleName: string, errorMessage: string) {
    try {
      const admins = await this.prisma.user.findMany({ where: { role: { in: ['admin', 'director'] }, status: 'active', deletedAt: null }, select: { id: true } });
      for (const admin of admins) {
        await this.notifications.createSystemNotification({
          userId: admin.id,
          type: 'workflow_error',
          title: `工作流执行失败：${ruleName}`,
          body: `规则 #${ruleId} 执行出错：${errorMessage}`,
        });
      }
    } catch (e) {
      this.logger.error(`Failed to notify admins of workflow failure: ${(e as Error).message}`);
    }
  }

  // ── Condition Evaluation ──────────────────────────────────────────────────

  private evaluateConditions(conditions: WorkflowCondition[], ctx: Record<string, any>): boolean {
    for (const cond of conditions) {
      const actual = ctx[cond.field];
      if (!this.matchCondition(cond, actual)) return false;
    }
    return true;
  }

  private matchCondition(cond: WorkflowCondition, actual: any): boolean {
    const a = String(actual ?? '').toLowerCase();
    switch (cond.operator) {
      case 'eq': return a === String(cond.value).toLowerCase();
      case 'neq': return a !== String(cond.value).toLowerCase();
      case 'contains': return a.includes(String(cond.value).toLowerCase());
      case 'in': return Array.isArray(cond.value) && cond.value.map((v) => v.toLowerCase()).includes(a);
      default: return true;
    }
  }

  // ── Action Execution ──────────────────────────────────────────────────────

  private async executeActions(actions: WorkflowAction[], entityId: string, entityType: string, ctx: Record<string, any>) {
    for (const action of actions) {
      await this.executeAction(action, entityId, entityType, ctx);
    }
  }

  private async executeAction(action: WorkflowAction, entityId: string, entityType: string, ctx: Record<string, any>) {
    switch (action.type) {
      case 'notify_owner': {
        const ownerId = ctx.ownerId;
        if (!ownerId) return;
        const message = action.config.message ?? `工作流提醒：${entityType} #${entityId} 触发了规则`;
        await this.notifications.createSystemNotification({
          userId: BigInt(ownerId),
          type: 'workflow',
          title: action.config.title ?? '工作流提醒',
          body: message,
          refType: entityType,
          refId: BigInt(entityId),
        });
        break;
      }
      case 'notify_manager': {
        const ownerId = ctx.ownerId;
        if (!ownerId) return;
        const owner = await this.prisma.user.findUnique({ where: { id: BigInt(ownerId) }, select: { managerId: true } });
        const managerId = owner?.managerId;
        if (!managerId) return;
        const message = action.config.message ?? `工作流提醒：${entityType} #${entityId} 触发了规则`;
        await this.notifications.createSystemNotification({
          userId: managerId,
          type: 'workflow',
          title: action.config.title ?? '工作流提醒（主管）',
          body: message,
          refType: entityType,
          refId: BigInt(entityId),
        });
        break;
      }
      case 'notify_admin': {
        const admins = await this.prisma.user.findMany({ where: { role: { in: ['admin', 'director'] }, status: 'active', deletedAt: null }, select: { id: true } });
        const message = action.config.message ?? `工作流提醒：${entityType} #${entityId} 触发了规则`;
        for (const admin of admins) {
          await this.notifications.createSystemNotification({
            userId: admin.id,
            type: 'workflow',
            title: action.config.title ?? '工作流提醒（管理员）',
            body: message,
            refType: entityType,
            refId: BigInt(entityId),
          });
        }
        break;
      }
      case 'assign_to': {
        const userId = action.config.userId;
        if (!userId || entityType !== 'customer') return;
        await this.prisma.customer.update({ where: { id: BigInt(entityId) }, data: { ownerId: BigInt(userId) } });
        break;
      }
      case 'assign_by_region':
      case 'assign_by_industry': {
        if (entityType !== 'customer') return;
        const matchField = action.type === 'assign_by_region' ? 'salesRegion' : 'salesIndustry';
        const matchValue = action.type === 'assign_by_region' ? ctx.region : ctx.industry;
        if (!matchValue) {
          // Fallback: assign to configured default user or skip
          await this.applyAssignFallback(entityId, action.config.fallbackUserId);
          return;
        }
        // Load-balanced assignment: pick active user matching attribute with fewest active customers
        const candidates = await this.prisma.user.findMany({
          where: { [matchField]: { contains: matchValue }, role: 'sales', status: 'active', deletedAt: null },
          select: { id: true, _count: { select: { customers: { where: { deletedAt: null } } } } },
        });
        if (candidates.length === 0) {
          await this.applyAssignFallback(entityId, action.config.fallbackUserId);
          return;
        }
        // Sort by active customer count ascending (load balancing)
        const winner = candidates.sort((a, b) => (a._count.customers) - (b._count.customers))[0];
        await this.prisma.customer.update({ where: { id: BigInt(entityId) }, data: { ownerId: winner.id } });
        break;
      }
      case 'call_webhook': {
        const webhookEvent = action.config.event ?? `workflow.${entityType}.action`;
        void this.webhooks.fire(webhookEvent, { entityType, entityId, ...(action.config.extraData ?? {}) });
        break;
      }
    }
  }

  private async applyAssignFallback(entityId: string, fallbackUserId?: string) {
    if (!fallbackUserId) return;
    await this.prisma.customer.update({ where: { id: BigInt(entityId) }, data: { ownerId: BigInt(fallbackUserId) } });
  }

  private async recordExecution(ruleId: bigint, event: string, entityType: string, entityId: string, status: string, errorMessage: string | null) {
    await this.prisma.workflowExecution.create({
      data: { ruleId, triggerEvent: event, entityType, entityId, status, errorMessage },
    });
  }
}
