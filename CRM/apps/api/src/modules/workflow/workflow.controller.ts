import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { WorkflowService, WorkflowCondition, WorkflowAction } from './workflow.service';

@Controller('workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get('rules')
  listRules() {
    return this.workflow.listRules();
  }

  @Post('rules')
  createRule(
    @CurrentUser() actor: CurrentUserPayload,
    @Body() body: {
      name: string;
      description?: string;
      trigger: string;
      conditions: WorkflowCondition[];
      actions: WorkflowAction[];
    },
  ) {
    return this.workflow.createRule(actor, body);
  }

  @Patch('rules/:id')
  updateRule(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      trigger?: string;
      conditions?: WorkflowCondition[];
      actions?: WorkflowAction[];
      isActive?: boolean;
    },
  ) {
    return this.workflow.updateRule(actor, id, body);
  }

  @Delete('rules/:id')
  deleteRule(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.workflow.deleteRule(actor, id);
  }

  @Get('executions')
  listExecutions(@Query('ruleId') ruleId?: string) {
    return this.workflow.listExecutions(ruleId);
  }
}
