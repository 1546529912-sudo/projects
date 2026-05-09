import { Body, Controller, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';

// ── Global /opportunities ──────────────────────────────────────────────────

@Controller('opportunities')
export class GlobalOpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Get()
  async list(@CurrentUser() actor: CurrentUserPayload, @Query() query: QueryOpportunitiesDto) {
    return this.service.globalList(actor, query);
  }

  @Get('export')
  async exportCsv(
    @CurrentUser() actor: CurrentUserPayload,
    @Query() query: QueryOpportunitiesDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(actor, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="opportunities_${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  async findOne(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.findOne(actor, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  @Post(':id/close')
  async close(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CloseOpportunityDto,
  ) {
    return this.service.close(actor, id, dto);
  }

  @Post(':id/reopen')
  async reopen(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.reopen(actor, id);
  }

  @Post(':id/contract/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'contracts'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
          return cb(new BadRequestException('仅支持 PDF / Word / 图片格式'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadContract(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请上传文件');
    const fileUrl = `/uploads/contracts/${file.filename}`;
    return this.service.uploadContract(actor, id, fileUrl);
  }

  @Post(':id/contract/sign')
  async markContractSigned(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.markContractSigned(actor, id);
  }
}

// ── Customer-scoped /customers/:customerId/opportunities ───────────────────

@Controller('customers/:customerId/opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Get()
  async list(@CurrentUser() actor: CurrentUserPayload, @Param('customerId') customerId: string) {
    return this.service.list(actor, customerId);
  }

  @Post()
  async create(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.service.create(actor, customerId, dto);
  }
}
