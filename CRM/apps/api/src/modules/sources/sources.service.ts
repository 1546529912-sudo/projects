import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface SourceCategoryDto {
  category: string;
  categoryLabel: string;
  items: { id: string; name: string; label: string }[];
}

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listGrouped(): Promise<SourceCategoryDto[]> {
    const rows = await this.prisma.leadSourceConfig.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const map = new Map<string, SourceCategoryDto>();
    for (const r of rows) {
      if (!map.has(r.category)) {
        map.set(r.category, { category: r.category, categoryLabel: r.categoryLabel, items: [] });
      }
      map.get(r.category)!.items.push({ id: r.id.toString(), name: r.name, label: r.label });
    }
    return Array.from(map.values());
  }

  async create(dto: { category: string; categoryLabel: string; name: string; label: string; sortOrder?: number }) {
    const r = await this.prisma.leadSourceConfig.create({ data: dto });
    return { ...r, id: r.id.toString() };
  }

  async update(id: string, dto: Partial<{ label: string; isActive: boolean; sortOrder: number }>) {
    const r = await this.prisma.leadSourceConfig.update({ where: { id: BigInt(id) }, data: dto });
    return { ...r, id: r.id.toString() };
  }

  async remove(id: string) {
    await this.prisma.leadSourceConfig.update({ where: { id: BigInt(id) }, data: { isActive: false } });
    return { ok: true };
  }
}
