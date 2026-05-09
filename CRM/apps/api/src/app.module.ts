import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AdminModule } from './modules/admin/admin.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { SourcesModule } from './modules/sources/sources.module';
import { TagsModule } from './modules/tags/tags.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { BiExportModule } from './modules/bi-export/bi-export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    UsersModule,
    PermissionsModule,
    AuthModule,
    CustomersModule,
    ContactsModule,
    LeadsModule,
    FollowUpsModule,
    OpportunitiesModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    OrdersModule,
    AdminModule,
    QuotationsModule,
    SourcesModule,
    TagsModule,
    ContractsModule,
    WorkflowModule,
    WebhookModule,
    BiExportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
