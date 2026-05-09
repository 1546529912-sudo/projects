import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2, User, Calendar, DollarSign, Paperclip, CheckCircle, Upload, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { QuotationPanel } from '@/features/quotations/components/QuotationPanel';
import { FollowUpList } from '@/features/follow-ups/components/FollowUpList';
import {
  getOpportunity,
  updateOpportunity,
  closeOpportunity,
  reopenOpportunity,
  uploadContract,
  signContract,
} from '../api/opportunities.api';
import { STAGE_CONFIG } from './OpportunityListPage';
import { cn } from '@/shared/lib/cn';

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '待付款', color: 'bg-yellow-100 text-yellow-700' },
  paid:            { label: '已付款', color: 'bg-emerald-100 text-emerald-700' },
  refunded:        { label: '已退款', color: 'bg-red-100 text-red-600' },
  refund_pending:  { label: '退款申请中', color: 'bg-orange-100 text-orange-700' },
};

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft:            { label: '草稿',   color: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: '待审批', color: 'bg-amber-100 text-amber-700' },
  sent:             { label: '已发送', color: 'bg-blue-100 text-blue-700' },
  accepted:         { label: '已接受', color: 'bg-emerald-100 text-emerald-700' },
  rejected:         { label: '已拒绝', color: 'bg-red-100 text-red-600' },
  expired:          { label: '已过期', color: 'bg-yellow-100 text-yellow-700' },
};

const ACTIVE_STAGES = ['initial_contact', 'needs_analysis', 'proposal', 'negotiation'];
const CLOSED_STAGES = new Set(['closed_won', 'closed_lost']);

// ── Edit modal ─────────────────────────────────────────────────────────────

