import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../../common/common.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { CustomersController } from './customers.controller';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule, PermissionsModule, CommonModule, WorkflowModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
