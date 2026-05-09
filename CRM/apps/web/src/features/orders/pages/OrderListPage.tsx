import { useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { listOrders, payOrder, type Order, type ListOrdersParams } from '../api/orders.api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '待付款', color: 'bg-yellow-100 text-yellow-700' },
  paid:            { label: '已付款', color: 'bg-green-100 text-green-700' },
  refund_pending:  { label: '退款申请中', color: 'bg-orange-100 text-orange-700' },
  refunded:        { label: '已退款', color: 'bg-red-100 text-red-600' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Payment modal ──────────────────────────────────────────────────────────

function PayModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const totalAmount = Number(order.amount);
  const paidAmount = Number(order.paidAmount);
  const remaining = totalAmount - paidAmount;
  const [amount, setAmount] = useState(String(remaining));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const val = Number(amount);
    if (!amount || isNaN(val) || val <= 0) { setError('请输入有效金额'); return; }
    if (val > remaining) { setError(`到账金额不能超过剩余应收 ¥${remaining.toLocaleString('zh-CN')}`); return; }
    setLoading(true);
    setError('');
    try {
      await payOrder(order.id, val);
      onDone();
    } catch {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-[var(--bg-subtle)] p-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">订单总额</span>
          <span className="font-semibold text-[var(--text-heading)]">¥{totalAmount.toLocaleString('zh-CN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">已收款</span>
          <span className="text-emerald-600">¥{paidAmount.toLocaleString('zh-CN')}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-[var(--text-secondary)]">剩余应收</span>
          <span className="text-[var(--text-heading)]">¥{remaining.toLocaleString('zh-CN')}</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">本次到账金额（元）</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            className="flex-1 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            onClick={() => setAmount(String(remaining))}
            className="rounded-[7px] border border-[var(--border-default)] px-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            全额
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? '处理中...' : '确认收款'}</Button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function OrderListPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<ListOrdersParams>({ page: 1, pageSize: 20 });
  const [keyword, setKeyword] = useState('');
  const [payTarget, setPayTarget] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => listOrders(params),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  usePageHeader('订单管理', pagination ? `共 ${pagination.total} 条订单` : undefined);

  function search() {
    setParams((p) => ({ ...p, page: 1, keyword: keyword || undefined }));
  }

  function filterStatus(value: string) {
    setParams((p) => ({ ...p, page: 1, status: value || undefined }));
  }

  function handlePayDone() {
    setPayTarget(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex w-56 items-center gap-2 rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 shadow-none ring-0 focus-within:bg-[var(--bg-hover)] focus-within:ring-0">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className="m-0 h-8 min-h-0 flex-1 border-0 bg-transparent p-0 text-sm leading-8 shadow-none ring-0 outline-none placeholder:text-[var(--text-muted)] focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
            placeholder="搜索订单号、客户名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <Select className="h-8 w-28 text-xs" value={params.status ?? ''} onChange={(e) => filterStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="pending_payment">待付款</option>
          <option value="paid">已付款</option>
        </Select>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">暂无订单</div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">订单号</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">客户</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">关联商机</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">金额</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">已收</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">创建时间</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {items.map((order) => {
                  const total = Number(order.amount);
                  const paid = Number(order.paidAmount);
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <tr key={order.id} className="hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{order.orderNo}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{order.customer?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{order.opportunity?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text-heading)]">
                        ¥{total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-[var(--text-secondary)]">¥{paid.toLocaleString()}</div>
                        {order.status === 'pending_payment' && paid > 0 && (
                          <div className="mt-0.5 text-xs text-[var(--text-muted)]">{pct}%</div>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.status === 'pending_payment' && (
                          <button
                            onClick={() => setPayTarget(order)}
                            className="inline-flex items-center gap-1 rounded-[6px] border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {paid > 0 ? '继续收款' : '确认收款'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={(params.page ?? 1) <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}>上一页</Button>
              <Button variant="secondary" disabled={(params.page ?? 1) >= pagination.totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`确认收款 · ${payTarget?.orderNo ?? ''}`}>
        {payTarget && <PayModal order={payTarget} onClose={() => setPayTarget(null)} onDone={handlePayDone} />}
      </Modal>
    </div>
  );
}
