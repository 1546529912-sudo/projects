import { useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, X, Check, Paperclip, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  listContracts,
  createContract,
  updateContract,
  deleteContract,
  uploadContractFile,
  getContractDownloadUrl,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type Contract,
  type CreateContractInput,
  type UpdateContractInput,
} from '../api/contracts.api';

interface ContractListProps {
  customerId: string;
}

// ── Create Form ──────────────────────────────────────────────────────────────

interface CreateFormProps {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function ContractCreateForm({ customerId, onSuccess, onCancel }: CreateFormProps) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    signingDate: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: CreateContractInput) => createContract(input),
    onSuccess,
    onError: (e: any) => setError(e?.response?.data?.message ?? '创建失败'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('请填写合同名称'); return; }
    mutation.mutate({
      customerId,
      title: form.title.trim(),
      amount: form.amount ? Number(form.amount) : undefined,
      signingDate: form.signingDate || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">合同名称 *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="如：2024年采购合同"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">合同金额（元）</label>
        <Input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          placeholder="0"
          min={0}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">签约日期</label>
          <Input type="date" value={form.signingDate} onChange={(e) => setForm((p) => ({ ...p, signingDate: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">开始日期</label>
          <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">结束日期</label>
          <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">备注</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="合同备注..."
          rows={2}
          className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? '创建中...' : '创建合同'}
        </Button>
      </div>
    </form>
  );
}

// ── Inline Edit Row ──────────────────────────────────────────────────────────

function ContractRow({
  contract,
  canDelete,
  onDeleted,
  onUpdated,
}: {
  contract: Contract;
  canDelete: boolean;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadContractFile(contract.id, file),
    onSuccess: onUpdated,
  });
  const [editForm, setEditForm] = useState<UpdateContractInput>({
    title: contract.title,
    amount: Number(contract.amount),
    status: contract.status,
    signingDate: contract.signingDate ? contract.signingDate.slice(0, 10) : null,
    startDate: contract.startDate ? contract.startDate.slice(0, 10) : null,
    endDate: contract.endDate ? contract.endDate.slice(0, 10) : null,
    notes: contract.notes ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateContractInput) => updateContract(contract.id, data),
    onSuccess: () => { setEditing(false); onUpdated(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContract(contract.id),
    onSuccess: onDeleted,
  });

  if (editing) {
    return (
      <div className="rounded-[9px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            value={editForm.title ?? ''}
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            className="flex-1 rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-sm outline-none focus:border-[var(--border-focus)]"
            placeholder="合同名称"
          />
          <select
            value={editForm.status ?? contract.status}
            onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
            className="rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
          >
            {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="mb-2 grid grid-cols-4 gap-2">
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--text-muted)]">金额</div>
            <input
              type="number"
              value={editForm.amount ?? 0}
              onChange={(e) => setEditForm((p) => ({ ...p, amount: Number(e.target.value) }))}
              className="w-full rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--text-muted)]">签约日期</div>
            <input
              type="date"
              value={editForm.signingDate ?? ''}
              onChange={(e) => setEditForm((p) => ({ ...p, signingDate: e.target.value || null }))}
              className="w-full rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--text-muted)]">开始日期</div>
            <input
              type="date"
              value={editForm.startDate ?? ''}
              onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value || null }))}
              className="w-full rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--text-muted)]">结束日期</div>
            <input
              type="date"
              value={editForm.endDate ?? ''}
              onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value || null }))}
              className="w-full rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
            />
          </div>
        </div>

        <textarea
          value={editForm.notes ?? ''}
          onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="备注..."
          rows={2}
          className="mb-2 w-full resize-none rounded-[6px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--border-focus)]"
        />

        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex h-7 items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 text-xs hover:bg-[var(--bg-hover)]"
          >
            <X className="h-3.5 w-3.5" />取消
          </button>
          <button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate(editForm)}
            className="flex h-7 items-center gap-1 rounded-[6px] bg-[var(--action-primary)] px-2.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />{updateMutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    );
  }

  const statusColor = CONTRACT_STATUS_COLORS[contract.status] ?? 'bg-gray-100 text-gray-600';
  const dateRange = [contract.startDate, contract.endDate]
    .filter(Boolean)
    .map((d) => new Date(d!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' }))
    .join(' ~ ');

  return (
    <div className="flex items-start justify-between rounded-[9px] border border-[var(--border-default)] p-3 hover:border-[var(--border-hover)]">
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)]">{contract.contractNo}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
            {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
          </span>
        </div>
        <div className="mt-0.5 text-sm font-medium text-[var(--text-heading)] truncate">{contract.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[var(--text-muted)]">
          <span>¥{Number(contract.amount).toLocaleString()}</span>
          {dateRange && <span>{dateRange}</span>}
          {contract.signingDate && (
            <span>签约 {new Date(contract.signingDate).toLocaleDateString('zh-CN')}</span>
          )}
          {contract.owner && <span>{contract.owner.name}</span>}
        </div>
        {contract.notes && (
          <div className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{contract.notes}</div>
        )}
        {contract.fileName && (
          <a
            href={getContractDownloadUrl(contract.id)}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
          >
            <Paperclip className="h-3 w-3" />{contract.fileName}
          </a>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMutation.mutate(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          title={contract.fileName ? '替换合同文件' : '上传合同文件'}
          className="rounded-[5px] p-1 text-[var(--text-muted)] hover:bg-blue-50 hover:text-blue-500 disabled:opacity-40"
        >
          {uploadMutation.isPending ? (
            <span className="text-[10px]">上传中</span>
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
        </button>
        {contract.fileName && (
          <a
            href={getContractDownloadUrl(contract.id)}
            target="_blank"
            rel="noreferrer"
            title="下载合同"
            className="rounded-[5px] p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)]"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="编辑"
          className="rounded-[5px] p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => { if (confirm('确认删除此合同？')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            title="删除"
            className="rounded-[5px] p-1 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ContractList({ customerId }: ContractListProps) {
  const queryClient = useQueryClient();
  const actor = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', customerId],
    queryFn: () => listContracts({ customerId }),
  });

  const canDelete = actor?.role === 'admin' || actor?.role === 'director' || actor?.role === 'manager';

  function handleSuccess() {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ['contracts', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
  }

  function handleUpdated() {
    queryClient.invalidateQueries({ queryKey: ['contracts', customerId] });
  }

  function handleDeleted() {
    queryClient.invalidateQueries({ queryKey: ['contracts', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">
          合同 <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{contracts.length}</span>
        </h3>
        <Button variant="secondary" className="h-7 px-2.5 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />新建合同
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-muted)]">加载中...</div>
      ) : contracts.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-[var(--border-default)] py-6 text-center text-sm text-[var(--text-muted)]">
          暂无合同
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              canDelete={canDelete}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建合同">
        <ContractCreateForm
          customerId={customerId}
          onSuccess={handleSuccess}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
