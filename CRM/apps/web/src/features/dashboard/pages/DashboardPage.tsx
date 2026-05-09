import { useLayoutEffect, useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, TrendingUp, Clock, AlertTriangle, Calendar, Activity, PenLine } from 'lucide-react';
import { getDashboard, type DashboardCustomer, type DashboardOpportunity } from '../api/dashboard.api';
import { STAGE_CONFIG } from '@/features/opportunities/pages/OpportunityListPage';
import { Modal } from '@/shared/components/ui/Modal';
import { FollowUpForm } from '@/features/follow-ups/components/FollowUpForm';
import { displayCustomerName, displayOpportunityTitle } from '@/shared/lib/customer-display';

// ── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-orange-100 text-orange-700',
  C: 'bg-blue-100 text-blue-700',
  D: 'bg-gray-100 text-gray-500',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function daysAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / 86400000);
}

function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ── Stat card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[var(--text-muted)]">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-[var(--text-heading)]">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</div>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-[10px] ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Customer row ───────────────────────────────────────────────────────────

function CustomerRow({ c, overdue, onRecord }: { c: DashboardCustomer; overdue?: boolean; onRecord?: (c: DashboardCustomer) => void }) {
  const navigate = useNavigate();
  return (
    <div className="group flex items-center justify-between rounded-[7px] px-3 py-2.5 hover:bg-[var(--bg-hover)]">
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
        onClick={() => navigate(`/customers/${c.id}`)}
      >
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLOR[c.level] ?? 'bg-gray-100 text-gray-500'}`}>
          {c.level}
        </span>
        <span className="truncate text-sm font-medium text-[var(--text-heading)]">{displayCustomerName(c.name)}</span>
        {c.nextFollowUpAt && (
          <span className={`shrink-0 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]'}`}>
            {overdue ? `逾期 ${daysAgo(c.nextFollowUpAt)} 天` : formatDate(c.nextFollowUpAt)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRecord?.(c)}
        className="ml-2 flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--border-default)] bg-white px-2 py-1 text-xs text-[var(--text-muted)] opacity-0 transition hover:border-[var(--action-primary)] hover:text-[var(--action-primary)] group-hover:opacity-100"
      >
        <PenLine className="h-3 w-3" />
        记录
      </button>
    </div>
  );
}

// ── Opportunity row ────────────────────────────────────────────────────────

