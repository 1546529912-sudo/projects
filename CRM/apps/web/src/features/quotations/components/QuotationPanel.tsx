import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, Trash2, Printer } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import {
  listQuotations, createQuotation, updateQuotationStatus, listProducts, openQuotationPrint,
  type Quotation, type Product, type CreateQuotationInput,
} from '../api/quotations.api';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:            { label: '草稿',   color: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: '待审批', color: 'bg-amber-100 text-amber-700' },
  sent:             { label: '已发送', color: 'bg-blue-100 text-blue-700' },
  accepted:         { label: '已接受', color: 'bg-green-100 text-green-700' },
  rejected:         { label: '已拒绝', color: 'bg-red-100 text-red-600' },
  expired:          { label: '已过期', color: 'bg-yellow-100 text-yellow-700' },
};

const STATUS_ACTIONS: Record<string, Array<{ value: string; label: string }>> = {
  draft:            [{ value: 'sent', label: '标记已发送' }],
  pending_approval: [],
  sent:             [{ value: 'accepted', label: '标记已接受' }, { value: 'rejected', label: '标记已拒绝' }, { value: 'expired', label: '标记已过期' }],
  accepted:         [],
  rejected:         [{ value: 'draft', label: '重新草稿' }],
  expired:          [{ value: 'draft', label: '重新草稿' }],
};

function fmt(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── New quotation form ────────────────────────────────────────────────────────

interface LineItem {
  productId: string;
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

function emptyLine(): LineItem {
  return { productId: '', name: '', unit: '', quantity: '1', unitPrice: '0', discount: '100' };
}

function lineTotal(item: LineItem) {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discount) || 100;
  return qty * price * (disc / 100);
}

function CreateQuotationForm({ opportunityId, products, onSuccess, onCancel }: {
  opportunityId: string;
  products: Product[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function pickProduct(idx: number, productId: string) {
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    setLines((prev) => prev.map((l, i) => i === idx
      ? { ...l, productId: p.id, name: p.name, unit: p.unit ?? '', unitPrice: p.unitPrice }
      : l
    ));
  }

  function removeLine(idx: number) {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [emptyLine()];
    });
  }

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  async function handleSubmit() {
    const validLines = lines.filter((l) => l.name.trim());
    if (validLines.length === 0) { setError('请至少添加一项产品'); return; }
    setLoading(true);
    setError(null);
    try {
      const input: CreateQuotationInput = {
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        items: validLines.map((l) => ({
          productId: l.productId || undefined,
          name: l.name.trim(),
          unit: l.unit || undefined,
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          discount: parseFloat(l.discount) || 100,
        })),
      };
      await createQuotation(opportunityId, input);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Line items */}
      <div className="overflow-hidden rounded-[8px] border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              {['产品/名称', '单位', '数量', '单价（元）', '折扣%', '小计'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="border-b border-[var(--border-default)] last:border-0">
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    {products.length > 0 && (
                      <select
                        className="h-8 rounded-[6px] border border-[var(--border-default)] bg-white px-1.5 text-xs text-[var(--text-muted)]"
                        value={line.productId}
                        onChange={(e) => pickProduct(idx, e.target.value)}
                      >
                        <option value="">选产品</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <Input
                      className="h-8 min-w-0 flex-1 text-xs"
                      placeholder="产品/服务名称"
                      value={line.name}
                      onChange={(e) => updateLine(idx, 'name', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <Input className="h-8 w-16 text-xs" placeholder="个" value={line.unit} onChange={(e) => updateLine(idx, 'unit', e.target.value)} />
                </td>
                <td className="px-2 py-2">
                  <Input type="number" min="0" className="h-8 w-20 text-xs" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                </td>
                <td className="px-2 py-2">
                  <Input type="number" min="0" className="h-8 w-24 text-xs" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                </td>
                <td className="px-2 py-2">
                  <Input type="number" min="0" max="100" className="h-8 w-16 text-xs" value={line.discount} onChange={(e) => updateLine(idx, 'discount', e.target.value)} />
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium">
                  ¥{fmt(lineTotal(line))}
                </td>
                <td className="px-1 py-2">
                  <button type="button" onClick={() => removeLine(idx)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])} className="flex items-center gap-1 text-sm text-[var(--action-primary)] hover:underline">
          <Plus className="h-3.5 w-3.5" />添加明细
        </button>
        <div className="text-sm font-semibold text-[var(--text-heading)]">
          合计：¥{fmt(total)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--text-muted)]">有效期至</span>
          <Input type="date" className="h-8 text-sm" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--text-muted)]">备注</span>
        <textarea
          rows={2}
          className="w-full rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--action-primary)] resize-none"
          placeholder="可选备注"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && <p className="rounded-[7px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? '创建中...' : '创建报价单'}</Button>
      </div>
    </div>
  );
}

