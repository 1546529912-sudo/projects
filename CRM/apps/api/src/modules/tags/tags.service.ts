import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const tags = await this.prisma.tag.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return tags.map((t) => ({ ...t, id: t.id.toString() }));
  }

  async listAllIncludingInactive() {
    const tags = await this.prisma.tag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return tags.map((t) => ({ ...t, id: t.id.toString() }));
  }

  async create(actor: CurrentUserPayload, dto: { name: string; color?: string; category?: string }) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员不能创建标签');
    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name.trim(),
        color: dto.color ?? '#6366f1',
        category: dto.category ?? null,
      },
    });
    return { ...tag, id: tag.id.toString() };
  }

  async update(actor: CurrentUserPayload, id: string, dto: { name?: string; color?: string; category?: string; isActive?: boolean }) {
    if (actor.role === 'sales') throw new ForbiddenException('销售员不能修改标签');
    const existing = await this.prisma.tag.findFirst({ where: { id: BigInt(id) } });
    if (!existing) throw new NotFoundException('标签不存在');
    const updated = await this.prisma.tag.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return { ...updated, id: updated.id.toString() };
  }

  async getCustomerTags(customerId: string) {
    const rows = await this.prisma.customerTag.findMany({
      where: { customerId: BigInt(customerId) },
      include: { tag: true },
    });
    return rows.map((r) => ({
      tagId: r.tagId.toString(),
      customerId: r.customerId.toString(),
      name: r.tag.name,
      color: r.tag.color,
      category: r.tag.category,
      addedAt: r.addedAt,
    }));
  }

  async addTagToCustomer(actor: CurrentUserPayload, customerId: string, tagId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: BigInt(tagId), isActive: true } });
    if (!tag) throw new NotFoundException('标签不存在');
    await this.prisma.customerTag.upsert({
      where: { customerId_tagId: { customerId: BigInt(customerId), tagId: BigInt(tagId) } },
      create: {
        customerId: BigInt(customerId),
        tagId: BigInt(tagId),
        addedById: BigInt(actor.sub),
      },
      update: {},
    });
    return { ok: true };
  }

  async removeTagFromCustomer(_actor: CurrentUserPayload, customerId: string, tagId: string) {
    await this.prisma.customerTag.deleteMany({
      where: { customerId: BigInt(customerId), tagId: BigInt(tagId) },
    });
    return { ok: true };
  }
}
