import { useRef, useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Upload, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { CustomerForm } from '../components/CustomerForm';
import { InlineLevelEditor, InlineStatusEditor } from '../components/InlineFieldEditor';
import { listCustomers, exportCustomersCsv, importCustomers, downloadCustomerTemplate } from '../api/customers.api';
import type { Customer, QueryCustomersParams, CustomerOpportunitySummary, CustomerImportResult } from '../api/customers.api';
import { listTags } from '@/features/tags/api/tags.api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { requestExportApproval, listExportApprovals } from '@/features/settings/api/admin.api';
import { usePermission } from '@/shared/hooks/usePermission';
import { displayCustomerName, displayOpportunityTitle } from '@/shared/lib/customer-display';

// ── Import modal ────────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await importCustomers(file);
      setResult(res);
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '导入失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-heading)]">第一步：</span>
          下载模板。模板字段将<strong className="font-medium text-[var(--text-heading)]">写入为线索</strong>（不会直接生成客户）；导入后请在「线索管理」中执行「转化为客户」。
        </p>
        <Button variant="secondary" onClick={downloadCustomerTemplate}>
          <Download className="mr-1.5 h-4 w-4" />下载导入模板
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">第二步：选择填好的 Excel / CSV 文件</p>
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[var(--border-default)] py-8 transition hover:border-[var(--action-primary)] hover:bg-[var(--bg-hover)]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-[var(--text-muted)]" />
          {file ? (
            <span className="text-sm font-medium text-[var(--text-heading)]">{file.name}</span>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">点击选择文件（xlsx / xls / csv，最大 5MB）</span>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
      </div>

      {error && (
        <p className="rounded-[7px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {result && (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--text-heading)]">导入完成</p>
          {result.importedAsLeads && (
            <p className="rounded-[7px] bg-blue-50 px-3 py-2 text-xs text-blue-800">
              数据已作为<strong>线索</strong>写入。请到左侧「线索管理」查看，并在合适时机「转化为客户」。
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-body)]">
              <span className="text-[var(--text-muted)]">共解析</span>
              <span className="font-medium">{result.total} 行</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              成功写入 {result.imported} 条{result.importedAsLeads ? '线索' : '记录'}
            </div>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              疑似重复 {result.duplicates} 条
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                失败 {result.errors.length} 行
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-[7px] bg-red-50 px-3 py-2 text-xs text-red-600 space-y-1">
              {result.errors.map((e, i) => (
                <div key={i}>第 {e.row} 行：{e.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>{result ? '关闭' : '取消'}</Button>
        {!result && (
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? '导入中...' : '开始导入'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: actor } = useAuthStore();
  const { can } = usePermission();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExportApproval, setShowExportApproval] = useState(false);
  const [params, setParams] = useState<QueryCustomersParams>({ page: 1, pageSize: 20 });
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => listCustomers(params),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });

  // For managers: check if they have an approved export token
  const { data: approvedExports = [], refetch: refetchApprovals } = useQuery({
    queryKey: ['export-approvals', 'approved'],
    queryFn: () => listExportApprovals('approved'),
    enabled: actor?.role === 'manager' || actor?.role === 'director',
  });

  const requestApprovalMut = useMutation({
    mutationFn: () => requestExportApproval('department'),
    onSuccess: () => {
      window.alert('导出申请已提交，请等待管理员审批');
      setShowExportApproval(false);
    },
    onError: (err: any) => {
      window.alert(err?.response?.data?.message ?? '申请失败');
    },
  });

  async function handleExportClick() {
    if (actor?.role === 'admin' || actor?.role === 'director') {
      await exportCustomersCsv(params);
      return;
    }
    if (actor?.role === 'manager') {
      const approved = approvedExports[0];
      if (approved) {
        await exportCustomersCsv(params, approved.id);
        refetchApprovals();
      } else {
        setShowExportApproval(true);
      }
    }
  }

  function search() {
    setParams((p) => ({ ...p, page: 1, keyword: keyword || undefined }));
  }

  function filter(key: keyof QueryCustomersParams, value: string) {
    setParams((p) => ({ ...p, page: 1, [key]: value || undefined }));
  }

  function handleCreated() {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }

  function handleImportDone() {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const isAdmin = actor?.role === 'admin' || actor?.role === 'director';
  usePageHeader('客户管理', pagination ? `共 ${pagination.total} 位客户` : undefined);

  return (
    <div className="flex h-full flex-col">
      {/* Filters + Actions */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex w-56 items-center gap-2 rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 shadow-none ring-0 focus-within:bg-[var(--bg-hover)] focus-within:ring-0">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className="m-0 h-8 min-h-0 flex-1 border-0 bg-transparent p-0 text-sm leading-8 shadow-none ring-0 outline-none placeholder:text-[var(--text-muted)] focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
            placeholder="搜索客户名称、手机号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <Select className="h-8 w-28 text-xs" value={params.status ?? ''} onChange={(e) => filter('status', e.target.value)}>
          <option value="">全部状态</option>
          <option value="following">跟进中</option>
          <option value="interested">有意向</option>
          <option value="negotiating">谈判中</option>
          <option value="won">已成交</option>
          <option value="lost">已丢失</option>
        </Select>
        <Select className="h-8 w-24 text-xs" value={params.level ?? ''} onChange={(e) => filter('level', e.target.value)}>
          <option value="">全部级别</option>
          <option value="A">A 级</option>
          <option value="B">B 级</option>
          <option value="C">C 级</option>
          <option value="D">D 级</option>
        </Select>
        {tags.length > 0 && (
          <Select className="h-8 w-28 text-xs" value={params.tagId ?? ''} onChange={(e) => filter('tagId', e.target.value)}>
            <option value="">全部标签</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={params.archived === 'only'}
              onChange={(e) => filter('archived', e.target.checked ? 'only' : '')}
              className="h-3.5 w-3.5 rounded"
            />
            仅显示已归档
          </label>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="mr-1.5 h-4 w-4" />导入线索
          </Button>
          {can('customer.export') && (
            <Button variant="secondary" onClick={handleExportClick}>
              <Download className="mr-1.5 h-4 w-4" />
              {actor?.role === 'manager' && approvedExports.length === 0 ? '申请导出' : '导出 CSV'}
            </Button>
          )}
          {isAdmin ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />新建客户
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/leads')}>
              <Plus className="mr-1.5 h-4 w-4" />录入线索
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="text-sm text-[var(--text-muted)]">暂无客户数据</div>
            <p className="max-w-sm text-center text-xs text-[var(--text-muted)]">
              客户由线索「转化」生成。请先在「线索管理」录入并转化；管理员也可在例外情况下直接建档。
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/leads')}>
                <Plus className="mr-1.5 h-4 w-4" />去录入线索
              </Button>
              {isAdmin && (
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />管理员直接建档
                </Button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-app)]">
                {['客户名称', '商机', '级别', '状态', '手机号', '负责人', '创建时间'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c: Customer) => (
                <CustomerRow key={c.id} customer={c} onNavigate={() => navigate(`/customers/${c.id}`)} onUpdated={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-6 py-3">
          <span className="text-xs text-[var(--text-muted)]">
            第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-7 px-3 text-xs"
              disabled={pagination.page <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >上一页</Button>
            <Button
              variant="secondary"
              className="h-7 px-3 text-xs"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >下一页</Button>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建客户（管理员例外）" className="max-w-2xl">
        <CustomerForm onSuccess={handleCreated} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="批量导入（写入线索）" className="max-w-lg">
        <ImportModal onClose={() => setShowImport(false)} onDone={handleImportDone} />
      </Modal>

      <Modal open={showExportApproval} onClose={() => setShowExportApproval(false)} title="申请导出审批">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-body)]">
            主管导出客户数据需经管理员审批。提交申请后，管理员审批通过即可下载。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowExportApproval(false)}>取消</Button>
            <Button onClick={() => requestApprovalMut.mutate()} disabled={requestApprovalMut.isPending}>
              {requestApprovalMut.isPending ? '提交中...' : '提交申请'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const OPP_STAGE_MINI: Record<string, { label: string; color: string }> = {
  initial_contact: { label: '接触', color: 'bg-gray-100 text-gray-500' },
  needs_analysis:  { label: '确认', color: 'bg-blue-100 text-blue-600' },
  proposal:        { label: '报价', color: 'bg-yellow-100 text-yellow-700' },
  negotiation:     { label: '谈判', color: 'bg-purple-100 text-purple-700' },
  closed_won:      { label: '赢单', color: 'bg-green-100 text-green-700' },
  closed_lost:     { label: '输单', color: 'bg-red-100 text-red-500' },
};

function OpportunityTags({ opps }: { opps?: CustomerOpportunitySummary[] }) {
  if (!opps || opps.length === 0) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const visible = opps.slice(0, 3);
  const more = opps.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((o) => {
        const cfg = OPP_STAGE_MINI[o.stage] ?? { label: o.stage, color: 'bg-gray-100 text-gray-500' };
        return (
          <span key={o.id} title={displayOpportunityTitle(o.title)} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
        );
      })}
      {more > 0 && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">
          +{more}
        </span>
      )}
    </div>
  );
}

function CustomerRow({ customer: c, onNavigate, onUpdated }: { customer: Customer; onNavigate: () => void; onUpdated: () => void }) {
  const [level, setLevel] = useState(c.level);
  const [status, setStatus] = useState(c.status);

  return (
    <tr
      className="border-b border-[var(--border-default)] transition hover:bg-[var(--bg-hover)] cursor-pointer"
      onClick={onNavigate}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-[var(--text-heading)]">{displayCustomerName(c.name)}</span>
          {c.archivedAt && (
            <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">已归档</span>
          )}
        </div>
        {c.companyName && <div className="text-xs text-[var(--text-muted)]">{displayCustomerName(c.companyName)}</div>}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <OpportunityTags opps={c.opportunities} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <InlineLevelEditor customerId={c.id} currentValue={level} onUpdated={(v) => { setLevel(v as any); onUpdated(); }} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <InlineStatusEditor customerId={c.id} currentValue={status} onUpdated={(v) => { setStatus(v as any); onUpdated(); }} />
      </td>
      <td className="px-4 py-3 text-[var(--text-body)]">{c.primaryPhone ?? '-'}</td>
      <td className="px-4 py-3 text-[var(--text-body)]">{c.owner?.name ?? '-'}</td>
      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</td>
    </tr>
  );
}