// ── Quotation card ────────────────────────────────────────────────────────────

function QuotationCard({ q, onStatusChange }: { q: Quotation; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const qc = useQueryClient();
  const cfg = STATUS_CONFIG[q.status] ?? { label: q.status, color: 'bg-gray-100 text-gray-600' };
  const actions = STATUS_ACTIONS[q.status] ?? [];

  async function changeStatus(status: string) {
    setUpdating(true);
    try {
      await updateQuotationStatus(q.id, status);
      qc.invalidateQueries({ queryKey: ['quotations', q.opportunityId] });
      onStatusChange();
    } catch { /* ignore */ }
    finally { setUpdating(false); }
  }

  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-heading)]">{q.quoteNo}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
          <div className="mt-0.5 flex gap-3 text-xs text-[var(--text-muted)]">
            <span>合计 <span className="font-semibold text-[var(--text-heading)]">¥{fmt(q.totalAmount)}</span></span>
            {q.validUntil && <span>有效期至 {q.validUntil}</span>}
            <span>{new Date(q.createdAt).toLocaleDateString('zh-CN')}</span>
            <span>by {q.createdBy?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((a) => (
            <button key={a.value} disabled={updating} onClick={() => changeStatus(a.value)}
              className="rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] disabled:opacity-50">
              {a.label}
            </button>
          ))}
          <button
            onClick={() => openQuotationPrint(q.id)}
            title="打印 / 导出 PDF"
            className="rounded-[6px] border border-[var(--border-default)] px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)] transition"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="text-[var(--text-muted)] hover:text-[var(--text-heading)]">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-default)] px-4 pb-3 pt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)]">
                {['产品/名称', '数量', '单价', '折扣', '小计'].map((h) => (
                  <th key={h} className="pb-1.5 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {q.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5">{item.name}{item.unit ? ` (${item.unit})` : ''}</td>
                  <td className="py-1.5">{item.quantity}</td>
                  <td className="py-1.5">¥{fmt(item.unitPrice)}</td>
                  <td className="py-1.5">{parseFloat(item.discount) < 100 ? `${item.discount}%` : '—'}</td>
                  <td className="py-1.5 font-medium">¥{fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.notes && <p className="mt-2 text-xs text-[var(--text-muted)]">备注：{q.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function QuotationPanel({ opportunityId }: { opportunityId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', opportunityId],
    queryFn: () => listQuotations(opportunityId),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
    staleTime: 5 * 60 * 1000,
  });

  function refresh() { qc.invalidateQueries({ queryKey: ['quotations', opportunityId] }); }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">报价单 ({quotations.length})</h3>
        <Button variant="secondary" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />新建报价单
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">加载中...</p>
      ) : quotations.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">暂无报价单</p>
      ) : (
        <div className="space-y-2">
          {quotations.map((q) => (
            <QuotationCard key={q.id} q={q} onStatusChange={refresh} />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建报价单">
        <CreateQuotationForm
          opportunityId={opportunityId}
          products={products}
          onSuccess={() => { setShowCreate(false); refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
