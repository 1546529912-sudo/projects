import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TagsService } from './tags.service';

@Controller()
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get('tags')
  listAll() {
    return this.service.listAll();
  }

  @Get('tags/admin')
  listAdmin(@CurrentUser() actor: CurrentUserPayload) {
    if (actor.role === 'admin' || actor.role === 'director' || actor.role === 'manager') {
      return this.service.listAllIncludingInactive();
    }
    return this.service.listAll();
  }

  @Post('tags')
  create(@CurrentUser() actor: CurrentUserPayload, @Body() body: { name: string; color?: string; category?: string }) {
    return this.service.create(actor, body);
  }

  @Patch('tags/:id')
  update(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string; category?: string; isActive?: boolean },
  ) {
    return this.service.update(actor, id, body);
  }

  @Get('customers/:customerId/tags')
  getCustomerTags(@Param('customerId') customerId: string) {
    return this.service.getCustomerTags(customerId);
  }

  @Post('customers/:customerId/tags')
  addTag(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Body('tagId') tagId: string,
  ) {
    return this.service.addTagToCustomer(actor, customerId, tagId);
  }

  @Delete('customers/:customerId/tags/:tagId')
  removeTag(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.service.removeTagFromCustomer(actor, customerId, tagId);
  }
}
