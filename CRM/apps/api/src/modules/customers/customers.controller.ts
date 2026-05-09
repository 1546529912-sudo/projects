import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { InlineFieldsDto } from './dto/inline-fields.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { BantDto } from './dto/bant.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  async list(@CurrentUser() actor: CurrentUserPayload, @Query() query: QueryCustomersDto) {
    return this.service.list(actor, query);
  }

  @Get('import/template')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.service.buildImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customers_import_template.xlsx"');
    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
        if (!ok) return cb(new BadRequestException('仅支持 xlsx / xls / csv 格式'), false);
        cb(null, true);
      },
    }),
  )
  async importCustomers(
    @CurrentUser() actor: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请上传文件');
    return this.service.importCustomers(actor, file.buffer);
  }

  @Get('export')
  async exportCsv(
    @CurrentUser() actor: CurrentUserPayload,
    @Query() query: QueryCustomersDto,
    @Query('approvalId') approvalId: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(actor, query, approvalId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers_${Date.now()}.csv"`);
    res.send(csv);
  }

  @Post()
  async create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateCustomerDto) {
    return this.service.create(actor, dto);
  }

  @Get('duplicates/check')
  async checkDuplicates(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('companyName') companyName?: string,
    @Query('contactName') contactName?: string,
    @Query('excludeCustomerId') excludeCustomerId?: string,
  ) {
    return this.service.checkDuplicates({ phone, email, companyName, contactName, excludeCustomerId }, actor);
  }

  @Get(':id')
  async detail(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.detail(actor, id);
  }

  @Patch(':id')
  async update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(actor, id, dto);
  }

  @Patch(':id/inline-fields')
  async inlineFields(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: InlineFieldsDto) {
    return this.service.inlineFields(actor, id, dto);
  }

  @Patch(':id/bant')
  async updateBant(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: BantDto) {
    return this.service.updateBant(actor, id, dto);
  }

  @Patch(':id/scotsman')
  async updateScotsman(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: Record<string, any>) {
    return this.service.updateScotsman(actor, id, dto);
  }

  @Post(':id/status')
  async changeStatus(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.service.changeStatus(actor, id, dto);
  }

  @Post(':id/transfer')
  async transfer(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    return this.service.transfer(actor, id, newOwnerId);
  }

  @Get('duplicates/suspected')
  async listSuspectedDuplicates(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
  ) {
    return this.service.listSuspectedDuplicates(actor, page ? parseInt(page) : 1);
  }

  @Post(':id/duplicate/ignore')
  async ignoreDuplicate(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.ignoreDuplicate(actor, id);
  }

  @Post(':id/duplicate/confirm')
  async confirmDuplicate(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.confirmDuplicate(actor, id);
  }

  @Get(':id/events')
  async listEvents(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.service.listBusinessEvents(actor, id);
  }

  @Post(':id/archive')
  async archive(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.service.archive(actor, id, reason);
  }

  @Post(':id/unarchive')
  async unarchive(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.service.unarchive(actor, id);
  }

  @Delete(':id/duplicate')
  async deleteDuplicate(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('transferToId') transferToId?: string,
  ) {
    return this.service.deleteDuplicate(actor, id, transferToId);
  }

  @Post(':id/merge')
  async mergeCustomers(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') masterId: string,
    @Body('mergeId') mergeId: string,
  ) {
    return this.service.mergeCustomers(actor, masterId, mergeId);
  }

  @Get(':id/merge-suggestion')
  async getMergeSuggestion(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.getMergeSuggestion(actor, id);
  }

  @Get(':id/collaborators')
  async listCollaborators(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.listCollaborators(actor, id);
  }

  @Post(':id/collaborators')
  async addCollaborator(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.service.addCollaborator(actor, id, userId);
  }

  @Delete(':id/collaborators/:userId')
  async removeCollaborator(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeCollaborator(actor, id, userId);
  }

  @Get('rollback-requests')
  async listRollbackRequests(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.service.listRollbackRequests(actor, status);
  }

  @Post('rollback-requests/:requestId/review')
  async reviewRollbackRequest(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('requestId') requestId: string,
    @Body('approved') approved: boolean,
    @Body('note') note?: string,
  ) {
    return this.service.reviewRollbackRequest(actor, requestId, approved, note);
  }
}