function EditModal({
  opp,
  onClose,
  onDone,
}: {
  opp: { id: string; title: string; amount: string; expectedCloseDate: string | null };
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(opp.title);
  const [amount, setAmount] = useState(opp.amount ? String(Number(opp.amount)) : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(opp.expectedCloseDate ? opp.expectedCloseDate.slice(0, 10) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('商机名称不能为空'); return; }
    setLoading(true);
    setError('');
    try {
      await updateOpportunity(opp.id, {
        title: title.trim(),
        amount: amount ? Number(amount) : undefined,
        expectedCloseDate: expectedCloseDate || undefined,
      });
      onDone();
    } catch {
      setError('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">商机名称 *</label>
        <input
          className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">预计金额（元）</label>
        <input
          type="number"
          min="0"
          className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">预计成交日期</label>
        <input
          type="date"
          className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
          value={expectedCloseDate}
          onChange={(e) => setExpectedCloseDate(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
      </div>
    </div>
  );
}

// ── Stage change modal ─────────────────────────────────────────────────────

function StageModal({
  opp,
  onClose,
  onDone,
}: {
  opp: { id: string; stage: string; title: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState(opp.stage);
  const [loading, setLoading] = useState(false);
  const otherStages = ACTIVE_STAGES.filter((s) => s !== opp.stage);

  async function handleSave() {
    if (selected === opp.stage) { onClose(); return; }
    setLoading(true);
    try {
      await updateOpportunity(opp.id, { stage: selected });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        当前阶段：<span className="font-medium text-[var(--text-heading)]">{STAGE_CONFIG[opp.stage]?.label ?? opp.stage}</span>
      </p>
      <div className="space-y-2">
        {otherStages.map((s) => {
          const cfg = STAGE_CONFIG[s];
          const currentOrder = STAGE_CONFIG[opp.stage]?.order ?? 0;
          const targetOrder = cfg?.order ?? 0;
          const dir = targetOrder > currentOrder ? '推进' : '回退';
          return (
            <label key={s} className={cn('flex cursor-pointer items-center gap-3 rounded-[8px] border px-4 py-3 transition', selected === s ? 'border-[var(--action-primary)] bg-[var(--bg-hover)]' : 'border-[var(--border-default)]')}>
              <input type="radio" name="stage" value={s} checked={selected === s} onChange={() => setSelected(s)} className="accent-[var(--action-primary)]" />
              <div>
                <span className="text-sm font-medium text-[var(--text-heading)]">{cfg?.label ?? s}</span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">{dir}</span>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={loading || selected === opp.stage}>保存</Button>
      </div>
    </div>
  );
}

// ── Close modal ────────────────────────────────────────────────────────────

function CloseModal({
  oppId,
  onClose,
  onDone,
}: {
  oppId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [outcome, setOutcome] = useState<'closed_won' | 'closed_lost'>('closed_won');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await closeOpportunity(oppId, { outcome, reason: reason || undefined });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {(['closed_won', 'closed_lost'] as const).map((o) => (
          <label key={o} className={cn('flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[8px] border py-3 text-sm font-medium transition', outcome === o ? (o === 'closed_won' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-600') : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]')}>
            <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="sr-only" />
            {o === 'closed_won' ? '赢单' : '输单'}
          </label>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">原因备注</label>
        <textarea className="w-full rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:ring-2 focus:ring-[var(--action-primary)]" rows={3} placeholder="选填" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? '提交中...' : '确认'}</Button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contractInputRef = useRef<HTMLInputElement>(null);
  const contractSectionRef = useRef<HTMLElement>(null);
  const quotationSectionRef = useRef<HTMLElement>(null);
  const ordersSectionRef = useRef<HTMLElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunity(id!),
    enabled: !!id,
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenOpportunity(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunity', id] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadContract(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunity', id] }),
  });

  const signMutation = useMutation({
    mutationFn: () => signContract(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunity', id] }),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['opportunity', id] });
  }

  if (isLoading) {
    return <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>;
  }
  if (!opp) {
    return <div className="flex h-32 items-center justify-center text-sm text-red-500">商机不存在</div>;
  }

  const isClosed = CLOSED_STAGES.has(opp.stage);
  const stageCfg = STAGE_CONFIG[opp.stage];

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--border-default)] px-6 py-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="mt-0.5 rounded-[6px] p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-heading)]">{opp.title}</h1>
              {!isClosed && (
                <button onClick={() => setShowEditModal(true)} className="rounded-[5px] p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)]">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <span className={cn('inline-flex items-center rounded-[5px] px-2 py-0.5 text-xs font-medium', stageCfg?.color ?? 'bg-gray-100 text-gray-600')}>
                {stageCfg?.label ?? opp.stage}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <Link to={`/customers/${opp.customerId}`} className="text-[var(--action-primary)] hover:underline">
                  {opp.customer?.name ?? opp.customerId}
                </Link>
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />{opp.owner.name}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                ¥{Number(opp.amount).toLocaleString('zh-CN')}
              </span>
              {opp.expectedCloseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  预计 {new Date(opp.expectedCloseDate).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
            {isClosed && opp.closeReason && (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">关闭原因：{opp.closeReason}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-2">
          {isClosed ? (
            <Button variant="secondary" onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending}>
              <RotateCcw className="mr-1.5 h-4 w-4" />重新开启
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowStageModal(true)}>调整阶段</Button>
              <Button variant="secondary" onClick={() => setShowCloseModal(true)}>赢单 / 输单</Button>
            </>
          )}
        </div>
      </div>

      {/* Body — two-column layout */}
      <div className="flex min-h-0 flex-1 gap-0 divide-x divide-[var(--border-default)] overflow-hidden">

        {/* Left column: quotations + orders */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          <nav
            className="sticky top-0 z-10 flex flex-wrap gap-1.5 border-b border-[var(--border-default)] bg-[var(--bg-app)]/95 px-6 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-app)]/85"
            aria-label="商机详情区块导航"
          >
            {(
              [
                { label: '合同', ref: contractSectionRef },
                { label: '报价单', ref: quotationSectionRef },
                { label: '关联订单', ref: ordersSectionRef },
              ] as const
            ).map(({ label, ref }) => (
              <button
                key={label}
                type="button"
                onClick={() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={cn(
                  'rounded-full border border-[var(--border-default)] bg-white/80 px-2.5 py-1 text-xs font-medium text-[var(--text-body)] shadow-sm transition',
                  'hover:border-[var(--border-focus)] hover:bg-[var(--bg-hover)]',
                )}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="space-y-6 p-6 pt-4">
          {/* Contract */}
          <section ref={contractSectionRef} className="scroll-mt-16">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">合同</h2>
            <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              {opp.contractStatus === 'none' && (
                <>
                  <span className="text-sm text-[var(--text-muted)]">暂无合同</span>
                  <Button variant="secondary" onClick={() => contractInputRef.current?.click()} disabled={uploadMutation.isPending}>
                    <Upload className="mr-1.5 h-4 w-4" />{uploadMutation.isPending ? '上传中...' : '上传合同'}
                  </Button>
                </>
              )}
              {opp.contractStatus === 'uploaded' && (
                <>
                  <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />
                  <a href={opp.contractUrl ?? '#'} target="_blank" rel="noreferrer" className="flex-1 text-sm text-[var(--action-primary)] hover:underline">查看合同文件</a>
                  <Button variant="secondary" onClick={() => signMutation.mutate()} disabled={signMutation.isPending}>
                    <CheckCircle className="mr-1.5 h-4 w-4" />确认签署
                  </Button>
                </>
              )}
              {opp.contractStatus === 'signed' && (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <a href={opp.contractUrl ?? '#'} target="_blank" rel="noreferrer" className="flex-1 text-sm text-[var(--action-primary)] hover:underline">查看合同文件</a>
                  <span className="rounded-[5px] border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">已签署</span>
                </>
              )}
              <input ref={contractInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }}
              />
            </div>
          </section>

          {/* Quotations */}
          <section ref={quotationSectionRef} className="scroll-mt-16">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">报价单</h2>
            <QuotationPanel opportunityId={opp.id} />
          </section>

          {/* Orders */}
          <section ref={ordersSectionRef} className="scroll-mt-16">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">关联订单</h2>
            {opp.orders.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">暂无订单</p>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                      {['订单号', '金额', '实付', '状态', '创建时间'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {opp.orders.map((order) => {
                      const sc = ORDER_STATUS[order.status];
                      return (
                        <tr key={order.id} className="border-b border-[var(--border-default)] last:border-0">
                          <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-heading)]">{order.orderNo}</td>
                          <td className="px-4 py-2.5 text-[var(--text-body)]">¥{Number(order.amount).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-2.5 text-[var(--text-body)]">¥{Number(order.paidAmount).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn('inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-xs font-medium', sc?.color ?? 'bg-gray-100 text-gray-600')}>
                              {sc?.label ?? order.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{new Date(order.createdAt).toLocaleDateString('zh-CN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        </div>

        {/* Right column: follow-ups */}
        <div className="w-[380px] shrink-0 overflow-y-auto">
          <h2 className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-app)]/95 px-6 py-3 text-sm font-semibold text-[var(--text-heading)] backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-app)]/85">
            跟进记录
          </h2>
          <div className="p-6 pt-4">
            <FollowUpList customerId={opp.customerId} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="编辑商机">
        {opp && (
          <EditModal
            opp={opp}
            onClose={() => setShowEditModal(false)}
            onDone={() => { setShowEditModal(false); refresh(); }}
          />
        )}
      </Modal>
      <Modal open={showStageModal} onClose={() => setShowStageModal(false)} title="调整阶段">
        {opp && (
          <StageModal
            opp={opp}
            onClose={() => setShowStageModal(false)}
            onDone={() => { setShowStageModal(false); refresh(); }}
          />
        )}
      </Modal>
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="赢单 / 输单">
        <CloseModal
          oppId={opp.id}
          onClose={() => setShowCloseModal(false)}
          onDone={() => { setShowCloseModal(false); refresh(); }}
        />
      </Modal>
    </div>
  );
}
