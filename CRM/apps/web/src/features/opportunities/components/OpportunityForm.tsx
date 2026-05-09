import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { refreshDashboardQueries } from '@/features/dashboard/lib/refresh-dashboard-queries';
import { createOpportunity } from '../api/opportunities.api';

const STAGE_OPTIONS = [
  { value: 'initial_contact', label: '初步接触' },
  { value: 'proposal', label: '方案提案' },
  { value: 'negotiation', label: '商务谈判' },
  { value: 'closed_won', label: '赢单' },
  { value: 'closed_lost', label: '输单' },
];

interface OpportunityFormProps {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpportunityForm({ customerId, onSuccess, onCancel }: OpportunityFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', amount: '', stage: 'initial_contact', expectedCloseDate: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('商机名称必填'); return; }
    setLoading(true);
    setError(null);
    try {
      await createOpportunity(customerId, {
        title: form.title.trim(),
        amount: form.amount ? Number(form.amount) : undefined,
        stage: form.stage,
        expectedCloseDate: form.expectedCloseDate || undefined,
      });
      refreshDashboardQueries(queryClient);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">商机名称 *</span>
        <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="如：ERP系统采购项目" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">预计金额（元）</span>
          <Input type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">阶段</span>
          <Select value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}>
            {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">预计成交日期</span>
        <Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm((p) => ({ ...p, expectedCloseDate: e.target.value }))} />
      </label>

      {error && <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>{loading ? '创建中...' : '创建商机'}</Button>
      </div>
    </form>
  );
}
