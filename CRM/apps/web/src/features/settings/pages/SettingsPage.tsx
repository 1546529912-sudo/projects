import { useState, useEffect } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle, Trash2, PackageSearch, Zap, ChevronDown, ChevronUp, Play, History } from 'lucide-react';
import {
  listExportApprovals,
  reviewExportApproval,
  listRequiredFieldRules,
  createRequiredFieldRule,
  updateRequiredFieldRule,
  deleteRequiredFieldRule,
  type ExportApproval,
  type RequiredFieldRule,
  type CreateRequiredFieldRuleInput,
} from '../api/admin.api';
import {
  listWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  listWorkflowExecutions,
  type WorkflowRule,
  type WorkflowCondition,
  type WorkflowAction,
  type CreateWorkflowRuleInput,
} from '../api/workflow.api';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { UserForm } from '../components/UserForm';
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  disableAdminUser,
  enableAdminUser,
  listDepartments,
  createDepartment,
  deleteDepartment,
  listAuditLogs,
  getSystemConfig,
  setSystemConfig,
  disableWithHandover,
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  type AdminUser,
  type Department,
  type AuditLog,
  type CustomFieldDef,
} from '../api/admin.api';
import {
  listProducts,
  createProduct,
  updateProduct,
  listQuotationApprovals,
  reviewQuotationApproval,
  type Product,
} from '@/features/quotations/api/quotations.api';
import {
  listWebhookConfigs,
  createWebhookConfig,
  updateWebhookConfig,
  deleteWebhookConfig,
  type WebhookConfig,
} from '../api/webhook.api';
import {
  listAdminCustomReports,
  createAdminCustomReport,
  updateAdminCustomReport,
  deleteAdminCustomReport,
  type CustomReport,
  type CustomReportMetric,
} from '@/features/reports/api/reports.api';
import {
  listSuspectedDuplicates,
  ignoreDuplicate,
  confirmDuplicate,
  deleteDuplicate,
  mergeCustomers,
  getMergeSuggestion,
  listRollbackRequests,
  reviewRollbackRequest,
  type RollbackRequest,
  type MergeSuggestion,
} from '@/features/customers/api/customers.api';
import {
  listSources,
  createSource,
  updateSource,
  deleteSource,
  type SourceCategory,
} from '../api/sources.api';

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  sales: '销售',
  manager: '组长',
  director: '总监',
  admin: '管理员',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: '正常', cls: 'bg-green-100 text-green-700' },
  locked:   { label: '已锁定', cls: 'bg-yellow-100 text-yellow-700' },
  disabled: { label: '已禁用', cls: 'bg-red-100 text-red-600' },
};

const TABS = ['用户管理', '部门管理', '产品目录', '来源管理', '标签管理', '疑似重复', '回退审批', '报价审批', '导出审批', '操作日志', '提醒规则', '报价模板', '丢单原因', '数据字典', '自定义字段', '必填规则', '工作流', '消息模板', '通知设置', '功能权限', 'Webhook', '自定义报表', 'BI数据接口', '阶段赢率'] as const;
type Tab = typeof TABS[number];

// ── User Management ────────────────────────────────────────────────────────

