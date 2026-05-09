import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { auditResourceIdToBigInt } from '../../common/utils/json-serialize.util';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string | bigint;
    beforeData?: Record<string, any>;
    afterData?: Record<string, any>;
    ipAddress?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ? BigInt(params.actorId) : null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: auditResourceIdToBigInt(params.resourceId),
        beforeData: params.beforeData ?? undefined,
        afterData: params.afterData ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    }).catch(() => {
      // audit log failure should not break main operation
    });
  }
}
