import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import { BusinessEventService } from '../../common/services/business-event.service';
import { WorkflowService } from '../workflow/workflow.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
    private readonly bizEvent: BusinessEventService,
    private readonly workflow: WorkflowService,
  ) {}

  async list(actor: CurrentUserPayload, customerId: string, page = 1, pageSize = 20) {
    await this.assertCustomerAccess(actor, customerId);
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.followUpRecord.count({ where: { customerId: BigInt(customerId), deletedAt: null } }),
      this.prisma.followUpRecord.findMany({
        where: { customerId: BigInt(customerId), deletedAt: null },
        orderBy: { followUpTime: 'desc' },
        skip,
        take: pageSize,
        include: {
          owner: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true } },
        },
      }),
    ]);
    return { items: items.map(this.serialize), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(actor: CurrentUserPayload, customerId: string, dto: CreateFollowUpDto) {
    await this.assertCustomerAccess(actor, customerId);
    const record = await this.prisma.followUpRecord.create({
      data: {
        customerId: BigInt(customerId),
        content: dto.content,
        followUpTime: new Date(dto.followUpTime),
        nextFollowUpTime: dto.nextFollowUpTime ? new Date(dto.nextFollowUpTime) : null,
        ownerId: BigInt(actor.sub),
        contactId: dto.contactId ? BigInt(dto.contactId) : null,
      },
      include: {
        owner: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        attachments: { select: { id: true, originalName: true, mimeType: true, size: true } },
      },
    });

    if (dto.nextFollowUpTime) {
      await this.prisma.customer.update({
        where: { id: BigInt(customerId) },
        data: {
          lastFollowUpAt: new Date(dto.followUpTime),
          nextFollowUpAt: new Date(dto.nextFollowUpTime),
        },
      });
    } else {
      await this.prisma.customer.update({
        where: { id: BigInt(customerId) },
        data: { lastFollowUpAt: new Date(dto.followUpTime) },
      });
    }

    void this.workflow
      .trigger('follow_up.created', 'customer', customerId, { ownerId: actor.sub })
      .catch((e) => this.logger.warn(`workflow trigger follow_up.created: ${e}`));

    // Clear stale follow-up notifications for this customer — the follow-up has been done
    await this.prisma.notification.updateMany({
      where: {
        userId: BigInt(actor.sub),
        refType: 'customer',
        refId: BigInt(customerId),
        type: { in: ['follow_up_today', 'follow_up_overdue'] },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return this.serialize(record);
  }

  async update(actor: CurrentUserPayload, customerId: string, id: string, dto: Partial<CreateFollowUpDto>) {
    await this.assertCustomerAccess(actor, customerId);
    const existing = await this.prisma.followUpRecord.findFirst({
      where: { id: BigInt(id), customerId: BigInt(customerId), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('跟进记录不存在');
    if (existing.ownerId.toString() !== actor.sub && actor.role === 'sales') {
      throw new ForbiddenException('只有负责人或主管才能编辑跟进记录');
    }
    if ((actor.role === 'manager' || actor.role === 'director') && existing.ownerId.toString() !== actor.sub) {
      const owner = await this.prisma.user.findFirst({ where: { id: existing.ownerId }, select: { departmentId: true } });
      if (!actor.departmentId || owner?.departmentId?.toString() !== actor.departmentId) {
        throw new ForbiddenException('只能编辑本部门销售的跟进记录');
      }
    }

    const historyPayload: Array<{ field: string; beforeValue: string | null; afterValue: string | null }> = [];

    if (dto.content !== undefined && dto.content !== existing.content) {
      historyPayload.push({ field: 'content', beforeValue: existing.content, afterValue: dto.content });
    }
    if (dto.followUpTime !== undefined) {
      const next = new Date(dto.followUpTime).toISOString();
      const prev = existing.followUpTime.toISOString();
      if (next !== prev) {
        historyPayload.push({ field: 'followUpTime', beforeValue: prev, afterValue: next });
      }
    }
    if (dto.nextFollowUpTime !== undefined) {
      const prev = existing.nextFollowUpTime?.toISOString() ?? '';
      const next = dto.nextFollowUpTime ? new Date(dto.nextFollowUpTime).toISOString() : '';
      if (prev !== next) {
        historyPayload.push({ field: 'nextFollowUpTime', beforeValue: prev || null, afterValue: next || null });
      }
    }
    if (dto.contactId !== undefined) {
      const prev = existing.contactId?.toString() ?? '';
      const next = dto.contactId ? String(dto.contactId) : '';
      if (prev !== next) {
        historyPayload.push({ field: 'contactId', beforeValue: prev || null, afterValue: next || null });
      }
    }

    const oldSnippet = existing.content.slice(0, 50) + (existing.content.length > 50 ? '…' : '');

    const updated = await this.prisma.followUpRecord.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.followUpTime !== undefined ? { followUpTime: new Date(dto.followUpTime) } : {}),
        ...(dto.nextFollowUpTime !== undefined ? { nextFollowUpTime: dto.nextFollowUpTime ? new Date(dto.nextFollowUpTime) : null } : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId ? BigInt(dto.contactId) : null } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        attachments: { select: { id: true, originalName: true, mimeType: true, size: true } },
      },
    });

    if (historyPayload.length) {
      await this.prisma.followUpEditHistory.createMany({
        data: historyPayload.map((h) => ({
          followUpId: BigInt(id),
          editorId: BigInt(actor.sub),
          field: h.field,
          beforeValue: h.beforeValue,
          afterValue: h.afterValue,
        })),
      });
    }

    this.bizEvent.log({
      objectType: 'customer',
      objectId: customerId,
      eventType: 'follow_up_edited',
      title: `跟进记录已编辑，原内容：「${oldSnippet}」`,
      createdBy: actor.sub,
    });

    return this.serialize(updated);
  }

  async listEditHistory(actor: CurrentUserPayload, customerId: string, followUpId: string) {
    await this.assertCustomerAccess(actor, customerId);
    const fu = await this.prisma.followUpRecord.findFirst({
      where: { id: BigInt(followUpId), customerId: BigInt(customerId), deletedAt: null },
    });
    if (!fu) throw new NotFoundException('跟进记录不存在');

    const rows = await this.prisma.followUpEditHistory.findMany({
      where: { followUpId: BigInt(followUpId) },
      orderBy: { createdAt: 'desc' },
      include: { editor: { select: { id: true, name: true } } },
    });

    return rows.map((r) => ({
      id: r.id.toString(),
      field: r.field,
      beforeValue: r.beforeValue,
      afterValue: r.afterValue,
      createdAt: r.createdAt,
      editor: { id: r.editor.id.toString(), name: r.editor.name },
    }));
  }

  async uploadAttachment(actor: CurrentUserPayload, customerId: string, followUpId: string, file: Express.Multer.File) {
    await this.assertCustomerAccess(actor, customerId);
    const followUp = await this.prisma.followUpRecord.findFirst({
      where: { id: BigInt(followUpId), customerId: BigInt(customerId), deletedAt: null },
    });
    if (!followUp) throw new NotFoundException('跟进记录不存在');

    const attachment = await this.prisma.followUpAttachment.create({
      data: {
        followUpId: BigInt(followUpId),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: BigInt(actor.sub),
      },
    });
    return { id: attachment.id.toString(), originalName: attachment.originalName, mimeType: attachment.mimeType, size: attachment.size };
  }

  async getAttachmentFilePath(attachmentId: string): Promise<{ filePath: string; originalName: string; mimeType: string }> {
    const attachment = await this.prisma.followUpAttachment.findUnique({ where: { id: BigInt(attachmentId) } });
    if (!attachment) throw new NotFoundException('附件不存在');
    const filePath = path.join(process.cwd(), 'uploads', 'follow-up-attachments', attachment.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('文件不存在');
    return { filePath, originalName: attachment.originalName, mimeType: attachment.mimeType };
  }

  async deleteAttachment(actor: CurrentUserPayload, customerId: string, followUpId: string, attachmentId: string) {
    await this.assertCustomerAccess(actor, customerId);
    const attachment = await this.prisma.followUpAttachment.findFirst({
      where: { id: BigInt(attachmentId), followUpId: BigInt(followUpId) },
    });
    if (!attachment) throw new NotFoundException('附件不存在');
    if (attachment.uploadedById.toString() !== actor.sub && actor.role === 'sales') {
      throw new ForbiddenException('只有上传者或主管才能删除附件');
    }
    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', 'follow-up-attachments', attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.prisma.followUpAttachment.delete({ where: { id: BigInt(attachmentId) } });
    return { deleted: true };
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

  private serialize(r: any) {
    return {
      ...r,
      id: r.id?.toString(),
      customerId: r.customerId?.toString(),
      ownerId: r.ownerId?.toString(),
      contactId: r.contactId?.toString() ?? null,
      owner: r.owner ? { ...r.owner, id: r.owner.id?.toString() } : undefined,
      contact: r.contact ? { ...r.contact, id: r.contact.id?.toString() } : null,
      attachments: (r.attachments ?? []).map((a: any) => ({ ...a, id: a.id?.toString() })),
    };
  }
}
