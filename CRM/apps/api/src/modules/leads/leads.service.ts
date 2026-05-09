import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
  ) {}

  async list(actor: CurrentUserPayload, page = 1, pageSize = 20, keyword?: string, status?: string) {
    const skip = (page - 1) * pageSize;
    let ownerScope: any = undefined;
    if (actor.role === 'admin') {
      ownerScope = undefined; // all
    } else if (actor.role === 'director' && actor.departmentId) {
      ownerScope = { owner: { departmentId: BigInt(actor.departmentId) } };
    } else if (actor.role === 'manager' && actor.departmentId) {
      ownerScope = { owner: { departmentId: BigInt(actor.departmentId) } };
    } else {
      ownerScope = { ownerId: BigInt(actor.sub) };
    }

    const where: any = {
      deletedAt: null,
      ...(ownerScope ?? {}),
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { companyName: { contains: keyword, mode: 'insensitive' } },
              { contactName: { contains: keyword, mode: 'insensitive' } },
              { phone: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      items: items.map(this.serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async create(actor: CurrentUserPayload, dto: CreateLeadDto) {
    if (!dto.phone && !dto.email && !dto.companyName) {
      throw new BadRequestException('手机号、邮箱、公司名称至少填一项');
    }

    const duplicates = await this.checkDuplicates({
      phone: dto.phone,
      email: dto.email,
      companyName: dto.companyName,
      contactName: dto.contactName,
    }, actor);

    const hasDuplicate = duplicates.length > 0;

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        sourceCategory: dto.sourceCategory,
        sourceDetail: dto.sourceDetail,
        status: hasDuplicate ? 'duplicate_suspected' : 'new',
        ownerId: BigInt(actor.sub),
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (hasDuplicate) {
      await Promise.all(
        duplicates.map((d) =>
          this.prisma.duplicateCandidate.create({
            data: {
              objectType: 'lead',
              objectId: lead.id,
              matchedObjectType: d.type,
              matchedObjectId: BigInt(d.id),
              matchType: d.matchType as any,
              matchValue: d.matchValue,
              createdBy: BigInt(actor.sub),
            },
          }),
        ),
      );
    }

    return { lead: this.serialize(lead), duplicateWarnings: duplicates };
  }

  async update(actor: CurrentUserPayload, id: string, dto: Partial<CreateLeadDto>) {
    const lead = await this.prisma.lead.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new BadRequestException('已转化的线索不能编辑');
    if (lead.ownerId.toString() !== actor.sub && actor.role !== 'admin' && actor.role !== 'director' && actor.role !== 'manager') {
      throw new ForbiddenException('无权编辑他人线索');
    }
    const updated = await this.prisma.lead.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.sourceCategory !== undefined ? { sourceCategory: dto.sourceCategory } : {}),
        ...(dto.sourceDetail !== undefined ? { sourceDetail: dto.sourceDetail } : {}),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return { lead: this.serialize(updated) };
  }

  async checkDuplicates(
    params: { phone?: string; email?: string; companyName?: string; contactName?: string },
    actor: CurrentUserPayload,
  ) {
    const results: Array<{ id: string; type: string; name: string; matchType: string; matchValue: string; isOwn: boolean }> = [];

    if (params.phone) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({
          where: { phone: params.phone, deletedAt: null },
          select: { id: true, name: true, companyName: true, ownerId: true },
          take: 5,
        }),
        this.prisma.customer.findMany({
          where: { primaryPhone: params.phone, deletedAt: null },
          select: { id: true, name: true, companyName: true, ownerId: true },
          take: 5,
        }),
      ]);
      leads.forEach((l) => results.push({ id: l.id.toString(), type: 'lead', name: l.name ?? l.companyName ?? '未知', matchType: 'phone', matchValue: params.phone!, isOwn: l.ownerId.toString() === actor.sub }));
      customers.forEach((c) => results.push({ id: c.id.toString(), type: 'customer', name: c.name, matchType: 'phone', matchValue: params.phone!, isOwn: c.ownerId.toString() === actor.sub }));
    }

    if (params.email && results.length === 0) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({ where: { email: params.email, deletedAt: null }, select: { id: true, name: true, companyName: true, ownerId: true }, take: 5 }),
        this.prisma.customer.findMany({ where: { primaryEmail: params.email, deletedAt: null }, select: { id: true, name: true, companyName: true, ownerId: true }, take: 5 }),
      ]);
      leads.forEach((l) => results.push({ id: l.id.toString(), type: 'lead', name: l.name ?? l.companyName ?? '未知', matchType: 'email', matchValue: params.email!, isOwn: l.ownerId.toString() === actor.sub }));
      customers.forEach((c) => results.push({ id: c.id.toString(), type: 'customer', name: c.name, matchType: 'email', matchValue: params.email!, isOwn: c.ownerId.toString() === actor.sub }));
    }

    if (params.companyName && params.contactName && results.length === 0) {
      const [leads, customers] = await Promise.all([
        this.prisma.lead.findMany({ where: { companyName: params.companyName, contactName: params.contactName, deletedAt: null }, select: { id: true, name: true, companyName: true, ownerId: true }, take: 5 }),
        this.prisma.customer.findMany({ where: { companyName: params.companyName, primaryContactName: params.contactName, deletedAt: null }, select: { id: true, name: true, companyName: true, ownerId: true }, take: 5 }),
      ]);
      const v = `${params.companyName}+${params.contactName}`;
      leads.forEach((l) => results.push({ id: l.id.toString(), type: 'lead', name: l.name ?? l.companyName ?? '未知', matchType: 'company_contact', matchValue: v, isOwn: l.ownerId.toString() === actor.sub }));
      customers.forEach((c) => results.push({ id: c.id.toString(), type: 'customer', name: c.name, matchType: 'company_contact', matchValue: v, isOwn: c.ownerId.toString() === actor.sub }));
    }

    return results;
  }

  async convert(actor: CurrentUserPayload, leadId: string, dto: ConvertLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: BigInt(leadId), deletedAt: null },
    });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new BadRequestException('线索已转化');
    if (lead.ownerId.toString() !== actor.sub && actor.role !== 'admin' && actor.role !== 'director' && actor.role !== 'manager') {
      throw new BadRequestException('无权转化他人线索');
    }

    const ownerId = BigInt(dto.ownerId ?? actor.sub);

    // Generate auto-number custom fields
    const autoNumberDefs = await this.prisma.customFieldDef.findMany({
      where: { entityType: 'customer', fieldType: 'autonumber', isActive: true },
    });
    const autoFields: Record<string, any> = {};
    for (const def of autoNumberDefs) {
      const seqKey = `autonumber_seq_customer_${def.fieldKey}`;
      const cfgRow = await this.prisma.systemConfig.upsert({
        where: { key: seqKey },
        create: { key: seqKey, value: 1 },
        update: { value: { increment: 1 } as any },
      });
      const seq = Number(cfgRow.value);
      const pattern = def.options ?? '{seq:4}';
      const match = pattern.match(/\{seq:(\d+)\}/);
      const width = match ? parseInt(match[1]) : 4;
      autoFields[def.fieldKey] = pattern.replace(/\{seq:\d+\}/, String(seq).padStart(width, '0'));
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: lead.companyName ?? lead.contactName ?? lead.name ?? '未命名客户',
          companyName: lead.companyName,
          primaryContactName: lead.contactName,
          primaryPhone: lead.phone,
          primaryEmail: lead.email,
          level: (dto.level ?? 'C') as any,
          sourceCategory: lead.sourceCategory,
          sourceDetail: lead.sourceDetail,
          sourceLeadId: lead.id,
          ownerId,
          ...(Object.keys(autoFields).length > 0 ? { customFields: autoFields } : {}),
        },
      });

      const contact = await tx.contact.create({
        data: {
          customerId: customer.id,
          name: lead.contactName ?? lead.name ?? '联系人',
          phone: lead.phone,
          email: lead.email,
          isPrimary: true,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'converted',
          convertedCustomerId: customer.id,
          convertedContactId: contact.id,
          convertedAt: new Date(),
        },
      });

      let opportunityId: string | null = null;
      if (dto.createOpportunity) {
        const opp = await tx.opportunity.create({
          data: {
            title: `${customer.name} - 初始商机`,
            customerId: customer.id,
            ownerId,
            stage: 'initial_contact',
            amount: undefined,
          },
        });
        opportunityId = opp.id.toString();
      }

      return { customerId: customer.id.toString(), contactId: contact.id.toString(), opportunityId };
    });

    void this.workflow
      .trigger('customer.created', 'customer', result.customerId, { actor })
      .catch(() => {});

    return result;
  }

  async setStatus(actor: CurrentUserPayload, id: string, status: 'new' | 'invalid') {
    const lead = await this.prisma.lead.findFirst({ where: { id: BigInt(id), deletedAt: null } });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new BadRequestException('已转化的线索不能修改状态');
    if (lead.ownerId.toString() !== actor.sub && actor.role !== 'admin' && actor.role !== 'director' && actor.role !== 'manager') {
      throw new ForbiddenException('无权操作他人线索');
    }
    const updated = await this.prisma.lead.update({
      where: { id: BigInt(id) },
      data: { status },
      include: { owner: { select: { id: true, name: true } } },
    });
    return { lead: this.serialize(updated) };
  }

  async importLeads(actor: CurrentUserPayload, buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const SOURCE_MAP: Record<string, string> = {
      '转介绍': 'referral', '社交': 'social', '展会': 'exhibition',
      '广告': 'ad', '来访': 'inbound', '其他': 'other',
    };

    const results = {
      total: rows.length,
      imported: 0,
      duplicates: 0,
      errors: [] as Array<{ row: number; reason: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name        = String(r['姓名'] ?? r['name'] ?? '').trim();
      const phone       = String(r['手机号'] ?? r['phone'] ?? '').trim();
      const email       = String(r['邮箱'] ?? r['email'] ?? '').trim();
      const companyName = String(r['公司名称'] ?? r['company'] ?? '').trim();
      const contactName = String(r['联系人姓名'] ?? r['contact'] ?? '').trim();
      const srcRaw      = String(r['来源'] ?? r['source'] ?? '').trim();
      const sourceCategory = SOURCE_MAP[srcRaw] ?? (srcRaw || 'other');
      const sourceDetail   = String(r['来源详情'] ?? r['sourceDetail'] ?? '').trim();

      if (!name && !phone && !companyName) {
        results.errors.push({ row: i + 2, reason: '姓名、手机号、公司名称至少填一项' });
        continue;
      }

      try {
        const dupes = await this.checkDuplicates({ phone: phone || undefined, email: email || undefined, companyName: companyName || undefined, contactName: contactName || undefined }, actor);
        const hasDuplicate = dupes.length > 0;

        await this.prisma.lead.create({
          data: {
            name: name || null,
            companyName: companyName || null,
            contactName: contactName || null,
            phone: phone || null,
            email: email || null,
            sourceCategory: sourceCategory || null,
            sourceDetail: sourceDetail || null,
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

  buildImportTemplate(): Buffer {
    const headers = [['姓名', '手机号', '邮箱', '公司名称', '联系人姓名', '来源', '来源详情']];
    const example = [['张三', '13800138000', 'zhangsan@example.com', '示例科技有限公司', '张三', '转介绍', '老客户推荐']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    ws['!cols'] = headers[0].map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '线索导入模板');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  private serialize(lead: any) {
    return {
      ...lead,
      id: lead.id?.toString(),
      ownerId: lead.ownerId?.toString(),
      convertedCustomerId: lead.convertedCustomerId?.toString() ?? null,
      convertedContactId: lead.convertedContactId?.toString() ?? null,
      owner: lead.owner ? { ...lead.owner, id: lead.owner.id?.toString() } : undefined,
    };
  }
}
