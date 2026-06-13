<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { pimApi } from '@/apis';
import * as echarts from 'echarts';
import { ElMessage, ElMessageBox } from 'element-plus';

const days = ref(30);
const stageFilter = ref('');
const page = ref(1);
const size = ref(20);
const loading = ref(false);

const data = ref<any>({ kpi: {}, stages: {}, spus: [], total: 0, as_of: '' });

const pieEl = ref<HTMLDivElement>();
const scatterEl = ref<HTMLDivElement>();
let pieChart: echarts.ECharts | null = null;
let scatterChart: echarts.ECharts | null = null;

const STAGE_COLORS: Record<string, string> = {
  新品: '#409EFF',
  热销: '#FF385C',
  一般: '#909399',
  滞销: '#E6A23C',
  淘汰: '#606266',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await pimApi.skuLifecycle({
      days: days.value,
      stage: stageFilter.value || undefined,
      page: page.value,
      size: size.value,
    });
    data.value = res?.data || { kpi: {}, stages: {}, spus: [], total: 0 };
    await nextTick();
    renderCharts();
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  // 1. 阶段分布饼图
  if (pieEl.value) {
    pieChart = pieChart || echarts.init(pieEl.value);
    const segs = data.value.stages || {};
    const pieData = Object.entries(segs).map(([name, value]) => ({
      name, value, itemStyle: { color: STAGE_COLORS[name] || '#909399' },
    }));
    pieChart.setOption({
      title: { text: 'SPU 阶段分布', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 30, textStyle: { fontSize: 12 } },
      series: [{
        name: '阶段', type: 'pie',
        radius: ['40%', '70%'], center: ['38%', '55%'],
        avoidLabelOverlap: false,
        label: { show: false }, labelLine: { show: false },
        data: pieData,
      }],
    });
  }

  // 2. 销量 × 库存 散点图（按阶段颜色）
  if (scatterEl.value) {
    scatterChart = scatterChart || echarts.init(scatterEl.value);
    const points = (data.value.spus || []).map((s: any) => ({
      value: [s.window_sales, s.available_stock, s.published_days, s.name],
      itemStyle: { color: STAGE_COLORS[s.stage] || '#909399' },
    }));
    scatterChart.setOption({
      title: { text: '销量 × 库存 散点（颜色 = 阶段）', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.value[3]}<br/>窗口销量: ${p.value[0]}<br/>在库: ${p.value[1]}<br/>上架: ${p.value[2]} 天`,
      },
      grid: { left: 50, right: 20, top: 50, bottom: 50 },
      xAxis: { name: '窗口销量', type: 'value', nameLocation: 'middle', nameGap: 26 },
      yAxis: { name: '在库数量', type: 'value', nameLocation: 'middle', nameGap: 30 },
      series: [{ type: 'scatter', data: points, symbolSize: 14 }],
    });
  }
}

async function batchOffline() {
  if (stageFilter.value !== '淘汰') { ElMessage.warning('仅"淘汰"阶段支持批量下架'); return; }
  try {
    await ElMessageBox.confirm('确认下架所有"淘汰"阶段的已上架 SPU？此操作不可一键回滚', '⚠️ 批量下架', { type: 'warning' });
  } catch { return; }
  try {
    const res: any = await pimApi.skuLifecycleBatchOffline({ stage: '淘汰', days: days.value });
    ElMessage.success(`已下架 ${res?.data?.offlined_count || 0} 个 SPU`);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '失败'); }
}

function onStageClick(seg: string) {
  stageFilter.value = stageFilter.value === seg ? '' : seg;
  page.value = 1;
  load();
}

const stageEntries = computed(() => Object.entries(data.value.stages || {}) as Array<[string, number]>);

onMounted(load);
onBeforeUnmount(() => { pieChart?.dispose(); scatterChart?.dispose(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">SKU 生命周期</h2>
        <p class="page-desc">BI-03 · SPU 按 上架天数/窗口销量/在库 分 5 阶段（新品/热销/一般/滞销/淘汰）· iter-48</p>
      </div>
      <div class="filters">
        <el-select v-model="days" style="width: 140px" @change="page = 1; load()">
          <el-option :value="7" label="最近 7 天" />
          <el-option :value="30" label="最近 30 天" />
          <el-option :value="90" label="最近 90 天" />
          <el-option :value="180" label="最近 180 天" />
        </el-select>
        <el-button @click="load" :loading="loading">刷新</el-button>
      </div>
    </div>

    <!-- KPI 卡 -->
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-label">总 SPU</div><div class="kpi-num">{{ data.kpi.total_spu || 0 }}</div></div>
      <div class="kpi-card good"><div class="kpi-label">新品（≤30 天）</div><div class="kpi-num">{{ data.kpi.new_count || 0 }}</div></div>
      <div class="kpi-card hot"><div class="kpi-label">热销（销量 ≥10）</div><div class="kpi-num">{{ data.kpi.hot_count || 0 }}</div></div>
      <div class="kpi-card warn"><div class="kpi-label">滞销（积压）</div><div class="kpi-num">{{ data.kpi.stale_count || 0 }}</div></div>
      <div class="kpi-card cold"><div class="kpi-label">淘汰</div><div class="kpi-num">{{ data.kpi.eol_count || 0 }}</div></div>
      <div class="kpi-card"><div class="kpi-label">窗口总销量</div><div class="kpi-num">{{ data.kpi.window_total_sales || 0 }}</div></div>
    </div>

    <!-- 阶段过滤 -->
    <el-card class="segment-bar" shadow="never">
      <span style="margin-right: 12px; color: #717171;">点击阶段筛选 SPU 表：</span>
      <el-tag
        v-for="[seg, cnt] in stageEntries"
        :key="seg"
        :type="stageFilter === seg ? 'danger' : 'info'"
        :effect="stageFilter === seg ? 'dark' : 'plain'"
        style="margin-right: 8px; cursor: pointer;"
        @click="onStageClick(seg)"
      >
        {{ seg }} · {{ cnt }}
      </el-tag>
      <el-button v-if="stageFilter" size="small" text type="primary" @click="stageFilter = ''; page = 1; load()">清除过滤</el-button>
      <el-button v-if="stageFilter === '淘汰'" size="small" type="danger" @click="batchOffline">📦 一键下架"淘汰"阶段</el-button>
    </el-card>

    <!-- 图表 -->
    <div class="chart-row">
      <el-card class="chart-card" shadow="never"><div ref="pieEl" style="height: 320px;" /></el-card>
      <el-card class="chart-card" shadow="never"><div ref="scatterEl" style="height: 320px;" /></el-card>
    </div>

    <!-- 用户表 -->
    <el-card shadow="never">
      <h3 style="margin: 0 0 12px;">SPU 明细 <span style="color: #999; font-size: 13px;">（{{ data.total }} 条 · 当前 {{ stageFilter || '全部' }} · 按销量降序）</span></h3>
      <el-table :data="data.spus" v-loading="loading" stripe border>
        <el-table-column prop="spu_id" label="ID" width="70" />
        <el-table-column prop="code" label="编码" width="130" />
        <el-table-column prop="name" label="商品名" min-width="200" />
        <el-table-column label="阶段" width="90">
          <template #default="{ row }">
            <el-tag :color="STAGE_COLORS[row.stage] || '#909399'" effect="dark" size="small" style="color: white; border: none;">
              {{ row.stage }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="status" width="100" />
        <el-table-column prop="published_days" label="上架天数" width="100">
          <template #default="{ row }">{{ row.published_days }} 天</template>
        </el-table-column>
        <el-table-column prop="window_sales" label="窗口销量" width="110">
          <template #default="{ row }"><span :class="row.window_sales >= 10 ? 'hot' : ''">{{ row.window_sales }}</span></template>
        </el-table-column>
        <el-table-column prop="available_stock" label="在库" width="100" />
      </el-table>
      <el-pagination
        v-if="data.total > size"
        v-model:current-page="page"
        v-model:page-size="size"
        :total="data.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px; justify-content: flex-end;"
        @current-change="load"
        @size-change="load"
      />
    </el-card>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 8px; }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #FFF; border: 1px solid #EEE; border-radius: 8px; padding: 14px 16px; border-left: 4px solid #DDD; }
.kpi-card.good { border-left-color: #409EFF; }
.kpi-card.hot { border-left-color: #FF385C; }
.kpi-card.cold { border-left-color: #606266; }
.kpi-card.warn { border-left-color: #E6A23C; }
.kpi-label { color: #717171; font-size: 12px; }
.kpi-num { font-size: 22px; font-weight: 700; color: #222; margin-top: 4px; }
.segment-bar { margin-bottom: 16px; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.chart-card { background: #FFF; }
.hot { color: #FF385C; font-weight: 600; }
</style>
