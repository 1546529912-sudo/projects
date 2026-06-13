<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const router = useRouter();
const data = ref<any>({ alerts: [], summary: { critical: 0, warn: 0, total_checks: 4 }, as_of: '' });
const loading = ref(false);
const autoRefresh = ref(true);
let timer: any = null;

const LEVEL_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  ok:       { color: '#67C23A', bg: '#F0F9EB', icon: '✅', label: '正常' },
  warn:     { color: '#E6A23C', bg: '#FDF6EC', icon: '⚠️',  label: '预警' },
  critical: { color: '#F56C6C', bg: '#FEF0F0', icon: '🚨', label: '严重' },
};

const ALERT_ICON: Record<string, string> = {
  order_surge: '📈',
  stock_low: '📦',
  refund_rate_spike: '↩️',
  dead_letter_backlog: '💀',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.alertSummary();
    data.value = res?.data || { alerts: [], summary: {} };
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) startTimer(); else stopTimer();
}
function startTimer() { stopTimer(); timer = setInterval(load, 30000); }
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

function go(key: string) {
  if (key === 'dead_letter_backlog') router.push('/oms/dead-letter');
  else if (key === 'stock_low') router.push('/wms/stock-alerts');
  else if (key === 'order_surge') router.push('/oms/orders');
  else if (key === 'refund_rate_spike') router.push('/oms/refunds');
}

const summary = computed(() => data.value.summary || { critical: 0, warn: 0 });

onMounted(() => { load(); startTimer(); });
onBeforeUnmount(stopTimer);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">异常预警</h2>
        <p class="page-desc">BI-04 · 4 类实时预警（订单激增 / 库存掉底 / 退款率突升 / 死信积压）· iter-49</p>
      </div>
      <div class="filters">
        <el-tag v-if="summary.critical > 0" type="danger" effect="dark">🚨 严重 {{ summary.critical }}</el-tag>
        <el-tag v-if="summary.warn > 0" type="warning" effect="dark">⚠️ 预警 {{ summary.warn }}</el-tag>
        <el-tag v-if="!summary.critical && !summary.warn" type="success" effect="plain">✅ 全部正常</el-tag>
        <el-button @click="load" :loading="loading">刷新</el-button>
        <el-switch v-model="autoRefresh" @change="toggleAutoRefresh" active-text="30s 自动刷新" inactive-text="" />
      </div>
    </div>

    <div class="alerts-grid">
      <div
        v-for="a in data.alerts"
        :key="a.key"
        class="alert-card"
        :style="{ background: LEVEL_META[a.level].bg, borderLeft: `4px solid ${LEVEL_META[a.level].color}` }"
        @click="go(a.key)"
      >
        <div class="alert-head">
          <div class="alert-title">
            <span class="emoji">{{ ALERT_ICON[a.key] || '🔍' }}</span>
            <span>{{ a.name }}</span>
          </div>
          <el-tag :type="a.level === 'critical' ? 'danger' : a.level === 'warn' ? 'warning' : 'success'" effect="dark">
            {{ LEVEL_META[a.level].icon }} {{ LEVEL_META[a.level].label }}
          </el-tag>
        </div>
        <div class="alert-body">
          <div class="metric">
            <span class="num">{{ a.current }}</span>
            <span class="lbl" v-if="a.baseline">基线 {{ a.baseline }}<span v-if="a.ratio"> · {{ a.ratio }}x</span></span>
          </div>
          <p class="hint">{{ a.action_hint }}</p>
        </div>
        <div v-if="a.items && a.items.length" class="alert-items">
          <!-- 库存掉底 items -->
          <div v-if="a.key === 'stock_low'" class="items-list">
            <div v-for="it in a.items" :key="it.sku_code" class="item">
              <span>{{ it.sku_code }}</span>
              <span class="bad">{{ it.avail }} / 阈值 {{ it.threshold }}</span>
            </div>
          </div>
          <!-- 死信 items -->
          <div v-else-if="a.key === 'dead_letter_backlog'" class="items-list">
            <div v-for="it in a.items" :key="it.id" class="item">
              <span>#{{ it.id }} {{ it.stream }}</span>
              <span class="bad">retry={{ it.retry_count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="footer-tip">as_of {{ data.as_of }} · 点卡片跳转关联页面查看明细</p>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 12px; align-items: center; }
.alerts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.alert-card { background: #FFF; border-radius: 10px; padding: 16px 20px; cursor: pointer; transition: transform 0.15s; }
.alert-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.alert-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.alert-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.alert-title .emoji { font-size: 20px; }
.alert-body { padding: 4px 0; }
.metric { display: flex; align-items: baseline; gap: 12px; }
.metric .num { font-size: 28px; font-weight: 700; color: #222; }
.metric .lbl { color: #999; font-size: 12px; }
.hint { color: #555; font-size: 13px; margin: 8px 0 0; line-height: 1.5; }
.alert-items { margin-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px; }
.items-list { display: flex; flex-direction: column; gap: 4px; }
.item { display: flex; justify-content: space-between; font-size: 12px; color: #717171; }
.item .bad { color: #F56C6C; font-weight: 600; }
.footer-tip { color: #999; font-size: 12px; text-align: right; margin-top: 16px; }
</style>
