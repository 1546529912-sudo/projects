import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/ui/Modal';
import { listCustomers } from '@/features/customers/api/customers.api';
import { FollowUpForm } from './FollowUpForm';
import { refreshDashboardQueries } from '@/features/dashboard/lib/refresh-dashboard-queries';

interface SelectedCustomer {
  id: string;
  name: string;
}

function CustomerPicker({ onSelect }: { onSelect: (c: SelectedCustomer) => void }) {
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['customers-picker', keyword],
    queryFn: () => listCustomers({ keyword: keyword || undefined, pageSize: 8 }),
    staleTime: 5000,
  });

  const customers = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索客户名称..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-[7px] border-0 bg-[var(--bg-subtle)] py-2 pl-9 pr-3 text-sm text-[var(--text-heading)] shadow-none ring-0 outline-none transition placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-hover)] focus:ring-0"
        />
        {keyword && (
          <button type="button" onClick={() => setKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-heading)]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        {isFetching && customers.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">搜索中...</div>
        ) : customers.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">
            {keyword ? '未找到相关客户' : '暂无客户数据'}
          </div>
        ) : (
          <div className="space-y-1">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect({ id: c.id, name: c.name })}
                className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-left hover:bg-[var(--bg-hover)]"
              >
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.level === 'A' ? 'bg-red-100 text-red-700'
                  : c.level === 'B' ? 'bg-orange-100 text-orange-700'
                  : c.level === 'C' ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>{c.level}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text-heading)]">{c.name}</div>
                  {c.companyName && c.companyName !== c.name && (
                    <div className="truncate text-xs text-[var(--text-muted)]">{c.companyName}</div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">{c.owner?.name ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GlobalFollowUpCreate() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const qc = useQueryClient();

  function handleClose() {
    setOpen(false);
    setSelected(null);
  }

  function handleSuccess() {
    refreshDashboardQueries(qc);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    handleClose();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="快速记录跟进"
        className="grid h-9 w-9 place-items-center rounded-[7px] border border-[var(--border-default)] bg-white text-[var(--text-heading)] transition hover:bg-[var(--bg-hover)]"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={selected ? `记录跟进 · ${selected.name}` : '快速记录跟进'}
      >
        {!selected ? (
          <div>
            <p className="mb-3 text-sm text-[var(--text-muted)]">选择要记录跟进的客户</p>
            <CustomerPicker onSelect={setSelected} />
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-3 flex items-center gap-1 text-xs text-[var(--action-primary)] hover:underline"
            >
              ← 重新选择客户
            </button>
            <FollowUpForm
              customerId={selected.id}
              customerName={selected.name}
              onSuccess={handleSuccess}
              onCancel={handleClose}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
