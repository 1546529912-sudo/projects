import { useRef, useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search, ArrowRight, AlertCircle, Upload, Download, CheckCircle2, XCircle, RotateCcw, Ban } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { LeadForm } from '../components/LeadForm';
import { LeadConvertForm } from '../components/LeadConvertForm';
import { listLeads, importLeads, downloadLeadTemplate, invalidateLead, restoreLead } from '../api/leads.api';
import type { Lead, ImportResult } from '../api/leads.api';
import { cn } from '@/shared/lib/cn';
import { displayCustomerName } from '@/shared/lib/customer-display';

const STATUS_LABELS: Record<string, string> = {
  new: '新线索',
  converted: '已转化',
  duplicate_suspected: '疑似重复',
  invalid: '无效',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-100',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  duplicate_suspected: 'bg-amber-50 text-amber-700 border-amber-100',
  invalid: 'bg-gray-50 text-gray-500 border-gray-100',
};

const STATUS_TABS = [
  { value: '', label: '全部' },
  { value: 'new', label: '新线索' },
  { value: 'duplicate_suspected', label: '疑似重复' },
  { value: 'invalid', label: '已无效' },
  { value: 'converted', label: '已转化' },
];

const SOURCE_LABELS: Record<string, string> = {
  referral: '转介绍', social: '社交', exhibition: '展会', ad: '广告', inbound: '来访', other: '其他',
};

// ── Import modal ────────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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
      const res = await importLeads(file);
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
      {/* Step 1: template */}
      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          第一步：下载模板，按格式填写后上传
        </p>
        <Button variant="secondary" onClick={downloadLeadTemplate}>
          <Download className="mr-1.5 h-4 w-4" />下载导入模板
        </Button>
      </div>

      {/* Step 2: upload */}
      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          第二步：选择填好的 Excel / CSV 文件
        </p>
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

      {/* Result */}
      {result && (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--text-heading)]">导入完成</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-body)]">
              <span className="text-[var(--text-muted)]">共解析</span>
              <span className="font-medium">{result.total} 行</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              成功导入 {result.imported} 条
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

// ── Main page ────────────────────────────────────────────────────────────────

export function LeadListPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, keyword, statusFilter],
    queryFn: () => listLeads({ page, keyword: keyword || undefined, status: statusFilter || undefined }),
  });

  const invalidateMutation = useMutation({
    mutationFn: (id: string) => invalidateLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  usePageHeader('线索录入', pagination ? `共 ${pagination.total} 条线索` : undefined);

  function handleCreated() {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  function handleEdited() {
    setEditLead(null);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  function handleConverted() {
    setConvertLead(null);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }

  function handleImportDone() {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex w-64 items-center gap-2 rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 shadow-none ring-0 focus-within:bg-[var(--bg-hover)] focus-within:ring-0">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className="m-0 h-8 min-h-0 flex-1 border-0 bg-transparent p-0 text-sm leading-8 shadow-none ring-0 outline-none placeholder:text-[var(--text-muted)] focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
            placeholder="搜索公司、联系人、手机号..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="mr-1.5 h-4 w-4" />批量导入
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />录入线索
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-0 border-b border-[var(--border-default)] px-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm transition',
              statusFilter === tab.value
                ? 'border-[var(--action-primary)] font-medium text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-body)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="text-sm text-[var(--text-muted)]">暂无线索数据</div>
            <Button variant="secondary" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />录入第一条线索
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-app)]">
                {['公司/联系人', '手机号', '来源', '状态', '负责人', '录入时间', '操作'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--border-default)] transition hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {lead.status === 'duplicate_suspected' && (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <div className="font-medium text-[var(--text-heading)]">
                          {displayCustomerName(lead.companyName ?? lead.name) || '-'}
                        </div>
                        {lead.contactName && (
                          <div className="text-xs text-[var(--text-muted)]">{displayCustomerName(lead.contactName)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{lead.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {lead.sourceCategory ? (SOURCE_LABELS[lead.sourceCategory] ?? lead.sourceCategory) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-[5px] border px-1.5 py-0.5 text-xs font-medium', STATUS_COLORS[lead.status])}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{lead.owner?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(lead.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {lead.status === 'invalid' ? (
                        <button
                          onClick={() => restoreMutation.mutate(lead.id)}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-body)] hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />恢复
                        </button>
                      ) : lead.status !== 'converted' ? (
                        <>
                          <button
                            onClick={() => setEditLead(lead)}
                            className="text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-body)] hover:underline"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => setConvertLead(lead)}
                            className="flex items-center gap-1 text-xs text-[var(--action-primary)] transition hover:underline"
                          >
                            转化客户 <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => { if (confirm('确认标记为无效线索？')) invalidateMutation.mutate(lead.id); }}
                            disabled={invalidateMutation.isPending}
                            className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition hover:text-red-500 hover:underline"
                          >
                            <Ban className="h-3 w-3" />无效
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">已转化</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-6 py-3">
          <span className="text-xs text-[var(--text-muted)]">第 {pagination.page} / {pagination.totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-7 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="secondary" className="h-7 px-3 text-xs" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="录入线索">
        <LeadForm onSuccess={handleCreated} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="批量导入线索">
        <ImportModal onClose={() => setShowImport(false)} onDone={handleImportDone} />
      </Modal>

      <Modal open={!!convertLead} onClose={() => setConvertLead(null)} title={`线索转化客户 · ${convertLead ? displayCustomerName(convertLead.companyName ?? convertLead.name ?? convertLead.contactName ?? '') || '未命名' : ''}`}>
        {convertLead && (
          <LeadConvertForm lead={convertLead} onSuccess={handleConverted} onCancel={() => setConvertLead(null)} />
        )}
      </Modal>

      <Modal open={!!editLead} onClose={() => setEditLead(null)} title={`编辑线索 · ${editLead ? displayCustomerName(editLead.companyName ?? editLead.name ?? editLead.contactName ?? '') || '未命名' : ''}`}>
        {editLead && (
          <LeadForm lead={editLead} onSuccess={handleEdited} onCancel={() => setEditLead(null)} />
        )}
      </Modal>
    </div>
  );
}
