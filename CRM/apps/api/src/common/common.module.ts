import { Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { BusinessEventService } from './services/business-event.service';
import { PrismaModule } from '../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, BusinessEventService],
  exports: [AuditLogService, BusinessEventService],
})
export class CommonModule {}
