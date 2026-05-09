import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { SaveLeadEditDto } from './dto/save-lead-edit.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  async list(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(actor, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20, keyword, status);
  }

  @Post()
  async create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateLeadDto) {
    return this.service.create(actor, dto);
  }

  @Get('duplicates/check')
  async checkDuplicates(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('companyName') companyName?: string,
    @Query('contactName') contactName?: string,
  ) {
    return this.service.checkDuplicates({ phone, email, companyName, contactName }, actor);
  }

  @Get('import/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.service.buildImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_import_template.xlsx"');
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
  async importLeads(
    @CurrentUser() actor: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请上传文件');
    return this.service.importLeads(actor, file.buffer);
  }

  /** 静态路径，避免 POST /leads/:id/edit 在部分环境下未匹配路由 */
  @Post('save-edit')
  async saveEdit(@CurrentUser() actor: CurrentUserPayload, @Body() body: SaveLeadEditDto) {
    const { id, ...dto } = body;
    return this.service.update(actor, id, dto);
  }

  @Patch(':id')
  async update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: Partial<CreateLeadDto>) {
    return this.service.update(actor, id, dto);
  }

  @Post(':id/convert')
  async convert(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.service.convert(actor, id, dto);
  }

  @Post(':id/invalidate')
  async invalidate(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.setStatus(actor, id, 'invalid');
  }

  @Post(':id/restore')
  async restore(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.setStatus(actor, id, 'new');
  }
}