function UserManagementTab({ departments, users, onRefresh }: {
  departments: Department[];
  users: AdminUser[];
  onRefresh: () => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [editTarget, setEditTarget] = useState<AdminUser | null | 'new'>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);
  const [handoverToId, setHandoverToId] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState('');

  const filtered = keyword
    ? users.filter(
        (u) =>
          u.name.includes(keyword) ||
          u.phone?.includes(keyword) ||
          u.email?.toLowerCase().includes(keyword.toLowerCase()),
      )
    : users;

  async function handleToggle(user: AdminUser) {
    if (user.status !== 'disabled') {
      setDisableTarget(user);
      setHandoverToId('');
      setDisableError('');
      return;
    }
    setActionLoading(user.id);
    try {
      await enableAdminUser(user.id);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisableConfirm() {
    if (!disableTarget) return;
    setDisabling(true);
    setDisableError('');
    try {
      await disableWithHandover(disableTarget.id, handoverToId || undefined);
      setDisableTarget(null);
      onRefresh();
    } catch (err: any) {
      setDisableError(err?.response?.data?.message ?? '操作失败');
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索姓名、手机号、邮箱"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setEditTarget('new')}>
          <Plus className="mr-1.5 h-4 w-4" />新建用户
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['姓名', '账号', '角色', '部门', '上级', '销售属性', '状态', '最后登录', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {filtered.map((user) => {
              const status = STATUS_BADGE[user.status] ?? STATUS_BADGE.active;
              return (
                <tr key={user.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{user.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {user.phone && <div>{user.phone}</div>}
                    {user.email && <div>{user.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{user.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{user.manager?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {[user.salesRegion, user.salesIndustry, user.salesGroup].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('zh-CN') : '从未'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditTarget(user)}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        <Pencil className="h-3 w-3" />编辑
                      </button>
                      <button
                        disabled={actionLoading === user.id}
                        onClick={() => handleToggle(user)}
                        className={`inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-xs disabled:opacity-50 ${
                          user.status === 'disabled'
                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {user.status === 'disabled'
                          ? <><CheckCircle className="h-3 w-3" />启用</>
                          : <><Ban className="h-3 w-3" />禁用</>}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">
            {keyword ? '无匹配结果' : '暂无用户'}
          </div>
        )}
      </div>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget === 'new' ? '新建用户' : '编辑用户'}
        className="max-w-xl"
      >
        <UserForm
          user={editTarget === 'new' ? null : editTarget}
          departments={departments}
          users={users}
          onSubmit={async (data) => {
            if (editTarget === 'new') {
              await createAdminUser(data as any);
            } else {
              await updateAdminUser(editTarget!.id, data);
            }
            setEditTarget(null);
            onRefresh();
          }}
          onCancel={() => setEditTarget(null)}
        />
      </Modal>

      <Modal
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        title={`禁用账号：${disableTarget?.name}`}
      >
        {disableTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-body)]">
              禁用后该账号将无法登录。可选择将其名下的<strong>客户和商机</strong>交接给其他成员。
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">
                交接给（可选）
              </label>
              <select
                value={handoverToId}
                onChange={(e) => setHandoverToId(e.target.value)}
                className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 text-sm focus:border-[var(--action-primary)] focus:outline-none"
              >
                <option value="">— 不交接，保留原负责人 —</option>
                {users.filter((u) => u.id !== disableTarget.id && u.status === 'active').map((u) => (
                  <option key={u.id} value={u.id}>{u.name}（{ROLE_LABEL[u.role] ?? u.role}）</option>
                ))}
              </select>
            </div>
            {disableError && <div className="rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-600">{disableError}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDisableTarget(null)}>取消</Button>
              <button
                disabled={disabling}
                onClick={handleDisableConfirm}
                className="rounded-[8px] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {disabling ? '处理中...' : '确认禁用'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Department Management ──────────────────────────────────────────────────

function DepartmentManagementTab({ departments, onRefresh }: {
  departments: Department[];
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createDepartment({ name: newName.trim(), parentId: newParentId || undefined });
      setNewName('');
      setNewParentId('');
      setShowCreate(false);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '创建失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(dept: Department) {
    setDeleting(dept.id);
    try {
      await deleteDepartment(dept.id);
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? '删除失败');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" />新建部门
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['部门名称', '上级部门', '创建时间', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{dept.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{dept.parent?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {new Date(dept.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={deleting === dept.id}
                    onClick={() => handleDelete(dept)}
                    className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {departments.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">暂无部门</div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建部门">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">部门名称 *</span>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">上级部门（可选）</span>
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 text-sm focus:border-[var(--action-primary)] focus:outline-none"
            >
              <option value="">— 顶级部门 —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>取消</Button>
            <Button type="submit" disabled={creating}>{creating ? '创建中...' : '创建部门'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Product Catalog Tab ───────────────────────────────────────────────────

function fmt2(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ProductFormState {
  name: string;
  code: string;
  unit: string;
  unitPrice: string;
  minPrice: string;
}

function emptyProductForm(): ProductFormState {
  return { name: '', code: '', unit: '', unitPrice: '0', minPrice: '' };
}

function ProductForm({ initial, onSubmit, onCancel, loading, error }: {
  initial?: ProductFormState;
  onSubmit: (data: ProductFormState) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ProductFormState>(initial ?? emptyProductForm());

  function set(field: keyof ProductFormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">产品名称 *</span>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="如：企业版授权" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">产品编号</span>
          <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="如：PRO-001" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">单位</span>
          <Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="如：套、个、年" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">标准单价（元） *</span>
          <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">最低价（元）</span>
          <p className="mb-1 text-xs text-[var(--text-muted)]">低于此价格需审批</p>
          <Input type="number" min="0" step="0.01" value={form.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="不设限" />
        </label>
      </div>
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.name.trim()}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}

function ProductCatalogTab() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Product | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  });

  function refresh() { qc.invalidateQueries({ queryKey: ['products'] }); }

  async function handleSubmit(form: ProductFormState) {
    const price = parseFloat(form.unitPrice);
    if (isNaN(price) || price < 0) { setSaveError('单价无效'); return; }
    const minPrice = form.minPrice ? parseFloat(form.minPrice) : undefined;
    if (minPrice !== undefined && isNaN(minPrice)) { setSaveError('最低价无效'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        unit: form.unit.trim() || undefined,
        unitPrice: price,
        minPrice,
      };
      if (editTarget === 'new') {
        await createProduct(payload);
      } else if (editTarget) {
        await updateProduct(editTarget.id, payload);
      }
      setEditTarget(null);
      refresh();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(product: Product) {
    setToggling(product.id);
    try {
      await updateProduct(product.id, { isActive: !product.isActive });
      refresh();
    } catch { /* ignore */ }
    finally { setToggling(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <PackageSearch className="h-4 w-4" />
          产品目录供新建报价单时快速选用
        </div>
        <Button onClick={() => { setSaveError(null); setEditTarget('new'); }}>
          <Plus className="mr-1.5 h-4 w-4" />新建产品
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['产品名称', '编号', '单位', '标准单价', '最低价', '状态', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {products.map((p) => (
              <tr key={p.id} className={`hover:bg-[var(--bg-hover)] ${!p.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{p.code ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{p.unit ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-body)]">¥{fmt2(p.unitPrice)}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{p.minPrice ? `¥${fmt2(p.minPrice)}` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.isActive ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setSaveError(null); setEditTarget(p); }}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      <Pencil className="h-3 w-3" />编辑
                    </button>
                    <button
                      disabled={toggling === p.id}
                      onClick={() => handleToggle(p)}
                      className={`inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-xs disabled:opacity-50 ${
                        p.isActive
                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {p.isActive ? <><Ban className="h-3 w-3" />停用</> : <><CheckCircle className="h-3 w-3" />启用</>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        )}
        {!isLoading && products.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">暂无产品，点击「新建产品」添加</div>
        )}
      </div>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget === 'new' ? '新建产品' : '编辑产品'}
      >
        <ProductForm
          initial={editTarget && editTarget !== 'new'
            ? { name: editTarget.name, code: editTarget.code ?? '', unit: editTarget.unit ?? '', unitPrice: editTarget.unitPrice, minPrice: editTarget.minPrice ?? '' }
            : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setEditTarget(null)}
          loading={saving}
          error={saveError}
        />
      </Modal>
    </div>
  );
}

// ── Suspected Duplicates Tab ──────────────────────────────────────────────

function SuspectedDuplicatesTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; followUpCount?: number } | null>(null);
  const [transferToId, setTransferToId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<{ id: string; name: string } | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suspected-duplicates', page],
    queryFn: () => listSuspectedDuplicates(page),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  async function handleAction(id: string, action: 'ignore' | 'confirm') {
    setActing(id);
    try {
      if (action === 'ignore') await ignoreDuplicate(id);
      else await confirmDuplicate(id);
      qc.invalidateQueries({ queryKey: ['suspected-duplicates'] });
    } finally { setActing(null); }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDuplicate(deleteTarget.id, transferToId || undefined);
      qc.invalidateQueries({ queryKey: ['suspected-duplicates'] });
      setDeleteTarget(null);
      setTransferToId('');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMergeConfirm() {
    if (!mergeTarget || !mergeIntoId.trim()) return;
    setMerging(true);
    setMergeError('');
    try {
      await mergeCustomers(mergeIntoId.trim(), mergeTarget.id);
      qc.invalidateQueries({ queryKey: ['suspected-duplicates'] });
      setMergeTarget(null);
      setMergeIntoId('');
    } catch (err: any) {
      setMergeError(err?.response?.data?.message ?? '合并失败，请重试');
    } finally {
      setMerging(false);
    }
  }

  const LEVEL_BADGE: Record<string, string> = {
    A: 'bg-red-100 text-red-700',
    B: 'bg-orange-100 text-orange-700',
    C: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        以下客户在录入时系统检测到可能与现有客户重复，请逐条核查并处理。
        共 <span className="font-medium text-[var(--text-heading)]">{total}</span> 条待处理。
      </p>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['客户名称', '联系人', '手机号', '邮箱', '负责人', '级别', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                  <a href={`/customers/${c.id}`} className="hover:underline">{c.name}</a>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{c.primaryContactName ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{c.primaryPhone ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{c.primaryEmail ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{c.owner?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[c.level] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.level}类
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={acting === c.id}
                      onClick={() => handleAction(c.id, 'ignore')}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                    >
                      忽略重复
                    </button>
                    <button
                      disabled={acting === c.id}
                      onClick={() => handleAction(c.id, 'confirm')}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                    >
                      确认重复
                    </button>
                    <button
                      disabled={acting === c.id}
                      onClick={async () => {
                        setMergeTarget({ id: c.id, name: c.name });
                        setMergeIntoId('');
                        setMergeError('');
                        setMergeSuggestion(null);
                        setLoadingSuggestion(true);
                        try {
                          const s = await getMergeSuggestion(c.id);
                          setMergeSuggestion(s);
                          if (s.suggestion) setMergeIntoId(s.suggestion.primaryId);
                        } catch { /* ignore */ } finally { setLoadingSuggestion(false); }
                      }}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    >
                      合并
                    </button>
                    <button
                      disabled={acting === c.id}
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">暂无疑似重复客户</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setTransferToId(''); }} title="删除重复客户">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-body)]">
              确定要删除客户 <span className="font-semibold text-[var(--text-heading)]">「{deleteTarget.name}」</span> 吗？此操作不可恢复。
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">
                跟进记录转移（可选）
              </label>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                如该客户有跟进记录，可填写目标客户 ID 将其转移；留空则直接丢弃。
              </p>
              <Input
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                placeholder="目标客户 ID（可选）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setDeleteTarget(null); setTransferToId(''); }}>取消</Button>
              <button
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="rounded-[8px] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!mergeTarget} onClose={() => { setMergeTarget(null); setMergeIntoId(''); setMergeError(''); setMergeSuggestion(null); }} title="合并到主记录">
        {mergeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-body)]">
              将 <span className="font-semibold text-[var(--text-heading)]">「{mergeTarget.name}」</span> 的跟进记录、联系人、商机全部合并到目标客户，该客户将被软删除。
            </p>

            {/* Smart suggestion banner */}
            {loadingSuggestion && (
              <p className="text-xs text-[var(--text-muted)]">正在分析合并建议...</p>
            )}
            {mergeSuggestion?.suggestion && (
              <div className="rounded-[8px] border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">系统建议</p>
                <p className="text-xs text-blue-600">{mergeSuggestion.suggestion.reason}</p>
                <p className="text-xs text-blue-500 mt-1">
                  建议保留：<span className="font-medium">{mergeSuggestion.suggestion.primaryName}</span>（ID: {mergeSuggestion.suggestion.primaryId}）
                  ，合并删除：<span className="font-medium">{mergeSuggestion.suggestion.mergeName}</span>
                </p>
              </div>
            )}
            {mergeSuggestion && !mergeSuggestion.suggestion && !loadingSuggestion && (
              <p className="text-xs text-[var(--text-muted)]">未找到相似客户，请手动输入目标客户 ID</p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">目标客户 ID（主记录，该记录将保留）</label>
              <Input
                value={mergeIntoId}
                onChange={(e) => setMergeIntoId(e.target.value)}
                placeholder="请输入或确认目标客户 ID"
              />
              {mergeSuggestion?.candidates && mergeSuggestion.candidates.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">相似客户（点击选择为主记录）：</p>
                  {mergeSuggestion.candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMergeIntoId(c.id)}
                      className={`w-full text-left rounded-[6px] border px-3 py-1.5 text-xs transition-colors ${mergeIntoId === c.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-[var(--border-default)] hover:bg-[var(--bg-hover)]'}`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-[var(--text-muted)]">{c.level}级 · 跟进{c.followUpCount}次 · ID: {c.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mergeError && (
              <p className="text-sm text-[var(--error)]">{mergeError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setMergeTarget(null); setMergeIntoId(''); setMergeError(''); setMergeSuggestion(null); }}>取消</Button>
              <button
                disabled={merging || !mergeIntoId.trim()}
                onClick={handleMergeConfirm}
                className="rounded-[8px] bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {merging ? '合并中...' : '确认合并'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Tag Management Tab ────────────────────────────────────────────────────

import { listTagsAdmin, createTag, updateTag, type Tag } from '@/features/tags/api/tags.api';

const TAG_CATEGORY_LABEL: Record<string, string> = {
  customer_trait: '客户特征',
  follow_status: '跟进状态',
  internal_ops: '内部运营',
};

const PRESET_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function TagManagementTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', color: '#6366f1', category: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#6366f1', category: '', isActive: true });

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['tags-admin'],
    queryFn: listTagsAdmin,
  });

  async function handleCreate() {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await createTag({ name: addForm.name.trim(), color: addForm.color, category: addForm.category || undefined });
      qc.invalidateQueries({ queryKey: ['tags-admin'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      setShowAdd(false);
      setAddForm({ name: '', color: '#6366f1', category: '' });
    } finally { setSaving(false); }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await updateTag(id, { name: editForm.name.trim(), color: editForm.color, category: editForm.category || undefined, isActive: editForm.isActive });
      qc.invalidateQueries({ queryKey: ['tags-admin'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      setEditId(null);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">管理客户标签，销售员可为客户打标签。共 {tags.length} 个标签。</p>
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" />新建标签</Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['标签名称', '颜色', '分类', '状态', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {tags.map((tag) => (
              <tr key={tag.id} className="hover:bg-[var(--bg-hover)]">
                {editId === tag.id ? (
                  <>
                    <td className="px-4 py-2">
                      <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-36" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button key={c} onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                            className="h-5 w-5 rounded-full border-2 transition"
                            style={{ backgroundColor: c, borderColor: editForm.color === c ? '#1a1a1a' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                        className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-sm">
                        <option value="">不分类</option>
                        <option value="customer_trait">客户特征</option>
                        <option value="follow_status">跟进状态</option>
                        <option value="internal_ops">内部运营</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
                        {editForm.isActive ? '启用' : '停用'}
                      </label>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button disabled={saving} onClick={() => handleUpdate(tag.id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50">保存</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-body)]">取消</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className={tag.isActive ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)] line-through'}>{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs text-[var(--text-muted)]">{tag.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{tag.category ? (TAG_CATEGORY_LABEL[tag.category] ?? tag.category) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tag.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tag.isActive ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditId(tag.id); setEditForm({ name: tag.name, color: tag.color, category: tag.category ?? '', isActive: tag.isActive }); }}
                        className="text-xs text-indigo-600 hover:text-indigo-700">
                        编辑
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {tags.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">暂无标签，点击「新建标签」添加</div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddForm({ name: '', color: '#6366f1', category: '' }); }} title="新建标签">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">标签名称 *</label>
            <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：重点客户" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">颜色</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setAddForm((f) => ({ ...f, color: c }))}
                  className="h-6 w-6 rounded-full border-2 transition"
                  style={{ backgroundColor: c, borderColor: addForm.color === c ? '#1a1a1a' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">分类（可选）</label>
            <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm">
              <option value="">不分类</option>
              <option value="customer_trait">客户特征</option>
              <option value="follow_status">跟进状态</option>
              <option value="internal_ops">内部运营</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAdd(false); setAddForm({ name: '', color: '#6366f1', category: '' }); }}>取消</Button>
            <Button disabled={saving || !addForm.name.trim()} onClick={handleCreate}>{saving ? '创建中...' : '创建标签'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Follow-Up Reminder Rules Tab ──────────────────────────────────────────

interface ReminderRule {
  level: string;
  label: string;
  days: number;
  color: string;
}

const DEFAULT_RULES: ReminderRule[] = [
  { level: 'A', label: 'A类客户', days: 3, color: '#ef4444' },
  { level: 'B', label: 'B类客户', days: 7, color: '#f97316' },
  { level: 'C', label: 'C类客户', days: 14, color: '#3b82f6' },
  { level: 'D', label: 'D类客户', days: 30, color: '#6b7280' },
];

function FollowUpRulesTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [rules, setRules] = useState<ReminderRule[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['system-config', 'follow_up_reminder_rules'],
    queryFn: () => getSystemConfig('follow_up_reminder_rules'),
  });

  const displayRules: ReminderRule[] = rules ?? (
    data?.value ? (data.value as ReminderRule[]) : DEFAULT_RULES
  );

  function setDays(level: string, days: number) {
    const base = rules ?? (data?.value ? (data.value as ReminderRule[]) : DEFAULT_RULES);
    setRules(base.map((r) => r.level === level ? { ...r, days } : r));
    setSaveOk(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await setSystemConfig('follow_up_reminder_rules', displayRules);
      qc.invalidateQueries({ queryKey: ['system-config', 'follow_up_reminder_rules'] });
      setSaveOk(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setRules(DEFAULT_RULES);
    setSaveOk(false);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">跟进提醒规则</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          配置各级别客户的跟进提醒天数。超过该天数未跟进的客户将出现在提醒列表中。
        </p>
      </div>

      {isLoading ? (
        <div className="py-6 text-sm text-[var(--text-muted)]">加载中...</div>
      ) : (
        <div className="space-y-3">
          {displayRules.map((rule) => (
            <div
              key={rule.level}
              className="flex items-center gap-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: rule.color }}
              >
                {rule.level}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--text-heading)]">{rule.label}</div>
                <div className="text-xs text-[var(--text-muted)]">超过 N 天未跟进时触发提醒</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={rule.days}
                  onChange={(e) => setDays(rule.level, Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-1.5 text-center text-sm focus:border-[var(--action-primary)] focus:outline-none"
                />
                <span className="text-sm text-[var(--text-muted)]">天</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveError && (
        <div className="rounded-[8px] bg-red-50 px-4 py-2.5 text-sm text-red-600">{saveError}</div>
      )}
      {saveOk && (
        <div className="rounded-[8px] bg-green-50 px-4 py-2.5 text-sm text-green-700">已保存成功</div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || isLoading}>
          {saving ? '保存中...' : '保存规则'}
        </Button>
        <Button variant="secondary" onClick={handleReset}>恢复默认</Button>
      </div>
    </div>
  );
}

// ── Source Management Tab ─────────────────────────────────────────────────

function SourceManagementTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ category: '', categoryLabel: '', name: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const { data: categoriesRaw, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
  });
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];

  async function handleAdd() {
    if (!addForm.category.trim() || !addForm.categoryLabel.trim() || !addForm.name.trim() || !addForm.label.trim()) return;
    setSaving(true);
    try {
      await createSource(addForm);
      qc.invalidateQueries({ queryKey: ['sources'] });
      setShowAdd(false);
      setAddForm({ category: '', categoryLabel: '', name: '', label: '' });
    } finally { setSaving(false); }
  }

  async function handleEditSave(id: string) {
    if (!editLabel.trim()) return;
    await updateSource(id, { label: editLabel });
    qc.invalidateQueries({ queryKey: ['sources'] });
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要停用该来源吗？')) return;
    await deleteSource(id);
    qc.invalidateQueries({ queryKey: ['sources'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">管理线索来源的大类和小类，供录入时选择。</p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-4 w-4" />新增来源
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat: SourceCategory) => (
            <div key={cat.category} className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
              <div className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-2.5">
                <span className="text-sm font-semibold text-[var(--text-heading)]">{cat.categoryLabel}</span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">{cat.category}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    {['显示名称', '标识名', '操作'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {Array.isArray(cat.items)
                    ? cat.items.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-2.5">
                        {editId === item.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="h-7 py-0.5 text-xs"
                            />
                            <button onClick={() => handleEditSave(item.id)} className="text-xs text-[var(--action-primary)] hover:underline">保存</button>
                            <button onClick={() => setEditId(null)} className="text-xs text-[var(--text-muted)] hover:underline">取消</button>
                          </div>
                        ) : (
                          <span className="text-[var(--text-body)]">{item.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">{item.name}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditId(item.id); setEditLabel(item.label); }}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--action-primary)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-[var(--text-secondary)] hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                    : null}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="新增来源">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">大类标识</span>
              <Input value={addForm.category} onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))} placeholder="如 referral" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">大类名称</span>
              <Input value={addForm.categoryLabel} onChange={(e) => setAddForm((p) => ({ ...p, categoryLabel: e.target.value }))} placeholder="如 转介绍" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">小类标识</span>
              <Input value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="如 employee" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">小类名称</span>
              <Input value={addForm.label} onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))} placeholder="如 员工介绍" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  create_user: '创建用户',
  disable_user: '禁用用户',
  enable_user: '启用用户',
  transfer_customer: '转移客户',
};

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => listAuditLogs({ page, pageSize: 50 }),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['时间', '操作人', '操作', '对象类型', '对象ID', '详情'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {items.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-heading)]">{log.actor?.name ?? '系统'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{log.resourceType}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">{log.resourceId ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {log.afterData ? JSON.stringify(log.afterData) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">暂无操作记录</div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">第 {pagination.page} / {pagination.totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rollback Approval Tab ─────────────────────────────────────────────────

const STATUS_LABEL_CN: Record<string, string> = {
  following: '跟进中', interested: '有意向', negotiating: '谈判中', won: '已成交', lost: '已丢失',
};

function RollbackApprovalTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ requestId: string; approved: boolean } | null>(null);
  const [note, setNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['rollback-requests', filter],
    queryFn: () => listRollbackRequests(filter || undefined),
  });

  async function handleReview(requestId: string, approved: boolean, reviewNote?: string) {
    setActing(requestId);
    try {
      await reviewRollbackRequest(requestId, approved, reviewNote);
      qc.invalidateQueries({ queryKey: ['rollback-requests'] });
      setNoteModal(null);
      setNote('');
    } finally { setActing(null); }
  }

  const FILTER_TABS = [
    { key: 'pending', label: '待审批' },
    { key: 'approved', label: '已批准' },
    { key: 'rejected', label: '已拒绝' },
    { key: '', label: '全部' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key as typeof filter)}
            className={`rounded-[6px] px-3 py-1.5 text-sm font-medium transition ${filter === t.key ? 'bg-[var(--action-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['客户', '申请人', '回退方向', '原因', '申请时间', '状态', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {requests.map((r: RollbackRequest) => (
              <tr key={r.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3">
                  <a href={`/customers/${r.customerId}`} className="font-medium text-[var(--text-heading)] hover:underline">
                    {r.customer?.name ?? r.customerId}
                  </a>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{r.requester?.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {STATUS_LABEL_CN[r.fromStatus] ?? r.fromStatus} → {STATUS_LABEL_CN[r.toStatus] ?? r.toStatus}
                </td>
                <td className="px-4 py-3 max-w-[160px] truncate text-[var(--text-muted)]">{r.reason ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                  {new Date(r.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">待审批</span>}
                  {r.status === 'approved' && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">已批准</span>}
                  {r.status === 'rejected' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">已拒绝</span>}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={acting === r.id}
                        onClick={() => setNoteModal({ requestId: r.id, approved: true })}
                        className="rounded-[6px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        批准
                      </button>
                      <button
                        disabled={acting === r.id}
                        onClick={() => setNoteModal({ requestId: r.id, approved: false })}
                        className="rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        拒绝
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && r.reviewer && (
                    <span className="text-xs text-[var(--text-muted)]">{r.reviewer.name}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="flex h-20 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>}
        {!isLoading && requests.length === 0 && <div className="flex h-20 items-center justify-center text-sm text-[var(--text-muted)]">暂无审批记录</div>}
      </div>

      <Modal open={!!noteModal} onClose={() => { setNoteModal(null); setNote(''); }} title={noteModal?.approved ? '批准回退申请' : '拒绝回退申请'}>
        {noteModal && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">可选填备注说明原因。</p>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（可选）" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setNoteModal(null); setNote(''); }}>取消</Button>
              <button
                disabled={!!acting}
                onClick={() => handleReview(noteModal.requestId, noteModal.approved, note || undefined)}
                className={`rounded-[8px] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${noteModal.approved ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {noteModal.approved ? '确认批准' : '确认拒绝'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Quotation Approval Tab ────────────────────────────────────────────────

function QuotationApprovalTab() {
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ id: string; approved: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const { data: approvalsRaw, isLoading } = useQuery({
    queryKey: ['quotation-approvals'],
    queryFn: listQuotationApprovals,
  });
  const approvals = Array.isArray(approvalsRaw) ? approvalsRaw : [];

  async function handleReview(id: string, approved: boolean, note?: string) {
    setActing(id);
    try {
      await reviewQuotationApproval(id, approved, note);
      qc.invalidateQueries({ queryKey: ['quotation-approvals'] });
      setReviewModal(null);
      setReviewNote('');
    } finally { setActing(null); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">以下报价单含低于最低价商品，需要审批后方可发送给客户。</p>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['报价单号', '客户', '商机', '金额', '申请人', '申请时间', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {approvals.map((a) => (
              <tr key={a.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--text-heading)]">{a.quotation.quoteNo}</td>
                <td className="px-4 py-3">
                  {a.quotation.customer && (
                    <a href={`/customers/${a.quotation.customer.id}`} className="text-[var(--text-secondary)] hover:underline">
                      {a.quotation.customer.name}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{a.quotation.opportunity?.title ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-[var(--text-heading)]">
                  ¥{Number(a.quotation.totalAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{a.quotation.createdBy?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {new Date(a.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={!!acting}
                      onClick={() => setReviewModal({ id: a.id, approved: true })}
                      className="rounded-[6px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      批准
                    </button>
                    <button
                      disabled={!!acting}
                      onClick={() => setReviewModal({ id: a.id, approved: false })}
                      className="rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      拒绝
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="flex h-20 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>}
        {!isLoading && approvals.length === 0 && <div className="flex h-20 items-center justify-center text-sm text-[var(--text-muted)]">暂无待审批报价单</div>}
      </div>

      <Modal open={!!reviewModal} onClose={() => { setReviewModal(null); setReviewNote(''); }} title={reviewModal?.approved ? '批准报价' : '拒绝报价'}>
        {reviewModal && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              {reviewModal.approved ? '批准后销售可将报价单发送给客户。' : '拒绝后销售需重新修改价格。'}
            </p>
            <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="备注说明（可选）" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setReviewModal(null); setReviewNote(''); }}>取消</Button>
              <button
                disabled={!!acting}
                onClick={() => handleReview(reviewModal.id, reviewModal.approved, reviewNote || undefined)}
                className={`rounded-[8px] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${reviewModal.approved ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {reviewModal.approved ? '确认批准' : '确认拒绝'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Loss Reasons Tab ──────────────────────────────────────────────────────

const DEFAULT_LOSS_REASONS = ['价格太高', '选择了竞品', '需求变化', '预算取消', '决策层否决', '合作时机不对', '产品不符合需求', '其他'];

function LossReasonsTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['system-config', 'loss_reasons'],
    queryFn: () => getSystemConfig('loss_reasons'),
  });

  const reasons: string[] = (data?.value as string[] | null) ?? DEFAULT_LOSS_REASONS;

  async function save(updated: string[]) {
    setSaving(true);
    setSaveOk(false);
    try {
      await setSystemConfig('loss_reasons', updated);
      qc.invalidateQueries({ queryKey: ['system-config', 'loss_reasons'] });
      qc.invalidateQueries({ queryKey: ['loss-reasons'] });
      setSaveOk(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const val = newReason.trim();
    if (!val || reasons.includes(val)) return;
    await save([...reasons, val]);
    setNewReason('');
  }

  async function handleDelete(index: number) {
    await save(reasons.filter((_, i) => i !== index));
  }

  async function handleEditSave() {
    if (!editing) return;
    const updated = reasons.map((r, i) => i === editing.index ? editing.value.trim() : r);
    await save(updated);
    setEditing(null);
  }

  async function handleReset() {
    await save(DEFAULT_LOSS_REASONS);
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">丢单原因管理</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          配置销售关闭商机（输单）时可选的预设原因，销售也可手动输入。
        </p>
      </div>

      {isLoading ? (
        <div className="py-4 text-sm text-[var(--text-muted)]">加载中...</div>
      ) : (
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <div key={index} className="flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2.5">
              {editing?.index === index ? (
                <>
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ index, value: e.target.value })}
                    className="flex-1 h-7 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditing(null); }}
                    autoFocus
                  />
                  <button disabled={saving} onClick={handleEditSave} className="text-xs text-[var(--action-primary)] hover:underline disabled:opacity-50">保存</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-[var(--text-muted)] hover:underline">取消</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[var(--text-body)]">{reason}</span>
                  <button onClick={() => setEditing({ index, value: reason })} className="text-xs text-[var(--text-secondary)] hover:text-[var(--action-primary)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(index)} className="text-xs text-[var(--text-secondary)] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="新增丢单原因"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button disabled={saving || !newReason.trim()} onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />添加
        </Button>
      </div>

      {saveOk && <div className="rounded-[8px] bg-green-50 px-4 py-2.5 text-sm text-green-700">已保存</div>}

      <Button variant="secondary" onClick={handleReset} disabled={saving}>恢复默认</Button>
    </div>
  );
}

// ── Quotation Template Tab ────────────────────────────────────────────────

interface CompanyProfile {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  footerNote?: string;
}

function QuotationTemplateTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyProfile | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['system-config', 'company_profile'],
    queryFn: () => getSystemConfig('company_profile'),
  });

  const displayForm: CompanyProfile = form ?? (data?.value as CompanyProfile ?? {});

  function set(field: keyof CompanyProfile, value: string) {
    setForm((prev) => ({ ...(prev ?? (data?.value as CompanyProfile ?? {})), [field]: value }));
    setSaveOk(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await setSystemConfig('company_profile', displayForm);
      qc.invalidateQueries({ queryKey: ['system-config', 'company_profile'] });
      setSaveOk(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">报价单模板配置</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          配置公司信息，将显示在打印报价单的页眉和页脚。
        </p>
      </div>

      {isLoading ? (
        <div className="py-6 text-sm text-[var(--text-muted)]">加载中...</div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">公司名称</span>
            <Input
              value={displayForm.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="如：深圳市XX科技有限公司"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">公司地址</span>
            <Input
              value={displayForm.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="如：深圳市南山区科技园XX大厦501"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">联系电话</span>
              <Input
                value={displayForm.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0755-12345678"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">联系邮箱</span>
              <Input
                type="email"
                value={displayForm.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contact@example.com"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">页脚备注</span>
            <textarea
              value={displayForm.footerNote ?? ''}
              onChange={(e) => set('footerNote', e.target.value)}
              rows={3}
              placeholder="如：本报价单有效期30天，价格含税。如有疑问请联系我司销售代表。"
              className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 text-sm focus:border-[var(--action-primary)] focus:outline-none resize-none"
            />
          </label>
        </div>
      )}

      {saveError && (
        <div className="rounded-[8px] bg-red-50 px-4 py-2.5 text-sm text-red-600">{saveError}</div>
      )}
      {saveOk && (
        <div className="rounded-[8px] bg-green-50 px-4 py-2.5 text-sm text-green-700">已保存成功，下次生成报价单时生效</div>
      )}

      <Button onClick={handleSave} disabled={saving || isLoading}>
        {saving ? '保存中...' : '保存配置'}
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('用户管理');
  usePageHeader('系统设置');

  const isAdmin = user?.role === 'admin';

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listAdminUsers({ pageSize: 100 }),
    enabled: isAdmin,
  });

  const { data: departments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => listDepartments(),
    enabled: isAdmin,
  });

  const users = usersData?.items ?? [];
  const depts = departments ?? [];

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-[var(--text-muted)]">
          <div className="text-4xl mb-3">🔒</div>
          <div>系统设置仅管理员可访问</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <div className="w-44 shrink-0 overflow-y-auto border-r border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full rounded-[7px] px-3 py-2 text-left text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-app)]/95 px-6 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-app)]/85">
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">{activeTab}</h2>
          </div>
          <div className="p-6 pt-4">
          {activeTab === '用户管理' && (
            <UserManagementTab
              departments={depts}
              users={users}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
            />
          )}
          {activeTab === '部门管理' && (
            <DepartmentManagementTab
              departments={depts}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-departments'] })}
            />
          )}
          {activeTab === '产品目录' && <ProductCatalogTab />}
          {activeTab === '来源管理' && <SourceManagementTab />}
          {activeTab === '标签管理' && <TagManagementTab />}
          {activeTab === '疑似重复' && <SuspectedDuplicatesTab />}
          {activeTab === '回退审批' && <RollbackApprovalTab />}
          {activeTab === '报价审批' && <QuotationApprovalTab />}
          {activeTab === '导出审批' && <ExportApprovalTab />}
          {activeTab === '操作日志' && <AuditLogTab />}
          {activeTab === '提醒规则' && <FollowUpRulesTab />}
          {activeTab === '报价模板' && <QuotationTemplateTab />}
          {activeTab === '丢单原因' && <LossReasonsTab />}
          {activeTab === '数据字典' && <DataDictionaryTab />}
          {activeTab === '自定义字段' && <CustomFieldsTab />}
          {activeTab === '必填规则' && <RequiredFieldRulesTab />}
          {activeTab === '工作流' && <WorkflowTab />}
          {activeTab === '消息模板' && <NotificationTemplatesTab />}
          {activeTab === '通知设置' && <NotificationSettingsTab />}
          {activeTab === '功能权限' && <FunctionPermissionsTab />}
          {activeTab === 'Webhook' && <WebhookTab />}
          {activeTab === '自定义报表' && <CustomReportsAdminTab />}
          {activeTab === 'BI数据接口' && <BiApiTab />}
          {activeTab === '阶段赢率' && <StageWinRateTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data Dictionary Tab ───────────────────────────────────────────────────

const DEFAULT_INDUSTRIES = ['制造业', '零售', '金融', '医疗', '教育', '房地产', '互联网', '政府', '物流', '其他'];
const DEFAULT_COMPANY_SIZES = ['1-50人', '51-200人', '201-1000人', '1000人以上', '上市公司'];
const DEFAULT_REGIONS = ['华东', '华南', '华北', '华中', '西南', '西北', '东北', '港澳台', '海外'];

function EnumListEditor({
  configKey,
  defaults,
  label,
  description,
}: {
  configKey: string;
  defaults: string[];
  label: string;
  description: string;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['system-config', configKey],
    queryFn: () => getSystemConfig(configKey),
  });

  const values: string[] = (data?.value as string[] | null) ?? defaults;

  async function save(updated: string[]) {
    setSaving(true);
    setSaveOk(false);
    try {
      await setSystemConfig(configKey, updated);
      qc.invalidateQueries({ queryKey: ['system-config', configKey] });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-[var(--border-default)] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">{label}</h4>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      {isLoading ? (
        <div className="py-2 text-sm text-[var(--text-muted)]">加载中...</div>
      ) : (
        <div className="mb-3 space-y-1.5">
          {values.map((v, index) => (
            <div key={index} className="flex items-center gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5">
              {editing?.index === index ? (
                <>
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ index, value: e.target.value })}
                    className="h-6 flex-1 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { save(values.map((r, i) => i === index ? editing.value.trim() : r)); setEditing(null); }
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                  <button disabled={saving} onClick={() => { save(values.map((r, i) => i === index ? editing.value.trim() : r)); setEditing(null); }} className="text-xs text-[var(--action-primary)] hover:underline disabled:opacity-50">保存</button>
                  <button onClick={() => setEditing(null)} className="text-xs text-[var(--text-muted)] hover:underline">取消</button>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <button
                      disabled={index === 0 || saving}
                      onClick={() => { const a = [...values]; [a[index - 1], a[index]] = [a[index], a[index - 1]]; save(a); }}
                      className="leading-none text-[var(--text-muted)] hover:text-[var(--action-primary)] disabled:opacity-30"
                      title="上移"
                    >▲</button>
                    <button
                      disabled={index === values.length - 1 || saving}
                      onClick={() => { const a = [...values]; [a[index + 1], a[index]] = [a[index], a[index + 1]]; save(a); }}
                      className="leading-none text-[var(--text-muted)] hover:text-[var(--action-primary)] disabled:opacity-30"
                      title="下移"
                    >▼</button>
                  </div>
                  <span className="flex-1 text-xs text-[var(--text-body)]">{v}</span>
                  <button onClick={() => setEditing({ index, value: v })} className="text-[var(--text-muted)] hover:text-[var(--action-primary)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => save(values.filter((_, i) => i !== index))} className="text-[var(--text-muted)] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`新增${label}...`}
          className="flex-1 h-8 text-xs"
          onKeyDown={(e) => { if (e.key === 'Enter' && newValue.trim()) { save([...values, newValue.trim()]); setNewValue(''); }}}
        />
        <Button
          className="h-8 px-3 text-xs"
          disabled={saving || !newValue.trim() || values.includes(newValue.trim())}
          onClick={() => { save([...values, newValue.trim()]); setNewValue(''); }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />添加
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button onClick={() => save(defaults)} disabled={saving} className="text-xs text-[var(--text-muted)] hover:underline disabled:opacity-50">恢复默认</button>
        {saveOk && <span className="text-xs text-emerald-600">已保存</span>}
      </div>
    </div>
  );
}

function DataDictionaryTab() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">数据字典</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          统一管理下拉选项枚举值，确保报表维度一致性。修改后立即生效于所有新建/编辑表单。
        </p>
      </div>
      <EnumListEditor
        configKey="industry_types"
        defaults={DEFAULT_INDUSTRIES}
        label="行业分类"
        description="客户/线索行业归属，影响自动分配和报表聚合"
      />
      <EnumListEditor
        configKey="company_sizes"
        defaults={DEFAULT_COMPANY_SIZES}
        label="公司规模"
        description="客户公司规模分类，影响销售策略匹配"
      />
      <EnumListEditor
        configKey="regions"
        defaults={DEFAULT_REGIONS}
        label="地区分类"
        description="客户归属地区，影响自动分配和区域报表"
      />
    </div>
  );
}

// ── BI API Tab ────────────────────────────────────────────────────────────────

function BiApiTab() {
  const { data: cfg } = useQuery({
    queryKey: ['system-config', 'external_api_key'],
    queryFn: () => getSystemConfig('external_api_key'),
    staleTime: 60_000,
  });
  const apiKey = (cfg?.value as string | null) ?? '（尚未生成）';
  const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin;

  const endpoints = [
    { method: 'GET', path: '/bi/customers', desc: '客户列表，支持 page / pageSize / updatedAfter 参数' },
    { method: 'GET', path: '/bi/leads', desc: '线索列表，支持 page / pageSize / updatedAfter 参数' },
    { method: 'GET', path: '/bi/opportunities', desc: '商机列表，支持 page / pageSize / updatedAfter 参数' },
    { method: 'GET', path: '/bi/orders', desc: '订单列表，支持 page / pageSize / updatedAfter 参数' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">BI 数据接口</h3>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">通过 REST API 将 CRM 数据同步至外部 BI 平台（Tableau、Metabase、Power BI 等）。</p>
      </div>

      <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">认证方式</div>
        <p className="text-sm text-[var(--text-body)]">在请求头中携带 <code className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-xs">x-api-key: &lt;API_KEY&gt;</code></p>
        <div className="flex items-center gap-2 rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2">
          <span className="flex-1 font-mono text-sm text-[var(--text-body)] break-all">{apiKey}</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">API Key 在「通知设置」Tab 中生成和管理。</p>
      </div>

      <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">接口列表</div>
        {endpoints.map((ep) => (
          <div key={ep.path} className="flex items-start gap-3 rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2.5">
            <span className="mt-0.5 shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700">{ep.method}</span>
            <div className="min-w-0">
              <div className="font-mono text-sm text-[var(--text-heading)]">{baseUrl}{ep.path}</div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">{ep.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">示例请求</div>
        <pre className="overflow-x-auto rounded-[7px] bg-gray-900 px-4 py-3 text-xs text-green-300 whitespace-pre">
{`curl -H "x-api-key: ${apiKey}" \\
  "${baseUrl}/bi/customers?page=1&pageSize=100"`}
        </pre>
      </div>
    </div>
  );
}

// ── Custom Fields Tab ─────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  date: '日期',
  select: '下拉选择',
  boolean: '是/否',
  autonumber: '自动编号',
  address: '地址（省/市/区/详情）',
};

const ENTITY_TYPES = [{ value: 'customer', label: '客户' }];

function CustomFieldsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomFieldDef | null>(null);
  const [entityType, setEntityType] = useState('customer');

  const { data: fields = [], isLoading } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields', entityType],
    queryFn: () => listCustomFields(entityType),
  });

  function handleSaved() {
    setShowForm(false);
    setEditTarget(null);
    qc.invalidateQueries({ queryKey: ['custom-fields', entityType] });
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此自定义字段？已录入的数据不会立即清除。')) return;
    await deleteCustomField(id);
    qc.invalidateQueries({ queryKey: ['custom-fields', entityType] });
  }

  async function handleToggleActive(field: CustomFieldDef) {
    await updateCustomField(field.id, { isActive: !field.isActive });
    qc.invalidateQueries({ queryKey: ['custom-fields', entityType] });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">自定义字段</h3>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">为客户等对象添加个性化字段，字段将在新建/编辑表单中展示。</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />新建字段
        </Button>
      </div>

      <div className="mb-3 flex gap-2">
        {ENTITY_TYPES.map((et) => (
          <button
            key={et.value}
            type="button"
            onClick={() => setEntityType(et.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${entityType === et.value ? 'bg-[var(--action-primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
          >
            {et.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-muted)]">加载中...</div>
      ) : fields.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--border-default)] py-10 text-center text-sm text-[var(--text-muted)]">
          暂无自定义字段，点击右上角新建
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                {['字段名称', '字段Key', '类型', '必填', '状态', '操作'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {fields.map((f) => (
                <tr key={f.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{f.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{f.fieldKey}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{f.required ? '是' : '否'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${f.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {f.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditTarget(f); setShowForm(true); }}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        <Pencil className="h-3 w-3" />编辑
                      </button>
                      <button
                        onClick={() => handleToggleActive(f)}
                        className={`inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-xs ${f.isActive ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {f.isActive ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditTarget(null); }} title={editTarget ? '编辑自定义字段' : '新建自定义字段'}>
        <CustomFieldForm
          field={editTarget}
          defaultEntityType={entityType}
          onSuccess={handleSaved}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      </Modal>
    </div>
  );
}

function CustomFieldForm({ field, defaultEntityType, onSuccess, onCancel }: {
  field: CustomFieldDef | null;
  defaultEntityType: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<{
    entityType: string;
    label: string;
    fieldKey: string;
    fieldType: CustomFieldDef['fieldType'];
    options: string;
    defaultValue: string;
    required: boolean;
    sortOrder: number;
  }>({
    entityType: field?.entityType ?? defaultEntityType,
    label: field?.label ?? '',
    fieldKey: field?.fieldKey ?? '',
    fieldType: (field?.fieldType ?? 'text') as CustomFieldDef['fieldType'],
    options: field?.options ?? '',
    defaultValue: field?.defaultValue ?? '',
    required: field?.required ?? false,
    sortOrder: field?.sortOrder ?? 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isCreate = !field;

  function genKey(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9_]/gi, '_').replace(/__+/g, '_');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setError('请填写字段名称'); return; }
    if (!form.fieldKey.trim()) { setError('请填写字段Key'); return; }
    setLoading(true);
    setError('');
    try {
      if (isCreate) {
        await createCustomField({
          entityType: form.entityType,
          label: form.label,
          fieldKey: form.fieldKey,
          fieldType: form.fieldType,
          options: form.fieldType === 'select' ? form.options : undefined,
          defaultValue: form.defaultValue.trim() || undefined,
          required: form.required,
          sortOrder: form.sortOrder,
        });
      } else {
        await updateCustomField(field!.id, {
          label: form.label,
          options: form.fieldType === 'select' ? form.options : undefined,
          defaultValue: form.defaultValue.trim() || null,
          required: form.required,
          sortOrder: form.sortOrder,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCreate && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">所属对象</label>
            <select
              value={form.entityType}
              onChange={(e) => setForm((p) => ({ ...p, entityType: e.target.value }))}
              className="w-full rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
            >
              {ENTITY_TYPES.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">字段类型</label>
            <select
              value={form.fieldType}
              onChange={(e) => setForm((p) => ({ ...p, fieldType: e.target.value as CustomFieldDef['fieldType'] }))}
              className="w-full rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">字段名称 *</label>
        <Input
          value={form.label}
          onChange={(e) => setForm((p) => ({ ...p, label: e.target.value, ...(isCreate && !p.fieldKey ? { fieldKey: genKey(e.target.value) } : {}) }))}
          placeholder="如：合同金额、到期日期"
          autoFocus
        />
      </div>

      {isCreate && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">字段Key（唯一标识，创建后不可修改）</label>
          <Input
            value={form.fieldKey}
            onChange={(e) => setForm((p) => ({ ...p, fieldKey: e.target.value }))}
            placeholder="如：contract_amount"
          />
        </div>
      )}

      {form.fieldType === 'select' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">选项值（每行一个）</label>
          <textarea
            value={form.options.replace(/,/g, '\n')}
            onChange={(e) => setForm((p) => ({ ...p, options: e.target.value.split('\n').filter(Boolean).join(',') }))}
            rows={4}
            placeholder="选项1&#10;选项2&#10;选项3"
            className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
          />
        </div>
      )}

      {form.fieldType === 'autonumber' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">编号格式</label>
          <Input
            value={form.options}
            onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
            placeholder="如：CUST-{seq:4} 生成 CUST-0001"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">使用 {'{seq:N}'} 表示自增序号，N 为补零位数</p>
        </div>
      )}

      {form.fieldType !== 'boolean' && form.fieldType !== 'autonumber' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">默认值（可选）</label>
          <Input
            value={form.defaultValue}
            onChange={(e) => setForm((p) => ({ ...p, defaultValue: e.target.value }))}
            placeholder={form.fieldType === 'select' ? '填写选项值之一' : form.fieldType === 'date' ? 'YYYY-MM-DD' : '留空则无默认值'}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.required}
            onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          <span className="text-[var(--text-body)]">必填</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">排序</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
            className="w-16 rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none focus:border-[var(--border-focus)]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>
          {loading ? '提交中...' : isCreate ? '创建字段' : '保存修改'}
        </Button>
      </div>
    </form>
  );
}

// ── Required Field Rules Tab ──────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<string, string> = {
  global: '全局必填',
  stage: '阶段必填',
  role: '角色必填',
};

const CUSTOMER_FIELDS = [
  { key: 'name', label: '客户名称' },
  { key: 'primaryPhone', label: '手机号' },
  { key: 'primaryEmail', label: '邮箱' },
  { key: 'primaryContactName', label: '联系人' },
  { key: 'companyName', label: '公司名称' },
  { key: 'region', label: '地区' },
  { key: 'industry', label: '行业' },
  { key: 'sourceCategory', label: '来源' },
];

const CUSTOMER_STATUSES = [
  { value: 'following', label: '跟进中' },
  { value: 'interested', label: '有意向' },
  { value: 'negotiating', label: '谈判中' },
  { value: 'won', label: '已成交' },
];

const ROLES = [
  { value: 'sales', label: '销售' },
  { value: 'manager', label: '销售组长' },
  { value: 'director', label: '销售总监' },
  { value: 'admin', label: '管理员' },
];

function RequiredFieldRulesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateRequiredFieldRuleInput>({
    entityType: 'customer', fieldKey: 'primaryPhone', fieldLabel: '手机号',
    ruleType: 'global',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['required-field-rules'],
    queryFn: () => listRequiredFieldRules(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRequiredFieldRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['required-field-rules'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateRequiredFieldRule(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['required-field-rules'] }),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fieldKey || !form.ruleType) { setFormError('请填写完整'); return; }
    if (form.ruleType === 'stage' && !form.stageValue) { setFormError('请选择适用阶段'); return; }
    if (form.ruleType === 'role' && !form.roleValue) { setFormError('请选择适用角色'); return; }
    setFormError('');
    setFormLoading(true);
    try {
      const field = CUSTOMER_FIELDS.find((f) => f.key === form.fieldKey);
      await createRequiredFieldRule({ ...form, fieldLabel: field?.label ?? form.fieldKey });
      qc.invalidateQueries({ queryKey: ['required-field-rules'] });
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? '创建失败');
    } finally { setFormLoading(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">必填规则配置</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">配置哪些字段在特定场景下为必填</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1" />新建规则
        </Button>
      </div>

      {isLoading && <p className="text-sm text-[var(--text-muted)]">加载中...</p>}
      {!isLoading && rules.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">暂无必填规则</p>
      )}

      {rules.length > 0 && (
        <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                {['字段', '规则类型', '条件', '状态', '操作'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-heading)]">{rule.fieldLabel}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                    {rule.ruleType === 'stage' && `阶段：${CUSTOMER_STATUSES.find((s) => s.value === rule.stageValue)?.label ?? rule.stageValue}`}
                    {rule.ruleType === 'role' && `角色：${ROLES.find((r) => r.value === rule.roleValue)?.label ?? rule.roleValue}`}
                    {rule.ruleType === 'global' && '所有场景'}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleMut.mutate({ id: rule.id, isActive: !rule.isActive })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {rule.isActive ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => { if (!confirm('确认删除？')) return; deleteMut.mutate(rule.id); }}
                      className="text-[var(--text-muted)] hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="新建必填规则">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">字段</label>
              <select
                value={form.fieldKey}
                onChange={(e) => setForm((p) => ({ ...p, fieldKey: e.target.value }))}
                className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none"
              >
                {CUSTOMER_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">规则类型</label>
              <select
                value={form.ruleType}
                onChange={(e) => setForm((p) => ({ ...p, ruleType: e.target.value as any, stageValue: undefined, roleValue: undefined }))}
                className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="global">全局必填</option>
                <option value="stage">阶段必填</option>
                <option value="role">角色必填</option>
              </select>
            </div>
          </div>

          {form.ruleType === 'stage' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">适用阶段</label>
              <select
                value={form.stageValue ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, stageValue: e.target.value }))}
                className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">请选择</option>
                {CUSTOMER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {form.ruleType === 'role' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">适用角色</label>
              <select
                value={form.roleValue ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, roleValue: e.target.value }))}
                className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">请选择</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? '创建中...' : '创建规则'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Export Approval Tab ───────────────────────────────────────────────────

const EXPORT_APPROVAL_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '待审批', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-500' },
  used:     { label: '已使用', cls: 'bg-gray-100 text-gray-500' },
};

function ExportApprovalTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['export-approvals', filterStatus],
    queryFn: () => listExportApprovals(filterStatus || undefined),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, approved, note }: { id: string; approved: boolean; note?: string }) =>
      reviewExportApproval(id, approved, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['export-approvals'] }),
    onError: (err: any) => window.alert(err?.response?.data?.message ?? '操作失败'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-heading)]">导出审批</h3>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--border-focus)]"
        >
          <option value="">全部状态</option>
          <option value="pending">待审批</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
          <option value="used">已使用</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-[var(--text-muted)]">加载中...</p>}

      {!isLoading && approvals.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">暂无导出审批记录</p>
      )}

      {approvals.map((ap) => {
        const s = EXPORT_APPROVAL_STATUS[ap.status] ?? { label: ap.status, cls: 'bg-gray-100 text-gray-500' };
        return (
          <div key={ap.id} className="flex items-center gap-4 rounded-xl border border-[var(--border-default)] bg-white p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-heading)]">{ap.requester?.name ?? '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                <span className="text-xs text-[var(--text-muted)]">导出范围：{ap.scope}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                申请时间：{new Date(ap.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {ap.reviewer && `  ·  审批人：${ap.reviewer.name}`}
                {ap.reviewNote && `  ·  备注：${ap.reviewNote}`}
              </p>
            </div>
            {ap.status === 'pending' && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const note = window.prompt('拒绝原因（可选）');
                    if (note === null) return;
                    reviewMut.mutate({ id: ap.id, approved: false, note: note || undefined });
                  }}
                >
                  拒绝
                </Button>
                <Button
                  onClick={() => reviewMut.mutate({ id: ap.id, approved: true })}
                  disabled={reviewMut.isPending}
                >
                  通过
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Workflow Tab ───────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'customer.created', label: '客户新建' },
  { value: 'customer.status_changed', label: '客户状态变更' },
  { value: 'customer.assigned', label: '客户转移/分配' },
  { value: 'opportunity.created', label: '商机新建' },
  { value: 'opportunity.stage_changed', label: '商机阶段变更' },
  { value: 'opportunity.closed', label: '商机关闭（赢单/输单）' },
  { value: 'follow_up.created', label: '跟进记录新建' },
  { value: 'follow_up.overdue', label: '跟进逾期（定时触发）' },
];

const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TRIGGER_OPTIONS.map((o) => [o.value, o.label]));

const OPERATOR_OPTIONS = [
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'in', label: '属于（逗号分隔）' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'notify_owner', label: '通知负责人' },
  { value: 'notify_manager', label: '通知主管' },
  { value: 'notify_admin', label: '通知管理员' },
  { value: 'assign_by_region', label: '按地区自动分配' },
  { value: 'assign_to', label: '分配给指定用户' },
];

const EXECUTION_STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: '成功', cls: 'bg-green-100 text-green-700' },
  failed: { label: '失败', cls: 'bg-red-100 text-red-700' },
  skipped: { label: '跳过', cls: 'bg-gray-100 text-gray-500' },
};

function WorkflowRuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: WorkflowRule | null;
  onSave: (data: CreateWorkflowRuleInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [trigger, setTrigger] = useState(initial?.trigger ?? 'customer.created');
  const [conditions, setConditions] = useState<WorkflowCondition[]>(initial?.conditions ?? []);
  const [actions, setActions] = useState<WorkflowAction[]>(initial?.actions ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addCondition = () =>
    setConditions((c) => [...c, { field: 'status', operator: 'eq', value: '' }]);

  const updateCondition = (i: number, patch: Partial<WorkflowCondition>) =>
    setConditions((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const removeCondition = (i: number) =>
    setConditions((c) => c.filter((_, idx) => idx !== i));

  const addAction = () =>
    setActions((a) => [...a, { type: 'notify_owner', config: {} }]);

  const updateAction = (i: number, patch: Partial<WorkflowAction>) =>
    setActions((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const removeAction = (i: number) =>
    setActions((a) => a.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('请输入规则名称'); return; }
    if (!trigger) { setError('请选择触发事件'); return; }
    if (actions.length === 0) { setError('至少添加一个动作'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, trigger, conditions, actions });
    } catch (err: any) {
      setError(err.message ?? '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">规则名称 *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：新客户自动分配" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">触发事件 *</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="rounded-[6px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
          >
            {TRIGGER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--text-muted)]">描述</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选描述" />
      </div>

      {/* Conditions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-heading)]">过滤条件（满足全部才执行）</span>
          <button type="button" onClick={addCondition} className="text-xs text-[var(--brand)] hover:underline">+ 添加条件</button>
        </div>
        {conditions.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">无条件 — 触发时总是执行</p>
        )}
        {conditions.map((cond, i) => (
          <div key={i} className="flex items-center gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
            <input
              className="flex-1 rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
              placeholder="字段名 (如 status, level)"
              value={cond.field}
              onChange={(e) => updateCondition(i, { field: e.target.value })}
            />
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value as any })}
              className="rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
            >
              {OPERATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              className="flex-1 rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
              placeholder={cond.operator === 'in' ? 'A,B,C' : '值'}
              value={Array.isArray(cond.value) ? cond.value.join(',') : cond.value}
              onChange={(e) => {
                const v = e.target.value;
                updateCondition(i, { value: cond.operator === 'in' ? v.split(',').map((s) => s.trim()) : v });
              }}
            />
            <button type="button" onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-heading)]">执行动作</span>
          <button type="button" onClick={addAction} className="text-xs text-[var(--brand)] hover:underline">+ 添加动作</button>
        </div>
        {actions.length === 0 && (
          <p className="text-xs text-red-400">请至少添加一个动作</p>
        )}
        {actions.map((act, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
            <div className="flex items-center gap-2">
              <select
                value={act.type}
                onChange={(e) => updateAction(i, { type: e.target.value as any, config: {} })}
                className="flex-1 rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
              >
                {ACTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
            {act.type === 'assign_to' && (
              <input
                className="w-full rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
                placeholder="目标用户 ID"
                value={act.config.userId ?? ''}
                onChange={(e) => updateAction(i, { config: { userId: e.target.value } })}
              />
            )}
            {(act.type === 'notify_owner' || act.type === 'notify_manager' || act.type === 'notify_admin') && (
              <input
                className="w-full rounded border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none"
                placeholder="通知消息（留空则使用默认）"
                value={act.config.message ?? ''}
                onChange={(e) => updateAction(i, { config: { ...act.config, message: e.target.value } })}
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>{loading ? '保存中...' : initial ? '保存修改' : '创建规则'}</Button>
      </div>
    </form>
  );
}

function WorkflowTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowRule | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExecRuleId, setShowExecRuleId] = useState<string | null>(null);

  const { data: rulesRaw, isLoading } = useQuery({
    queryKey: ['workflow-rules'],
    queryFn: listWorkflowRules,
  });
  const rules = Array.isArray(rulesRaw) ? rulesRaw : [];

  const { data: executionsRaw } = useQuery({
    queryKey: ['workflow-executions', showExecRuleId],
    queryFn: () => listWorkflowExecutions(showExecRuleId ?? undefined),
    enabled: showExecRuleId !== null,
  });
  const executions = Array.isArray(executionsRaw) ? executionsRaw : [];

  const createMut = useMutation({
    mutationFn: createWorkflowRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-rules'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateWorkflowRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-rules'] }); setShowForm(false); setEditTarget(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteWorkflowRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-rules'] }),
  });

  const toggleActive = (rule: WorkflowRule) =>
    updateMut.mutate({ id: rule.id, data: { isActive: !rule.isActive } });

  const handleSave = async (data: CreateWorkflowRuleInput) => {
    if (editTarget) {
      await updateMut.mutateAsync({ id: editTarget.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">工作流规则</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">配置触发器、条件和自动化动作</p>
        </div>
        <Button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
        >
          <Plus size={14} className="mr-1" />新建规则
        </Button>
      </div>

      {isLoading && <p className="text-sm text-[var(--text-muted)]">加载中...</p>}

      {!isLoading && rules.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-default)] py-12">
          <Zap size={32} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">暂无工作流规则，点击右上角新建</p>
        </div>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className="rounded-xl border border-[var(--border-default)] bg-white overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-[var(--text-heading)] truncate">{rule.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {rule.isActive ? '启用' : '停用'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {TRIGGER_LABEL[rule.trigger] ?? rule.trigger}
                </span>
              </div>
              {rule.description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{rule.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowExecRuleId(showExecRuleId === rule.id ? null : rule.id)}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--brand)] px-2 py-1 rounded hover:bg-[var(--bg-subtle)]"
                title="执行历史"
              >
                <History size={13} />
                <span>{rule._count?.executions ?? 0}</span>
              </button>
              <button
                onClick={() => toggleActive(rule)}
                className={`text-xs px-2 py-1 rounded hover:bg-[var(--bg-subtle)] ${rule.isActive ? 'text-orange-500' : 'text-green-600'}`}
              >
                {rule.isActive ? <Ban size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => { setEditTarget(rule); setShowForm(true); }}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--brand)]"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (!confirm('确认删除此规则？')) return;
                  deleteMut.mutate(rule.id);
                }}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
              >
                {expandedId === rule.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Expanded conditions/actions */}
          {expandedId === rule.id && (
            <div className="border-t border-[var(--border-default)] px-4 py-3 bg-[var(--bg-subtle)] grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-[var(--text-heading)] mb-1">过滤条件</p>
                {rule.conditions.length === 0 ? (
                  <p className="text-[var(--text-muted)]">无条件（总是执行）</p>
                ) : (
                  rule.conditions.map((c, i) => (
                    <p key={i} className="text-[var(--text-body)]">
                      {c.field} {OPERATOR_OPTIONS.find((o) => o.value === c.operator)?.label} {Array.isArray(c.value) ? c.value.join(', ') : c.value}
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--text-heading)] mb-1">执行动作</p>
                {rule.actions.map((a, i) => (
                  <p key={i} className="text-[var(--text-body)]">
                    {ACTION_TYPE_OPTIONS.find((o) => o.value === a.type)?.label}
                    {a.config.userId ? ` → 用户 ${a.config.userId}` : ''}
                    {a.config.message ? `：${a.config.message}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Execution history panel */}
          {showExecRuleId === rule.id && (
            <div className="border-t border-[var(--border-default)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--text-heading)] mb-2">执行历史（最近 100 条）</p>
              {executions.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">暂无执行记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[var(--text-muted)]">
                        <th className="text-left py-1 pr-3">时间</th>
                        <th className="text-left py-1 pr-3">实体</th>
                        <th className="text-left py-1 pr-3">状态</th>
                        <th className="text-left py-1">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((ex) => {
                        const s = EXECUTION_STATUS[ex.status] ?? { label: ex.status, cls: 'bg-gray-100 text-gray-500' };
                        return (
                          <tr key={ex.id} className="border-t border-[var(--border-subtle)]">
                            <td className="py-1 pr-3 text-[var(--text-muted)]">
                              {new Date(ex.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-1 pr-3 text-[var(--text-body)]">{ex.entityType} #{ex.entityId}</td>
                            <td className="py-1 pr-3">
                              <span className={`px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                            </td>
                            <td className="py-1 text-[var(--text-muted)]">{ex.errorMessage ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? '编辑工作流规则' : '新建工作流规则'}
      >
        <WorkflowRuleForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      </Modal>
    </div>
  );
}

// ── Notification Templates Tab ────────────────────────────────────────────────

const NOTIFICATION_TEMPLATE_KEYS = [
  { key: 'tpl_follow_up_today', label: '今日待跟进提醒', vars: ['customerName', 'nextFollowUpTime'] },
  { key: 'tpl_follow_up_overdue', label: '逾期跟进提醒', vars: ['customerName', 'overdueDays'] },
  { key: 'tpl_follow_up_escalated', label: '跟进升级提醒（主管）', vars: ['customerName', 'salesName', 'overdueDays'] },
  { key: 'tpl_refund_requested', label: '退款申请通知', vars: ['orderNo', 'amount', 'customerName'] },
  { key: 'tpl_refund_processed', label: '退款处理完成通知', vars: ['orderNo', 'amount'] },
  { key: 'tpl_workflow', label: '工作流提醒', vars: ['ruleName', 'entityType', 'entityId'] },
  { key: 'tpl_customer_transfer', label: '客户转移通知', vars: ['customerName', 'fromSales', 'toSales'] },
  { key: 'tpl_export_approved', label: '导出审批通过通知', vars: ['requesterName'] },
];

interface NotifTemplate { title: string; body: string; }

function NotificationTemplateEditor({ tplKey, label, vars }: { tplKey: string; label: string; vars: string[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<NotifTemplate>({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ['system-config', tplKey],
    queryFn: () => getSystemConfig(tplKey),
    staleTime: 60_000,
  });

  const tpl: NotifTemplate | null = cfg?.value as NotifTemplate | null;

  function startEdit() {
    setForm(tpl ?? { title: '', body: '' });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setSystemConfig(tplKey, form);
      qc.invalidateQueries({ queryKey: ['system-config', tplKey] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[9px] border border-[var(--border-default)] bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-heading)]">{label}</span>
        <Button variant="secondary" onClick={startEdit}>编辑</Button>
      </div>
      {tpl ? (
        <div className="space-y-1">
          <div className="text-xs text-[var(--text-muted)]">标题：<span className="text-[var(--text-body)]">{tpl.title}</span></div>
          <div className="text-xs text-[var(--text-muted)]">内容：<span className="text-[var(--text-body)]">{tpl.body}</span></div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">使用系统默认模板</p>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        {vars.map((v) => (
          <span key={v} className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">{`{{${v}}}`}</span>
        ))}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title={`编辑模板：${label}`}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">标题模板</label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="支持 {{变量名}} 插入" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">内容模板</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
              placeholder="支持 {{变量名}} 插入，如：客户 {{customerName}} 需跟进"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">可用变量：{vars.map((v) => `{{${v}}}`).join('、')}</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setEditing(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function NotificationTemplatesTab() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">消息模板配置</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          配置各类站内通知的标题和内容模板，支持变量插入。留空则使用系统默认模板。
        </p>
      </div>
      {NOTIFICATION_TEMPLATE_KEYS.map((t) => (
        <NotificationTemplateEditor key={t.key} tplKey={t.key} label={t.label} vars={t.vars} />
      ))}
    </div>
  );
}

// ── Notification Settings Tab ─────────────────────────────────────────────────

function NotificationSettingsTab() {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ['system-config', 'refund_alert_threshold'],
    queryFn: () => getSystemConfig('refund_alert_threshold'),
    staleTime: 60_000,
  });

  const { data: apiKeyCfg } = useQuery({
    queryKey: ['system-config', 'external_api_key'],
    queryFn: () => getSystemConfig('external_api_key'),
    staleTime: 60_000,
  });

  const currentThreshold: number | null = cfg?.value as number | null;
  const currentApiKey: string = (apiKeyCfg?.value as string | null) ?? '';

  function handleFocus() {
    if (!threshold) setThreshold(currentThreshold != null ? String(currentThreshold) : '');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(threshold);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await setSystemConfig('refund_alert_threshold', val);
      qc.invalidateQueries({ queryKey: ['system-config', 'refund_alert_threshold'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleApiKeySave(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;
    setApiKeySaving(true);
    try {
      await setSystemConfig('external_api_key', key);
      qc.invalidateQueries({ queryKey: ['system-config', 'external_api_key'] });
      setApiKeySaved(true);
      setApiKey('');
      setTimeout(() => setApiKeySaved(false), 2000);
    } finally {
      setApiKeySaving(false);
    }
  }

  function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'crm_';
    for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setApiKey(result);
  }

  // Channel config
  const { data: channelCfg } = useQuery({
    queryKey: ['system-config', 'notification_channels_config'],
    queryFn: () => getSystemConfig('notification_channels_config'),
    staleTime: 60_000,
  });
  const channelsConfig = (channelCfg?.value ?? {}) as Record<string, { url?: string; enabled?: boolean }>;
  const [channelForms, setChannelForms] = useState<Record<string, { url: string; enabled: boolean }>>({});
  const [channelSaving, setChannelSaving] = useState<Record<string, boolean>>({});

  const CHANNEL_DEFS = [
    { key: 'wecom', label: '企业微信机器人', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...' },
    { key: 'dingtalk', label: '钉钉机器人', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...' },
  ];

  function getChannelForm(key: string) {
    return channelForms[key] ?? { url: channelsConfig[key]?.url ?? '', enabled: channelsConfig[key]?.enabled ?? false };
  }

  async function saveChannel(chKey: string) {
    const form = getChannelForm(chKey);
    setChannelSaving((p) => ({ ...p, [chKey]: true }));
    try {
      const next = { ...channelsConfig, [chKey]: { url: form.url, enabled: form.enabled, types: ['refund', 'refund_alert', 'workflow_error', 'follow_up_overdue'] } };
      await setSystemConfig('notification_channels_config', next);
      qc.invalidateQueries({ queryKey: ['system-config', 'notification_channels_config'] });
    } finally {
      setChannelSaving((p) => ({ ...p, [chKey]: false }));
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">通知设置</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">配置系统通知的触发规则和阈值。</p>
      </div>

      <div className="rounded-[9px] border border-[var(--border-default)] bg-white p-5">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">大额退款通知阈值</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          当退款金额超过此阈值时，系统将额外通知所有管理员。设为 0 表示不限额。
          当前阈值：{currentThreshold != null ? `¥${Number(currentThreshold).toLocaleString()}` : '未设置（默认不限额）'}
        </p>
        <form onSubmit={handleSave} className="mt-3 flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">¥</span>
            <Input
              type="number"
              value={threshold || (currentThreshold != null ? String(currentThreshold) : '')}
              onChange={(e) => { setThreshold(e.target.value); }}
              onFocus={handleFocus}
              placeholder="如 10000"
              min={0}
            />
          </div>
          <Button type="submit" disabled={saving}>{saving ? '保存...' : saved ? '已保存' : '保存'}</Button>
        </form>
      </div>

      <div className="rounded-[9px] border border-[var(--border-default)] bg-white p-5">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">超期跟进升级规则</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          系统自动按以下规则升级提醒：超期1天→销售本人；超期3天→直属组长；超期7天→总监。
          此规则固定内置，可在「提醒规则」Tab 配置各级别客户的跟进间隔。
        </p>
        <div className="mt-3 space-y-1 text-xs text-[var(--text-body)]">
          <div className="flex items-center gap-2 rounded bg-[var(--bg-muted)] px-3 py-1.5">
            <span className="font-medium">超期 1 天</span><span className="text-[var(--text-muted)]">→ 通知销售本人</span>
          </div>
          <div className="flex items-center gap-2 rounded bg-[var(--bg-muted)] px-3 py-1.5">
            <span className="font-medium">超期 3 天</span><span className="text-[var(--text-muted)]">→ 通知直属主管</span>
          </div>
          <div className="flex items-center gap-2 rounded bg-[var(--bg-muted)] px-3 py-1.5">
            <span className="font-medium">超期 7 天</span><span className="text-[var(--text-muted)]">→ 通知管理员</span>
          </div>
        </div>
      </div>

      <div className="rounded-[9px] border border-[var(--border-default)] bg-white p-5">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">外部系统 API 密钥</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          外部财务/客服系统可调用 <code className="rounded bg-[var(--bg-muted)] px-1 py-0.5 font-mono text-xs">POST /api/v1/orders/external-refund-notify</code> 触发退款同步。
          请求头携带 <code className="rounded bg-[var(--bg-muted)] px-1 py-0.5 font-mono text-xs">X-Api-Key: &lt;密钥&gt;</code>。
        </p>
        {currentApiKey && (
          <div className="mt-2 flex items-center gap-2 rounded bg-[var(--bg-muted)] px-3 py-2 text-xs">
            <span className="text-[var(--text-muted)]">当前密钥：</span>
            <span className="font-mono">{showApiKey ? currentApiKey : '••••••••••••••••'}</span>
            <button type="button" onClick={() => setShowApiKey((v) => !v)} className="ml-1 text-[var(--primary)] hover:underline">{showApiKey ? '隐藏' : '显示'}</button>
          </div>
        )}
        <form onSubmit={handleApiKeySave} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-[7px] border border-[var(--border-default)] px-3 py-2 text-sm font-mono outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入新密钥或点击生成"
            />
            <Button type="button" variant="secondary" onClick={generateKey}>生成</Button>
          </div>
          <Button type="submit" disabled={apiKeySaving || !apiKey.trim()}>
            {apiKeySaving ? '保存...' : apiKeySaved ? '已保存' : '设置密钥'}
          </Button>
        </form>
      </div>

      <div className="rounded-[9px] border border-[var(--border-default)] bg-white p-5">
        <h4 className="text-sm font-semibold text-[var(--text-heading)]">外部通知渠道</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          退款、工作流失败、逾期跟进等重要通知将同时推送到已启用的外部渠道。
        </p>
        <div className="mt-4 space-y-4">
          {CHANNEL_DEFS.map((ch) => {
            const form = getChannelForm(ch.key);
            return (
              <div key={ch.key} className="rounded-[7px] border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-heading)]">{ch.label}</span>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setChannelForms((p) => ({ ...p, [ch.key]: { ...form, enabled: e.target.checked } }))}
                      className="h-3.5 w-3.5"
                    />
                    启用
                  </label>
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={form.url}
                    onChange={(e) => setChannelForms((p) => ({ ...p, [ch.key]: { ...form, url: e.target.value } }))}
                    placeholder={ch.placeholder}
                    className="flex-1 font-mono text-xs"
                  />
                  <Button type="button" variant="secondary" disabled={channelSaving[ch.key]} onClick={() => saveChannel(ch.key)}>
                    {channelSaving[ch.key] ? '保存...' : '保存'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Function Permissions Tab ──────────────────────────────────────────────────

const FEATURE_PERMISSIONS = [
  {
    group: '客户管理',
    features: [
      { key: 'customer.export', label: '导出客户数据', defaultRoles: ['admin'] },
      { key: 'customer.transfer', label: '转移/分配客户', defaultRoles: ['admin', 'manager'] },
      { key: 'customer.delete', label: '删除客户', defaultRoles: ['admin'] },
      { key: 'customer.archive', label: '归档客户', defaultRoles: ['admin', 'manager'] },
      { key: 'customer.merge', label: '合并重复客户', defaultRoles: ['admin'] },
      { key: 'customer.source_edit', label: '修改来源记录', defaultRoles: ['admin', 'manager'] },
    ],
  },
  {
    group: '商机管理',
    features: [
      { key: 'opportunity.close', label: '赢单/输单操作', defaultRoles: ['admin', 'manager', 'sales'] },
      { key: 'opportunity.reopen', label: '重开已关闭商机', defaultRoles: ['admin', 'manager'] },
      { key: 'opportunity.export', label: '导出商机数据', defaultRoles: ['admin', 'manager'] },
    ],
  },
  {
    group: '订单管理',
    features: [
      { key: 'order.pay', label: '确认收款', defaultRoles: ['admin', 'manager'] },
      { key: 'order.refund_request', label: '申请退款', defaultRoles: ['admin', 'manager'] },
      { key: 'order.refund_process', label: '处理退款', defaultRoles: ['admin', 'manager'] },
    ],
  },
  {
    group: '系统设置',
    features: [
      { key: 'settings.access', label: '访问系统设置', defaultRoles: ['admin'] },
      { key: 'report.view_all', label: '查看全公司报表', defaultRoles: ['admin'] },
      { key: 'report.view_dept', label: '查看部门报表', defaultRoles: ['admin', 'manager'] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = { admin: '管理员', director: '总监', manager: '组长', sales: '销售' };
const ALL_ROLES = ['admin', 'director', 'manager', 'sales'];

type PermissionConfig = Record<string, string[]>; // featureKey -> allowedRoles[]

function FunctionPermissionsTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: cfg } = useQuery({
    queryKey: ['system-config', 'function_permissions'],
    queryFn: () => getSystemConfig('function_permissions'),
    staleTime: 60_000,
  });

  const permissions: PermissionConfig = (cfg?.value as PermissionConfig | null) ?? {};

  function getRoles(featureKey: string, defaultRoles: string[]): string[] {
    return permissions[featureKey] ?? defaultRoles;
  }

  async function toggleRole(featureKey: string, role: string, currentRoles: string[]) {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    const newPerms = { ...permissions, [featureKey]: newRoles };
    setSaving(featureKey);
    try {
      await setSystemConfig('function_permissions', newPerms);
      qc.invalidateQueries({ queryKey: ['system-config', 'function_permissions'] });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-heading)]">功能权限配置</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          配置各角色可执行的操作权限。勾选表示该角色拥有此功能权限。管理员始终拥有所有权限，无法撤销。
        </p>
      </div>

      {FEATURE_PERMISSIONS.map((group) => (
        <div key={group.group} className="rounded-[9px] border border-[var(--border-default)] bg-white overflow-hidden">
          <div className="bg-[var(--bg-muted)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{group.group}</div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">功能</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 text-center text-xs font-medium text-[var(--text-muted)]">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {group.features.map((f) => {
                const roles = getRoles(f.key, f.defaultRoles);
                return (
                  <tr key={f.key} className="hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-2.5 text-sm text-[var(--text-body)]">{f.label}</td>
                    {ALL_ROLES.map((r) => (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={roles.includes(r)}
                          disabled={r === 'admin' || saving === f.key}
                          onChange={() => toggleRole(f.key, r, roles)}
                          className="h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <p className="text-xs text-[var(--text-muted)]">
        提示：此配置影响前端按钮/菜单的可见性，后端接口仍保有独立权限校验作为最终防线。
        变更会实时生效，无需重启服务。
      </p>
    </div>
  );
}

// ── Webhook Tab ───────────────────────────────────────────────────────────────

const WEBHOOK_EVENT_OPTIONS = [
  'customer.created', 'customer.status_changed', 'customer.assigned',
  'opportunity.created', 'opportunity.stage_changed', 'opportunity.closed',
  'follow_up.created', 'order.paid', 'order.refund_requested', 'order.refunded',
];

function WebhookTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookConfig | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: configs = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ['webhook-configs'],
    queryFn: listWebhookConfigs,
    staleTime: 30_000,
  });

  function startCreate() {
    setForm({ name: '', url: '', events: [], secret: '' });
    setEditTarget(null);
    setError('');
    setShowForm(true);
  }

  function startEdit(c: WebhookConfig) {
    setForm({ name: c.name, url: c.url, events: c.events, secret: '' });
    setEditTarget(c);
    setError('');
    setShowForm(true);
  }

  function toggleEvent(ev: string) {
    setForm((p) => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter((e) => e !== ev) : [...p.events, ev],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) { setError('名称和URL必填'); return; }
    if (form.events.length === 0) { setError('至少选择一个触发事件'); return; }
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await updateWebhookConfig(editTarget.id, { name: form.name, url: form.url, events: form.events, secret: form.secret || null });
      } else {
        await createWebhookConfig({ name: form.name, url: form.url, events: form.events, secret: form.secret || undefined });
      }
      qc.invalidateQueries({ queryKey: ['webhook-configs'] });
      setShowForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c: WebhookConfig) {
    await updateWebhookConfig(c.id, { isActive: !c.isActive });
    qc.invalidateQueries({ queryKey: ['webhook-configs'] });
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此 Webhook？')) return;
    await deleteWebhookConfig(id);
    qc.invalidateQueries({ queryKey: ['webhook-configs'] });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Webhook 配置</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">配置出站 Webhook，CRM 事件发生时自动推送到外部系统。支持 HMAC-SHA256 签名验证。</p>
        </div>
        <Button onClick={startCreate}><Plus className="mr-1.5 h-4 w-4" />添加</Button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : configs.length === 0 ? (
        <div className="rounded-[9px] border border-dashed border-[var(--border-default)] py-8 text-center text-sm text-[var(--text-muted)]">
          暂无 Webhook 配置
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <div key={c.id} className="rounded-[9px] border border-[var(--border-default)] bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-heading)]">{c.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`}>
                      {c.isActive ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{c.url}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.events.map((ev) => (
                      <span key={ev} className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">{ev}</span>
                    ))}
                  </div>
                  {c.lastFiredAt && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">最后触发：{new Date(c.lastFiredAt).toLocaleString('zh-CN')}</div>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 gap-1">
                  <button onClick={() => handleToggle(c)} className="text-xs text-[var(--text-muted)] hover:text-[var(--action-primary)]">{c.isActive ? '停用' : '启用'}</button>
                  <button onClick={() => startEdit(c)} className="text-[var(--text-muted)] hover:text-[var(--action-primary)]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(c.id)} className="text-[var(--text-muted)] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTarget ? '编辑 Webhook' : '添加 Webhook'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">名称 *</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="如：飞书机器人" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">目标 URL *</label>
            <Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">签名密钥（可选，用于 HMAC-SHA256 验证）</label>
            <Input value={form.secret} onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))} placeholder="留空则不签名" type="password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">触发事件 *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="h-3.5 w-3.5" />
                  <span className="font-mono text-[var(--text-body)]">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Custom Reports Admin Tab ──────────────────────────────────────────────────

const ENTITY_OPTIONS = [
  { value: 'customer', label: '客户' },
  { value: 'opportunity', label: '商机' },
  { value: 'order', label: '订单' },
];

const DIMENSION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  customer: [
    { value: 'industry', label: '行业' },
    { value: 'region', label: '地区' },
    { value: 'companySize', label: '规模' },
    { value: 'level', label: '客户级别' },
    { value: 'status', label: '客户状态' },
    { value: 'sourceCategory', label: '来源大类' },
  ],
  opportunity: [
    { value: 'stage', label: '阶段' },
    { value: 'industry', label: '行业' },
    { value: 'region', label: '地区' },
  ],
  order: [
    { value: 'status', label: '订单状态' },
  ],
};

const METRIC_OPTIONS: Record<string, { field: string; agg: string; label: string }[]> = {
  customer: [{ field: 'count', agg: 'count', label: '客户数量' }],
  opportunity: [
    { field: 'count', agg: 'count', label: '商机数量' },
    { field: 'amount', agg: 'sum', label: '商机总金额' },
  ],
  order: [
    { field: 'count', agg: 'count', label: '订单数量' },
    { field: 'amount', agg: 'sum', label: '订单总金额' },
  ],
};

const EMPTY_REPORT_FORM = { name: '', entityType: 'customer', dimensions: [] as string[], metrics: [{ field: 'count', agg: 'count', label: '数量' }] as CustomReportMetric[] };

function CustomReportsAdminTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_REPORT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<CustomReport[]>({
    queryKey: ['admin-custom-reports'],
    queryFn: listAdminCustomReports,
    staleTime: 30_000,
  });

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_REPORT_FORM });
    setError(null);
    setShowForm(true);
  }

  function openEdit(r: CustomReport) {
    setEditId(r.id);
    setForm({ name: r.name, entityType: r.entityType, dimensions: [...r.dimensions], metrics: [...r.metrics] });
    setError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('报表名称必填'); return; }
    if (form.dimensions.length === 0) { setError('至少选择一个维度'); return; }
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await updateAdminCustomReport(editId, form);
      } else {
        await createAdminCustomReport({ ...form, sortOrder: 0 });
      }
      qc.invalidateQueries({ queryKey: ['admin-custom-reports'] });
      setShowForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此报表？')) return;
    await deleteAdminCustomReport(id);
    qc.invalidateQueries({ queryKey: ['admin-custom-reports'] });
  }

  async function handleToggleActive(r: CustomReport) {
    await updateAdminCustomReport(r.id, { isActive: !r.isActive });
    qc.invalidateQueries({ queryKey: ['admin-custom-reports'] });
  }

  function toggleDim(dim: string) {
    setForm((p) => ({
      ...p,
      dimensions: p.dimensions.includes(dim) ? p.dimensions.filter((d) => d !== dim) : [...p.dimensions, dim],
    }));
  }

  function toggleMetric(m: { field: string; agg: string; label: string }) {
    setForm((p) => {
      const exists = p.metrics.some((x) => x.field === m.field && x.agg === m.agg);
      return { ...p, metrics: exists ? p.metrics.filter((x) => !(x.field === m.field && x.agg === m.agg)) : [...p.metrics, m] };
    });
  }

  const dimOpts = DIMENSION_OPTIONS[form.entityType] ?? [];
  const metricOpts = METRIC_OPTIONS[form.entityType] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">自定义报表</h3>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">配置报表维度和指标，在报表页查看数据。</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1.5"><Plus className="h-4 w-4" />新建报表</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-[9px] border border-dashed border-[var(--border-default)] py-12 text-center text-sm text-[var(--text-muted)]">
          暂无自定义报表，点击右上角新建
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-[9px] border border-[var(--border-default)] bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-heading)]">{r.name}</span>
                  {!r.isActive && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">已停用</span>}
                  <span className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                    {ENTITY_OPTIONS.find((e) => e.value === r.entityType)?.label ?? r.entityType}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  维度：{r.dimensions.join('、')} ｜ 指标：{r.metrics.map((m) => m.label ?? m.field).join('、')}
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button onClick={() => handleToggleActive(r)} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">
                  {r.isActive ? '停用' : '启用'}
                </button>
                <button onClick={() => openEdit(r)} className="text-[var(--text-muted)] hover:text-[var(--primary)]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(r.id)} className="text-[var(--text-muted)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? '编辑报表' : '新建报表'}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">报表名称 *</span>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="如：按行业的客户分布" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">数据来源</span>
            <select
              value={form.entityType}
              onChange={(e) => setForm((p) => ({ ...p, entityType: e.target.value, dimensions: [], metrics: [{ field: 'count', agg: 'count', label: '数量' }] }))}
              className="w-full rounded-[7px] border border-[var(--border-default)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            >
              {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">统计维度 * <span className="text-xs font-normal text-[var(--text-muted)]">（至少选一个）</span></span>
            <div className="flex flex-wrap gap-2">
              {dimOpts.map((d) => (
                <label key={d.value} className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--border-default)] px-2.5 py-1.5 text-sm hover:border-[var(--primary)]">
                  <input type="checkbox" checked={form.dimensions.includes(d.value)} onChange={() => toggleDim(d.value)} className="h-3.5 w-3.5" />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">统计指标</span>
            <div className="flex flex-wrap gap-2">
              {metricOpts.map((m) => (
                <label key={`${m.field}-${m.agg}`} className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--border-default)] px-2.5 py-1.5 text-sm hover:border-[var(--primary)]">
                  <input type="checkbox" checked={form.metrics.some((x) => x.field === m.field && x.agg === m.agg)} onChange={() => toggleMetric(m)} className="h-3.5 w-3.5" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Stage Win Rate Tab ────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { key: 'initial_contact', label: '初步接触' },
  { key: 'needs_analysis',  label: '需求确认' },
  { key: 'proposal',        label: '方案报价' },
  { key: 'negotiation',     label: '谈判中' },
];

const DEFAULT_WIN_RATES: Record<string, number> = {
  initial_contact: 10,
  needs_analysis: 25,
  proposal: 50,
  negotiation: 75,
};

function StageWinRateTab() {
  const qc = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['system-config', 'stage_win_rates'],
    queryFn: () => getSystemConfig('stage_win_rates'),
  });
  const [rates, setRates] = useState<Record<string, number>>({ ...DEFAULT_WIN_RATES });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      try {
        const parsed = typeof config === 'string' ? JSON.parse(config) : config;
        const mapped: Record<string, number> = {};
        for (const s of STAGE_OPTIONS) {
          mapped[s.key] = typeof parsed[s.key] === 'number' ? Math.round(parsed[s.key] * 100) : DEFAULT_WIN_RATES[s.key];
        }
        setRates(mapped);
      } catch {
        setRates({ ...DEFAULT_WIN_RATES });
      }
    }
  }, [config]);

  async function handleSave() {
    setSaving(true);
    try {
      const toSave: Record<string, number> = {};
      for (const s of STAGE_OPTIONS) {
        toSave[s.key] = (rates[s.key] ?? DEFAULT_WIN_RATES[s.key]) / 100;
      }
      await setSystemConfig('stage_win_rates', toSave);
      qc.invalidateQueries({ queryKey: ['system-config', 'stage_win_rates'] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        配置各商机阶段的默认赢率权重，用于计算业绩预测值。赢单和输单商机不参与预测计算。
      </p>
      <div className="rounded-[10px] border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
        {STAGE_OPTIONS.map((s) => (
          <div key={s.key} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-[var(--text-heading)]">{s.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={rates[s.key] ?? DEFAULT_WIN_RATES[s.key]}
                onChange={(e) => setRates((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                className="w-20 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-app)] px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
              />
              <span className="text-sm text-[var(--text-muted)]">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存赢率设置'}</Button>
      </div>
    </div>
  );
}
