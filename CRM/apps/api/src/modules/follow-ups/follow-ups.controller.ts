import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Controller('customers/:customerId/follow-ups')
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Get()
  async list(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(actor, customerId, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Get(':id/history')
  async history(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
  ) {
    return this.service.listEditHistory(actor, customerId, id);
  }

  @Post()
  async create(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.service.create(actor, customerId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFollowUpDto>,
  ) {
    return this.service.update(actor, customerId, id, dto);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'follow-up-attachments'),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadAttachment(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请选择文件');
    return this.service.uploadAttachment(actor, customerId, id, file);
  }

  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @CurrentUser() _actor: CurrentUserPayload,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const { filePath, originalName, mimeType } = await this.service.getAttachmentFilePath(attachmentId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    createReadStream(filePath).pipe(res);
  }

  @Delete(':id/attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.deleteAttachment(actor, customerId, id, attachmentId);
  }
}
