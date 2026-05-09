import { Module } from '@nestjs/common';
import { CustomerScopeService } from './customer-scope.service';

@Module({
  providers: [CustomerScopeService],
  exports: [CustomerScopeService],
})
export class PermissionsModule {}
