import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('sources')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}

  @Get()
  list() {
    return this.service.listGrouped();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: { category: string; categoryLabel: string; name: string; label: string; sortOrder?: number }) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Partial<{ label: string; isActive: boolean; sortOrder: number }>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
