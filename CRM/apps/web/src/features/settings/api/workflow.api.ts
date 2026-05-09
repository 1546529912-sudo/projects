import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'in';
  value: string | string[];
}

export interface WorkflowAction {
  type: 'notify_owner' | 'notify_manager' | 'notify_admin' | 'assign_by_region' | 'assign_to';
  config: Record<string, any>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  triggerEvent: string;
  entityType: string;
  entityId: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  rule: { id: string; name: string } | null;
}

export interface CreateWorkflowRuleInput {
  name: string;
  description?: string;
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

export const listWorkflowRules = async (): Promise<WorkflowRule[]> => {
  const res = await http.get<ApiResponse<WorkflowRule[]>>('/workflow/rules');
  const list = res.data.data;
  return Array.isArray(list) ? list : [];
};

export const createWorkflowRule = async (data: CreateWorkflowRuleInput): Promise<WorkflowRule> => {
  const res = await http.post<ApiResponse<WorkflowRule>>('/workflow/rules', data);
  return res.data.data;
};

export const updateWorkflowRule = async (
  id: string,
  data: Partial<CreateWorkflowRuleInput> & { isActive?: boolean },
): Promise<WorkflowRule> => {
  const res = await http.patch<ApiResponse<WorkflowRule>>(`/workflow/rules/${id}`, data);
  return res.data.data;
};

export const deleteWorkflowRule = async (id: string): Promise<{ deleted: boolean }> => {
  const res = await http.delete<ApiResponse<{ deleted: boolean }>>(`/workflow/rules/${id}`);
  return res.data.data;
};

export const listWorkflowExecutions = async (ruleId?: string): Promise<WorkflowExecution[]> => {
  const res = await http.get<ApiResponse<WorkflowExecution[]>>('/workflow/executions', {
    params: ruleId ? { ruleId } : undefined,
  });
  const list = res.data.data;
  return Array.isArray(list) ? list : [];
};
