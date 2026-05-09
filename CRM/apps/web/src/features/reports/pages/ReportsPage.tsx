import React, { useState } from 'react';
import { usePageHeader } from '@/shared/providers/page-header-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Target, BarChart3, ChevronRight, CheckCircle2, PieChart, Users, Activity } from 'lucide-react';
import { getFunnel, getPerformance, setTarget, getSource, getEfficiency, getFunnelByProduct, getSourceFunnel, getSourceTrend, getTeamActivity, getTeamMembers, listCustomReports, runCustomReport, getAttributionComparison } from '../api/reports.api';
import type { FunnelQuery, PerformanceQuery, SourceQuery, CustomReport, CustomReportResult } from '../api/reports.api';
import { cn } from '@/shared/lib/cn';

// ── helpers ────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]) {
  const bom = '﻿';
  const csv = bom + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmt(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '0';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toFixed(0);
}

/** 来源漏斗表格：0–100 的整数占比，后端为 null 时展示破折号 */
function sourceFunnelPctCell(rate: number | null) {
  if (rate === null) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <div className="flex min-w-[5.5rem] items-center gap-2">
      <div className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--border-default)]/40">
        <div
          className="h-full rounded-full bg-emerald-500/90"
          style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
        />
      </div>
      <span className="tabular-nums text-xs font-medium text-[var(--text-heading)]">{rate}%</span>
    </div>
  );
}

function currentPeriod(type: 'month' | 'quarter' | 'year') {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (type === 'month') return `${y}-${String(m).padStart(2, '0')}`;
  if (type === 'quarter') return `${y}-Q${Math.ceil(m / 3)}`;
  return `${y}`;
}

// ── Tab bar ────────────────────────────────────────────────────────────────

type Tab = 'funnel' | 'performance' | 'source' | 'efficiency' | 'team_activity' | 'custom';

const TAB_META: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'funnel',         label: '销售漏斗', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'performance',    label: '业绩完成', icon: <Target className="h-4 w-4" /> },
  { key: 'source',         label: '来源分析', icon: <PieChart className="h-4 w-4" /> },
  { key: 'efficiency',     label: '销售效能', icon: <Users className="h-4 w-4" /> },
  { key: 'team_activity',  label: '团队动态', icon: <Activity className="h-4 w-4" /> },
  { key: 'custom',         label: '自定义报表', icon: <BarChart3 className="h-4 w-4" /> },
];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-1">
      {TAB_META.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 rounded-[7px] px-4 py-1.5 text-sm font-medium transition',
            active === key
              ? 'bg-white shadow-sm text-[var(--text-heading)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-body)]',
          )}
        >
          {icon}{label}
        </button>
      ))}
    </div>
  );
}

// ── Funnel Tab ─────────────────────────────────────────────────────────────

const ACTIVE_STAGE_COLOR: Record<string, string> = {
  initial_contact: '#6366f1',
  needs_analysis: '#8b5cf6',
  proposal: '#a78bfa',
  negotiation: '#c4b5fd',
  closed_won: '#10b981',
  closed_lost: '#f43f5e',
};

