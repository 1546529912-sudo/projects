<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { pimApi } from '@/apis';
import * as echarts from 'echarts';

interface Stats {
  kpi: {
    total_spu: number; published_spu: number; draft_spu: number; offline_spu: number;
    total_sku: number; enabled_sku: number;
    price_change_count: number; low_stock_spu_count: number;
  };
  top_spus: Array<{ spu_id: number; name: string; qty: number; amt: number; revenue_yuan: string }>;
  price_series: Array<{ date: string; count: number }>;
  status_series: Array<{ date: string; published: number; offline: number; draft: number; deleted: number }>;
  low_stock: Array<{ spu_id: number; name: string; avail: number }>;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);
const days = ref(7);

const topSpuChartEl = ref<HTMLDivElement | null>(null);
const priceTrendChartEl = ref<HTMLDivElement | null>(null);
const statusChartEl = ref<HTMLDivElement | null>(null);
let topSpuChart: echarts.ECharts | null = null;
let priceTrendChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;

async function load() {
  loading.value = true;
  try {
    const res: any = await pimApi.adminStats({ days: days.value });
    stats.value = res.data;
    await nextTick();
    renderCharts();
  } finally { loading.value = false; }
}

function renderCharts() {
  if (!stats.value) return;
  if (topSpuChartEl.value) {
    topSpuChart = topSpuChart || echarts.init(topSpuChartEl.value);
    const sorted = [...stats.value.top_spus].reverse();
    topSpuChart.setOption({
      title: { text: 'TOP 10 SPU 销量', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['销量', '销售额（元）'], top: 25, textStyle: { fontSize: 11 } },
      grid: { left: 130, right: 60, top: 60, bottom: 40 },
      xAxis: [
        { type: 'value', name: '销量', position: 'bottom' },
        { type: 'value', name: '销售额', position: 'top' },
      ],
      yAxis: { type: 'category', data: sorted.map(s => s.name || `#${s.spu_id}`) },
      series: [
        { name: '销量', type: 'bar', xAxisIndex: 0, data: sorted.map(s => s.qty),
          itemStyle: { color: '#36A2EB' }, label: { show: true, position: 'right' } },
        { name: '销售额（元）', type: 'bar', xAxisIndex: 1,
          data: sorted.map(s => Number(s.revenue_yuan)),
          itemStyle: { color: '#FFCE56' } },
      ],
    });
  }
  if (priceTrendChartEl.value) {
    priceTrendChart = priceTrendChart || echarts.init(priceTrendChartEl.value);
    priceTrendChart.setOption({
      title: { text: '每日改价次数', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.price_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value' },
      series: [{
        name: '改价', type: 'line', smooth: true,
        data: stats.value.price_series.map(d => d.count),
        itemStyle: { color: '#FF385C' }, areaStyle: { opacity: 0.15 },
        label: { show: true },
      }],
    });
  }
  if (statusChartEl.value) {
    statusChart = statusChart || echarts.init(statusChartEl.value);
    statusChart.setOption({
      title: { text: '上下架曲线（按状态切换日期）', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['上架', '下架', '删除'], top: 25, textStyle: { fontSize: 11 } },
      grid: { left: 40, right: 20, top: 60, bottom: 40 },
      xAxis: { type: 'category', data: stats.value.status_series.map(d => d.date.slice(5)), axisLabel: { rotate: 35 } },
      yAxis: { type: 'value' },
      series: [
        { name: '上架', type: 'bar', stack: 'a', data: stats.value.status_series.map(d => d.published), itemStyle: { color: '#67C23A' } },
        { name: '下架', type: 'bar', stack: 'a', data: stats.value.status_series.map(d => d.offline),   itemStyle: { color: '#E6A23C' } },
        { name: '删除', type: 'bar', stack: 'a', data: stats.value.status_series.map(d => d.deleted),   itemStyle: { color: '#F56C6C' } },
      ],
    });
  }
}

function handleResize() {
  topSpuChart?.resize();
  priceTrendChart?.resize();
  statusChart?.resize();
}

watch(days, () => load());
onMounted(() => { window.addEventListener('resize', handleResize); load(); });
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  topSpuChart?.dispose(); priceTrendChart?.dispose(); statusChart?.dispose();
});
</script>

<template>
  <div class="dashboard">
    <div class="page-head">
      <div>
        <h2 class="page-title">PIM 总览</h2>
        <p class="page-desc">PIM /admin/stats · 商品组合 + 销售热度（跨库 OMS）+ 库存覆盖（跨库 WMS）+ 改价/上下架趋势</p>
      </div>
      <div>
        <el-radio-group v-model="days" size="small">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
        </el-radio-group>
        <el-button @click="load" :loading="loading" style="margin-left:12px;">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <div v-if="stats" class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">SPU 总数</div><div class="kpi-value">{{ stats.kpi.total_spu }}</div></div>
        <div class="kpi-card kpi-ok"><div class="kpi-label">在售 SPU</div><div class="kpi-value">{{ stats.kpi.published_spu }}</div></div>
        <div class="kpi-card"><div class="kpi-label">草稿 / 下架</div><div class="kpi-value">{{ stats.kpi.draft_spu }} / {{ stats.kpi.offline_spu }}</div></div>
        <div class="kpi-card"><div class="kpi-label">SKU 总数 / 启用</div><div class="kpi-value">{{ stats.kpi.total_sku }} / {{ stats.kpi.enabled_sku }}</div></div>
        <div class="kpi-card kpi-warn"><div class="kpi-label">近 {{ days }} 天改价次数</div><div class="kpi-value">{{ stats.kpi.price_change_count }}</div></div>
        <div class="kpi-card kpi-danger"><div class="kpi-label">低库存 SPU（&lt;30 件）</div><div class="kpi-value">{{ stats.kpi.low_stock_spu_count }}</div></div>
      </div>

      <div class="charts-grid">
        <div ref="topSpuChartEl" class="chart-box chart-full"></div>
        <div ref="priceTrendChartEl" class="chart-box"></div>
        <div ref="statusChartEl" class="chart-box"></div>
      </div>

      <div v-if="stats && stats.low_stock?.length" class="low-stock">
        <h3 class="block-title">低库存 SPU 清单（按可用量升序，<= 10 条）</h3>
        <el-table :data="stats.low_stock" stripe border size="small">
          <el-table-column prop="spu_id" label="SPU ID" width="100" />
          <el-table-column prop="name" label="名称" min-width="240" />
          <el-table-column label="可用库存（跨库 WMS）" width="200">
            <template #default="{ row }">
              <el-tag :type="row.avail === 0 ? 'danger' : row.avail < 10 ? 'warning' : 'info'" size="small">
                {{ row.avail }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
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
.kpi-value { font-size: 22px; font-weight: 600; color: #222; }
.kpi-ok { border-left: 3px solid #67C23A; }
.kpi-warn { border-left: 3px solid #E6A23C; }
.kpi-danger { border-left: 3px solid #F56C6C; }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-box { background: #FFFFFF; border-radius: 8px; padding: 16px; height: 360px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.chart-full { grid-column: span 2; }
.low-stock { background: #FFFFFF; border-radius: 8px; padding: 16px; margin-top: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.block-title { margin: 0 0 12px; font-size: 14px; color: #222; }
</style>
