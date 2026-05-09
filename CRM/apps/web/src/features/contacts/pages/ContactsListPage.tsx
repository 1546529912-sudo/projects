import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery } from '@tanstack/react-query';
import { Search, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { listAllContacts } from '../api/contacts.api';
import { displayCustomerName } from '@/shared/lib/customer-display';

const DECISION_ROLE_LABELS: Record<string, string> = {
  decision_maker: '决策人',
  influencer: '影响者',
  user: '使用者',
  champion: '支持者',
  blocker: '阻碍者',
};

export function ContactsListPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts-all', page, keyword],
    queryFn: () => listAllContacts({ page, keyword: keyword || undefined }),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  usePageHeader('联系人管理', pagination ? `共 ${pagination.total} 位联系人` : undefined);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex w-64 items-center gap-2 rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 shadow-none ring-0 focus-within:bg-[var(--bg-hover)] focus-within:ring-0">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className="m-0 h-8 min-h-0 flex-1 border-0 bg-transparent p-0 text-sm leading-8 shadow-none ring-0 outline-none placeholder:text-[var(--text-muted)] focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
            placeholder="搜索姓名、手机、职位、公司..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <User className="h-8 w-8 text-[var(--text-muted)]" />
            <div className="text-sm text-[var(--text-muted)]">暂无联系人数据</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-app)]">
                {['姓名', '手机号', '邮箱', '职位', '决策角色', '所属客户', '是否主要'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((contact) => (
                <tr key={contact.id} className="border-b border-[var(--border-default)] transition hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                    {displayCustomerName(contact.name) || '-'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{contact.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{contact.email ?? '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{contact.position ?? '-'}</td>
                  <td className="px-4 py-3">
                    {contact.decisionRole ? (
                      <span className="inline-flex items-center rounded-[5px] border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                        {DECISION_ROLE_LABELS[contact.decisionRole] ?? contact.decisionRole}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.customer ? (
                      <Link
                        to={`/customers/${contact.customer.id}`}
                        className="text-[var(--action-primary)] hover:underline"
                      >
                        {contact.customer.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.isPrimary ? (
                      <span className="inline-flex items-center rounded-[5px] border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">主要</span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-6 py-3">
          <span className="text-xs text-[var(--text-muted)]">第 {pagination.page} / {pagination.totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-7 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="secondary" className="h-7 px-3 text-xs" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}
