import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, User, UserCheck, Archive, ArchiveRestore, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';
import { ContactList } from '@/features/contacts/components/ContactList';
import { FollowUpList } from '@/features/follow-ups/components/FollowUpList';
import { OpportunityList } from '@/features/opportunities/components/OpportunityList';
import { ContractList } from '@/features/contracts/components/ContractList';
import { listCustomFields, type CustomFieldDef } from '@/features/settings/api/admin.api';
import { InlineLevelEditor, InlineStatusEditor } from '../components/InlineFieldEditor';
import { getCustomer, updateCustomer, transferCustomer, archiveCustomer, unarchiveCustomer, listCustomerBusinessEvents, updateCustomerBant, updateCustomerScotsman, listCollaborators, addCollaborator, removeCollaborator } from '../api/customers.api';
import { requestRefund, processRefund } from '@/features/orders/api/orders.api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { listAdminUsers } from '@/features/settings/api/admin.api';
import { usePermission } from '@/shared/hooks/usePermission';
import { listTags, getCustomerTags, addTagToCustomer, removeTagFromCustomer } from '@/features/tags/api/tags.api';
import type { Tag, CustomerTagItem } from '@/features/tags/api/tags.api';
import { displayCustomerName, stripDemoMarkForDisplay } from '@/shared/lib/customer-display';
import { cn } from '@/shared/lib/cn';

const SOURCE_LABELS: Record<string, string> = {
  referral: '转介绍',
  social: '社交媒体',
  exhibition: '展会',
  ad: '广告投放',
  inbound: '主动来访',
  other: '其他',
};

const STAGE_LABELS: Record<string, string> = {
  initial_contact: '初步接触',
  proposal: '方案提案',
  negotiation: '商务谈判',
  closed_won: '赢单',
  closed_lost: '输单',
};

const BIZ_EVENT_ICONS: Record<string, string> = {
  opportunity_created: '💼',
  opportunity_won: '🏆',
  opportunity_lost: '❌',
  contract_uploaded: '📎',
  contract_signed: '✍️',
  quotation_created: '📋',
  quotation_status_changed: '🔄',
  customer_archived: '📦',
  customer_unarchived: '📤',
  customer_transferred: '🔄',
  order_paid: '💰',
  status_changed: '🔁',
  follow_up_edited: '✏️',
  follow_up_transferred: '🔀',
  status_rollback_requested: '⏪',
  status_rollback_approved: '✅',
  status_rollback_rejected: '🚫',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  refund_requested: '退款审核中',
  refunded: '已退款',
};

// ── Customer Tag Editor ────────────────────────────────────────────────────

