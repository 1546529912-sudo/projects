import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { DuplicateWarningPanel } from './DuplicateWarning';
import { createLead, updateLead, checkLeadDuplicates } from '../api/leads.api';
import { listSources } from '../api/sources.api';
import type { Lead, CreateLeadInput, DuplicateWarning } from '../api/leads.api';

interface LeadFormProps {
  lead?: Lead | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const isEdit = !!lead;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<DuplicateWarning[]>([]);
  const [form, setForm] = useState<CreateLeadInput>({
    companyName: lead?.companyName ?? '',
    contactName: lead?.contactName ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    sourceCategory: lead?.sourceCategory ?? '',
    sourceDetail: lead?.sourceDetail ?? '',
  });
  const [selectedCategory, setSelectedCategory] = useState(lead?.sourceCategory ?? '');

  const { data: sourceCategories = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
    staleTime: 5 * 60 * 1000,
  });

  const subcategories = sourceCategories.find((c) => c.category === selectedCategory)?.items ?? [];

  function set(key: keyof CreateLeadInput, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    set('sourceCategory', category);
    set('sourceDetail', '');
  }

  async function onPhoneBlur() {
    if (!form.phone?.trim() || isEdit) return;
    const result = await checkLeadDuplicates({ phone: form.phone.trim() }).catch(() => []);
    setWarnings(result);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !form.phone?.trim() && !form.email?.trim() && !form.companyName?.trim()) {
      setError('手机号、邮箱、公司名称至少填一项');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await updateLead(lead.id, {
          companyName: form.companyName?.trim() || undefined,
          contactName: form.contactName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          email: form.email?.trim() || undefined,
          sourceCategory: form.sourceCategory || undefined,
          sourceDetail: form.sourceDetail || undefined,
        });
      } else {
        await createLead({
          companyName: form.companyName?.trim() || undefined,
          contactName: form.contactName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          email: form.email?.trim() || undefined,
          sourceCategory: form.sourceCategory || undefined,
          sourceDetail: form.sourceDetail || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (isEdit ? '更新失败，请重试' : '创建失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">公司名称</span>
          <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="深圳XX科技有限公司" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">联系人</span>
          <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="姓名" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">手机号</span>
          <Input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            onBlur={onPhoneBlur}
            placeholder="13800000000"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">邮箱</span>
          <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">来源大类</span>
          <Select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">请选择</option>
            {sourceCategories.map((c) => (
              <option key={c.category} value={c.category}>{c.categoryLabel}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">来源小类</span>
          <Select
            value={form.sourceDetail}
            onChange={(e) => set('sourceDetail', e.target.value)}
            disabled={!selectedCategory || subcategories.length === 0}
          >
            <option value="">请选择</option>
            {subcategories.map((item) => (
              <option key={item.name} value={item.name}>{item.label}</option>
            ))}
          </Select>
        </label>
      </div>

      {!isEdit && <DuplicateWarningPanel warnings={warnings} />}

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>
          {loading ? (isEdit ? '保存中...' : '录入中...') : (isEdit ? '保存修改' : '录入线索')}
        </Button>
      </div>
    </form>
  );
}
