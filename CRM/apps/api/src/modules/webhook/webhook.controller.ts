import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { WebhookService } from './webhook.service';

@Controller('webhook-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  @Get()
  list(@CurrentUser() actor: CurrentUserPayload) {
    return this.service.list(actor);
  }

  @Post()
  create(@CurrentUser() actor: CurrentUserPayload, @Body() body: { name: string; url: string; events: string[]; secret?: string }) {
    return this.service.create(actor, body);
  }

  @Patch(':id')
  update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() body: { name?: string; url?: string; events?: string[]; secret?: string | null; isActive?: boolean }) {
    return this.service.update(actor, id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
