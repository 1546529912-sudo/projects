<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { omsApi } from '@/apis';
import * as echarts from 'echarts';

interface TimeSeriesItem { date: string; order_count: number; revenue_cents: number; revenue_yuan: string; }
interface TopSku { sku_code: string; qty: number; revenue_yuan: string; }
interface RefundItem { date: string; refund_cents: number; paid_cents: number; refund_rate_pct: number; }
// iter-21 新增
interface CouponMetrics { total_claimed: number; total_used: number; overall_use_rate_pct: number; }
interface CouponSeriesItem { date: string; claimed: number; used: number; use_rate_pct: number; }
interface ReviewMetrics { total_reviews: number; avg_rating: number; recent_reviews: number; recent_avg_rating: number; }
interface ReviewSeriesItem { date: string; review_count: number; avg_rating: number; }
interface RetentionMetrics { total_users: number; total_buyers: number; repeat_buyers: number; buyer_rate_pct: number; repeat_rate_pct: number; }

interface Stats {
  total_orders: number;
  total_revenue_yuan: string;
  by_status: Array<{ status: string; cnt: number }>;
  sku_count: number;
  total_locked: number;
  days: number;
  time_series: TimeSeriesItem[];
  top_skus: TopSku[];
  refund_series: RefundItem[];
  // iter-21
  coupon_metrics: CouponMetrics;
  coupon_series: CouponSeriesItem[];
  review_metrics: ReviewMetrics;
  review_series: ReviewSeriesItem[];
  retention_metrics: RetentionMetrics;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);
const error = ref('');
const days = ref(7);

const orderChartEl = ref<HTMLDivElement | null>(null);
const revenueChartEl = ref<HTMLDivElement | null>(null);
const topSkuChartEl = ref<HTMLDivElement | null>(null);
const refundRateChartEl = ref<HTMLDivElement | null>(null);
// iter-21
const couponChartEl = ref<HTMLDivElement | null>(null);
const reviewChartEl = ref<HTMLDivElement | null>(null);

