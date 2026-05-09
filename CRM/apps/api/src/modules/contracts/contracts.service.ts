import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
  ) {}

  async list(actor: CurrentUserPayload, customerId?: string, opportunityId?: string) {
    const where: any = { deletedAt: null };
    if (customerId) where.customerId = BigInt(customerId);
    if (opportunityId) where.opportunityId = BigInt(opportunityId);
    if (actor.role === 'sales') where.ownerId = BigInt(actor.sub);

    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });
    return contracts.map(this.serialize);
  }

  async create(actor: CurrentUserPayload, dto: {
    opportunityId?: string;
    customerId: string;
    title: string;
    amount?: number;
    signingDate?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) {
    const count = await this.prisma.contract.count({ where: { customerId: BigInt(dto.customerId) } });
    const contractNo = `HT-${dto.customerId.padStart(4, '0')}-${String(count + 1).padStart(3, '0')}`;

    const contract = await this.prisma.contract.create({
      data: {
        contractNo,
        title: dto.title,
        amount: dto.amount ?? 0,
        customerId: BigInt(dto.customerId),
        opportunityId: dto.opportunityId ? BigInt(dto.opportunityId) : null,
        ownerId: BigInt(actor.sub),
        signingDate: dto.signingDate ? new Date(dto.signingDate) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        status: 'draft',
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });
    return this.serialize(contract);
  }

  async update(actor: CurrentUserPayload, id: string, dto: {
    title?: string;
    amount?: number;
    status?: string;
    signingDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string;
  }) {
    const existing = await this.prisma.contract.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!existing) throw new NotFoundException('合同不存在');
    if (actor.role === 'sales' && existing.ownerId.toString() !== actor.sub) throw new ForbiddenException('无权修改此合同');

    const updated = await this.prisma.contract.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.signingDate !== undefined ? { signingDate: dto.signingDate ? new Date(dto.signingDate) : null } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });
    return this.serialize(updated);
  }

  async attachFile(actor: CurrentUserPayload, id: string, fileUrl: string, fileName: string) {
    const existing = await this.prisma.contract.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!existing) throw new NotFoundException('合同不存在');
    if (actor.role === 'sales' && existing.ownerId.toString() !== actor.sub) throw new ForbiddenException('无权操作此合同');

    const updated = await this.prisma.contract.update({
      where: { id: BigInt(id) },
      data: { fileUrl, fileName, status: existing.status === 'draft' ? 'active' : existing.status },
      include: { owner: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } }, opportunity: { select: { id: true, title: true } } },
    });
    return this.serialize(updated);
  }

  async getFilePath(id: string) {
    const contract = await this.prisma.contract.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!contract || !contract.fileUrl) throw new NotFoundException('合同文件不存在');
    const filename = contract.fileUrl.split('/').pop()!;
    return {
      filePath: join(process.cwd(), 'uploads', 'contracts', filename),
      fileName: contract.fileName ?? filename,
    };
  }

  async delete(actor: CurrentUserPayload, id: string) {
    const existing = await this.prisma.contract.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!existing) throw new NotFoundException('合同不存在');
    if (actor.role === 'sales') throw new ForbiddenException('销售员无权删除合同');
    await this.prisma.contract.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  private serialize(c: any) {
    return {
      ...c,
      id: c.id?.toString(),
      customerId: c.customerId?.toString(),
      opportunityId: c.opportunityId?.toString() ?? null,
      ownerId: c.ownerId?.toString(),
      amount: c.amount?.toString(),
      owner: c.owner ? { ...c.owner, id: c.owner.id?.toString() } : undefined,
      customer: c.customer ? { ...c.customer, id: c.customer.id?.toString() } : undefined,
      opportunity: c.opportunity ? { ...c.opportunity, id: c.opportunity.id?.toString() } : null,
    };
  }
}