function OppRow({ o, stale }: { o: DashboardOpportunity; stale?: boolean }) {
  const navigate = useNavigate();
  const stageCfg = STAGE_CONFIG[o.stage] ?? { label: o.stage, color: 'bg-gray-100 text-gray-600' };
  return (
    <div
      onClick={() => navigate(`/customers/${o.customer.id}`)}
      className="flex cursor-pointer items-center justify-between rounded-[7px] px-3 py-2.5 hover:bg-[var(--bg-hover)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-heading)]">{displayOpportunityTitle(o.title)}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${stageCfg.color}`}>{stageCfg.label}</span>
        </div>
        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{displayCustomerName(o.customer.name)} · {o.owner.name}</div>
      </div>
      <div className="ml-3 shrink-0 text-right">
        <div className="text-sm font-semibold text-[var(--text-heading)]">¥{Number(o.amount).toLocaleString()}</div>
        {stale && o.updatedAt ? (
          <div className="text-xs text-orange-500">{daysAgo(o.updatedAt)} 天未更新</div>
        ) : o.expectedCloseDate ? (
          <div className="text-xs text-[var(--text-muted)]">
            {daysUntil(o.expectedCloseDate) <= 3
              ? <span className="text-red-500 font-medium">{daysUntil(o.expectedCloseDate)} 天后到期</span>
              : `${formatDate(o.expectedCloseDate)} 到期`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  badge?: string;
  children: React.ReactNode;
  emptyText: string;
  /** 锚点 id，供顶栏提醒跳转 */
  sectionId?: string;
}

function Section({ icon, title, count, badge, children, emptyText, sectionId }: SectionProps) {
  return (
    <div id={sectionId} className="scroll-mt-[76px] rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
        {icon}
        <span className="text-sm font-semibold text-[var(--text-heading)]">{title}</span>
        {count > 0 && (
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge ?? 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
            {count}
          </span>
        )}
      </div>
      <div className="p-2">
        {count === 0 ? (
          <div className="py-4 text-center text-sm text-[var(--text-muted)]">{emptyText}</div>
        ) : children}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function DashboardPage() {
  const location = useLocation();
  const [quickRecord, setQuickRecord] = useState<DashboardCustomer | null>(null);
  usePageHeader('工作台', new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5 * 60 * 1000,
  });

  useLayoutEffect(() => {
    if (!data) return;
    const id = location.hash.replace(/^#/, '');
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [data, location.hash]);

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
        加载中...
      </div>
    );
  }

  const { stats, todayFollowUps, overdueFollowUps, upcomingOpportunities, staleOpportunities } = data;

  const totalAmt = Number(stats.openOppAmount);
  const amtDisplay = totalAmt >= 1_000_000
    ? `¥${(totalAmt / 10000).toFixed(0)} 万`
    : `¥${totalAmt.toLocaleString()}`;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex-1 space-y-5 p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="客户总数"
            value={stats.totalCustomers}
            color="bg-blue-50"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            label="进行中商机"
            value={stats.openOppCount}
            sub="个活跃商机"
            color="bg-purple-50"
          />
          <StatCard
            icon={<span className="text-base font-bold text-green-600">¥</span>}
            label="商机总金额"
            value={amtDisplay}
            sub="进行中商机合计"
            color="bg-green-50"
          />
        </div>

        {/* Follow-up & Opportunity sections */}
        <div className="grid grid-cols-2 gap-4">
          {/* 今日待跟进 */}
          <Section
            sectionId="reminder-follow-today"
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            title="今日待跟进"
            count={todayFollowUps.length}
            badge="bg-blue-100 text-blue-700"
            emptyText="今日暂无需跟进的客户"
          >
            {todayFollowUps.map((c) => <CustomerRow key={c.id} c={c} onRecord={setQuickRecord} />)}
          </Section>

          {/* 逾期待跟进 */}
          <Section
            sectionId="reminder-follow-overdue"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title="逾期待跟进"
            count={overdueFollowUps.length}
            badge="bg-red-100 text-red-700"
            emptyText="暂无逾期跟进"
          >
            {overdueFollowUps.map((c) => <CustomerRow key={c.id} c={c} overdue onRecord={setQuickRecord} />)}
          </Section>

          {/* 即将到期商机 */}
          <Section
            sectionId="reminder-opp-upcoming"
            icon={<Calendar className="h-4 w-4 text-orange-500" />}
            title="14 天内即将到期"
            count={upcomingOpportunities.length}
            badge="bg-orange-100 text-orange-700"
            emptyText="近期无即将到期的商机"
          >
            {upcomingOpportunities.map((o) => <OppRow key={o.id} o={o} />)}
          </Section>

          {/* 长期未推进 */}
          <Section
            sectionId="reminder-opp-stale"
            icon={<Activity className="h-4 w-4 text-gray-400" />}
            title="长期未推进商机"
            count={staleOpportunities.length}
            badge="bg-gray-100 text-gray-600"
            emptyText="暂无长期未推进的商机"
          >
            {staleOpportunities.map((o) => <OppRow key={o.id} o={o} stale />)}
          </Section>
        </div>
      </div>

      {/* Quick-record modal */}
      <Modal
        open={!!quickRecord}
        onClose={() => setQuickRecord(null)}
        title={`记录跟进 · ${displayCustomerName(quickRecord?.name ?? '')}`}
      >
        {quickRecord && (
          <FollowUpForm
            customerId={quickRecord.id}
            onSuccess={() => { setQuickRecord(null); refetch(); }}
            onCancel={() => setQuickRecord(null)}
          />
        )}
      </Modal>
    </div>
  );
}
