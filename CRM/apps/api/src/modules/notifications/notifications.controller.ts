import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() actor: CurrentUserPayload, @Query('cursor') cursor?: string) {
    return this.svc.list(actor, cursor);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: CurrentUserPayload) {
    return this.svc.unreadCount(actor);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.markRead(actor, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() actor: CurrentUserPayload) {
    return this.svc.markAllRead(actor);
  }

  @Post('trigger-generate')
  async triggerGenerate(@CurrentUser() actor: CurrentUserPayload) {
    if (actor.role !== 'admin') return { ok: false, message: 'forbidden' };
    await this.svc.generateFollowUpNotifications();
    return { ok: true };
  }
}
