import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { updateInlineFields, changeCustomerStatus } from '../api/customers.api';

const LEVEL_OPTIONS = [
  { value: 'A', label: 'A 级' },
  { value: 'B', label: 'B 级' },
  { value: 'C', label: 'C 级' },
  { value: 'D', label: 'D 级' },
];

const STATUS_OPTIONS = [
  { value: 'following', label: '跟进中' },
  { value: 'interested', label: '有意向' },
  { value: 'negotiating', label: '谈判中' },
  { value: 'won', label: '已成交' },
  { value: 'lost', label: '已丢失' },
];

interface InlineLevelEditorProps {
  customerId: string;
  currentValue: string;
  onUpdated: (newValue: string) => void;
}

export function InlineLevelEditor({ customerId, currentValue, onUpdated }: InlineLevelEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function select(value: string) {
    if (value === currentValue) { setOpen(false); return; }
    setSaving(true);
    try {
      await updateInlineFields(customerId, { level: value });
      onUpdated(value);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-[5px] border border-[var(--border-default)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)] transition"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {currentValue} 级
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-24 rounded-[7px] border border-[var(--border-default)] bg-white shadow-lg">
          {LEVEL_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)] transition',
                o.value === currentValue && 'font-medium text-[var(--action-primary)]',
              )}
            >
              {o.label}
              {o.value === currentValue && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface InlineStatusEditorProps {
  customerId: string;
  currentValue: string;
  onUpdated: (newValue: string) => void;
}

export function InlineStatusEditor({ customerId, currentValue, onUpdated }: InlineStatusEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  async function select(value: string) {
    if (value === currentValue) { setOpen(false); return; }
    setSaving(true);
    try {
      const result = await changeCustomerStatus(customerId, { toStatus: value, triggerType: 'manual' });
      if ((result as any)?.pendingApproval) {
        setPendingMsg('已提交回退申请，等待主管审批');
      } else {
        onUpdated(value);
      }
    } catch {
      /* 状态切换失败由外层 UI 处理；此处仅结束 loading */
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  const current = STATUS_OPTIONS.find((o) => o.value === currentValue);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-[5px] border border-[var(--border-default)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)] transition"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {current?.label ?? currentValue}
      </button>
      {pendingMsg && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-[7px] border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 shadow">
          {pendingMsg}
          <button onClick={() => setPendingMsg(null)} className="ml-2 underline">关闭</button>
        </div>
      )}
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-28 rounded-[7px] border border-[var(--border-default)] bg-white shadow-lg">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)] transition',
                o.value === currentValue && 'font-medium text-[var(--action-primary)]',
              )}
            >
              {o.label}
              {o.value === currentValue && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
