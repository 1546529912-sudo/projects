import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeaderValue } from '@/shared/providers/page-header-context';
import { Bell, CheckCheck, ExternalLink, KeyRound, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { logout, changePassword } from '@/features/auth/api/auth.api';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  UNREAD_COUNT_QUERY_KEY,
  NOTIFICATIONS_QUERY_KEY,
  type NotificationItem,
} from '@/features/notifications/api/notifications.api';
import { GlobalFollowUpCreate } from '@/features/follow-ups/components/GlobalFollowUpCreate';
import { globalSearch, type SearchResults } from '@/features/dashboard/api/dashboard.api';
import { displayCustomerName, displayOpportunityTitle } from '@/shared/lib/customer-display';

const TYPE_DOT: Record<string, string> = {
  follow_up_today: 'bg-blue-400',
  follow_up_overdue: 'bg-red-400',
  follow_up_overdue_manager: 'bg-orange-400',
  follow_up_overdue_admin: 'bg-red-600',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: string, refType: string | null, refId: string | null) => void;
}) {
  const dotColor = TYPE_DOT[item.type] ?? 'bg-gray-400';
  return (
    <button
      type="button"
      onClick={() => onRead(item.id, item.refType, item.refId)}
      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--bg-hover)] ${item.isRead ? 'opacity-55' : ''}`}
    >
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-2 w-2 rounded-full ${item.isRead ? 'bg-gray-300' : dotColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${item.isRead ? 'text-[var(--text-muted)]' : 'font-medium text-[var(--text-heading)]'}`}>
          {item.title}
        </p>
        {item.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{item.body}</p>
        )}
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{timeAgo(item.createdAt)}</p>
      </div>
      {item.refType === 'customer' && item.refId && (
        <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
      )}
    </button>
  );
}

function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const { data: listData, isFetching } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => getNotifications(),
    enabled: open,
    staleTime: 10_000,
  });

  const readMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const readAllMutation = useMutation<void, Error, void>({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unreadCount = countData?.count ?? 0;
  const items = listData?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  function handleRead(id: string, refType: string | null, refId: string | null) {
    readMutation.mutate(id);
    let path: string | null = null;
    if (refType === 'customer' && refId) path = `/customers/${refId}`;
    else if (refType === 'opportunity' && refId) path = `/opportunities/${refId}`;
    else if (refType === 'lead' && refId) path = `/leads`;
    else if (refType === 'order' && refId) path = `/orders`;
    if (path) { navigate(path); setOpen(false); }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-[7px] border border-[var(--border-default)] bg-white text-[var(--text-heading)] transition hover:bg-[var(--bg-hover)]"
        aria-label="消息通知"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2.5">
            <span className="text-sm font-semibold text-[var(--text-heading)]">
              消息通知
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount} 条未读
                </span>
              )}
            </span>
            {hasUnread && (
              <button
                type="button"
                onClick={() => readAllMutation.mutate()}
                disabled={readAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-[var(--action-primary)] hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isFetching && items.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)] opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">暂无消息</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {items.map((item: NotificationItem) => (
                  <NotificationRow key={item.id} item={item} onRead={handleRead} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border-default)] px-4 py-2">
            <button
              type="button"
              onClick={() => { navigate('/dashboard'); setOpen(false); }}
              className="w-full text-center text-xs font-medium text-[var(--action-primary)] hover:underline"
            >
              查看工作台
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!current || !next) { setError('请填写所有字段'); return; }
    if (next.length < 6) { setError('新密码不能少于6位'); return; }
    if (next !== confirm) { setError('两次输入的新密码不一致'); return; }
    setLoading(true); setError(null);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? '修改失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCurrent(''); setNext(''); setConfirm(''); setError(null); setDone(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="修改密码">
      {done ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-emerald-600">密码修改成功！</p>
          <div className="flex justify-end"><Button onClick={handleClose}>关闭</Button></div>
        </div>
      ) : (
        <div className="space-y-3 py-1">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">当前密码</span>
            <Input type="password" value={current} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)} placeholder="请输入当前密码" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">新密码（至少6位）</span>
            <Input type="password" value={next} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNext(e.target.value)} placeholder="请输入新密码" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">确认新密码</span>
            <Input type="password" value={confirm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)} placeholder="再次输入新密码" />
          </label>
          {error && <p className="rounded-[7px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={handleClose}>取消</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? '提交中...' : '确认修改'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const STAGE_LABEL: Record<string, string> = {
  initial_contact: '初步接触', needs_analysis: '需求确认', proposal: '方案报价',
  negotiation: '谈判中', closed_won: '赢单', closed_lost: '输单',
};