let orderChart: echarts.ECharts | null = null;
let revenueChart: echarts.ECharts | null = null;
let topSkuChart: echarts.ECharts | null = null;
let refundRateChart: echarts.ECharts | null = null;
let couponChart: echarts.ECharts | null = null;
let reviewChart: echarts.ECharts | null = null;

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res: any = await omsApi.stats({ days: days.value });
    stats.value = res.data;
    await nextTick();
    renderCharts();
  } catch (e: any) {
    error.value = e?.msg || 'OMS 不可达';
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  if (!stats.value) return;

  // 1. 日订单数 折线图
  if (orderChartEl.value) {
    orderChart = orderChart || echarts.init(orderChartEl.value);
    orderChart.setOption({
      title: { text: '每日订单数', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.time_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value' },
      series: [{
        name: '订单数', type: 'line', smooth: true,
        data: stats.value.time_series.map(d => d.order_count),
        itemStyle: { color: '#FF385C' },
        areaStyle: { color: 'rgba(255,56,92,0.1)' },
      }],
    });
  }

  // 2. 日销售额 柱状图
  if (revenueChartEl.value) {
    revenueChart = revenueChart || echarts.init(revenueChartEl.value);
    revenueChart.setOption({
      title: { text: '每日销售额（元）', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>销售额：¥${(p.data as number).toFixed(2)}`;
      }},
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.time_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value' },
      series: [{
        name: '销售额', type: 'bar',
        data: stats.value.time_series.map(d => d.revenue_cents / 100),
        itemStyle: { color: '#36A2EB' },
      }],
    });
  }

  // 3. TOP 10 SKU 横条
  if (topSkuChartEl.value) {
    topSkuChart = topSkuChart || echarts.init(topSkuChartEl.value);
    const sorted = [...stats.value.top_skus].reverse(); // ECharts y 轴自下而上
    topSkuChart.setOption({
      title: { text: 'TOP 10 SKU 销量', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 100, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: sorted.map(s => s.sku_code) },
      series: [{
        name: '销量', type: 'bar',
        data: sorted.map(s => s.qty),
        itemStyle: { color: '#FFCE56' },
        label: { show: true, position: 'right' },
      }],
    });
  }

  // 4. 日退款率 折线图
  if (refundRateChartEl.value) {
    refundRateChart = refundRateChart || echarts.init(refundRateChartEl.value);
    refundRateChart.setOption({
      title: { text: '每日退款率 (%)', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>退款率：${p.data}%`;
      }},
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.refund_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [{
        name: '退款率', type: 'line', smooth: true,
        data: stats.value.refund_series.map(d => d.refund_rate_pct),
        itemStyle: { color: '#9966FF' },
      }],
    });
  }

  // iter-21 · 5. 优惠券核销率（双 Y 轴：左=数量、右=核销率%）
  if (couponChartEl.value && stats.value.coupon_series) {
    couponChart = couponChart || echarts.init(couponChartEl.value);
    couponChart.setOption({
      title: { text: '优惠券领取 / 核销 / 核销率', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['领取', '核销', '核销率'], top: 25, textStyle: { fontSize: 11 } },
      grid: { left: 40, right: 60, top: 70, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.coupon_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: [
        { type: 'value', name: '数量', position: 'left' },
        { type: 'value', name: '核销率%', position: 'right', max: 100, axisLabel: { formatter: '{value}%' } },
      ],
      series: [
        { name: '领取', type: 'bar', data: stats.value.coupon_series.map(d => d.claimed), itemStyle: { color: '#36A2EB' } },
        { name: '核销', type: 'bar', data: stats.value.coupon_series.map(d => d.used), itemStyle: { color: '#FF385C' } },
        { name: '核销率', type: 'line', yAxisIndex: 1, smooth: true, data: stats.value.coupon_series.map(d => d.use_rate_pct), itemStyle: { color: '#FFCE56' } },
      ],
    });
  }

  // iter-21 · 6. 评价数据趋势（数量 + 当日均分）
  if (reviewChartEl.value && stats.value.review_series) {
    reviewChart = reviewChart || echarts.init(reviewChartEl.value);
    reviewChart.setOption({
      title: { text: '评价数量 / 当日平均分', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['评价数', '当日均分'], top: 25, textStyle: { fontSize: 11 } },
      grid: { left: 40, right: 60, top: 70, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.review_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: [
        { type: 'value', name: '评价数', position: 'left' },
        { type: 'value', name: '均分', position: 'right', min: 0, max: 5 },
      ],
      series: [
        { name: '评价数', type: 'bar', data: stats.value.review_series.map(d => d.review_count), itemStyle: { color: '#36A2EB' } },
        { name: '当日均分', type: 'line', yAxisIndex: 1, smooth: true, data: stats.value.review_series.map(d => d.avg_rating), itemStyle: { color: '#FFB400' } },
      ],
    });
  }
}

function handleResize() {
  orderChart?.resize();
  revenueChart?.resize();
  topSkuChart?.resize();
  refundRateChart?.resize();
  couponChart?.resize();
  reviewChart?.resize();
}

const statusList = computed(() => stats.value?.by_status || []);

const STATUS_LABELS: Record<string, string> = {
  pending_pay: '待支付',
  paid: '已支付',
  picking: '拣货中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  exception: '异常',
};

watch(days, () => load());

onMounted(() => {
  window.addEventListener('resize', handleResize);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  orderChart?.dispose();
  revenueChart?.dispose();
  topSkuChart?.dispose();
  refundRateChart?.dispose();
  couponChart?.dispose();
  reviewChart?.dispose();
});
</script>

<template>
  <div class="dashboard">
    <div class="page-head">
      <div>
        <h2 class="page-title">总览 Dashboard</h2>
        <p class="page-desc">OMS /api/v1/admin/stats · 实时业务指标</p>
      </div>
      <div>
        <el-radio-group v-model="days" size="small">
          <el-radio-button :value="1">今日</el-radio-button>
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
          <el-radio-button :value="90">近 90 天</el-radio-button>
        </el-radio-group>
        <el-button @click="load" :loading="loading" style="margin-left:12px;">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon style="margin-bottom: 16px;" />

    <div v-loading="loading">
      <div v-if="stats" class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">订单总数</div><div class="kpi-value">{{ stats.total_orders }}</div></div>
        <div class="kpi-card"><div class="kpi-label">累计销售额</div><div class="kpi-value">¥{{ stats.total_revenue_yuan }}</div></div>
        <div class="kpi-card"><div class="kpi-label">SKU 数</div><div class="kpi-value">{{ stats.sku_count }}</div></div>
        <div class="kpi-card"><div class="kpi-label">已锁库存</div><div class="kpi-value">{{ stats.total_locked }}</div></div>
      </div>

      <!-- iter-21 营销 + UGC + 用户 KPI -->
      <div v-if="stats" class="kpi-grid">
        <div class="kpi-card kpi-marketing">
          <div class="kpi-label">优惠券核销率</div>
          <div class="kpi-value">{{ stats.coupon_metrics.overall_use_rate_pct }}%</div>
          <div class="kpi-sub">领 {{ stats.coupon_metrics.total_claimed }} · 用 {{ stats.coupon_metrics.total_used }}</div>
        </div>
        <div class="kpi-card kpi-ugc">
          <div class="kpi-label">评价数 / 均分</div>
          <div class="kpi-value">{{ stats.review_metrics.total_reviews }} <span class="kpi-secondary">★ {{ stats.review_metrics.avg_rating }}</span></div>
          <div class="kpi-sub">近 {{ stats.days }} 天 {{ stats.review_metrics.recent_reviews }} 条 · ★ {{ stats.review_metrics.recent_avg_rating }}</div>
        </div>
        <div class="kpi-card kpi-user">
          <div class="kpi-label">下单转化率</div>
          <div class="kpi-value">{{ stats.retention_metrics.buyer_rate_pct }}%</div>
          <div class="kpi-sub">{{ stats.retention_metrics.total_buyers }} / {{ stats.retention_metrics.total_users }} 用户</div>
        </div>
        <div class="kpi-card kpi-user">
          <div class="kpi-label">复购率</div>
          <div class="kpi-value">{{ stats.retention_metrics.repeat_rate_pct }}%</div>
          <div class="kpi-sub">{{ stats.retention_metrics.repeat_buyers }} / {{ stats.retention_metrics.total_buyers }} 买家 ≥2 单</div>
        </div>
      </div>

      <!-- iter-28 财务 KPI -->
      <div v-if="stats && (stats as any).finance_metrics" class="kpi-grid">
        <div class="kpi-card kpi-finance">
          <div class="kpi-label">营收（结算单口径）</div>
          <div class="kpi-value">¥{{ (stats as any).finance_metrics.total_revenue_yuan }}</div>
          <div class="kpi-sub">订单完成后落账</div>
        </div>
        <div class="kpi-card kpi-finance-neg">
          <div class="kpi-label">退款</div>
          <div class="kpi-value">¥{{ (stats as any).finance_metrics.total_refund_yuan }}</div>
          <div class="kpi-sub">退款完成后落账</div>
        </div>
        <div class="kpi-card kpi-finance">
          <div class="kpi-label">净金额</div>
          <div class="kpi-value">¥{{ (stats as any).finance_metrics.net_yuan }}</div>
          <div class="kpi-sub">营收 - 退款</div>
        </div>
        <div class="kpi-card kpi-marketing">
          <div class="kpi-label">多券订单占比</div>
          <div class="kpi-value">{{ (stats as any).coupon_usage_metrics.multi_coupon_rate_pct }}%</div>
          <div class="kpi-sub">{{ (stats as any).coupon_usage_metrics.orders_with_multi_coupon }} / {{ (stats as any).coupon_usage_metrics.orders_with_coupon }} 用券订单</div>
        </div>
      </div>

      <div v-if="statusList.length" class="status-bar">
        <span v-for="s in statusList" :key="s.status" class="status-chip">
          {{ STATUS_LABELS[s.status] || s.status }}: <b>{{ s.cnt }}</b>
        </span>
      </div>

      <div class="charts-grid">
        <div ref="orderChartEl" class="chart-box"></div>
        <div ref="revenueChartEl" class="chart-box"></div>
        <div ref="topSkuChartEl" class="chart-box"></div>
        <div ref="refundRateChartEl" class="chart-box"></div>
        <div ref="couponChartEl" class="chart-box"></div>
        <div ref="reviewChartEl" class="chart-box"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.kpi-card { background: #FFFFFF; border-radius: 8px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.kpi-label { color: #717171; font-size: 13px; margin-bottom: 8px; }
.kpi-value { font-size: 28px; font-weight: 600; color: #222; }
.kpi-secondary { color: #FFB400; font-size: 18px; margin-left: 6px; }
.kpi-sub { color: #999; font-size: 12px; margin-top: 6px; }
.kpi-marketing { border-left: 3px solid #FF385C; }
.kpi-finance { border-left: 3px solid #67C23A; }
.kpi-finance-neg { border-left: 3px solid #E6A23C; }
.kpi-ugc { border-left: 3px solid #FFB400; }
.kpi-user { border-left: 3px solid #36A2EB; }

.status-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px; background: #FFFFFF; border-radius: 8px; }
.status-chip { color: #717171; font-size: 13px; }
.status-chip b { color: #FF385C; }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-box { background: #FFFFFF; border-radius: 8px; padding: 16px; height: 360px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
</style>
