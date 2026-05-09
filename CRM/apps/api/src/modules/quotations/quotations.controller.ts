import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Controller()
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  // ── Quotations ───────────────────────────────────────────────────────────

  @Get('opportunities/:opportunityId/quotations')
  async list(@CurrentUser() actor: CurrentUserPayload, @Param('opportunityId') oppId: string) {
    return this.service.listByOpportunity(actor, oppId);
  }

  @Post('opportunities/:opportunityId/quotations')
  async create(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('opportunityId') oppId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.service.create(actor, oppId, dto);
  }

  @Get('quotations/:id/print')
  async print(@Param('id') id: string, @Res() res: Response) {
    const html = await this.service.getPrintHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Patch('quotations/:id')
  async update(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.service.update(actor, id, dto);
  }

  // ── Products ─────────────────────────────────────────────────────────────

  @Get('products')
  async listProducts() {
    return this.service.listProducts();
  }

  @Post('products')
  async createProduct(@Body() dto: { name: string; code?: string; description?: string; unit?: string; unitPrice: number }) {
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: { name?: string; code?: string; description?: string; unit?: string; unitPrice?: number; minPrice?: number; isActive?: boolean }) {
    return this.service.updateProduct(id, dto);
  }

  // ── Quotation Approvals ──────────────────────────────────────────────────

  @Get('quotation-approvals')
  async listApprovals(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.listPendingApprovals(actor);
  }

  @Post('quotation-approvals/:id/review')
  async reviewApproval(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body('approved') approved: boolean,
    @Body('reviewNote') reviewNote?: string,
  ) {
    return this.service.reviewApproval(actor, id, approved, reviewNote);
  }
}
