import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { convertLead } from '../api/leads.api';
import type { Lead } from '../api/leads.api';
import { displayCustomerName } from '@/shared/lib/customer-display';

interface LeadConvertFormProps {
  lead: Lead;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadConvertForm({ lead, onSuccess, onCancel }: LeadConvertFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState('C');
  const [createOpportunity, setCreateOpportunity] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await convertLead(lead.id, { level: level as any, createOpportunity });
      onSuccess();
      navigate(`/customers/${result.customerId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '转化失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-app)] p-3 text-sm">
        <div className="text-[var(--text-muted)]">将转化为客户：</div>
        <div className="mt-1 font-medium text-[var(--text-heading)]">
          {displayCustomerName(lead.companyName ?? lead.contactName ?? lead.name ?? '') || '未命名'}
        </div>
        {lead.phone && <div className="text-xs text-[var(--text-muted)]">{lead.phone}</div>}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">初始客户级别</span>
        <Select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="A">A 级</option>
          <option value="B">B 级</option>
          <option value="C">C 级</option>
          <option value="D">D 级</option>
        </Select>
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={createOpportunity}
          onChange={(e) => setCreateOpportunity(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--action-primary)]"
        />
        <span className="text-sm text-[var(--text-body)]">同时创建商机</span>
      </label>

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>{loading ? '转化中...' : '确认转化'}</Button>
      </div>
    </form>
  );
}
