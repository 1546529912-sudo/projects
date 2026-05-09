import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller()
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Get('contacts')
  async listAll(
    @CurrentUser() actor: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listAll(actor, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20, keyword);
  }

  @Get('customers/:customerId/contacts')
  async list(@CurrentUser() actor: CurrentUserPayload, @Param('customerId') customerId: string) {
    return this.service.list(actor, customerId);
  }

  @Post('customers/:customerId/contacts')
  async create(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('customerId') customerId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.service.create(actor, customerId, dto);
  }

  @Patch('contacts/:id')
  async update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.service.update(actor, id, dto);
  }

  @Delete('contacts/:id')
  async remove(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.service.remove(actor, id);
  }
}