const STATUS_LABEL: Record<string, string> = {
  following: '跟进中', interested: '有意向', negotiating: '谈判中', won: '已成交', lost: '已丢失',
};

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const search = useCallback(async (val: string) => {
    if (val.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await globalSearch(val.trim());
      setResults(res);
      setOpen(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) { setResults(null); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(path: string) {
    setOpen(false);
    setQ('');
    setResults(null);
    navigate(path);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasResults = results && (results.customers.length > 0 || results.opportunities.length > 0 || results.leads.length > 0);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex h-8 w-56 items-center gap-2 rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 shadow-none ring-0 focus-within:bg-[var(--bg-hover)] focus-within:ring-0">
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          placeholder="搜索客户、商机..."
          className="m-0 h-8 min-h-0 flex-1 border-0 bg-transparent p-0 text-sm leading-8 shadow-none ring-0 outline-none placeholder:text-[var(--text-muted)] focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
        />
        {loading && <span className="text-[10px] text-[var(--text-muted)]">...</span>}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-white shadow-lg">
          {!hasResults ? (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">无匹配结果</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-default)]">
              {results!.customers.length > 0 && (
                <div>
                  <div className="bg-[var(--bg-subtle)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">客户</div>
                  {results!.customers.map((c: SearchResults['customers'][number]) => (
                    <button key={c.id} onClick={() => handleSelect(`/customers/${c.id}`)}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-[var(--bg-hover)]">
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text-heading)]">{displayCustomerName(c.name)}</div>
                        {c.companyName && <div className="truncate text-xs text-[var(--text-muted)]">{displayCustomerName(c.companyName)}</div>}
                      </div>
                      <div className="shrink-0 text-xs text-[var(--text-muted)]">{STATUS_LABEL[c.status] ?? c.status}</div>
                    </button>
                  ))}
                </div>
              )}
              {results!.opportunities.length > 0 && (
                <div>
                  <div className="bg-[var(--bg-subtle)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">商机</div>
                  {results!.opportunities.map((o: SearchResults['opportunities'][number]) => (
                    <button key={o.id} onClick={() => handleSelect(o.customer ? `/customers/${o.customer.id}` : '/opportunities')}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-[var(--bg-hover)]">
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text-heading)]">{displayOpportunityTitle(o.title)}</div>
                        {o.customer && <div className="truncate text-xs text-[var(--text-muted)]">{displayCustomerName(o.customer.name)}</div>}
                      </div>
                      <div className="shrink-0 text-xs text-[var(--text-muted)]">{STAGE_LABEL[o.stage] ?? o.stage}</div>
                    </button>
                  ))}
                </div>
              )}
              {results!.leads.length > 0 && (
                <div>
                  <div className="bg-[var(--bg-subtle)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">线索</div>
                  {results!.leads.map((l: SearchResults['leads'][number]) => (
                    <button key={l.id} onClick={() => handleSelect('/leads')}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-[var(--bg-hover)]">
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text-heading)]">
                          {displayCustomerName(l.name ?? l.companyName ?? '') || '未命名'}
                        </div>
                        {l.phone && <div className="text-xs text-[var(--text-muted)]">{l.phone}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = useAuthStore((state: any) => state.user);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearAuth = useAuthStore((state: any) => state.clearAuth);
  const header = usePageHeaderValue();
  const [showPwChange, setShowPwChange] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  }

  return (
    <header className="z-20 flex h-[58px] shrink-0 items-center border-b border-[var(--border-default)] bg-white/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="topbar-title-slot shrink-0">
        <div className="flex min-w-0 items-baseline gap-[2ch]">
          <h1 className="min-w-0 truncate text-base font-semibold tracking-[-0.03em] text-[var(--text-heading)]">
            <span className="font-normal text-[var(--text-muted)]">CRM</span>
            {header.title && (
              <>
                <span className="mx-1.5 font-normal text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-heading)]">{header.title}</span>
              </>
            )}
          </h1>
          {header.subtitle && (
            <span className="shrink-0 truncate text-xs font-normal text-[var(--text-muted)]">{header.subtitle}</span>
          )}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <GlobalSearch />
        <GlobalFollowUpCreate />
        <NotificationCenter />
        <button
          onClick={() => setShowPwChange(true)}
          className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-body)]"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {user?.name} · {user?.role}
        </button>
        <Button variant="secondary" onClick={handleLogout}>退出</Button>
      </div>
      <ChangePasswordModal open={showPwChange} onClose={() => setShowPwChange(false)} />
    </header>
  );
}