function FunnelTab() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<FunnelQuery>({ mode: 'snapshot', timeField: 'created' });
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'funnel', query],
    queryFn: () => getFunnel(query),
  });
  const { data: productSlice = [] } = useQuery({
    queryKey: ['reports', 'funnel-by-product'],
    queryFn: getFunnelByProduct,
  });

  const activeStages = data?.stages.filter((s) => s.stage !== 'closed_won' && s.stage !== 'closed_lost') ?? [];
  const wonStage = data?.stages.find((s) => s.stage === 'closed_won');
  const lostStage = data?.stages.find((s) => s.stage === 'closed_lost');
  const maxCount = Math.max(...(activeStages.map((s) => s.count)), 1);

  // Anomaly detection
  const anomalies: string[] = [];
  for (let i = 0; i < activeStages.length - 1; i++) {
    const curr = activeStages[i];
    const next = activeStages[i + 1];
    if (next.count > curr.count * 1.5 && next.count > 3) {
      anomalies.push(`⚠️ 漏斗倒置：${next.label}（${next.count}）> ${curr.label}（${curr.count}），可能存在数据异常`);
    }
  }
  const largestStage = [...activeStages].sort((a, b) => b.count - a.count)[0];
  if (largestStage && activeStages.length > 1) {
    const totalActive = activeStages.reduce((s, x) => s + x.count, 0);
    if (largestStage.count / totalActive > 0.7 && largestStage.count > 5) {
      anomalies.push(`⚠️ 阶段堆积：${largestStage.label} 占比 ${Math.round(largestStage.count / totalActive * 100)}%，商机可能卡在此阶段`);
    }
  }

  const chartData = data?.stages.map((s) => ({ name: s.label, 数量: s.count, 金额: parseFloat(s.amount) })) ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={query.mode}
          onChange={(e) => setQuery((q) => ({ ...q, mode: e.target.value as any }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        >
          <option value="snapshot">快照统计（当前状态）</option>
          <option value="flow">流量统计（经过阶段）</option>
        </select>
        <select
          value={query.timeField}
          onChange={(e) => setQuery((q) => ({ ...q, timeField: e.target.value as any }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        >
          <option value="created">按创建时间</option>
          <option value="expected_close">按预计成交时间</option>
        </select>
        <input
          type="date"
          value={query.startDate ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, startDate: e.target.value || undefined }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
          placeholder="开始日期"
        />
        <span className="text-[var(--text-muted)] text-sm">至</span>
        <input
          type="date"
          value={query.endDate ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, endDate: e.target.value || undefined }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        />
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-[var(--text-muted)]">加载中…</div>
      ) : (
        <>
          {/* Overall win rate */}
          <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-[var(--text-muted)]">整体赢单率</span>
            <span className="text-2xl font-bold text-[var(--text-heading)]">{data?.overallWinRate ?? 0}%</span>
          </div>

          {/* Anomaly warnings */}
          {anomalies.length > 0 && (
            <div className="space-y-2">
              {anomalies.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Funnel bars */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--text-heading)]">各阶段分布</div>
            <div className="space-y-3">
              {activeStages.map((stage) => {
                const width = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
                const rate = data?.conversionRates.find((r) => r.from === stage.stage);
                return (
                  <div key={stage.stage}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <button
                        onClick={() => navigate(`/opportunities?stage=${stage.stage}`)}
                        className="flex items-center gap-1 font-medium text-[var(--text-heading)] hover:underline"
                      >
                        {stage.label}
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      </button>
                      <div className="flex items-center gap-4 text-[var(--text-muted)]">
                        <span>{stage.count} 个</span>
                        <span>¥{fmt(stage.amount)}</span>
                        {rate && (
                          <span className="text-xs text-[var(--text-muted)]">
                            → 转化率 {rate.rate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${width}%`,
                          backgroundColor: ACTIVE_STAGE_COLOR[stage.stage] ?? '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Won / Lost summary */}
            {(wonStage || lostStage) && (
              <div className="mt-5 flex gap-4 border-t border-[var(--border-default)] pt-4">
                {wonStage && (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-[var(--text-muted)]">赢单 {wonStage.count} 个  ¥{fmt(wonStage.amount)}</span>
                  </div>
                )}
                {lostStage && (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-sm text-[var(--text-muted)]">输单 {lostStage.count} 个</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--text-heading)]">阶段数量对比</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="数量" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Product slice */}
          {productSlice.length > 0 && (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
              <div className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-heading)]">
                按产品切片
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">产品</th>
                    {['初步接触', '需求确认', '方案报价', '谈判中'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-center text-xs font-medium text-[var(--text-muted)]">{h}</th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--text-muted)]">合计商机</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {productSlice.map((row) => {
                    const stageMap = Object.fromEntries(row.stages.map((s) => [s.stage, s]));
                    const total = row.stages.reduce((s, x) => s + x.count, 0);
                    return (
                      <tr key={row.product} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-2.5 font-medium text-[var(--text-heading)]">{row.product}</td>
                        {['initial_contact', 'needs_analysis', 'proposal', 'negotiation'].map((stage) => {
                          const s = stageMap[stage];
                          return (
                            <td key={stage} className="px-4 py-2.5 text-center text-[var(--text-body)]">
                              {s ? `${s.count}` : '—'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-heading)]">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Performance Tab ────────────────────────────────────────────────────────

function PerformanceTab() {
  const qc = useQueryClient();
  const [query, setQuery] = useState<PerformanceQuery>({ periodType: 'month' });
  const [period, setPeriod] = useState(currentPeriod('month'));
  const [targetInput, setTargetInput] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'performance', query.periodType, period],
    queryFn: () => getPerformance({ periodType: query.periodType, period }),
  });

  const handlePeriodTypeChange = (type: 'month' | 'quarter' | 'year') => {
    setQuery({ periodType: type });
    setPeriod(currentPeriod(type));
  };

  const handleSaveTarget = async () => {
    const amount = parseFloat(targetInput);
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    try {
      await setTarget({ periodType: query.periodType!, period, targetType: 'team', amount });
      qc.invalidateQueries({ queryKey: ['reports', 'performance'] });
    } finally {
      setSaving(false);
      setTargetInput('');
    }
  };

  const target = parseFloat(data?.target ?? '0');
  const actual = parseFloat(data?.actual ?? '0');
  const predicted = parseFloat(data?.predicted ?? '0');
  const completion = data?.completionRate ?? 0;
  const timeProgress = data?.timeProgress ?? 0;

  const trendData = [
    { name: '目标', value: target },
    { name: '实际', value: actual },
    { name: '预测', value: predicted + actual },
  ];

  return (
    <div className="space-y-6">
      {/* Period filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-0.5">
          {(['month', 'quarter', 'year'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handlePeriodTypeChange(t)}
              className={cn(
                'rounded-[6px] px-3 py-1 text-xs font-medium transition',
                query.periodType === t ? 'bg-white shadow-sm text-[var(--text-heading)]' : 'text-[var(--text-muted)]',
              )}
            >
              {t === 'month' ? '月' : t === 'quarter' ? '季度' : '年'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder={query.periodType === 'month' ? '2026-05' : query.periodType === 'quarter' ? '2026-Q2' : '2026'}
          className="w-28 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        />
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-[var(--text-muted)]">加载中…</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: '目标金额', value: `¥${fmt(target)}`, color: 'bg-indigo-50 text-indigo-600' },
              { label: '实际回款', value: `¥${fmt(actual)}`, color: 'bg-emerald-50 text-emerald-600' },
              { label: '预测合计', value: `¥${fmt(predicted + actual)}`, color: 'bg-violet-50 text-violet-600' },
              { label: '完成率', value: `${completion}%`, color: completion >= 100 ? 'bg-emerald-50 text-emerald-600' : completion >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600' },
            ].map((c) => (
              <div key={c.label} className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <div className="text-sm text-[var(--text-muted)]">{c.label}</div>
                <div className="mt-1.5 text-2xl font-bold text-[var(--text-heading)]">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bars */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-4">
            <div className="text-sm font-semibold text-[var(--text-heading)]">完成进度 vs 时间进度</div>
            {[
              { label: '业绩完成', pct: completion, color: 'bg-indigo-500' },
              { label: '时间已过', pct: timeProgress, color: 'bg-amber-400' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-[var(--text-body)]">{bar.label}</span>
                  <span className="font-medium text-[var(--text-heading)]">{bar.pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className={`h-full rounded-full transition-all ${bar.color}`}
                    style={{ width: `${Math.min(bar.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {completion < timeProgress && (
              <div className="flex items-center gap-2 rounded-[7px] bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <TrendingUp className="h-3.5 w-3.5" />
                业绩进度落后时间进度 {timeProgress - completion}%，需要关注
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--text-heading)]">目标 / 实际 / 预测对比</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v))} />
                <Tooltip
                  formatter={(value) => [`¥${fmt(Number(value))}`, '']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}
                  fill="#6366f1"
                  label={{ position: 'top', fontSize: 11, fill: 'var(--text-muted)', formatter: (label) => `¥${fmt(Number(label))}` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Set target */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-3 text-sm font-semibold text-[var(--text-heading)]">设置团队目标</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">¥</span>
              <input
                type="number"
                min={0}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="输入目标金额"
                className="w-44 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
              />
              <button
                onClick={handleSaveTarget}
                disabled={saving || !targetInput}
                className="rounded-[7px] bg-[var(--action-primary)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90 transition"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>

          {/* Breakdown table */}
          {data?.breakdown && data.breakdown.length > 0 && (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-default)] text-sm font-semibold text-[var(--text-heading)]">
                团队成员完成情况
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                    {['姓名', '角色', '实际回款', '个人目标', '完成率'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((u) => (
                    <tr key={u.userId} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--text-heading)]">{u.userName}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">
                        {{ admin: '管理员', director: '总监', manager: '组长', sales: '销售' }[u.role] ?? u.role}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-body)]">¥{fmt(u.actual)}</td>
                      <td className="px-4 py-2.5 text-[var(--text-body)]">
                        {parseFloat(u.target) > 0 ? `¥${fmt(u.target)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                          u.completionRate >= 100 ? 'bg-emerald-100 text-emerald-700' :
                          u.completionRate >= 70 ? 'bg-amber-100 text-amber-700' :
                          parseFloat(u.target) === 0 ? 'bg-gray-100 text-gray-500' :
                          'bg-rose-100 text-rose-700',
                        )}>
                          {parseFloat(u.target) === 0 ? '未设目标' : `${u.completionRate}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Source Tab ─────────────────────────────────────────────────────────────

const SOURCE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

function SourceTab() {
  const [query, setQuery] = useState<SourceQuery>({});
  const [trendMonths, setTrendMonths] = useState(6);
  const user = useAuthStore((s) => s.user);
  const canExport = user?.role === 'admin' || user?.role === 'director' || user?.role === 'manager';

  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'source', query],
    queryFn: () => getSource(query),
  });

  const { data: funnelData = [] } = useQuery({
    queryKey: ['reports', 'source-funnel', query],
    queryFn: () => getSourceFunnel(query),
  });

  const { data: attrData = [] } = useQuery({
    queryKey: ['reports', 'attribution'],
    queryFn: getAttributionComparison,
    staleTime: 5 * 60_000,
  });

  const { data: trendData } = useQuery({
    queryKey: ['reports', 'source-trend', trendMonths],
    queryFn: () => getSourceTrend(trendMonths),
  });

  const totalLeads = data.reduce((s, r) => s + r.leadCount, 0);
  const totalCustomers = data.reduce((s, r) => s + r.customerCount, 0);

  const barData = data.map((r) => ({
    name: r.source,
    线索: r.leadCount,
    转化: r.convertedCount,
    客户: r.customerCount,
  }));

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-muted)]">线索创建时间</span>
        <input
          type="date"
          value={query.startDate ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, startDate: e.target.value || undefined }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        />
        <span className="text-sm text-[var(--text-muted)]">至</span>
        <input
          type="date"
          value={query.endDate ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, endDate: e.target.value || undefined }))}
          className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        />
        {(query.startDate || query.endDate) && (
          <button
            onClick={() => setQuery({})}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-body)]"
          >
            清除
          </button>
        )}
        {canExport && data.length > 0 && (
          <button
            onClick={() => {
              const header = ['来源渠道', '线索数', '已转化', '客户数', '转化率'];
              const rows = data.map((r) => [r.source, String(r.leadCount), String(r.convertedCount), String(r.customerCount), `${r.conversionRate}%`]);
              downloadCsv('来源分析.csv', [header, ...rows]);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-[7px] border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <TrendingUp className="h-3.5 w-3.5" />导出 CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-[var(--text-muted)]">加载中…</div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">暂无来源数据</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[
              { label: '线索总数', value: totalLeads, color: 'bg-indigo-50 text-indigo-600' },
              { label: '客户总数', value: totalCustomers, color: 'bg-emerald-50 text-emerald-600' },
              { label: '来源渠道数', value: data.length, color: 'bg-violet-50 text-violet-600' },
            ].map((c) => (
              <div key={c.label} className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <div className="text-sm text-[var(--text-muted)]">{c.label}</div>
                <div className="mt-1.5 text-2xl font-bold text-[var(--text-heading)]">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--text-heading)]">各来源渠道分布</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="线索" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="转化" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="客户" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-heading)]">
              来源明细
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  {['来源渠道', '线索数', '已转化', '客户数', '转化率'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {data.map((row, i) => (
                  <tr key={row.source} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        {row.source}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-body)]">{row.leadCount}</td>
                    <td className="px-4 py-3 text-[var(--text-body)]">{row.convertedCount}</td>
                    <td className="px-4 py-3 text-[var(--text-body)]">{row.customerCount}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                        row.conversionRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                        row.conversionRate >= 20 ? 'bg-amber-100 text-amber-700' :
                        row.leadCount === 0 ? 'bg-gray-100 text-gray-500' :
                        'bg-rose-100 text-rose-700',
                      )}>
                        {row.leadCount === 0 ? '—' : `${row.conversionRate}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Source trend line chart */}
          {trendData && trendData.series.length > 0 && (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--text-heading)]">来源线索趋势</div>
                <select
                  value={trendMonths}
                  onChange={(e) => setTrendMonths(Number(e.target.value))}
                  className="rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-body)]"
                >
                  <option value={3}>近 3 个月</option>
                  <option value={6}>近 6 个月</option>
                  <option value={12}>近 12 个月</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={trendData.monthKeys.map((mk) => ({
                    month: mk,
                    ...Object.fromEntries(
                      trendData.series.map((s) => [s.source, s.data.find((d) => d.month === mk)?.count ?? 0])
                    ),
                  }))}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {trendData.series.map((s, i) => (
                    <Line
                      key={s.source}
                      type="monotone"
                      dataKey={s.source}
                      stroke={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Source conversion funnel table */}
          {funnelData.length > 0 && (
            <div className="overflow-x-auto overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)]">
              <div className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-heading)]">
                来源转化漏斗（线索 → 客户 → 商机 → 赢单）
              </div>
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                    {[
                      '来源渠道',
                      '线索',
                      '客户',
                      '线索→客户',
                      '商机',
                      '客户→商机',
                      '赢单',
                      '商机→赢单',
                      '线索→赢单',
                    ].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] first:pl-4 last:pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {funnelData.map((row, i) => {
                    const leadToWon = row.leadToWonRate;
                    return (
                      <tr key={row.source} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                            {row.source}
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">{row.leadCount}</td>
                        <td className="px-3 py-3 tabular-nums">{row.customerCount}</td>
                        <td className="px-3 py-3">{sourceFunnelPctCell(row.leadToCustomerRate)}</td>
                        <td className="px-3 py-3 tabular-nums">{row.oppCount}</td>
                        <td className="px-3 py-3">{sourceFunnelPctCell(row.customerToOppRate)}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums text-emerald-600">{row.wonCount}</td>
                        <td className="px-3 py-3">{sourceFunnelPctCell(row.oppToWonRate)}</td>
                        <td className="px-4 py-3">
                          {leadToWon === null ? (
                            <span className="text-[var(--text-muted)]">—</span>
                          ) : (
                            <span className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                              leadToWon >= 20 ? 'bg-emerald-100 text-emerald-700'
                                : leadToWon >= 5 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700',
                            )}>
                              {`${leadToWon}%`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Attribution Comparison */}
      {attrData.length > 0 && (
        <div className="mt-6 rounded-[9px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">归因模型对比（已成交客户 · 回款金额）</h3>
          <p className="mb-4 text-xs text-[var(--text-muted)]">首次接触：线索来源渠道；末次接触：成交时客户来源；线性：各渠道平分。</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)]">来源渠道</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">首次接触</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">末次接触</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--text-muted)]">线性归因</th>
                </tr>
              </thead>
              <tbody>
                {attrData.map((row) => (
                  <tr key={row.source} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-muted)]/50">
                    <td className="px-4 py-2.5 font-medium text-[var(--text-heading)]">{row.source}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-body)]">¥{row.firstTouch.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-body)]">¥{row.lastTouch.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-body)]">¥{row.linearTouch.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Efficiency Tab ─────────────────────────────────────────────────────────

function EfficiencyTab() {
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [period, setPeriod] = useState(currentPeriod('month'));
  const user = useAuthStore((s) => s.user);
  const canExport = user?.role === 'admin' || user?.role === 'director' || user?.role === 'manager';

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'efficiency', periodType, period],
    queryFn: () => getEfficiency({ periodType, period }),
  });

  const rows = data?.rows ?? [];

  const ROLE_LABEL: Record<string, string> = { sales: '销售', manager: '主管', admin: '管理员' };

  function handleExport() {
    const header = ['姓名', '角色', '新增线索', '跟进次数', '新建商机', '赢单数', '输单数', '胜率', '赢单金额'];
    const dataRows = rows.map((r) => [
      r.userName, ROLE_LABEL[r.role] ?? r.role,
      String(r.leadCount), String(r.followUpCount), String(r.oppCreated),
      String(r.wonCount), String(r.lostCount),
      `${r.winRate}%`, r.wonAmount,
    ]);
    downloadCsv(`效能报表_${period}.csv`, [header, ...dataRows]);
  }

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-0.5">
          {(['month', 'quarter', 'year'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setPeriodType(t); setPeriod(currentPeriod(t)); }}
              className={cn(
                'rounded-[6px] px-3 py-1 text-xs font-medium transition',
                periodType === t ? 'bg-white shadow-sm text-[var(--text-heading)]' : 'text-[var(--text-muted)]',
              )}
            >
              {t === 'month' ? '月' : t === 'quarter' ? '季度' : '年'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder={periodType === 'month' ? '2026-05' : periodType === 'quarter' ? '2026-Q2' : '2026'}
          className="w-28 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
        />
        {canExport && rows.length > 0 && (
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 rounded-[7px] border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <TrendingUp className="h-3.5 w-3.5" />导出 CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-[var(--text-muted)]">加载中…</div>
      ) : rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">暂无数据</div>
      ) : (
        <>
          {/* Anomaly warnings */}
          {(() => {
            if (rows.length < 2) return null;
            const avgFollow = rows.reduce((s, r) => s + r.followUpCount, 0) / rows.length;
            const laggards = rows.filter((r) => r.role === 'sales' && r.followUpCount < avgFollow * 0.4 && avgFollow >= 3);
            const zeroFollow = rows.filter((r) => r.role === 'sales' && r.followUpCount === 0);
            const msgs: string[] = [];
            if (zeroFollow.length > 0) msgs.push(`⚠️ ${zeroFollow.map((r) => r.userName).join('、')} 本周期内跟进次数为 0，请重点关注`);
            if (laggards.length > 0 && !zeroFollow.find((r) => laggards.includes(r)))
              msgs.push(`⚠️ ${laggards.map((r) => r.userName).join('、')} 跟进次数明显低于团队平均（${Math.round(avgFollow)} 次），建议督促`);
            return msgs.length > 0 ? (
              <div className="space-y-2">
                {msgs.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{msg}</div>
                ))}
              </div>
            ) : null;
          })()}

          {/* Bar chart - follow-up activity */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="mb-4 text-sm font-semibold text-[var(--text-heading)]">过程指标对比</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={rows.map((r) => ({ name: r.userName, 线索: r.leadCount, 跟进: r.followUpCount, 商机: r.oppCreated }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="线索" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="跟进" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="商机" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-heading)]">
              销售员效能明细
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  {['姓名', '角色', '新增线索', '跟进次数', '创建商机', '赢单', '输单', '赢单率', '赢单金额'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{r.userName}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{ROLE_LABEL[r.role] ?? r.role}</td>
                    <td className="px-4 py-3">{r.leadCount}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'font-semibold',
                        r.followUpCount === 0 ? 'text-rose-500' : r.followUpCount >= 10 ? 'text-emerald-600' : 'text-[var(--text-body)]',
                      )}>{r.followUpCount}</span>
                    </td>
                    <td className="px-4 py-3">{r.oppCreated}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{r.wonCount}</td>
                    <td className="px-4 py-3 text-rose-500">{r.lostCount}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                        r.winRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                        r.winRate >= 25 ? 'bg-amber-100 text-amber-700' :
                        r.wonCount + r.lostCount === 0 ? 'bg-gray-100 text-gray-500' :
                        'bg-rose-100 text-rose-700',
                      )}>
                        {r.wonCount + r.lostCount === 0 ? '—' : `${r.winRate}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-body)]">¥{fmt(r.wonAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Team Activity Tab ──────────────────────────────────────────────────────

function TeamActivityTab() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: getTeamMembers,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['team-activity', page, userId, dateFrom, dateTo],
    queryFn: () => getTeamActivity({ page, limit: 20, userId: userId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    staleTime: 30 * 1000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {members.length > 0 && (
          <select
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            className="h-8 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-body)]"
          >
            <option value="">全部成员</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-8 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-body)]"
        />
        <span className="flex items-center text-sm text-[var(--text-muted)]">至</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-8 rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-body)]"
        />
        {(userId || dateFrom || dateTo) && (
          <button
            onClick={() => { setUserId(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="h-8 rounded-[7px] border border-[var(--border-default)] px-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-body)]"
          >
            清除
          </button>
        )}
        {data != null && (
          <span className="flex items-center text-sm text-[var(--text-muted)]">共 {total} 条记录</span>
        )}
      </div>

      {/* Activity feed */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无跟进记录</div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="divide-y divide-[var(--border-default)]">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 px-5 py-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-muted)]">
                  {item.owner?.name?.slice(0, 1) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium text-sm text-[var(--text-heading)]">{item.owner?.name ?? '未知'}</span>
                    <span className="text-xs text-[var(--text-muted)]">跟进了</span>
                    <span className="text-sm font-medium text-[var(--text-body)]">{item.customer?.name ?? '—'}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      {new Date(item.followUpTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {item.content && (
                    <p className="mt-1 text-sm text-[var(--text-body)] line-clamp-2">{item.content}</p>
                  )}
                  {item.nextFollowUpTime && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      下次跟进：{new Date(item.nextFollowUpTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-[7px] border border-[var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
          >上一页</button>
          <span className="text-sm text-[var(--text-muted)]">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-[7px] border border-[var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
          >下一页</button>
        </div>
      )}
    </div>
  );
}

// ── Custom Reports Tab ─────────────────────────────────────────────────────

const DIM_LABEL: Record<string, string> = {
  industry: '行业', region: '地区', companySize: '规模', level: '客户级别', status: '状态',
  sourceCategory: '来源大类', stage: '阶段', count: '数量', total_amount: '总金额',
};

function CustomReportsTab() {
  const { data: reports = [], isLoading } = useQuery<CustomReport[]>({
    queryKey: ['custom-reports'],
    queryFn: listCustomReports,
    staleTime: 60_000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  const { data: result, isLoading: running, refetch } = useQuery<CustomReportResult>({
    queryKey: ['custom-report-run', selectedId],
    queryFn: () => runCustomReport(selectedId!),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  if (isLoading) return <div className="py-16 text-center text-sm text-[var(--text-muted)]">加载中...</div>;

  if (reports.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">管理员尚未配置自定义报表。</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">前往「系统设置 → 自定义报表」进行配置。</p>
      </div>
    );
  }

  const columns = result ? [...(result.dimensions ?? []), ...(result.metrics ?? [])] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={cn(
              'rounded-[8px] border px-4 py-2 text-sm font-medium transition',
              selectedId === r.id
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border-default)] bg-white text-[var(--text-body)] hover:border-[var(--primary)]',
            )}
          >
            {r.name}
          </button>
        ))}
      </div>

      {selectedReport && (
        <div className="rounded-[9px] border border-[var(--border-default)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
            <div>
              <h3 className="font-semibold text-[var(--text-heading)]">{selectedReport.name}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                维度：{selectedReport.dimensions.map((d) => DIM_LABEL[d] ?? d).join('、')} ｜ 指标：{selectedReport.metrics.map((m) => m.label ?? m.field).join('、')}
              </p>
            </div>
            <button onClick={() => refetch()} className="rounded border border-[var(--border-default)] px-3 py-1.5 text-xs hover:bg-[var(--bg-muted)]">刷新</button>
          </div>
          {running ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">查询中...</div>
          ) : !result || result.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">暂无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)]">
                        {DIM_LABEL[col] ?? col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-muted)]/50">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2.5 text-[var(--text-body)]">
                          {row[col] != null ? String(row[col]) : <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('funnel');
  usePageHeader('数据报表');

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 flex justify-end border-b border-[var(--border-default)] bg-[var(--bg-app)]/95 px-6 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-app)]/85">
        <TabBar active={tab} onChange={setTab} />
      </div>
      <div className="mt-4 space-y-4">
        {tab === 'funnel' && <FunnelTab />}
        {tab === 'performance' && <PerformanceTab />}
        {tab === 'source' && <SourceTab />}
        {tab === 'efficiency' && <EfficiencyTab />}
        {tab === 'team_activity' && <TeamActivityTab />}
        {tab === 'custom' && <CustomReportsTab />}
      </div>
    </div>
  );
}
