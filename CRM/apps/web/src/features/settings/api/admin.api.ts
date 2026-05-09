import { http } from '@/shared/api/http';
import type { ApiResponse, PaginatedResponse } from '@/shared/api/types';

export type UserRole = 'sales' | 'manager' | 'director' | 'admin';

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: 'active' | 'locked' | 'disabled';
  departmentId: string | null;
  department: { id: string; name: string } | null;
  managerId: string | null;
  manager: { id: string; name: string } | null;
  salesRegion: string | null;
  salesIndustry: string | null;
  salesGroup: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  password: string;
  departmentId?: string;
  managerId?: string;
  salesRegion?: string;
  salesIndustry?: string;
  salesGroup?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  password?: string;
  departmentId?: string;
  managerId?: string;
  salesRegion?: string;
  salesIndustry?: string;
  salesGroup?: string;
}

export async function listAdminUsers(params?: { page?: number; pageSize?: number; keyword?: string }) {
  const res = await http.get<ApiResponse<PaginatedResponse<AdminUser>>>('/admin/users', { params });
  return res.data.data;
}

export async function createAdminUser(input: CreateUserInput) {
  const res = await http.post<ApiResponse<AdminUser>>('/admin/users', input);
  return res.data.data;
}

export async function updateAdminUser(id: string, input: UpdateUserInput) {
  const res = await http.patch<ApiResponse<AdminUser>>(`/admin/users/${id}`, input);
  return res.data.data;
}

export async function disableAdminUser(id: string) {
  const res = await http.post<ApiResponse<AdminUser>>(`/admin/users/${id}/disable`, {});
  return res.data.data;
}

export async function disableWithHandover(id: string, toUserId?: string) {
  const res = await http.post<ApiResponse<{ user: AdminUser; handover: { transferredCustomers: number; transferredOpportunities: number } | null }>>(`/admin/users/${id}/disable-with-handover`, { toUserId });
  return res.data.data;
}

export async function enableAdminUser(id: string) {
  const res = await http.post<ApiResponse<AdminUser>>(`/admin/users/${id}/enable`, {});
  return res.data.data;
}

export async function listDepartments() {
  const res = await http.get<ApiResponse<Department[]>>('/admin/departments');
  return res.data.data;
}

export async function createDepartment(input: { name: string; parentId?: string }) {
  const res = await http.post<ApiResponse<Department>>('/admin/departments', input);
  return res.data.data;
}

export async function deleteDepartment(id: string) {
  const res = await http.delete<ApiResponse<{ success: boolean }>>(`/admin/departments/${id}`);
  return res.data.data;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actor: { id: string; name: string } | null;
  afterData: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function listAuditLogs(params?: { page?: number; pageSize?: number }) {
  const res = await http.get<ApiResponse<PaginatedResponse<AuditLog>>>('/admin/audit-logs', { params });
  return res.data.data;
}

export async function getSystemConfig(key: string): Promise<{ key: string; value: any }> {
  const res = await http.get<ApiResponse<{ key: string; value: any }>>(`/admin/system-config/${key}`);
  return res.data.data;
}

export async function setSystemConfig(key: string, value: any): Promise<{ key: string; value: any }> {
  const res = await http.patch<ApiResponse<{ key: string; value: any }>>(`/admin/system-config/${key}`, { value });
  return res.data.data;
}

export async function checkEnumUsage(key: string, value: string): Promise<{ value: string; count: number; field: string }> {
  const res = await http.get<ApiResponse<{ value: string; count: number; field: string }>>(`/admin/system-config/${key}/usage-check`, { params: { value } });
  return res.data.data;
}

export interface ConditionRule { field: string; op: 'eq' | 'neq' | 'contains' | 'in'; value: string | string[]; }
export interface ConditionLogic { operator: 'AND' | 'OR'; rules: ConditionRule[]; }

export interface CustomFieldDef {
  id: string;
  entityType: string;
  label: string;
  fieldKey: string;
  fieldType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean' | 'autonumber' | 'address';
  options: string | null;
  defaultValue: string | null;
  conditionLogic: ConditionLogic | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomFieldInput {
  entityType: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  options?: string;
  defaultValue?: string;
  required?: boolean;
  sortOrder?: number;
}

export async function listCustomFields(entityType?: string): Promise<CustomFieldDef[]> {
  const res = await http.get<ApiResponse<CustomFieldDef[]>>('/admin/custom-fields', { params: entityType ? { entityType } : {} });
  return res.data.data;
}

export async function createCustomField(input: CreateCustomFieldInput): Promise<CustomFieldDef> {
  const res = await http.post<ApiResponse<CustomFieldDef>>('/admin/custom-fields', input);
  return res.data.data;
}

export async function updateCustomField(id: string, input: { label?: string; options?: string; defaultValue?: string | null; required?: boolean; sortOrder?: number; isActive?: boolean }): Promise<CustomFieldDef> {
  const res = await http.patch<ApiResponse<CustomFieldDef>>(`/admin/custom-fields/${id}`, input);
  return res.data.data;
}

export async function deleteCustomField(id: string): Promise<void> {
  await http.delete(`/admin/custom-fields/${id}`);
}

export interface ExportApproval {
  id: string;
  requestedBy: string;
  reviewedBy: string | null;
  scope: string;
  filters: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requester: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
}

export async function listExportApprovals(status?: string): Promise<ExportApproval[]> {
  const res = await http.get<ApiResponse<ExportApproval[]>>('/admin/export-approvals', { params: status ? { status } : {} });
  return res.data.data;
}

export async function requestExportApproval(scope?: string): Promise<ExportApproval> {
  const res = await http.post<ApiResponse<ExportApproval>>('/admin/export-approvals', { scope: scope ?? 'department' });
  return res.data.data;
}

export async function reviewExportApproval(id: string, approved: boolean, note?: string): Promise<ExportApproval> {
  const res = await http.post<ApiResponse<ExportApproval>>(`/admin/export-approvals/${id}/review`, { approved, note });
  return res.data.data;
}

export interface RequiredFieldRule {
  id: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  ruleType: 'global' | 'stage' | 'role';
  stageValue: string | null;
  roleValue: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequiredFieldRuleInput {
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  ruleType: 'global' | 'stage' | 'role';
  stageValue?: string;
  roleValue?: string;
}

export async function listRequiredFieldRules(entityType?: string): Promise<RequiredFieldRule[]> {
  const res = await http.get<ApiResponse<RequiredFieldRule[]>>('/admin/required-field-rules', { params: entityType ? { entityType } : {} });
  return res.data.data;
}

export async function createRequiredFieldRule(input: CreateRequiredFieldRuleInput): Promise<RequiredFieldRule> {
  const res = await http.post<ApiResponse<RequiredFieldRule>>('/admin/required-field-rules', input);
  return res.data.data;
}

export async function updateRequiredFieldRule(id: string, input: { isActive?: boolean; fieldLabel?: string }): Promise<RequiredFieldRule> {
  const res = await http.patch<ApiResponse<RequiredFieldRule>>(`/admin/required-field-rules/${id}`, input);
  return res.data.data;
}

export async function deleteRequiredFieldRule(id: string): Promise<void> {
  await http.delete(`/admin/required-field-rules/${id}`);
}
