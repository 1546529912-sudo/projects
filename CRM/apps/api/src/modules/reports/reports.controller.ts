import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { FunnelQueryDto } from './dto/funnel-query.dto';
import { PerformanceQueryDto, SetTargetDto } from './dto/performance-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('funnel')
  funnel(@CurrentUser() actor: CurrentUserPayload, @Query() query: FunnelQueryDto) {
    return this.service.getFunnel(actor, query);
  }

  @Get('performance')
  performance(@CurrentUser() actor: CurrentUserPayload, @Query() query: PerformanceQueryDto) {
    return this.service.getPerformance(actor, query);
  }

  @Get('funnel-by-product')
  funnelByProduct(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.getFunnelByProduct(actor);
  }

  @Get('source-funnel')
  sourceFunnel(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getSourceFunnel(actor, startDate, endDate);
  }

  @Get('source')
  source(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getSource(actor, startDate, endDate);
  }

  @Get('source-trend')
  sourceTrend(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('months') months?: string,
  ) {
    return this.service.getSourceTrend(actor, months ? parseInt(months) : 6);
  }

  @Get('efficiency')
  efficiency(@CurrentUser() actor: CurrentUserPayload, @Query() query: PerformanceQueryDto) {
    return this.service.getEfficiency(actor, query);
  }

  @Post('targets')
  setTarget(@CurrentUser() actor: CurrentUserPayload, @Body() dto: SetTargetDto) {
    return this.service.setTarget(actor, dto);
  }

  @Get('team-activity')
  teamActivity(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getTeamActivity(
      actor,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      userId,
      dateFrom,
      dateTo,
    );
  }

  @Get('team-members')
  teamMembers(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.getTeamMembers(actor);
  }

  @Get('attribution')
  attributionComparison(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.getAttributionComparison(actor);
  }

  @Get('custom')
  listCustomReports() {
    return this.service.listCustomReports();
  }

  @Get('custom/:id/run')
  runCustomReport(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.runCustomReport(actor, id);
  }
}
