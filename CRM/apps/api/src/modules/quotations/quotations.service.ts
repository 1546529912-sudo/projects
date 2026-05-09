import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { BusinessEventService } from '../../common/services/business-event.service';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bizEvent: BusinessEventService,
    private readonly notifications: NotificationsService,
  ) {}

  async listByOpportunity(actor: CurrentUserPayload, opportunityId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: BigInt(opportunityId), deletedAt: null },
    });
    if (!opp) throw new NotFoundException('商机不存在');

    const items = await this.prisma.quotation.findMany({
      where: { opportunityId: BigInt(opportunityId) },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return items.map(this.serialize);
  }

  async create(actor: CurrentUserPayload, opportunityId: string, dto: CreateQuotationDto) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: BigInt(opportunityId), deletedAt: null },
    });
    if (!opp) throw new NotFoundException('商机不存在');

    const quoteNo = `QT-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const lineItems = dto.items.map((item, idx) => {
      const discount = item.discount ?? 100;
      const lineTotal = Number(item.quantity) * Number(item.unitPrice) * (discount / 100);
      return {
        productId: item.productId ? BigInt(item.productId) : null,
        name: item.name,
        unit: item.unit ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        lineTotal,
        sortOrder: idx,
      };
    });

    const totalAmount = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);

    const quotation = await this.prisma.quotation.create({
      data: {
        quoteNo,
        opportunityId: BigInt(opportunityId),
        customerId: opp.customerId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null,
        totalAmount,
        createdById: BigInt(actor.sub),
        items: { create: lineItems },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    this.bizEvent.log({ objectType: 'customer', objectId: opp.customerId.toString(), eventType: 'quotation_created', title: `新建报价单 ${quoteNo}，合计 ¥${totalAmount.toFixed(2)}`, createdBy: actor.sub });

    // Check if any line item is below minimum price — trigger approval if so
    const productIds = dto.items.filter((i) => i.productId).map((i) => BigInt(i.productId!));
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, minPrice: true },
      });
      const belowMin = dto.items.some((item) => {
        if (!item.productId) return false;
        const prod = products.find((p) => p.id.toString() === item.productId!.toString());
        if (!prod?.minPrice) return false;
        const effectivePrice = Number(item.unitPrice) * ((item.discount ?? 100) / 100);
        return effectivePrice < Number(prod.minPrice);
      });

      if (belowMin) {
        await this.prisma.quotation.update({ where: { id: quotation.id }, data: { approvalStatus: 'pending_approval' } });
        await this.prisma.quotationApproval.create({
          data: { quotationId: quotation.id, requestedBy: BigInt(actor.sub) },
        });
        this.bizEvent.log({
          objectType: 'customer',
          objectId: opp.customerId.toString(),
          eventType: 'quotation_approval_requested',
          title: `报价单 ${quoteNo} 含低于最低价商品，已提交审批`,
          createdBy: actor.sub,
        });

        // Notify approvers: heavy discount (any item discount < 90%) escalates to director
        const hasDeepDiscount = dto.items.some((item) => (item.discount ?? 100) < 90);
        const approverRoles = hasDeepDiscount
          ? { in: [UserRole.manager, UserRole.director, UserRole.admin] }
          : { in: [UserRole.manager, UserRole.admin] };
        const requesterUser = await this.prisma.user.findUnique({
          where: { id: BigInt(actor.sub) },
          select: { departmentId: true },
        });
        const approvers = await this.prisma.user.findMany({
          where: {
            role: approverRoles,
            isActive: true,
            ...(requesterUser?.departmentId ? { departmentId: requesterUser.departmentId } : {}),
          },
          select: { id: true },
        });
        const msgTitle = `报价单 ${quoteNo} 申请审批`;
        const msgBody = `销售提交了含低于最低价商品的报价单，请前往【系统设置→报价审批】审核。`;
        await Promise.all(
          approvers.map((u) =>
            this.notifications.createSystemNotification({
              userId: u.id,
              type: 'quotation_approval',
              title: msgTitle,
              body: msgBody,
              refType: 'customer',
              refId: opp.customerId,
            }),
          ),
        );
      }
    }

    return this.serialize({ ...quotation, approvalStatus: null });
  }

  async update(actor: CurrentUserPayload, id: string, dto: UpdateQuotationDto) {
    const existing = await this.prisma.quotation.findFirst({ where: { id: BigInt(id) } });
    if (!existing) throw new NotFoundException('报价单不存在');

    const updated = await this.prisma.quotation.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (dto.status && dto.status !== existing.status) {
      const statusLabel: Record<string, string> = {
        sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期', draft: '草稿',
      };
      this.bizEvent.log({
        objectType: 'customer',
        objectId: existing.customerId.toString(),
        eventType: 'quotation_status_changed',
        title: `报价单 ${existing.quoteNo} 状态变更：${statusLabel[existing.status] ?? existing.status} → ${statusLabel[dto.status] ?? dto.status}，金额 ¥${Number(existing.totalAmount).toFixed(2)}`,
        createdBy: actor.sub,
      });
    }

    return this.serialize(updated);
  }

  // ── Product catalog ──────────────────────────────────────────────────────

  async listProducts() {
    const items = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.serializeProduct);
  }

  async createProduct(dto: { name: string; code?: string; description?: string; unit?: string; unitPrice: number }) {
    const p = await this.prisma.product.create({ data: { ...dto, unitPrice: dto.unitPrice ?? 0 } });
    return this.serializeProduct(p);
  }

  async updateProduct(id: string, dto: { name?: string; code?: string; description?: string; unit?: string; unitPrice?: number; minPrice?: number; isActive?: boolean }) {
    const p = await this.prisma.product.update({ where: { id: BigInt(id) }, data: dto });
    return this.serializeProduct(p);
  }

  // ── Quotation Approval ───────────────────────────────────────────────────

  async listPendingApprovals(actor: CurrentUserPayload) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const items = await this.prisma.quotationApproval.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: {
          include: {
            createdBy: { select: { id: true, name: true } },
            opportunity: { select: { id: true, title: true } },
            customer: { select: { id: true, name: true } },
          },
        },
        requester: { select: { id: true, name: true } },
      },
    });
    return items.map((a) => ({
      id: a.id.toString(),
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      quotation: {
        id: a.quotation.id.toString(),
        quoteNo: a.quotation.quoteNo,
        totalAmount: a.quotation.totalAmount?.toString(),
        opportunity: a.quotation.opportunity ? {
          id: a.quotation.opportunity.id.toString(),
          title: a.quotation.opportunity.title,
        } : null,
        customer: a.quotation.customer ? {
          id: a.quotation.customer.id.toString(),
          name: a.quotation.customer.name,
        } : null,
        createdBy: a.quotation.createdBy ? {
          id: a.quotation.createdBy.id.toString(),
          name: a.quotation.createdBy.name,
        } : null,
      },
    }));
  }

  async reviewApproval(actor: CurrentUserPayload, approvalId: string, approved: boolean, reviewNote?: string) {
    if (actor.role === 'sales') throw new ForbiddenException('无权限');
    const approval = await this.prisma.quotationApproval.findFirst({
      where: { id: BigInt(approvalId), status: 'pending' },
      include: { quotation: true },
    });
    if (!approval) throw new NotFoundException('审批记录不存在或已处理');

    const newStatus = approved ? 'approved' : 'rejected';
    await this.prisma.quotationApproval.update({
      where: { id: BigInt(approvalId) },
      data: { status: newStatus, reviewedBy: BigInt(actor.sub), reviewNote, reviewedAt: new Date() },
    });

    await this.prisma.quotation.update({
      where: { id: approval.quotationId },
      data: { approvalStatus: newStatus },
    });

    this.bizEvent.log({
      objectType: 'customer',
      objectId: approval.quotation.customerId.toString(),
      eventType: 'quotation_approval_reviewed',
      title: `报价单 ${approval.quotation.quoteNo} 审批${approved ? '通过' : '拒绝'}`,
      createdBy: actor.sub,
    });

    await this.notifications.createSystemNotification({
      userId: approval.requestedBy,
      type: 'quotation_approval',
      title: `报价单 ${approval.quotation.quoteNo} 审批${approved ? '通过' : '拒绝'}`,
      body: approved ? '您的报价单已获批准，可继续推进。' : `报价单审批被拒绝。${reviewNote ? `原因：${reviewNote}` : ''}`,
      refType: 'customer',
      refId: approval.quotation.customerId,
    });

    return { ok: true, approved };
  }

  // ── Serializers ──────────────────────────────────────────────────────────

  private serialize(q: any) {
    return {
      id: q.id.toString(),
      quoteNo: q.quoteNo,
      opportunityId: q.opportunityId.toString(),
      customerId: q.customerId.toString(),
      status: q.status,
      validUntil: q.validUntil ? (q.validUntil instanceof Date ? q.validUntil.toISOString().slice(0, 10) : q.validUntil) : null,
      totalAmount: q.totalAmount?.toString(),
      notes: q.notes,
      createdBy: q.createdBy ? { id: q.createdBy.id.toString(), name: q.createdBy.name } : null,
      createdAt: q.createdAt.toISOString(),
      items: (q.items ?? []).map((i: any) => ({
        id: i.id.toString(),
        productId: i.productId?.toString() ?? null,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity?.toString(),
        unitPrice: i.unitPrice?.toString(),
        discount: i.discount?.toString(),
        lineTotal: i.lineTotal?.toString(),
        sortOrder: i.sortOrder,
      })),
    };
  }

  async getPrintHtml(id: string): Promise<string> {
    const [q, companyConfig] = await Promise.all([
      this.prisma.quotation.findFirst({
      where: { id: BigInt(id) },
        include: {
          createdBy: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          opportunity: {
            select: {
              title: true,
              customer: { select: { name: true, companyName: true } },
            },
          },
        },
      }),
      this.prisma.systemConfig.findUnique({ where: { key: 'company_profile' } }),
    ]);
    if (!q) throw new NotFoundException('报价单不存在');

    const company = (companyConfig?.value as any) ?? {};

    const fmtMoney = (v: any) => {
      const n = parseFloat(String(v ?? 0));
      return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const statusLabel: Record<string, string> = {
      draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期',
    };

    const itemRows = (q.items ?? []).map((item: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.name}</td>
        <td>${item.unit ?? ''}</td>
        <td style="text-align:right">${Number(item.quantity)}</td>
        <td style="text-align:right">¥${fmtMoney(item.unitPrice)}</td>
        <td style="text-align:right">${Number(item.discount)}%</td>
        <td style="text-align:right">¥${fmtMoney(item.lineTotal)}</td>
      </tr>
    `).join('');

    const customer = q.opportunity?.customer;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>报价单 ${q.quoteNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 13px; color: #1a1a1a; padding: 48px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 32px; }
  .section { margin-bottom: 20px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-row { display: flex; gap: 8px; }
  .info-label { color: #888; min-width: 72px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 12px; border: 1px solid #e5e5e5; }
  td { padding: 8px 12px; border: 1px solid #e5e5e5; }
  .total-row td { font-weight: 700; background: #f9f9f9; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #888; font-size: 12px; }
  @media print {
    body { padding: 24px; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  ${company.name ? `<div style="font-size:18px;font-weight:700;margin-bottom:4px">${company.name}</div>` : ''}
  ${company.address ? `<div style="font-size:12px;color:#888;margin-bottom:16px">${company.address}</div>` : ''}
  <h1>报价单</h1>
  <div class="subtitle">编号：${q.quoteNo} &nbsp;|&nbsp; 状态：${statusLabel[q.status] ?? q.status}</div>

  <div class="section info-grid">
    <div>
      <div class="info-row"><span class="info-label">客户名称：</span><span>${customer?.name ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">公司名称：</span><span>${customer?.companyName ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">商机名称：</span><span>${q.opportunity?.title ?? '—'}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="info-label">报价人：</span><span>${q.createdBy?.name ?? '—'}</span></div>
      <div class="info-row"><span class="info-label">报价日期：</span><span>${q.createdAt.toLocaleDateString('zh-CN')}</span></div>
      <div class="info-row"><span class="info-label">有效期至：</span><span>${q.validUntil ? new Date(q.validUntil).toLocaleDateString('zh-CN') : '—'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>产品 / 服务名称</th>
        <th style="width:60px">单位</th>
        <th style="width:70px;text-align:right">数量</th>
        <th style="width:100px;text-align:right">单价</th>
        <th style="width:70px;text-align:right">折扣</th>
        <th style="width:110px;text-align:right">金额</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="6" style="text-align:right">合计金额</td>
        <td style="text-align:right">¥${fmtMoney(q.totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  ${q.notes ? `<div class="section" style="margin-top:20px"><strong>备注：</strong>${q.notes}</div>` : ''}

  <div class="footer">
    <p>${company.footerNote || '本报价单由 CRM 系统自动生成。如有疑问，请联系报价人。'}</p>
    ${company.name ? `<p style="margin-top:4px">${company.name}${company.phone ? ' &nbsp;|&nbsp; 电话：' + company.phone : ''}${company.email ? ' &nbsp;|&nbsp; 邮箱：' + company.email : ''}</p>` : ''}
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
  }

  private serializeProduct(p: any) {
    return {
      id: p.id.toString(),
      name: p.name,
      code: p.code,
      description: p.description,
      unit: p.unit,
      unitPrice: p.unitPrice?.toString(),
      minPrice: p.minPrice?.toString() ?? null,
      isActive: p.isActive,
    };
  }
}
