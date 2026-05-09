import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface LogEventParams {
  objectType: string;
  objectId: string | bigint;
  eventType: string;
  title: string;
  detail?: Record<string, any>;
  createdBy?: string | bigint;
}

@Injectable()
export class BusinessEventService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogEventParams) {
    await this.prisma.businessEvent.create({
      data: {
        objectType: params.objectType,
        objectId: BigInt(params.objectId.toString()),
        eventType: params.eventType,
        title: params.title,
        detail: params.detail ?? {},
        createdBy: params.createdBy ? BigInt(params.createdBy.toString()) : null,
      },
    }).catch(() => {});
  }

  async listByCustomer(customerId: string | bigint) {
    const events = await this.prisma.businessEvent.findMany({
      where: { objectType: 'customer', objectId: BigInt(customerId.toString()) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { createdUser: { select: { id: true, name: true } } },
    });
    return events.map((e) => ({
      id: e.id.toString(),
      eventType: e.eventType,
      title: e.title,
      detail: e.detail,
      createdBy: e.createdUser ? { id: e.createdUser.id.toString(), name: e.createdUser.name } : null,
      createdAt: e.createdAt,
    }));
  }
}