function CustomerTagEditor({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: listTags,
    staleTime: 5 * 60 * 1000,
  });

  const { data: customerTags = [] } = useQuery<CustomerTagItem[]>({
    queryKey: ['customer-tags', customerId],
    queryFn: () => getCustomerTags(customerId),
  });

  const appliedTagIds = new Set(customerTags.map((t) => t.tagId));

  async function toggleTag(tagId: string) {
    if (appliedTagIds.has(tagId)) {
      await removeTagFromCustomer(customerId, tagId);
    } else {
      await addTagToCustomer(customerId, tagId);
    }
    qc.invalidateQueries({ queryKey: ['customer-tags', customerId] });
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1">
        {customerTags.map((t) => (
          <span
            key={t.tagId}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
            style={{ backgroundColor: t.color }}
            onClick={() => toggleTag(t.tagId)}
            title="点击移除标签"
          >
            {t.name}
            <span className="opacity-70">×</span>
          </span>
        ))}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="inline-flex items-center rounded-full border border-dashed border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-muted)] hover:border-[var(--border-focus)] hover:text-[var(--text-body)]"
        >
          + 标签
        </button>
      </div>
      {showPicker && (
        <div className="absolute left-0 top-7 z-10 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-lg">
          <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">选择标签</div>
          <div className="flex max-w-[240px] flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const active = appliedTagIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs transition"
                  style={{
                    backgroundColor: active ? tag.color : undefined,
                    color: active ? '#fff' : undefined,
                    border: `1.5px solid ${tag.color}`,
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
            {allTags.length === 0 && <span className="text-xs text-[var(--text-muted)]">暂无标签</span>}
          </div>
          <button onClick={() => setShowPicker(false)} className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-body)]">关闭</button>
        </div>
      )}
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: actor } = useAuthStore();
  const { can } = usePermission();
  const [level, setLevel] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{ id: string; orderNo: string } | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const contactsRef = useRef<HTMLDivElement>(null);
  const followUpsRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);
  const contractsRef = useRef<HTMLDivElement>(null);
  const ordersRef = useRef<HTMLDivElement>(null);
  const bizRef = useRef<HTMLDivElement>(null);

  function scrollToSection(el: HTMLDivElement | null) {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const { data: customer, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-picker'],
    queryFn: () => listAdminUsers({ pageSize: 100 }),
    enabled: showTransfer && (actor?.role === 'admin' || actor?.role === 'director' || actor?.role === 'manager'),
  });
  const allUsers = usersData?.items ?? [];

  const { data: bizEvents = [] } = useQuery({
    queryKey: ['customer-biz-events', id],
    queryFn: () => listCustomerBusinessEvents(id!),
    enabled: !!id,
  });

  const canManageRefunds = can('order.refund_request') || can('order.refund_process');

  const requestRefundMut = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => requestRefund(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-biz-events', id] });
      setRefundTarget(null);
      setRefundReason('');
    },
    onError: (err: any) => {
      window.alert(err?.response?.data?.message ?? '申请退款失败');
    },
  });

  const processRefundMut = useMutation({
    mutationFn: (orderId: string) => processRefund(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-biz-events', id] });
    },
    onError: (err: any) => {
      window.alert(err?.response?.data?.message ?? '处理退款失败');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
    );
  }

  if (isError) {
    const msg =
      (error as any)?.response?.data?.message ??
      (error instanceof Error ? error.message : null) ??
      '加载失败，请稍后重试';
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
        <div className="text-center text-sm text-red-600">{msg}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()}>重试</Button>
          <Button variant="secondary" onClick={() => navigate('/customers')}>返回列表</Button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-sm text-[var(--text-muted)]">客户不存在或无权限访问</div>
        <Button variant="secondary" onClick={() => navigate('/customers')}>返回列表</Button>
      </div>
    );
  }

  const currentLevel = level ?? customer.level;
  const currentStatus = status ?? customer.status;
  const orderCount = (customer.orders ?? []).length;
  const hasBizEvents = bizEvents.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-[58px] items-center gap-3 border-b border-[var(--border-default)] px-6">
        <button
          onClick={() => navigate('/customers')}
          className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-base font-semibold text-[var(--text-heading)]">{displayCustomerName(customer.name)}</h1>
          <InlineLevelEditor customerId={customer.id} currentValue={currentLevel} onUpdated={setLevel} />
          <InlineStatusEditor customerId={customer.id} currentValue={currentStatus} onUpdated={setStatus} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">负责人：{customer.owner?.name}</span>
          {customer.archivedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Archive className="h-3 w-3" />已归档
            </span>
          )}
          {can('customer.transfer') && (
            <button
              onClick={() => { setTransferTo(''); setShowTransfer(true); }}
              className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              <UserCheck className="h-3 w-3" />转移
            </button>
          )}
          {can('customer.archive') && (
            customer.archivedAt ? (
              <button
                onClick={async () => {
                  if (!id) return;
                  setArchiving(true);
                  try { await unarchiveCustomer(id); qc.invalidateQueries({ queryKey: ['customer', id] }); }
                  finally { setArchiving(false); }
                }}
                disabled={archiving}
                className="inline-flex items-center gap-1 rounded-[6px] border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                <ArchiveRestore className="h-3 w-3" />解除归档
              </button>
            ) : (
              <button
                onClick={() => { setArchiveReason(''); setShowArchive(true); }}
                className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <Archive className="h-3 w-3" />归档
              </button>
            )
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left: basic info */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-[var(--border-default)] p-5">
          <div className="mb-4">
            <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">标签</div>
            <CustomerTagEditor customerId={customer.id} />
          </div>

          <Section title="基本信息">
            <InfoRow label="客户名称" value={displayCustomerName(customer.name)} />
            {customer.shortName && <InfoRow label="简称" value={customer.shortName} />}
            {customer.companyName && (
              <InfoRow label="公司" value={<span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{displayCustomerName(customer.companyName)}</span>} />
            )}
            {customer.primaryContactName && (
              <InfoRow label="联系人" value={<span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{customer.primaryContactName}</span>} />
            )}
            {customer.primaryPhone && (
              <InfoRow label="手机号" value={<span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.primaryPhone}</span>} />
            )}
            {customer.primaryEmail && (
              <InfoRow label="邮箱" value={<span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.primaryEmail}</span>} />
            )}
            {customer.sourceCategory && (
              <InfoRow label="来源" value={SOURCE_LABELS[customer.sourceCategory] ?? customer.sourceCategory} />
            )}
          </Section>

          <CustomerCustomFieldsSection customerId={id!} customFields={customer.customFields} onUpdated={() => refetch()} />

          {customer.sourceLead && (
            <Section title="来源线索">
              <InfoRow
                label="线索"
                value={displayCustomerName(customer.sourceLead.companyName ?? customer.sourceLead.name ?? '-')}
              />
              {customer.sourceLead.phone && <InfoRow label="手机号" value={customer.sourceLead.phone} />}
              <InfoRow label="录入时间" value={new Date(customer.sourceLead.createdAt).toLocaleDateString('zh-CN')} />
            </Section>
          )}

          <Section title="状态变更记录">
            {(customer.statusHistories ?? []).length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">暂无记录</div>
            ) : (
              <div className="space-y-2">
                {customer.statusHistories.slice(0, 5).map((h) => (
                  <div key={h.id} className="text-xs text-[var(--text-body)]">
                    <span className="text-[var(--text-muted)]">{new Date(h.createdAt).toLocaleDateString('zh-CN')}</span>
                    {' · '}{h.fromStatus ? `${h.fromStatus} → ` : ''}{h.toStatus}
                    {h.reason && <div className="text-[var(--text-muted)]">{h.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <CollaboratorPanel customerId={customer.id} currentUserId={actor?.id ?? ''} ownerId={customer.ownerId} />

          <BantPanel customerId={customer.id} customer={customer} />
          {(customer.status === 'interested' || customer.status === 'negotiating') && (
            <ScottsmanPanel customerId={customer.id} customer={customer} />
          )}
        </div>

        {/* Right: sticky section nav + content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <nav
              className="sticky top-0 z-10 flex flex-wrap gap-1.5 border-b border-[var(--border-default)] bg-[var(--bg-app)]/95 px-4 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-app)]/85"
              aria-label="客户详情区块导航"
            >
              {(
                [
                  { label: '联系人', ref: contactsRef },
                  { label: '跟进', ref: followUpsRef },
                  { label: '商机', ref: opportunitiesRef },
                  { label: '合同', ref: contractsRef },
                  ...(orderCount > 0 ? [{ label: `订单 (${orderCount})`, ref: ordersRef }] as const : []),
                  ...(hasBizEvents ? [{ label: '动态', ref: bizRef }] as const : []),
                ] as const
              ).map(({ label, ref }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => scrollToSection(ref.current)}
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
              <div ref={contactsRef} className="scroll-mt-16">
                <ContactList customerId={customer.id} />
              </div>

              <div ref={followUpsRef} className="scroll-mt-16">
                <FollowUpList customerId={customer.id} />
              </div>

              <div ref={opportunitiesRef} className="scroll-mt-16">
                <OpportunityList customerId={customer.id} />
              </div>

              <div ref={contractsRef} className="scroll-mt-16">
                <ContractList customerId={customer.id} />
              </div>

              {orderCount > 0 && (
                <div ref={ordersRef} className="scroll-mt-16">
                  <Section title={`订单 (${orderCount})`}>
                    <div className="space-y-2">
                      {(customer.orders ?? []).map((o) => (
                        <div
                          key={o.id}
                          className="flex flex-col gap-3 rounded-[7px] border border-[var(--border-default)] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-heading)]">{o.orderNo}</span>
                              <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                {ORDER_STATUS_LABELS[o.status] ?? o.status}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--text-muted)]">{new Date(o.createdAt).toLocaleDateString('zh-CN')}</div>
                          </div>
                          <div className="flex flex-col items-stretch gap-2 sm:items-end">
                            <div className="text-right">
                              <div className="text-sm font-semibold">¥{Number(o.amount).toLocaleString()}</div>
                              <div className="text-xs text-[var(--text-muted)]">已付 ¥{Number(o.paidAmount).toLocaleString()}</div>
                            </div>
                            {canManageRefunds && o.status === 'paid' && (
                              <Button
                                variant="secondary"
                                className="whitespace-nowrap text-xs"
                                onClick={() => {
                                  setRefundReason('');
                                  setRefundTarget({ id: o.id, orderNo: o.orderNo });
                                }}
                              >
                                申请退款
                              </Button>
                            )}
                            {canManageRefunds && o.status === 'refund_requested' && (
                              <Button
                                variant="secondary"
                                className="whitespace-nowrap text-xs"
                                disabled={processRefundMut.isPending}
                                onClick={() => {
                                  if (!window.confirm('确认将订单标为已退款并清零已付金额？')) return;
                                  processRefundMut.mutate(o.id);
                                }}
                              >
                                {processRefundMut.isPending && processRefundMut.variables === o.id ? '处理中…' : '处理退款'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}

              {hasBizEvents && (
                <div ref={bizRef} className="scroll-mt-16">
                  <Section title="业务动态">
                    <div className="relative space-y-0 pl-5">
                      <div className="absolute left-1.5 top-0 h-full w-px bg-[var(--border-default)]" />
                      {bizEvents.map((ev) => (
                        <div key={ev.id} className="relative pb-4">
                          <span className="absolute -left-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-xs">
                            {BIZ_EVENT_ICONS[ev.eventType] ?? '•'}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm text-[var(--text-body)]">{stripDemoMarkForDisplay(ev.title)}</p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {ev.createdBy?.name ?? '系统'} · {new Date(ev.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archive modal */}
      <Modal open={showArchive} onClose={() => setShowArchive(false)} title="归档客户">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">归档后客户不可编辑，仍可查看。请填写归档原因。</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">归档原因 *</span>
            <Input value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} placeholder="如：长期无响应、已流失" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowArchive(false)}>取消</Button>
            <Button
              disabled={!archiveReason.trim() || archiving}
              onClick={async () => {
                if (!id || !archiveReason.trim()) return;
                setArchiving(true);
                try {
                  await archiveCustomer(id, archiveReason.trim());
                  setShowArchive(false);
                  qc.invalidateQueries({ queryKey: ['customer', id] });
                  qc.invalidateQueries({ queryKey: ['customer-biz-events', id] });
                } finally { setArchiving(false); }
              }}
            >
              {archiving ? '归档中...' : '确认归档'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!refundTarget}
        onClose={() => { if (!requestRefundMut.isPending) { setRefundTarget(null); setRefundReason(''); } }}
        title={refundTarget ? `申请退款 · ${refundTarget.orderNo}` : '申请退款'}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">将向负责人、主管及管理员发送通知。退款原因选填。</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">退款原因</span>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              placeholder="选填，例如：客户取消、误付重付等"
              className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={requestRefundMut.isPending} onClick={() => { setRefundTarget(null); setRefundReason(''); }}>
              取消
            </Button>
            <Button
              disabled={!refundTarget || requestRefundMut.isPending}
              onClick={() => {
                if (!refundTarget) return;
                const r = refundReason.trim();
                requestRefundMut.mutate({ orderId: refundTarget.id, reason: r || undefined });
              }}
            >
              {requestRefundMut.isPending ? '提交中…' : '提交申请'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="转移客户负责人">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            当前负责人：<span className="font-medium text-[var(--text-heading)]">{customer.owner?.name}</span>
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">转移给</span>
            <Select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="w-full">
              <option value="">— 请选择 —</option>
              {allUsers.filter((u) => u.id !== customer.ownerId && u.status === 'active').map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}（{{ admin: '管理员', director: '总监', manager: '组长', sales: '销售' }[u.role] ?? u.role}）
                </option>
              ))}
            </Select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTransfer(false)}>取消</Button>
            <Button
              disabled={!transferTo || transferring}
              onClick={async () => {
                if (!transferTo || !id) return;
                setTransferring(true);
                try {
                  await transferCustomer(id, transferTo);
                  setShowTransfer(false);
                  refetch();
                } finally {
                  setTransferring(false);
                }
              }}
            >
              {transferring ? '转移中...' : '确认转移'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CustomerCustomFieldsSection({ customerId, customFields, onUpdated }: { customerId: string; customFields: Record<string, any>; onUpdated: () => void }) {
  const { data: defs = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields', 'customer'],
    queryFn: () => listCustomFields('customer'),
    staleTime: 5 * 60 * 1000,
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const active = defs.filter((d) => d.isActive && d.fieldType !== 'autonumber');
  if (active.length === 0) return null;

  async function saveEdit(fieldKey: string) {
    setSaving(true);
    try {
      await updateCustomer(customerId, { customFields: { ...(customFields ?? {}), [fieldKey]: editVal } });
      onUpdated();
      setEditingKey(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="自定义信息">
      {active.map((d) => {
        const val = customFields?.[d.fieldKey];
        let display: React.ReactNode = val === undefined || val === null || val === '' ? <span className="text-[var(--text-muted)]">—</span> : null;
        if (display === null) {
          if (d.fieldType === 'address' && typeof val === 'object') {
            display = [val.province, val.city, val.district, val.detail].filter(Boolean).join(' ') || '—';
          } else if (d.fieldType === 'boolean') {
            display = val === true || val === '是' ? '是' : '否';
          } else {
            display = String(val);
          }
        }
        if (editingKey === d.fieldKey) {
          return (
            <div key={d.fieldKey} className="flex items-center gap-2 py-1 text-sm">
              <span className="w-24 shrink-0 text-[var(--text-muted)]">{d.label}</span>
              {d.fieldType === 'select' ? (
                <select value={editVal ?? ''} onChange={(e) => setEditVal(e.target.value)} className="flex-1 rounded-[6px] border border-[var(--border-focus)] px-2 py-1 text-sm outline-none">
                  <option value="">— 请选择 —</option>
                  {(d.options ?? '').split(',').filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : d.fieldType === 'boolean' ? (
                <div className="flex gap-3">
                  {['是', '否'].map((v) => (
                    <label key={v} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={editVal === v} onChange={() => setEditVal(v)} /> {v}
                    </label>
                  ))}
                </div>
              ) : d.fieldType === 'textarea' ? (
                <textarea value={editVal ?? ''} onChange={(e) => setEditVal(e.target.value)} rows={2} className="flex-1 resize-none rounded-[6px] border border-[var(--border-focus)] px-2 py-1 text-sm outline-none" />
              ) : (
                <Input value={editVal ?? ''} onChange={(e) => setEditVal(e.target.value)} type={d.fieldType === 'number' ? 'number' : d.fieldType === 'date' ? 'date' : 'text'} className="flex-1 h-7 text-sm" />
              )}
              <Button onClick={() => saveEdit(d.fieldKey)} disabled={saving} className="h-7 px-2 text-xs">保存</Button>
              <Button variant="secondary" onClick={() => setEditingKey(null)} className="h-7 px-2 text-xs">取消</Button>
            </div>
          );
        }
        return (
          <div key={d.fieldKey} className="group flex items-center gap-2 py-0.5">
            <div className="flex-1"><InfoRow label={d.label} value={display} /></div>
            <button
              onClick={() => { setEditingKey(d.fieldKey); setEditVal(val ?? ''); }}
              className="invisible rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)] group-hover:visible"
            >✏️</button>
          </div>
        );
      })}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-start gap-2">
      <span className="w-14 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <span className="flex-1 text-xs text-[var(--text-body)]">{value}</span>
    </div>
  );
}

function CollaboratorPanel({ customerId, currentUserId, ownerId }: { customerId: string; currentUserId: string; ownerId: string }) {
  const { user: authUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: collaborators = [], refetch } = useQuery({
    queryKey: ['collaborators', customerId],
    queryFn: () => listCollaborators(customerId),
    enabled: open,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => listAdminUsers({ pageSize: 200 }),
    select: (d) => d.items.filter((u) => u.status === 'active' && u.id !== ownerId),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addCollaborator(customerId, userId),
    onSuccess: () => { setSelectedUserId(''); refetch(); },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeCollaborator(customerId, userId),
    onSuccess: () => refetch(),
  });

  const availableUsers = allUsers.filter((u) => !collaborators.some((c) => c.userId === u.id));
  const canEdit = currentUserId === ownerId || authUser?.role === 'admin' || authUser?.role === 'director' || authUser?.role === 'manager';

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
      >
        <span>协作者</span>
        <div className="flex items-center gap-1.5">
          {collaborators.length > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{collaborators.length}</span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {collaborators.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)]">暂无协作者</div>
          ) : (
            collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-body)]">{c.user.name}</span>
                {canEdit && (
                  <button
                    type="button"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(c.userId)}
                    className="text-[var(--text-muted)] hover:text-red-500 disabled:opacity-40"
                  >
                    移除
                  </button>
                )}
              </div>
            ))
          )}
          {canEdit && availableUsers.length > 0 && (
            <div className="flex gap-1.5 pt-1">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
              >
                <option value="">选择用户...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedUserId || addMutation.isPending}
                onClick={() => selectedUserId && addMutation.mutate(selectedUserId)}
                className="rounded-[6px] bg-[var(--action-primary)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                添加
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BANT_LABELS = ['未评估', '很低', '一般', '较高', '很高'];
const BANT_COLORS = ['bg-gray-100 text-gray-400', 'bg-red-100 text-red-500', 'bg-amber-100 text-amber-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600'];

function BantScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((v) => (
          <button
            key={v}
            type="button"
            title={BANT_LABELS[v]}
            onClick={() => onChange(v)}
            className={`h-5 w-5 rounded-full text-[10px] font-medium transition ${value === v ? BANT_COLORS[v] + ' ring-1 ring-offset-1 ring-current' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{BANT_LABELS[value]}</span>
    </div>
  );
}

function BantPanel({ customerId, customer }: { customerId: string; customer: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState({
    bantBudget: customer.bantBudget ?? 0,
    bantAuthority: customer.bantAuthority ?? 0,
    bantNeed: customer.bantNeed ?? 0,
    bantTimeline: customer.bantTimeline ?? 0,
    bantNotes: customer.bantNotes ?? '',
  });
  const [saved, setSaved] = useState(false);

  const total = scores.bantBudget + scores.bantAuthority + scores.bantNeed + scores.bantTimeline;
  const suggestedLevel = total >= 13 ? 'A' : total >= 9 ? 'B' : total >= 5 ? 'C' : 'D';

  const mutation = useMutation({
    mutationFn: () => updateCustomerBant(customerId, scores),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
  });

  const hasScores = customer.bantBudget !== null || customer.bantAuthority !== null || customer.bantNeed !== null || customer.bantTimeline !== null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
      >
        <span>BANT 评估</span>
        <div className="flex items-center gap-1.5">
          {hasScores && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BANT_COLORS[suggestedLevel === 'A' ? 4 : suggestedLevel === 'B' ? 3 : suggestedLevel === 'C' ? 2 : 1]}`}>
              建议 {suggestedLevel} 级 ({total}/16)
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2.5">
          <BantScoreRow label="预算" value={scores.bantBudget} onChange={(v) => setScores((p) => ({ ...p, bantBudget: v }))} />
          <BantScoreRow label="决策权" value={scores.bantAuthority} onChange={(v) => setScores((p) => ({ ...p, bantAuthority: v }))} />
          <BantScoreRow label="需求" value={scores.bantNeed} onChange={(v) => setScores((p) => ({ ...p, bantNeed: v }))} />
          <BantScoreRow label="时间线" value={scores.bantTimeline} onChange={(v) => setScores((p) => ({ ...p, bantTimeline: v }))} />
          <div className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1.5 text-xs">
            <div className="mb-1 font-medium text-[var(--text-heading)]">综合评分：{total}/16 → 建议 {suggestedLevel} 级</div>
          </div>
          <textarea
            value={scores.bantNotes}
            onChange={(e) => setScores((p) => ({ ...p, bantNotes: e.target.value }))}
            placeholder="评估备注（可选）..."
            rows={2}
            className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
          />
          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-xs text-emerald-600">已保存</span>}
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-[6px] bg-[var(--action-primary)] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? '保存中...' : '保存评估'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SCOTSMAN_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: 'scotsmanSituation',   label: '现状 (S)',     desc: '客户当前经营状态与背景' },
  { key: 'scotsmanCompetition', label: '竞争 (C)',     desc: '竞争对手情况与差异化' },
  { key: 'scotsmanOpportunity', label: '机会 (O)',     desc: '商机规模与可实现程度' },
  { key: 'scotsmanTimescale',   label: '时间线 (T)',   desc: '决策和上线的时间计划' },
  { key: 'scotsmanSize',        label: '规模 (S)',     desc: '项目规模与合同金额预期' },
  { key: 'scotsmanMotivation',  label: '动机 (M)',     desc: '客户购买动机的强烈程度' },
  { key: 'scotsmanAuthority',   label: '决策权 (A)',   desc: '接触到真正决策者的程度' },
  { key: 'scotsmanNeed',        label: '需求 (N)',     desc: '客户需求的明确程度' },
];

function ScottsmanPanel({ customerId, customer }: { customerId: string; customer: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(SCOTSMAN_FIELDS.map((f) => [f.key, customer[f.key] ?? 0]))
  );
  const [notes, setNotes] = useState(customer.scotsmanNotes ?? '');
  const [saved, setSaved] = useState(false);

  const filled = SCOTSMAN_FIELDS.filter((f) => customer[f.key] !== null && customer[f.key] !== undefined);
  const totalScore = filled.reduce((s, f) => s + (scores[f.key] ?? 0), 0);
  const maxScore = SCOTSMAN_FIELDS.length * 5;
  const pct = Math.round((totalScore / maxScore) * 100);

  const mutation = useMutation({
    mutationFn: () => updateCustomerScotsman(customerId, { ...scores, scotsmanNotes: notes } as any),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
  });

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
      >
        <span>SCOTSMAN 评估</span>
        <div className="flex items-center gap-1.5">
          {filled.length > 0 && (
            <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
              {pct}% ({totalScore}/{maxScore})
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2.5">
          {SCOTSMAN_FIELDS.map((f) => (
            <BantScoreRow
              key={f.key}
              label={f.label}
              value={scores[f.key] ?? 0}
              onChange={(v) => setScores((p) => ({ ...p, [f.key]: v }))}
            />
          ))}
          <div className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1.5 text-xs">
            <div className="font-medium text-[var(--text-heading)]">综合评分：{totalScore}/{maxScore}（{pct}%）</div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="SCOTSMAN 评估备注..."
            rows={2}
            className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
          />
          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-xs text-emerald-600">已保存</span>}
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-[6px] bg-[var(--action-primary)] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? '保存中...' : '保存评估'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
