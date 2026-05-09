import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(actor: CurrentUserPayload, page = 1, pageSize = 20, status?: string, keyword?: string) {
    const skip = (page - 1) * pageSize;
    const scope = this.buildOrderScope(actor);

    const where: Prisma.OrderWhereInput = {
      ...scope,
      ...(status ? { status } : {}),
      ...(keyword ? {
        OR: [
          { orderNo: { contains: keyword, mode: 'insensitive' } },
          { customer: { name: { contains: keyword, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          opportunity: { select: { id: true, title: true } },
        },
      }),
    ]);

    return {
      items: items.map(this.serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async pay(actor: CurrentUserPayload, id: string, payAmount?: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        customer: { include: { owner: { select: { id: true, name: true, departmentId: true } } } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    this.scopeService.assertCanRead(actor, {
      ownerId: order.customer.ownerId,
      owner: order.customer.owner,
    });
    if (order.status === 'paid') throw new BadRequestException('订单已付款');

    const totalAmount = Number(order.amount);
    const prevPaid = Number(order.paidAmount);
    const incoming = payAmount != null ? payAmount : totalAmount - prevPaid;
    if (incoming <= 0) throw new BadRequestException('到账金额必须大于0');
    const newPaid = Math.min(prevPaid + incoming, totalAmount);
    const isFullyPaid = newPaid >= totalAmount;

    const [updated] = await Promise.all([
      this.prisma.order.update({
        where: { id: BigInt(id) },
        data: { paidAmount: newPaid, status: isFullyPaid ? 'paid' : 'pending_payment' },
        include: {
          customer: { select: { id: true, name: true } },
          opportunity: { select: { id: true, title: true } },
        },
      }),
      ...(isFullyPaid
        ? [this.prisma.customer.update({ where: { id: order.customerId }, data: { status: 'won' } })]
        : []),
    ]);

    return { ...this.serialize(updated), fullyPaid: isFullyPaid };
  }

  async requestRefund(actor: CurrentUserPayload, id: string, reason?: string) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员无权发起退款，请联系主管');

    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        customer: {
          include: {
            owner: { select: { id: true, name: true, managerId: true, departmentId: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'paid') throw new BadRequestException('只有已付款订单才能申请退款');

    const updated = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: { status: 'refund_requested' },
      include: {
        customer: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });

    // Notify sales owner
    const ownerId = order.customer.ownerId;
    const title = '退款申请通知';
    const body = `订单 ${order.orderNo}（客户：${order.customer.name}）已申请退款${reason ? `，原因：${reason}` : ''}`;

    await this.notifications.createSystemNotification({
      userId: ownerId,
      type: 'refund',
      title,
      body,
      refType: 'order',
      refId: BigInt(id),
    });

    // Notify manager if exists
    const managerId = order.customer.owner?.managerId;
    if (managerId) {
      await this.notifications.createSystemNotification({
        userId: managerId,
        type: 'refund',
        title,
        body,
        refType: 'order',
        refId: BigInt(id),
      });
    }

    // Notify admins
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['admin', 'director'] }, status: 'active', deletedAt: null },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notifications.createSystemNotification({
        userId: admin.id,
        type: 'refund',
        title: '退款申请通知（管理员）',
        body,
        refType: 'order',
        refId: BigInt(id),
      });
    }

    return this.serialize(updated);
  }

  async processRefund(actor: CurrentUserPayload, id: string) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员无权处理退款');

    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        customer: {
          include: {
            owner: { select: { id: true, name: true, managerId: true, departmentId: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'refund_requested') throw new BadRequestException('订单未处于退款申请状态');

    const updated = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: { status: 'refunded', paidAmount: 0 },
      include: {
        customer: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });

    // Notify the sales owner that refund was processed
    const body = `订单 ${order.orderNo}（客户：${order.customer.name}）退款已处理完成`;
    await this.notifications.createSystemNotification({
      userId: order.customer.ownerId,
      type: 'refund',
      title: '退款处理完成',
      body,
      refType: 'order',
      refId: BigInt(id),
    });

    // Large refund alert: notify all admins if amount exceeds configured threshold
    const thresholdCfg = await this.prisma.systemConfig.findUnique({ where: { key: 'refund_alert_threshold' } });
    const threshold = thresholdCfg ? Number(thresholdCfg.value) : null;
    const refundAmount = Number(order.paidAmount);
    if (threshold != null && threshold > 0 && refundAmount >= threshold) {
      const admins = await this.prisma.user.findMany({ where: { role: 'admin', status: 'active', deletedAt: null }, select: { id: true } });
      const alertBody = `大额退款警报：订单 ${order.orderNo} 退款金额 ¥${refundAmount.toLocaleString()}，超过阈值 ¥${threshold.toLocaleString()}`;
      for (const admin of admins) {
        await this.notifications.createSystemNotification({
          userId: admin.id,
          type: 'refund_alert',
          title: '大额退款警报',
          body: alertBody,
          refType: 'order',
          refId: BigInt(id),
        });
      }
    }

    return this.serialize(updated);
  }

  async externalRefundNotify(apiKey: string, orderNo: string, amount: number, note?: string) {
    // Validate API key
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: 'external_api_key' } });
    const configuredKey = cfg ? String(cfg.value).replace(/^"|"$/g, '') : null;
    if (!configuredKey || configuredKey !== apiKey) {
      throw new UnauthorizedException('无效的 API 密钥');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNo, deletedAt: null },
      include: {
        customer: {
          include: { owner: { select: { id: true, name: true, managerId: true, departmentId: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException(`订单号 ${orderNo} 不存在`);
    if (!['paid', 'refund_requested'].includes(order.status)) {
      throw new BadRequestException(`订单状态为 ${order.status}，无法触发退款`);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'refunded', paidAmount: 0 },
    });

    // Revert customer status from won back to following
    if (order.customer.status === 'won') {
      await this.prisma.customer.update({ where: { id: order.customerId }, data: { status: 'following' } });
    }

    const body = `订单 ${orderNo}（客户：${order.customer.name}）已由外部财务系统触发退款${note ? `，备注：${note}` : ''}，退款金额 ¥${amount}`;
    const notifyIds = new Set<bigint>();
    notifyIds.add(order.customer.ownerId);
    if (order.customer.owner?.managerId) notifyIds.add(BigInt(order.customer.owner.managerId));
    const admins = await this.prisma.user.findMany({ where: { role: 'admin', status: 'active', deletedAt: null }, select: { id: true } });
    for (const a of admins) notifyIds.add(a.id);

    for (const uid of notifyIds) {
      await this.notifications.createSystemNotification({
        userId: uid,
        type: 'refund',
        title: '外部系统退款通知',
        body,
        refType: 'order',
        refId: order.id,
      });
    }

    return { success: true, orderNo, status: 'refunded' };
  }

  private buildOrderScope(actor: CurrentUserPayload): Prisma.OrderWhereInput {
    const base: Prisma.OrderWhereInput = { deletedAt: null };
    if (actor.role === 'admin') return base;
    if (actor.role === 'director' || actor.role === 'manager') {
      if (!actor.departmentId) return { ...base, customer: { ownerId: BigInt(actor.sub) } };
      return { ...base, customer: { owner: { departmentId: BigInt(actor.departmentId) } } };
    }
    return { ...base, customer: { ownerId: BigInt(actor.sub) } };
  }

  private serialize(o: any) {
    return {
      ...o,
      id: o.id?.toString(),
      customerId: o.customerId?.toString(),
      opportunityId: o.opportunityId?.toString() ?? null,
      amount: o.amount?.toString(),
      paidAmount: o.paidAmount?.toString(),
      customer: o.customer ? { id: o.customer.id?.toString(), name: o.customer.name } : undefined,
      opportunity: o.opportunity ? { id: o.opportunity.id?.toString(), title: o.opportunity.title } : undefined,
    };
  }
}
