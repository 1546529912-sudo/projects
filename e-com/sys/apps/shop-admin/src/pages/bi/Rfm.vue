<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { omsApi } from '@/apis';
import * as echarts from 'echarts';
import { ElMessage, ElMessageBox } from 'element-plus';

const days = ref(90);
const segmentFilter = ref('');
const page = ref(1);
const size = ref(20);
const loading = ref(false);

const data = ref<any>({ kpi: {}, segments: {}, users: [], total: 0, as_of: '' });

const pieEl = ref<HTMLDivElement>();
const scatterEl = ref<HTMLDivElement>();
let pieChart: echarts.ECharts | null = null;
let scatterChart: echarts.ECharts | null = null;

const SEGMENT_COLORS: Record<string, string> = {
  重要价值: '#FF385C',
  重要保持: '#F56C6C',
  不能失去: '#E6A23C',
  重要发展: '#67C23A',
  新客户: '#409EFF',
  流失风险: '#909399',
  休眠: '#C0C4CC',
  流失: '#606266',
  一般客户: '#DCDFE6',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.rfmAnalysis({
      days: days.value,
      segment: segmentFilter.value || undefined,
      page: page.value,
      size: size.value,
    });
    data.value = res?.data || { kpi: {}, segments: {}, users: [], total: 0 };
    await nextTick();
    renderCharts();
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  // 1. 分群饼图
  if (pieEl.value) {
    pieChart = pieChart || echarts.init(pieEl.value);
    const segs = data.value.segments || {};
    const pieData = Object.entries(segs).map(([name, value]) => ({
      name, value, itemStyle: { color: SEGMENT_COLORS[name] || '#909399' },
    }));
    pieChart.setOption({
      title: { text: '用户分群分布', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 30, textStyle: { fontSize: 12 } },
      series: [{
        name: '分群', type: 'pie',
        radius: ['40%', '70%'], center: ['38%', '55%'],
        avoidLabelOverlap: false,
        label: { show: false }, labelLine: { show: false },
        data: pieData,
      }],
    });
  }

  // 2. R-F 散点（M 用气泡大小）
  if (scatterEl.value) {
    scatterChart = scatterChart || echarts.init(scatterEl.value);
    // 全量画散点（不仅当前页）— 但我们只有当前页数据，所以这里画用户列表
    const points = (data.value.users || []).map((u: any) => ({
      value: [u.r_days, u.f, u.m_yuan],
      name: `用户 ${u.user_id}`,
      itemStyle: { color: SEGMENT_COLORS[u.segment] || '#909399' },
    }));
    const maxM = Math.max(...points.map((p: any) => p.value[2]), 1);
    scatterChart.setOption({
      title: { text: '用户 R-F 散点（气泡 = 金额）', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}<br/>距今 ${p.value[0]} 天<br/>${p.value[1]} 单<br/>¥${p.value[2]}`,
      },
      grid: { left: 50, right: 20, top: 50, bottom: 40 },
      xAxis: { name: '最近购买（天）', type: 'value', nameLocation: 'middle', nameGap: 26, inverse: true },
      yAxis: { name: '订单数', type: 'value', nameLocation: 'middle', nameGap: 30 },
      series: [{
        type: 'scatter',
        data: points,
        symbolSize: (val: number[]) => 8 + Math.sqrt(val[2] / maxM) * 40,
      }],
    });
  }
}

async function batchGrantCoupon() {
  if (!segmentFilter.value) { ElMessage.warning('请先点选一个分群'); return; }
  let couponId = 0;
  try {
    const { value } = await ElMessageBox.prompt(`给"${segmentFilter.value}"分群（共 ${data.value.users?.length || 0} 个用户）发券，请填 coupon_id`, '🎁 一键发券', {
      inputValidator: v => /^\d+$/.test(v) || '请输入数字 coupon_id',
    });
    couponId = parseInt(value);
  } catch { return; }
  try {
    const res: any = await omsApi.rfmGrantCoupon({ segment: segmentFilter.value, coupon_id: couponId, days: days.value });
    ElMessage.success(`目标 ${res?.data?.target_count} 人 / 实际发出 ${res?.data?.granted} 张`);
  } catch (e: any) { ElMessage.error(e?.msg || '失败'); }
}

function onSegmentClick(seg: string) {
  segmentFilter.value = segmentFilter.value === seg ? '' : seg;
  page.value = 1;
  load();
}

function fmtSeg(seg: string) {
  return seg;
}

const segmentEntries = computed(() => Object.entries(data.value.segments || {}) as Array<[string, number]>);

onMounted(load);
onBeforeUnmount(() => { pieChart?.dispose(); scatterChart?.dispose(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">用户 RFM 分层</h2>
        <p class="page-desc">BI-01 · 按 R 最近购买 / F 订单频次 / M 累计消费 三维五分位 → 8 分群 · iter-46</p>
      </div>
      <div class="filters">
        <el-select v-model="days" style="width: 140px" @change="page = 1; load()">
          <el-option :value="30" label="最近 30 天" />
          <el-option :value="90" label="最近 90 天" />
          <el-option :value="180" label="最近 180 天" />
          <el-option :value="365" label="最近 365 天" />
        </el-select>
        <el-button @click="load" :loading="loading">刷新</el-button>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">总用户</div>
        <div class="kpi-num">{{ data.kpi.total_users || 0 }}</div>
      </div>
      <div class="kpi-card good">
        <div class="kpi-label">活跃用户（R 近 14 天）</div>
        <div class="kpi-num">{{ data.kpi.active_users || 0 }}</div>
      </div>
      <div class="kpi-card hot">
        <div class="kpi-label">高价值（重要价值/保持/不能失去）</div>
        <div class="kpi-num">{{ data.kpi.high_value_users || 0 }}</div>
      </div>
      <div class="kpi-card cold">
        <div class="kpi-label">流失/休眠</div>
        <div class="kpi-num">{{ data.kpi.lost_users || 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总营收（元）</div>
        <div class="kpi-num">¥{{ data.kpi.total_revenue_yuan || 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">人均订单数</div>
        <div class="kpi-num">{{ data.kpi.avg_orders_per_user || 0 }}</div>
      </div>
    </div>

    <!-- 分群快捷过滤 -->
    <el-card class="segment-bar" shadow="never">
      <span style="margin-right: 12px; color: #717171;">点击分群筛选用户表：</span>
      <el-tag
        v-for="[seg, cnt] in segmentEntries"
        :key="seg"
        :type="segmentFilter === seg ? 'danger' : 'info'"
        :effect="segmentFilter === seg ? 'dark' : 'plain'"
        style="margin-right: 8px; cursor: pointer;"
        @click="onSegmentClick(seg)"
      >
        {{ fmtSeg(seg) }} · {{ cnt }}
      </el-tag>
      <el-button v-if="segmentFilter" size="small" text type="primary" @click="segmentFilter = ''; page = 1; load()">清除过滤</el-button>
      <el-button v-if="segmentFilter" size="small" type="success" @click="batchGrantCoupon">🎁 一键给该分群发券</el-button>
    </el-card>

    <!-- 图表 -->
    <div class="chart-row">
      <el-card class="chart-card" shadow="never"><div ref="pieEl" style="height: 320px;" /></el-card>
      <el-card class="chart-card" shadow="never"><div ref="scatterEl" style="height: 320px;" /></el-card>
    </div>

    <!-- 用户表 -->
    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <h3 style="margin: 0;">用户明细 <span style="color: #999; font-size: 13px;">（{{ data.total }} 条 · 当前 {{ segmentFilter || '全部' }}）</span></h3>
      </div>
      <el-table :data="data.users" v-loading="loading" stripe border>
        <el-table-column prop="user_id" label="用户 ID" width="100" />
        <el-table-column prop="r_days" label="距今天数（R）" width="130">
          <template #default="{ row }">{{ row.r_days }} 天</template>
        </el-table-column>
        <el-table-column prop="f" label="订单数（F）" width="110" />
        <el-table-column label="累计消费（M）" width="140">
          <template #default="{ row }"><span class="price">¥{{ row.m_yuan }}</span></template>
        </el-table-column>
        <el-table-column label="R/F/M 分" width="120">
          <template #default="{ row }">
            <span class="score r">{{ row.r_score }}</span>
            /
            <span class="score f">{{ row.f_score }}</span>
            /
            <span class="score m">{{ row.m_score }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分群" width="140">
          <template #default="{ row }">
            <el-tag :color="SEGMENT_COLORS[row.segment] || '#909399'" effect="dark" size="small" style="color: white; border: none;">
              {{ row.segment }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_paid_at" label="最近购买" />
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
.kpi-card.good { border-left-color: #67C23A; }
.kpi-card.hot { border-left-color: #FF385C; }
.kpi-card.cold { border-left-color: #909399; }
.kpi-label { color: #717171; font-size: 12px; }
.kpi-num { font-size: 22px; font-weight: 700; color: #222; margin-top: 4px; }
.segment-bar { margin-bottom: 16px; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.chart-card { background: #FFF; }
.score { display: inline-block; width: 22px; text-align: center; font-weight: 600; }
.score.r { color: #FF385C; }
.score.f { color: #409EFF; }
.score.m { color: #E6A23C; }
.price { color: #FF385C; font-weight: 600; }
</style>
