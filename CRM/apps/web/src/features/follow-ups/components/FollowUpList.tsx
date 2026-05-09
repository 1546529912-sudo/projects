import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarClock, ChevronDown, ChevronUp, User, Pencil, Paperclip, Trash2, History, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FollowUpForm } from './FollowUpForm';
import {
  listFollowUps,
  updateFollowUp,
  deleteFollowUpAttachment,
  getAttachmentDownloadUrl,
  getFollowUpEditHistory,
  type FollowUp,
} from '../api/follow-ups.api';

const COLLAPSE_THRESHOLD = 3;

interface FollowUpListProps {
  customerId: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const base = d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `昨天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  return base;
}

function nextFollowLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  const base = d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (diffDays < 0) return { label: `${base}（已逾期）`, urgent: true };
  if (diffDays === 0) return { label: `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, urgent: true };
  if (diffDays === 1) return { label: `明天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, urgent: false };
  return { label: base, urgent: false };
}

function isMissedPlan(item: FollowUp, allItems: FollowUp[]): boolean {
  if (!item.nextFollowUpTime) return false;
  const planned = new Date(item.nextFollowUpTime);
  if (planned >= new Date()) return false;
  return !allItems.some((fu) => fu.id !== item.id && new Date(fu.followUpTime) >= planned);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EDIT_FIELD_LABEL: Record<string, string> = {
  content: '跟进内容',
  followUpTime: '跟进时间',
  nextFollowUpTime: '下次跟进',
  contactId: '联系人',
};

function formatHistoryValue(field: string, value: string | null): string {
  if (value === null || value === '') return '（空）';
  if (field === 'followUpTime' || field === 'nextFollowUpTime') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
  return value;
}

function TimelineItem({
  item, missed, isLast, customerId, onUpdated,
}: { item: FollowUp; missed: boolean; isLast: boolean; customerId: string; onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const next = item.nextFollowUpTime ? nextFollowLabel(item.nextFollowUpTime) : null;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: editHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['follow-up-edit-history', customerId, item.id],
    queryFn: () => getFollowUpEditHistory(customerId, item.id),
    enabled: historyOpen,
  });

  async function handleSave() {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await updateFollowUp(customerId, item.id, { content: editContent });
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['follow-up-edit-history', customerId, item.id] });
      onUpdated();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteFollowUpAttachment(customerId, item.id, attachmentId);
      onUpdated();
    } catch {
      // ignore
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white ${missed ? 'border-red-500' : 'border-[var(--action-primary)]'}`} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-[var(--border-default)]" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-heading)]">{item.owner?.name}</span>
          {item.contact && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5">
              <User className="h-2.5 w-2.5" />
              {item.contact.name}
            </span>
          )}
          <span className="ml-auto shrink-0">{timeLabel(item.followUpTime)}</span>
          <button
            onClick={() => { setEditContent(item.content); setEditing(true); }}
            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)]"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        {editing ? (
          <div className="mt-1.5 space-y-2">
            <textarea
              rows={3}
              className="w-full rounded-[7px] border border-[var(--action-primary)] bg-white px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-[var(--action-primary)]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-[6px] bg-[var(--action-primary)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50 hover:opacity-90"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-[6px] border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                取消
              </button>
              <span className="ml-1 text-[10px] text-[var(--text-muted)] self-center">
                （保存后写入字段级修改记录与业务日志）
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 rounded-[7px] bg-[var(--bg-subtle)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-body)]">
            {item.content}
          </p>
        )}
        {item.attachments && item.attachments.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {item.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                <a
                  href={getAttachmentDownloadUrl(customerId, item.id, att.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-[var(--action-primary)] hover:underline"
                >
                  {att.originalName}
                </a>
                <span className="shrink-0 text-[var(--text-muted)]">{formatFileSize(att.size)}</span>
                <button
                  type="button"
                  disabled={deletingAttachmentId === att.id}
                  onClick={() => handleDeleteAttachment(att.id)}
                  className="shrink-0 text-[var(--text-muted)] hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)]"
          >
            <History className="h-3 w-3 shrink-0" />
            {historyOpen ? '收起修改记录' : '查看修改记录'}
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-2 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  加载中…
                </div>
              ) : editHistory.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">暂无字段修改记录</p>
              ) : (
                editHistory.map((h) => (
                  <div key={h.id} className="border-b border-[var(--border-default)] pb-2 text-xs last:border-0 last:pb-0">
                    <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-heading)]">{h.editor.name}</span>
                      <span>{new Date(h.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="text-[var(--text-body)]">
                      <span className="font-medium text-[var(--text-heading)]">
                        {EDIT_FIELD_LABEL[h.field] ?? h.field}
                      </span>
                      <span className="mx-1 text-[var(--text-muted)]">：</span>
                      <span className="break-words text-red-600/90 line-through decoration-red-400/60">
                        {formatHistoryValue(h.field, h.beforeValue)}
                      </span>
                      <span className="mx-1 text-[var(--text-muted)]">→</span>
                      <span className="break-words text-emerald-700">{formatHistoryValue(h.field, h.afterValue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {next && (
          <div className={`mt-1.5 flex items-center gap-1 text-xs ${next.urgent ? 'text-red-500' : 'text-blue-600'}`}>
            <CalendarClock className="h-3 w-3 shrink-0" />
            下次跟进：{next.label}
            {missed && (
              <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                计划未执行
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FollowUpList({ customerId }: FollowUpListProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['follow-ups', customerId],
    queryFn: () => listFollowUps(customerId, { pageSize: 50 }),
  });

  const allItems = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;
  const hasMore = allItems.length > COLLAPSE_THRESHOLD;
  const visibleItems = expanded ? allItems : allItems.slice(0, COLLAPSE_THRESHOLD);

  function handleSuccess() {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['follow-ups', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">
          跟进记录
          {total > 0 && (
            <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">{total} 条</span>
          )}
        </h3>
        <Button variant="secondary" className="h-7 px-2.5 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />记录跟进
        </Button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : allItems.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-[var(--border-default)] py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">暂无跟进记录</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-2 text-xs text-[var(--action-primary)] hover:underline"
          >
            立即记录第一条跟进 →
          </button>
        </div>
      ) : (
        <div>
          {visibleItems.map((item, i) => (
            <TimelineItem
              key={item.id}
              item={item}
              missed={isMissedPlan(item, allItems)}
              isLast={i === visibleItems.length - 1 && !hasMore}
              customerId={customerId}
              onUpdated={() => queryClient.invalidateQueries({ queryKey: ['follow-ups', customerId] })}
            />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1 rounded-[7px] py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)]"
            >
              {expanded ? (
                <><ChevronUp className="h-3.5 w-3.5" />收起</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" />查看更多 ({allItems.length - COLLAPSE_THRESHOLD} 条)</>
              )}
            </button>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="记录跟进">
        <FollowUpForm customerId={customerId} onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
