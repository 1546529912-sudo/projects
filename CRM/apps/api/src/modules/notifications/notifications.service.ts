import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

const PAGE_SIZE = 30;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Internal: workflow rules, cron jobs, etc. (no authenticated actor). */
  async createSystemNotification(input: {
    userId: bigint;
    type: string;
    title: string;
    body: string;
    refType?: string | null;
    refId?: bigint | null;
  }) {
    const ts = Date.now();
    const dedupKey = `${input.type}:u${input.userId}:r${input.refId?.toString() ?? '0'}:${ts}`.slice(0, 128);
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type.slice(0, 32),
        title: input.title.slice(0, 255),
        body: input.body,
        refType: input.refType?.slice(0, 32) ?? null,
        refId: input.refId ?? null,
        dedupKey,
      },
    });
    // Dispatch to external channels (fire-and-forget)
    void this.dispatchToExternalChannels(input.type, input.title, input.body);
  }

  private async dispatchToExternalChannels(type: string, title: string, body: string) {
    try {
      const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'notification_channels_config' } });
      if (!cfg?.value) return;
      const channels = cfg.value as Record<string, { url?: string; enabled?: boolean; types?: string[] }>;
      const text = `[CRM通知] ${title}\n${body}`;
      for (const [, channel] of Object.entries(channels)) {
        if (!channel.enabled || !channel.url) continue;
        if (channel.types && channel.types.length > 0 && !channel.types.includes(type)) continue;
        const payload = JSON.stringify({ msgtype: 'text', text: { content: text } });
        fetch(channel.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: AbortSignal.timeout(8_000),
        }).catch((err: any) => this.logger.warn(`Channel dispatch failed: ${err.message}`));
      }
    } catch (err: any) {
      this.logger.warn(`dispatchToExternalChannels error: ${err.message}`);
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async list(actor: CurrentUserPayload, cursor?: string) {
    const userId = BigInt(actor.sub);
    const items = await this.prisma.notification.findMany({
      where: { userId, ...(cursor ? { id: { lt: BigInt(cursor) } } : {}) },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
    });
    return {
      items: items.map(this.serialize),
      nextCursor: items.length === PAGE_SIZE ? items[items.length - 1].id.toString() : null,
    };
  }

  async unreadCount(actor: CurrentUserPayload) {
    const count = await this.prisma.notification.count({
      where: { userId: BigInt(actor.sub), isRead: false },
    });
    return { count };
  }

  async markRead(actor: CurrentUserPayload, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: BigInt(id), userId: BigInt(actor.sub) },
    });
    if (!notification) return { ok: false };
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(actor: CurrentUserPayload) {
    await this.prisma.notification.updateMany({
      where: { userId: BigInt(actor.sub), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  }

  // ── Cron: generate follow-up notifications ───────────────────────────────

  @Cron('0 * * * *')
  async generateFollowUpNotifications() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // UTC+8 offset
    const localOffset = 8 * 60 * 60 * 1000;
    const localTodayStart = new Date(todayStart.getTime() - localOffset);
    const localTodayEnd = new Date(todayEnd.getTime() - localOffset);

    const [todayCustomers, overdueCustomers, admins] = await Promise.all([
      this.prisma.customer.findMany({
        where: { deletedAt: null, nextFollowUpAt: { gte: localTodayStart, lte: localTodayEnd } },
        select: { id: true, name: true, ownerId: true },
      }),
      this.prisma.customer.findMany({
        where: { deletedAt: null, nextFollowUpAt: { lt: localTodayStart } },
        select: {
          id: true, name: true, ownerId: true, nextFollowUpAt: true,
          owner: { select: { id: true, name: true, managerId: true } },
        },
      }),
      // admin users for 7-day escalation
      this.prisma.user.findMany({
        where: { role: { in: ['admin', 'director'] }, status: 'active' },
        select: { id: true },
      }),
    ]);

    type NotifRow = { userId: bigint; type: string; title: string; body: string; refType: string; refId: bigint; dedupKey: string };
    const creates: NotifRow[] = [];

    for (const c of todayCustomers) {
      creates.push({
        userId: c.ownerId,
        type: 'follow_up_today',
        title: `今日待跟进：${c.name}`,
        body: `客户「${c.name}」今天需要跟进，请及时联系。`,
        refType: 'customer',
        refId: c.id,
        dedupKey: `follow_up_today:${c.id}:${todayStr}`,
      });
    }

    for (const c of overdueCustomers) {
      const dueDate = c.nextFollowUpAt?.toISOString().slice(0, 10) ?? '未知';
      const overdueDays = Math.floor((localTodayStart.getTime() - (c.nextFollowUpAt?.getTime() ?? 0)) / 86400000);
      const ownerName = c.owner?.name ?? '销售';

      // 逾期1天以上 → 通知销售本人
      creates.push({
        userId: c.ownerId,
        type: 'follow_up_overdue',
        title: `跟进逾期 ${overdueDays} 天：${c.name}`,
        body: `客户「${c.name}」计划于 ${dueDate} 跟进，已逾期 ${overdueDays} 天，请尽快处理。`,
        refType: 'customer',
        refId: c.id,
        dedupKey: `follow_up_overdue:${c.id}:${todayStr}`,
      });

      // 逾期3天以上 → 通知直属上级
      if (overdueDays >= 3 && c.owner?.managerId) {
        creates.push({
          userId: c.owner.managerId,
          type: 'follow_up_overdue_manager',
          title: `下属跟进逾期 ${overdueDays} 天：${c.name}`,
          body: `${ownerName} 负责的客户「${c.name}」已逾期 ${overdueDays} 天未跟进，请督促处理。`,
          refType: 'customer',
          refId: c.id,
          dedupKey: `follow_up_overdue_mgr:${c.id}:${todayStr}`,
        });
      }

      // 逾期7天以上 → 通知所有管理员
      if (overdueDays >= 7) {
        for (const admin of admins) {
          creates.push({
            userId: admin.id,
            type: 'follow_up_overdue_admin',
            title: `严重逾期 ${overdueDays} 天：${c.name}`,
            body: `${ownerName} 负责的客户「${c.name}」已严重逾期 ${overdueDays} 天未跟进，请关注。`,
            refType: 'customer',
            refId: c.id,
            dedupKey: `follow_up_overdue_adm:${c.id}:${todayStr}`,
          });
        }
      }
    }

    if (creates.length === 0) return;

    await this.prisma.notification.createMany({ data: creates, skipDuplicates: true });
    this.logger.log(`Generated ${creates.length} follow-up notifications`);
  }

  // ── Cron: level-based follow-up reminder ─────────────────────────────────

  @Cron('30 1 * * *')
  async generateLevelBasedReminders() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const rulesConfig = await this.prisma.systemConfig.findUnique({ where: { key: 'follow_up_reminder_rules' } });
    const rules: Array<{ level: string; days: number }> = rulesConfig?.value as any ?? [
      { level: 'A', days: 3 },
      { level: 'B', days: 7 },
      { level: 'C', days: 14 },
      { level: 'D', days: 30 },
    ];

    type NotifRow = { userId: bigint; type: string; title: string; body: string; refType: string; refId: bigint; dedupKey: string };
    const creates: NotifRow[] = [];

    for (const rule of rules) {
      const threshold = new Date(now.getTime() - rule.days * 86400000);

      const customers = await this.prisma.customer.findMany({
        where: {
          deletedAt: null,
          level: rule.level as any,
          status: { notIn: ['won', 'lost'] as any },
          OR: [
            { lastFollowUpAt: null, createdAt: { lt: threshold } },
            { lastFollowUpAt: { lt: threshold } },
          ],
        },
        select: { id: true, name: true, ownerId: true },
      });

      for (const c of customers) {
        creates.push({
          userId: c.ownerId,
          type: 'follow_up_level_reminder',
          title: `${rule.level}类客户超期未跟进：${c.name}`,
          body: `客户「${c.name}」为${rule.level}类，应在 ${rule.days} 天内跟进，已超期，请尽快联系。`,
          refType: 'customer',
          refId: c.id,
          dedupKey: `follow_up_level:${c.id}:${todayStr}`,
        });
      }
    }

    if (creates.length === 0) return;
    await this.prisma.notification.createMany({ data: creates, skipDuplicates: true });
    this.logger.log(`Generated ${creates.length} level-based follow-up reminders`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private serialize(n: {
    id: bigint; type: string; title: string; body: string | null;
    isRead: boolean; refType: string | null; refId: bigint | null;
    createdAt: Date; readAt: Date | null;
  }) {
    return {
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      refType: n.refType,
      refId: n.refId?.toString() ?? null,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    };
  }
}
