<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { wmsApi } from '@/apis';
import * as echarts from 'echarts';

interface SeriesItem { date: string; count: number; qty: number; }
interface Stats {
  days: number;
  kpi: {
    warehouses: number; locations: number; sku_count: number;
    total_quantity: number; total_locked: number; today_picking_pending: number;
  };
  warehouse_utilization: Array<{ warehouse_code: string; warehouse_name: string; total_locations: number; used_locations: number; util_pct: number; total_qty: number; }>;
  inbound_series: SeriesItem[];
  outbound_series: SeriesItem[];
  picking_efficiency: { completed_count: number; avg_seconds: number; median_seconds: number };
  top_skus: Array<{ sku_code: string; total_qty: number; total_locked: number; available: number }>;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);
const days = ref(7);

const inOutChartEl = ref<HTMLDivElement | null>(null);
const topSkuChartEl = ref<HTMLDivElement | null>(null);
const whUtilChartEl = ref<HTMLDivElement | null>(null);
let inOutChart: echarts.ECharts | null = null;
let topSkuChart: echarts.ECharts | null = null;
let whUtilChart: echarts.ECharts | null = null;

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.wmsStats({ days: days.value });
    stats.value = res.data;
    await nextTick();
    renderCharts();
  } finally { loading.value = false; }
}

function renderCharts() {
  if (!stats.value) return;
  if (inOutChartEl.value) {
    inOutChart = inOutChart || echarts.init(inOutChartEl.value);
    inOutChart.setOption({
      title: { text: '每日入/出库量', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['入库', '出库'], top: 25, textStyle: { fontSize: 11 } },
      grid: { left: 50, right: 20, top: 70, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.inbound_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value' },
      series: [
        { name: '入库', type: 'bar', data: stats.value.inbound_series.map(d => d.qty), itemStyle: { color: '#67C23A' } },
        { name: '出库', type: 'bar', data: stats.value.outbound_series.map(d => d.qty), itemStyle: { color: '#FF385C' } },
      ],
    });
  }
  if (topSkuChartEl.value) {
    topSkuChart = topSkuChart || echarts.init(topSkuChartEl.value);
    const sorted = [...stats.value.top_skus].reverse();
    topSkuChart.setOption({
      title: { text: 'TOP 10 SKU 库存量', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: sorted.map(s => s.sku_code) },
      series: [{
        name: '库存量', type: 'bar',
        data: sorted.map(s => s.total_qty),
        itemStyle: { color: '#36A2EB' },
        label: { show: true, position: 'right' },
      }],
    });
  }
  if (whUtilChartEl.value) {
    whUtilChart = whUtilChart || echarts.init(whUtilChartEl.value);
    whUtilChart.setOption({
      title: { text: '仓库利用率（库位占用 %）', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: (params: any) => {
        const p = params[0];
        const item = stats.value!.warehouse_utilization[p.dataIndex];
        return `${item.warehouse_name}<br/>利用率: ${item.util_pct}%<br/>已用/总: ${item.used_locations}/${item.total_locations}<br/>库存: ${item.total_qty}`;
      }},
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.warehouse_utilization.map(w => w.warehouse_name || w.warehouse_code) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: '利用率', type: 'bar',
        data: stats.value.warehouse_utilization.map(w => w.util_pct),
        itemStyle: { color: '#FFCE56' },
        label: { show: true, position: 'top', formatter: '{c}%' },
      }],
    });
  }
}

function handleResize() {
  inOutChart?.resize();
  topSkuChart?.resize();
  whUtilChart?.resize();
}

watch(days, () => load());
onMounted(() => { window.addEventListener('resize', handleResize); load(); });
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  inOutChart?.dispose(); topSkuChart?.dispose(); whUtilChart?.dispose();
});

const fmtSeconds = (s: number) => {
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${s % 60}秒`;
  return `${(s / 3600).toFixed(1)}小时`;
};
</script>

<template>
  <div class="dashboard">
    <div class="page-head">
      <div>
        <h2 class="page-title">WMS 总览</h2>
        <p class="page-desc">WMS /admin/wms-stats · 仓库利用率 + 入出库趋势 + 拣货效率</p>
      </div>
      <div>
        <el-radio-group v-model="days" size="small">
          <el-radio-button :value="1">今日</el-radio-button>
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
        </el-radio-group>
        <el-button @click="load" :loading="loading" style="margin-left:12px;">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <div v-if="stats" class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">仓库</div><div class="kpi-value">{{ stats.kpi.warehouses }}</div></div>
        <div class="kpi-card"><div class="kpi-label">库位</div><div class="kpi-value">{{ stats.kpi.locations }}</div></div>
        <div class="kpi-card"><div class="kpi-label">SKU 种类</div><div class="kpi-value">{{ stats.kpi.sku_count }}</div></div>
        <div class="kpi-card"><div class="kpi-label">总实物量</div><div class="kpi-value">{{ stats.kpi.total_quantity }}</div></div>
        <div class="kpi-card"><div class="kpi-label">已锁定</div><div class="kpi-value">{{ stats.kpi.total_locked }}</div></div>
        <div class="kpi-card kpi-warn"><div class="kpi-label">待拣货任务</div><div class="kpi-value">{{ stats.kpi.today_picking_pending }}</div></div>
      </div>

      <div v-if="stats" class="efficiency">
        <strong>拣货效率（近 {{ stats.days }} 天）：</strong>
        已完成 {{ stats.picking_efficiency.completed_count }} 单 ·
        平均 {{ fmtSeconds(stats.picking_efficiency.avg_seconds) }} ·
        中位 {{ fmtSeconds(stats.picking_efficiency.median_seconds) }}
      </div>

      <div class="charts-grid">
        <div ref="inOutChartEl" class="chart-box"></div>
        <div ref="whUtilChartEl" class="chart-box"></div>
        <div ref="topSkuChartEl" class="chart-box chart-full"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #FFFFFF; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.kpi-label { color: #717171; font-size: 13px; margin-bottom: 6px; }
.kpi-value { font-size: 24px; font-weight: 600; color: #222; }
.kpi-warn { border-left: 3px solid #FF385C; }
.efficiency { background: #FFFFFF; border-radius: 8px; padding: 16px; margin-bottom: 16px; font-size: 14px; color: #555; }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-box { background: #FFFFFF; border-radius: 8px; padding: 16px; height: 360px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.chart-full { grid-column: span 2; }
</style>
