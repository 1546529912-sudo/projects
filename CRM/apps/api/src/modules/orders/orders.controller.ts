import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  async list(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.list(actor, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20, status, keyword);
  }

  @Post(':id/pay')
  async pay(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body?: { amount?: number },
  ) {
    return this.service.pay(actor, id, body?.amount);
  }

  @Post(':id/refund-request')
  async requestRefund(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.requestRefund(actor, id, body.reason);
  }

  @Post(':id/refund-process')
  async processRefund(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.processRefund(actor, id);
  }

  @Public()
  @Post('external-refund-notify')
  async externalRefundNotify(
    @Headers('x-api-key') headerKey: string,
    @Body() body: { apiKey?: string; orderNo: string; amount: number; note?: string },
  ) {
    return this.service.externalRefundNotify(headerKey ?? body.apiKey ?? '', body.orderNo, body.amount, body.note);
  }
}
