import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  list(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.service.list(actor, customerId, opportunityId);
  }

  @Post()
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: {
    opportunityId?: string;
    customerId: string;
    title: string;
    amount?: number;
    signingDate?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) {
    return this.service.create(actor, dto);
  }

  @Patch(':id')
  update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: {
    title?: string;
    amount?: number;
    status?: string;
    signingDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string;
  }) {
    return this.service.update(actor, id, dto);
  }

  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'contracts'),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new BadRequestException('仅支持 PDF / Word 文件'), false);
      },
    }),
  )
  async uploadFile(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请选择文件');
    const fileUrl = `/uploads/contracts/${file.filename}`;
    return this.service.attachFile(actor, id, fileUrl, file.originalname);
  }

  @Get(':id/download')
  async downloadFile(
    @CurrentUser() _actor: CurrentUserPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.service.getFilePath(id);
    const mime = filePath.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    const { createReadStream } = await import('fs');
    createReadStream(filePath).pipe(res);
  }

  @Delete(':id')
  delete(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.delete(actor, id);
  }
}
