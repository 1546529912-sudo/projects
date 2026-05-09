import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerScopeService } from '../permissions/customer-scope.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CustomerScopeService,
  ) {}

  async listAll(actor: CurrentUserPayload, page = 1, pageSize = 20, keyword?: string) {
    const skip = (page - 1) * pageSize;

    // Build customer scope filter based on role
    let customerWhere: any = { deletedAt: null };
    if (actor.role === UserRole.admin) {
      // no restriction
    } else if ((actor.role === UserRole.director || actor.role === UserRole.manager) && actor.departmentId) {
      customerWhere = { ...customerWhere, owner: { departmentId: BigInt(actor.departmentId) } };
    } else {
      customerWhere = { ...customerWhere, ownerId: BigInt(actor.sub) };
    }

    const where: any = {
      deletedAt: null,
      customer: customerWhere,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { phone: { contains: keyword } },
              { email: { contains: keyword, mode: 'insensitive' } },
              { position: { contains: keyword, mode: 'insensitive' } },
              { customer: { name: { contains: keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: { customer: { select: { id: true, name: true, ownerId: true } } },
      }),
    ]);

    return {
      items: items.map((c) => ({
        ...this.serialize(c),
        customer: c.customer
          ? { id: c.customer.id.toString(), name: c.customer.name, ownerId: c.customer.ownerId.toString() }
          : null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async list(actor: CurrentUserPayload, customerId: string) {
    await this.assertCustomerAccess(actor, customerId);
    const contacts = await this.prisma.contact.findMany({
      where: { customerId: BigInt(customerId), deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return contacts.map(this.serialize);
  }

  async create(actor: CurrentUserPayload, customerId: string, dto: CreateContactDto) {
    await this.assertCustomerAccess(actor, customerId);

    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId: BigInt(customerId), deletedAt: null },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.contact.create({
      data: {
        customerId: BigInt(customerId),
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        position: dto.position,
        decisionRole: dto.decisionRole,
        isPrimary: dto.isPrimary ?? false,
      },
    });
    return this.serialize(contact);
  }

  async update(actor: CurrentUserPayload, contactId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: BigInt(contactId), deletedAt: null },
      include: { customer: { include: { owner: true } } },
    });
    if (!contact) throw new NotFoundException();
    this.scopeService.assertCanWrite(actor, contact.customer);

    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId: contact.customerId, deletedAt: null, id: { not: BigInt(contactId) } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.contact.update({
      where: { id: BigInt(contactId) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.decisionRole !== undefined ? { decisionRole: dto.decisionRole } : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
      },
    });
    return this.serialize(updated);
  }

  async remove(actor: CurrentUserPayload, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: BigInt(contactId), deletedAt: null },
      include: { customer: { include: { owner: true } } },
    });
    if (!contact) throw new NotFoundException();
    this.scopeService.assertCanWrite(actor, contact.customer);

    await this.prisma.contact.update({
      where: { id: BigInt(contactId) },
      data: { deletedAt: new Date() },
    });
    return { success: true };
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

  private serialize(c: any) {
    return {
      ...c,
      id: c.id?.toString(),
      customerId: c.customerId?.toString(),
    };
  }
}
