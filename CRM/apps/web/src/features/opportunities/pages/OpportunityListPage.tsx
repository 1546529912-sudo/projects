import { useRef, useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Trophy, XCircle, RotateCcw, Upload, FileCheck, Download, FileText } from 'lucide-react';
import { QuotationPanel } from '@/features/quotations/components/QuotationPanel';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { refreshDashboardQueries } from '@/features/dashboard/lib/refresh-dashboard-queries';
import { getSystemConfig } from '@/features/settings/api/admin.api';
import {
  listAllOpportunities,
  closeOpportunity,
  reopenOpportunity,
  updateOpportunity,
  uploadContract,
  signContract,
  exportOpportunitiesCsv,
  type Opportunity,
} from '../api/opportunities.api';

// ── Constants ──────────────────────────────────────────────────────────────

export const STAGE_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  initial_contact: { label: '初步接触', color: 'bg-gray-100 text-gray-600', order: 0 },
  needs_analysis:  { label: '需求确认', color: 'bg-blue-100 text-blue-700', order: 1 },
  proposal:        { label: '方案报价', color: 'bg-yellow-100 text-yellow-700', order: 2 },
  negotiation:     { label: '谈判中',   color: 'bg-purple-100 text-purple-700', order: 3 },
  closed_won:      { label: '赢单',     color: 'bg-green-100 text-green-700', order: 4 },
  closed_lost:     { label: '输单',     color: 'bg-red-100 text-red-600', order: 4 },
};

const ACTIVE_STAGES = ['initial_contact', 'needs_analysis', 'proposal', 'negotiation'];

const FILTER_TABS = [
  { value: '', label: '全部' },
  { value: 'initial_contact', label: '初步接触' },
  { value: 'needs_analysis',  label: '需求确认' },
  { value: 'proposal',        label: '方案报价' },
  { value: 'negotiation',     label: '谈判中' },
  { value: 'closed_won',      label: '赢单' },
  { value: 'closed_lost',     label: '输单' },
];

// ── Stage badge ────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] ?? { label: stage, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Contract badge ─────────────────────────────────────────────────────────

const CONTRACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  none:     { label: '未上传', color: 'bg-gray-100 text-gray-500' },
  uploaded: { label: '已上传', color: 'bg-blue-100 text-blue-700' },
  signed:   { label: '已签署', color: 'bg-green-100 text-green-700' },
};

