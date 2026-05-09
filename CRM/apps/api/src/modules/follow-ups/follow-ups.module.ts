import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../../common/common.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [PrismaModule, PermissionsModule, CommonModule, WorkflowModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
