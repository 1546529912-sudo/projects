import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { createContact } from '../api/contacts.api';
import type { CreateContactInput } from '../api/contacts.api';

interface ContactFormProps {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContactForm({ customerId, onSuccess, onCancel }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateContactInput>({
    name: '',
    phone: '',
    email: '',
    position: '',
    decisionRole: '',
    isPrimary: false,
  });

  function set(key: keyof CreateContactInput, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('联系人姓名必填'); return; }
    setLoading(true);
    setError(null);
    try {
      await createContact(customerId, {
        name: form.name.trim(),
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        position: form.position?.trim() || undefined,
        decisionRole: form.decisionRole || undefined,
        isPrimary: form.isPrimary,
      });
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
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">姓名 *</span>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="联系人姓名" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">手机号</span>
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="13800000000" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">邮箱</span>
          <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">职位</span>
          <Input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="如：采购总监" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">决策角色</span>
          <Select value={form.decisionRole} onChange={(e) => set('decisionRole', e.target.value)}>
            <option value="">请选择</option>
            <option value="decision_maker">决策者</option>
            <option value="influencer">影响者</option>
            <option value="user">使用者</option>
            <option value="finance">财务</option>
            <option value="unknown">未知</option>
          </Select>
        </label>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => set('isPrimary', e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-default)]"
        />
        <span className="text-sm text-[var(--text-body)]">设为主要联系人</span>
      </label>

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>{loading ? '添加中...' : '添加联系人'}</Button>
      </div>
    </form>
  );
}