function ContractBadge({ status }: { status: string }) {
  const cfg = CONTRACT_STATUS_CONFIG[status] ?? CONTRACT_STATUS_CONFIG.none;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Close modal ────────────────────────────────────────────────────────────

interface CloseModalProps {
  opp: Opportunity | null;
  outcome: 'closed_won' | 'closed_lost';
  onClose: () => void;
  onSuccess: () => void;
  lossReasons?: string[];
}

const DEFAULT_LOSS_REASONS = ['价格太高', '选择了竞品', '需求变化', '预算取消', '决策层否决', '合作时机不对', '产品不符合需求', '其他'];

function CloseModal({ opp, outcome, onClose, onSuccess, lossReasons = DEFAULT_LOSS_REASONS }: CloseModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!opp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await closeOpportunity(opp!.id, { outcome, reason: reason.trim() || undefined });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  const isWon = outcome === 'closed_won';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3 rounded-[10px] p-3"
        style={{ background: isWon ? 'var(--success-bg, #f0fdf4)' : 'var(--error-bg, #fef2f2)' }}>
        {isWon
          ? <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
        <div>
          <div className="text-sm font-medium" style={{ color: isWon ? '#16a34a' : '#dc2626' }}>
            确认{isWon ? '赢单' : '输单'}：{opp.title}
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-muted)]">金额：¥{Number(opp.amount).toLocaleString()}</div>
        </div>
      </div>

      <div className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">
          {isWon ? '赢单原因（选填）' : '输单原因（选填）'}
        </span>
        {!isWon && lossReasons.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {lossReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(reason === r ? '' : r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  reason === r
                    ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={isWon ? '如：价格有优势，产品契合度高' : '可自定义填写，或直接选择上方预设原因'}
          className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--action-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/20 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
        <Button
          type="submit"
          disabled={loading}
          className={isWon ? '' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}
          variant={isWon ? 'primary' : 'secondary'}
        >
          {loading ? '提交中...' : isWon ? '确认赢单' : '确认输单'}
        </Button>
      </div>
    </form>
  );
}

// ── Stage advance modal ────────────────────────────────────────────────────

interface AdvanceModalProps {
  opp: Opportunity | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AdvanceModal({ opp, onClose, onSuccess }: AdvanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!opp) return null;

  const otherStages = ACTIVE_STAGES.filter((s) => s !== opp.stage);

  async function handleAdvance(stage: string) {
    setLoading(true);
    setError(null);
    try {
      await updateOpportunity(opp!.id, { stage });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        当前阶段：<span className="font-medium text-[var(--text-heading)]">{STAGE_CONFIG[opp.stage]?.label ?? opp.stage}</span>
      </p>
      <div className="space-y-2">
        {otherStages.map((s) => {
          const currentOrder = STAGE_CONFIG[opp.stage]?.order ?? 0;
          const targetOrder = STAGE_CONFIG[s]?.order ?? 0;
          const isForward = targetOrder > currentOrder;
          return (
            <button
              key={s}
              disabled={loading}
              onClick={() => handleAdvance(s)}
              className="flex w-full items-center justify-between rounded-[7px] border border-[var(--border-default)] px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              <span className="font-medium text-[var(--text-heading)]">{STAGE_CONFIG[s]?.label}</span>
              {isForward
                ? <TrendingUp className="h-4 w-4 text-[var(--action-primary)]" />
                : <TrendingDown className="h-4 w-4 text-[var(--text-muted)]" />}
            </button>
          );
        })}
      </div>
      {error && <div className="rounded-[7px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="flex justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function OpportunityListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stageFilter, setStageFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const [closeTarget, setCloseTarget] = useState<Opportunity | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<'closed_won' | 'closed_lost'>('closed_won');
  const [advanceTarget, setAdvanceTarget] = useState<Opportunity | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Opportunity | null>(null);
  const [quotationTarget, setQuotationTarget] = useState<Opportunity | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', { stageFilter, keyword, page }],
    queryFn: () => listAllOpportunities({ stage: stageFilter || undefined, keyword: keyword || undefined, page }),
  });

  const { data: lossReasonsConfig } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: () => getSystemConfig('loss_reasons'),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  usePageHeader('销售商机', pagination ? `共 ${pagination.total} 条` : undefined);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    refreshDashboardQueries(queryClient);
  }

  async function handleReopen(opp: Opportunity) {
    try {
      await reopenOpportunity(opp.id);
      invalidate();
    } catch {
      // ignore
    }
  }

  async function handleUploadFile(file: File) {
    if (!uploadTarget) return;
    setUploading(true);
    try {
      await uploadContract(uploadTarget.id, file);
      invalidate();
      setUploadTarget(null);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  async function handleSign(opp: Opportunity) {
    try {
      await signContract(opp.id);
      invalidate();
    } catch {
      // ignore
    }
  }

  const isClosed = (stage: string) => stage === 'closed_won' || stage === 'closed_lost';

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-page)] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStageFilter(tab.value); setPage(1); }}
                className={`rounded-[7px] px-3 py-1.5 text-sm font-medium transition ${
                  stageFilter === tab.value
                    ? 'bg-[var(--action-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索商机名称或客户"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-52"
            />
            <Button variant="secondary" onClick={() => exportOpportunitiesCsv({ stage: stageFilter || undefined, keyword: keyword || undefined })}>
              <Download className="mr-1.5 h-4 w-4" />导出 CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <div>暂无商机</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">商机名称</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">客户</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">金额</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">阶段</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">合同</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">负责人</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">预计成交</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {items.map((opp) => (
                  <tr key={opp.id} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                        className="font-medium text-[var(--text-heading)] hover:text-[var(--action-primary)] hover:underline text-left"
                      >
                        {opp.title}
                      </button>
                      {opp.closeReason && (
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{opp.closeReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      <button onClick={() => navigate(`/customers/${opp.customerId}`)} className="hover:text-[var(--action-primary)] hover:underline">
                        {opp.customer?.name ?? '—'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-heading)]">
                      ¥{Number(opp.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3"><StageBadge stage={opp.stage} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <ContractBadge status={opp.contractStatus ?? 'none'} />
                        {opp.contractUrl && (
                          <a
                            href={opp.contractUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[var(--action-primary)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >查看</a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{opp.owner?.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {opp.expectedCloseDate
                        ? new Date(opp.expectedCloseDate).toLocaleDateString('zh-CN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isClosed(opp.stage) ? (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {opp.stage === 'closed_won' && opp.contractStatus !== 'signed' && (
                              <>
                                <button
                                  onClick={() => setUploadTarget(opp)}
                                  className="inline-flex items-center gap-1 rounded-[6px] border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100"
                                >
                                  <Upload className="h-3 w-3" />上传合同
                                </button>
                                {opp.contractStatus === 'uploaded' && (
                                  <button
                                    onClick={() => handleSign(opp)}
                                    className="inline-flex items-center gap-1 rounded-[6px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100"
                                  >
                                    <FileCheck className="h-3 w-3" />确认签署
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => handleReopen(opp)}
                              title="重新开启"
                              className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            >
                              <RotateCcw className="h-3 w-3" />重新开启
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setQuotationTarget(opp)}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            >
                              <FileText className="h-3 w-3" />报价单
                            </button>
                            <button
                              onClick={() => setAdvanceTarget(opp)}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            >
                              <TrendingUp className="h-3 w-3" />调整阶段
                            </button>
                            <button
                              onClick={() => { setCloseOutcome('closed_won'); setCloseTarget(opp); }}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100"
                            >
                              <Trophy className="h-3 w-3" />赢单
                            </button>
                            <button
                              onClick={() => { setCloseOutcome('closed_lost'); setCloseTarget(opp); }}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                            >
                              <TrendingDown className="h-3 w-3" />输单
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      {/* Win/Loss modal */}
      <Modal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        title={closeOutcome === 'closed_won' ? '赢单确认' : '输单确认'}
      >
        <CloseModal
          opp={closeTarget}
          outcome={closeOutcome}
          onClose={() => setCloseTarget(null)}
          onSuccess={() => { setCloseTarget(null); invalidate(); }}
          lossReasons={Array.isArray(lossReasonsConfig?.value) ? (lossReasonsConfig.value as string[]) : DEFAULT_LOSS_REASONS}
        />
      </Modal>

      {/* Advance stage modal */}
      <Modal open={!!advanceTarget} onClose={() => setAdvanceTarget(null)} title="调整阶段">
        <AdvanceModal
          opp={advanceTarget}
          onClose={() => setAdvanceTarget(null)}
          onSuccess={() => { setAdvanceTarget(null); invalidate(); }}
        />
      </Modal>

      {/* Quotation modal */}
      <Modal open={!!quotationTarget} onClose={() => setQuotationTarget(null)} title={`报价单 — ${quotationTarget?.title ?? ''}`}>
        {quotationTarget && <QuotationPanel opportunityId={quotationTarget.id} />}
      </Modal>

      {/* Contract upload modal */}
      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} title="上传合同">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            支持 PDF、Word（.doc/.docx）、图片格式，最大 20MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadFile(file);
              e.target.value = '';
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadTarget(null)}>取消</Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {uploading ? '上传中...' : '选择文件'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
