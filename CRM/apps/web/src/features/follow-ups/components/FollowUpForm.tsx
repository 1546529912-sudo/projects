import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { listContacts } from '@/features/contacts/api/contacts.api';
import { refreshDashboardQueries } from '@/features/dashboard/lib/refresh-dashboard-queries';
import { createFollowUp, uploadFollowUpAttachment } from '../api/follow-ups.api';

interface FollowUpFormProps {
  customerId: string;
  /** Pre-fill customer name for display in global quick-create mode */
  customerName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FollowUpForm({ customerId, customerName, onSuccess, onCancel }: FollowUpFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    content: '',
    followUpTime: localNow,
    nextFollowUpTime: '',
    contactId: '',
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', customerId],
    queryFn: () => listContacts(customerId),
    enabled: !!customerId,
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) { setError('跟进内容必填'); return; }
    setLoading(true);
    setError(null);
    try {
      const record = await createFollowUp(customerId, {
        content: form.content.trim(),
        followUpTime: new Date(form.followUpTime).toISOString(),
        nextFollowUpTime: form.nextFollowUpTime ? new Date(form.nextFollowUpTime).toISOString() : undefined,
        contactId: form.contactId ? Number(form.contactId) : undefined,
      });
      // Upload attachments sequentially
      for (const file of attachments) {
        try {
          await uploadFollowUpAttachment(customerId, record.id, file);
        } catch {
          // Non-fatal: record created, just log upload failure silently
        }
      }
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
      {customerName && (
        <div className="rounded-[7px] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-muted)]">
          客户：<span className="font-medium text-[var(--text-heading)]">{customerName}</span>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">跟进内容 *</span>
        <textarea
          value={form.content}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          placeholder="记录本次跟进的情况、客户反馈、下一步计划..."
          rows={4}
          className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-heading)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">跟进时间 *</span>
          <Input
            type="datetime-local"
            value={form.followUpTime}
            onChange={(e) => setForm((p) => ({ ...p, followUpTime: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">下次跟进时间</span>
          <Input
            type="datetime-local"
            value={form.nextFollowUpTime}
            onChange={(e) => setForm((p) => ({ ...p, nextFollowUpTime: e.target.value }))}
          />
        </label>
      </div>

      {contacts.length > 0 && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">关联联系人</span>
          <select
            value={form.contactId}
            onChange={(e) => setForm((p) => ({ ...p, contactId: e.target.value }))}
            className="w-full rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-heading)] outline-none transition focus:border-[var(--border-focus)]"
          >
            <option value="">不关联联系人</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.position ? ` · ${c.position}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Attachments */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-heading)]">附件</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-xs text-[var(--action-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Paperclip className="h-3.5 w-3.5" />添加附件
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                <span className="min-w-0 flex-1 truncate text-[var(--text-body)]">{f.name}</span>
                <span className="shrink-0 text-[var(--text-muted)]">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-[var(--text-muted)] hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>
          {loading ? (attachments.length > 0 ? '上传中...' : '记录中...') : '记录跟进'}
        </Button>
      </div>
    </form>
  );
}
