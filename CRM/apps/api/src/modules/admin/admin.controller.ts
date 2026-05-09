import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // ── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listUsers(actor, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20, keyword);
  }

  @Post('users')
  createUser(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateUserDto) {
    return this.service.createUser(actor, dto);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(actor, id, dto);
  }

  @Post('users/:id/disable')
  disableUser(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.disableUser(actor, id);
  }

  @Post('users/:id/handover')
  handoverUser(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('toUserId') toUserId: string,
  ) {
    return this.service.handoverUser(actor, id, toUserId);
  }

  @Post('users/:id/disable-with-handover')
  disableWithHandover(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('toUserId') toUserId?: string,
  ) {
    return this.service.disableWithHandover(actor, id, toUserId);
  }

  @Post('users/:id/enable')
  enableUser(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.enableUser(actor, id);
  }

  // ── Departments ──────────────────────────────────────────────────────────

  @Get('departments')
  listDepartments(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.listDepartments(actor);
  }

  @Post('departments')
  createDepartment(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(actor, dto);
  }

  @Delete('departments/:id')
  deleteDepartment(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.deleteDepartment(actor, id);
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  @Get('audit-logs')
  listAuditLogs(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listAuditLogs(actor, page ? Number(page) : 1, pageSize ? Number(pageSize) : 50);
  }

  // ── System Config ─────────────────────────────────────────────────────────

  @Get('system-config/:key')
  getConfig(@Param('key') key: string) {
    return this.service.getConfig(key);
  }

  @Get('system-config/:key/usage-check')
  checkEnumUsage(@Param('key') key: string, @Query('value') value: string) {
    return this.service.checkEnumUsage(key, value);
  }

  @Patch('system-config/:key')
  setConfig(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('key') key: string,
    @Body('value') value: any,
  ) {
    return this.service.setConfig(actor, key, value);
  }

  // ── Custom Field Definitions ──────────────────────────────────────────────

  @Get('custom-fields')
  listCustomFields(@Query('entityType') entityType?: string) {
    return this.service.listCustomFields(entityType);
  }

  @Post('custom-fields')
  createCustomField(
    @CurrentUser() actor: CurrentUserPayload,
    @Body() dto: { entityType: string; label: string; fieldKey: string; fieldType: string; options?: string; defaultValue?: string; conditionLogic?: any; required?: boolean; sortOrder?: number },
  ) {
    return this.service.createCustomField(actor, dto);
  }

  @Patch('custom-fields/:id')
  updateCustomField(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: { label?: string; options?: string; defaultValue?: string | null; conditionLogic?: any; required?: boolean; sortOrder?: number; isActive?: boolean },
  ) {
    return this.service.updateCustomField(actor, id, dto);
  }

  @Delete('custom-fields/:id')
  deleteCustomField(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.deleteCustomField(actor, id);
  }

  // ── Required Field Rules ──────────────────────────────────────────────────

  @Get('required-field-rules')
  listRequiredFieldRules(@Query('entityType') entityType?: string) {
    return this.service.listRequiredFieldRules(entityType);
  }

  @Post('required-field-rules')
  createRequiredFieldRule(@CurrentUser() actor: CurrentUserPayload, @Body() body: any) {
    return this.service.createRequiredFieldRule(actor, body);
  }

  @Patch('required-field-rules/:id')
  updateRequiredFieldRule(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() body: any) {
    return this.service.updateRequiredFieldRule(actor, id, body);
  }

  @Delete('required-field-rules/:id')
  deleteRequiredFieldRule(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.deleteRequiredFieldRule(actor, id);
  }

  // ── Export Approvals ─────────────────────────────────────────────────────

  @Get('export-approvals')
  listExportApprovals(@CurrentUser() actor: CurrentUserPayload, @Query('status') status?: string) {
    return this.service.listExportApprovals(actor, status);
  }

  @Post('export-approvals')
  requestExportApproval(@CurrentUser() actor: CurrentUserPayload, @Body() body: { scope?: string; filters?: Record<string, any> }) {
    return this.service.requestExportApproval(actor, body);
  }

  @Post('export-approvals/:id/review')
  reviewExportApproval(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { approved: boolean; note?: string },
  ) {
    return this.service.reviewExportApproval(actor, id, body.approved, body.note);
  }

  // ── Custom Reports ─────────────────────────────────────────────────────────

  @Get('custom-reports')
  listCustomReports() {
    return this.service.listAdminCustomReports();
  }

  @Post('custom-reports')
  createCustomReport(@CurrentUser() actor: CurrentUserPayload, @Body() body: any) {
    return this.service.createCustomReport(actor, body);
  }

  @Patch('custom-reports/:id')
  updateCustomReport(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() body: any) {
    return this.service.updateCustomReport(actor, id, body);
  }

  @Delete('custom-reports/:id')
  deleteCustomReport(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.deleteCustomReport(actor, id);
  }
}
