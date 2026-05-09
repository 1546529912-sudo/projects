import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('counts')
  async counts(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.getCounts(actor);
  }

  @Get()
  async summary(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.getSummary(actor);
  }

  @Get('search')
  async search(@CurrentUser() actor: CurrentUserPayload, @Query('q') q: string) {
    return this.service.globalSearch(actor, q ?? '');
  }
}
