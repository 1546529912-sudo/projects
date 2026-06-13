<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { omsApi } from '@/apis';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';

const days = ref(30);
const loading = ref(false);
const data = ref<any>({ stages: [], overall_conversion: 0, kpi: {}, days: 30, as_of: '' });

const funnelEl = ref<HTMLDivElement>();
const convBarEl = ref<HTMLDivElement>();
let funnelChart: echarts.ECharts | null = null;
let convBarChart: echarts.ECharts | null = null;

const STAGE_COLORS = ['#409EFF', '#67C23A', '#FF385C', '#E6A23C', '#909399'];

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.funnelAnalysis({ days: days.value });
    data.value = res?.data || { stages: [], overall_conversion: 0, kpi: {} };
    await nextTick();
    renderCharts();
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  const stages = data.value.stages || [];
  if (!stages.length) return;

  // 1. ECharts 漏斗图
  if (funnelEl.value) {
    funnelChart = funnelChart || echarts.init(funnelEl.value);
    funnelChart.setOption({
      title: { text: '5 阶段转化漏斗', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>用户数: ${p.value}<br/>累计转化: ${stages[p.dataIndex].conv_from_start}%` },
      series: [{
        type: 'funnel',
        left: '10%', right: '10%', top: 50, bottom: 30,
        min: 0,
        sort: 'descending',
        gap: 4,
        label: { show: true, position: 'inside', formatter: '{b}\n{c} 人' },
        labelLine: { show: false },
        itemStyle: { borderColor: '#FFF', borderWidth: 2 },
        data: stages.map((s: any, i: number) => ({ name: s.name, value: s.users, itemStyle: { color: STAGE_COLORS[i] } })),
      }],
    });
  }

  // 2. 阶段间转化率柱图
  if (convBarEl.value) {
    convBarChart = convBarChart || echarts.init(convBarEl.value);
    const transitions = [];
    for (let i = 1; i < stages.length; i++) {
      transitions.push({
        name: `${stages[i - 1].name}→${stages[i].name}`,
        rate: stages[i].conv_from_prev ?? 0,
        color: STAGE_COLORS[i],
      });
    }
    convBarChart.setOption({
      title: { text: '阶段间转化率（%）', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}: ${p[0].value}%` },
      grid: { left: 50, right: 20, top: 50, bottom: 70 },
      xAxis: { type: 'category', data: transitions.map(t => t.name), axisLabel: { rotate: 30, interval: 0 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: transitions.map(t => ({ value: t.rate, itemStyle: { color: t.color } })),
        label: { show: true, position: 'top', formatter: '{c}%' },
      }],
    });
  }
}

onMounted(load);
onBeforeUnmount(() => { funnelChart?.dispose(); convBarChart?.dispose(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">订单漏斗</h2>
        <p class="page-desc">BI-02 · 加购→下单→支付→收货→评价 5 阶段转化 · iter-47</p>
      </div>
      <div class="filters">
        <el-select v-model="days" style="width: 140px" @change="load">
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
      <div class="kpi-card">
        <div class="kpi-label">加购用户</div>
        <div class="kpi-num">{{ data.kpi.cart_users || 0 }}</div>
      </div>
      <div class="kpi-card hot">
        <div class="kpi-label">支付用户</div>
        <div class="kpi-num">{{ data.kpi.paying_users || 0 }}</div>
      </div>
      <div class="kpi-card good">
        <div class="kpi-label">评价用户</div>
        <div class="kpi-num">{{ data.kpi.review_users || 0 }}</div>
      </div>
      <div class="kpi-card cold">
        <div class="kpi-label">整体转化率（加购→评价）</div>
        <div class="kpi-num">{{ data.overall_conversion || 0 }}%</div>
      </div>
      <div class="kpi-card warn">
        <div class="kpi-label">最大流失环节</div>
        <div class="kpi-num small">{{ data.kpi.biggest_drop_stage || '—' }}</div>
      </div>
    </div>

    <div class="chart-row">
      <el-card class="chart-card" shadow="never"><div ref="funnelEl" style="height: 360px;" /></el-card>
      <el-card class="chart-card" shadow="never"><div ref="convBarEl" style="height: 360px;" /></el-card>
    </div>

    <el-card shadow="never">
      <h3 style="margin: 0 0 12px;">阶段明细</h3>
      <el-table :data="data.stages" v-loading="loading" stripe border>
        <el-table-column label="#" width="60">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="name" label="阶段" width="120" />
        <el-table-column prop="users" label="独立用户" width="120" />
        <el-table-column label="上一阶段→本阶段" width="180">
          <template #default="{ row, $index }">
            <span v-if="$index === 0" style="color: #999;">—</span>
            <span v-else>
              {{ row.conv_from_prev }}%
              <span v-if="row.conv_from_prev !== null && row.conv_from_prev < 50" class="drop">↓ {{ (100 - row.conv_from_prev).toFixed(1) }}%</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="加购→本阶段（累计）" width="180">
          <template #default="{ row }">{{ row.conv_from_start }}%</template>
        </el-table-column>
      </el-table>
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
.kpi-card.good { border-left-color: #67C23A; }
.kpi-card.hot { border-left-color: #FF385C; }
.kpi-card.cold { border-left-color: #909399; }
.kpi-card.warn { border-left-color: #E6A23C; }
.kpi-label { color: #717171; font-size: 12px; }
.kpi-num { font-size: 22px; font-weight: 700; color: #222; margin-top: 4px; }
.kpi-num.small { font-size: 16px; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.chart-card { background: #FFF; }
.drop { color: #F56C6C; font-size: 12px; margin-left: 6px; }
</style>
