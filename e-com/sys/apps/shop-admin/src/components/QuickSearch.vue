<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { omsApi, pimApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const visible = ref(false);
const q = ref('');
const loading = ref(false);
const inputRef = ref<any>(null);

const result = ref({
  orders: [] as any[],
  refunds: [] as any[],
  exchanges: [] as any[],
  spus: [] as any[],
});

// iter-65 Q44-03 localStorage 最近 10 个搜索词
const HISTORY_KEY = 'qs_history_v1';
const history = ref<string[]>([]);
function loadHistory() {
  try { history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || []; } catch { history.value = []; }
}
function pushHistory(kw: string) {
  if (!kw || kw.length < 2) return;
  const cur = history.value.filter(h => h !== kw);
  cur.unshift(kw);
  history.value = cur.slice(0, 10);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value)); } catch {}
}
function clearHistory() {
  history.value = [];
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

// iter-65 Q44-04 ↑↓ 上下选 + Enter 确认
const flatItems = computed(() => {
  return [
    ...result.value.orders.map((o: any) => ({ type: 'order', label: o.order_no, path: `/oms/orders/${o.order_no}` })),
    ...result.value.refunds.map((r: any) => ({ type: 'refund', label: r.refund_no, path: '/oms/refunds' })),
    ...result.value.exchanges.map((e: any) => ({ type: 'exchange', label: e.exchange_no, path: '/oms/exchanges' })),
    // iter-65 Q44-02 SPU 跳列表带 q（让 Products 页拿到关键词预填筛选）
    ...result.value.spus.map((s: any) => ({ type: 'spu', label: s.code, path: `/pim/products?q=${encodeURIComponent(s.code)}` })),
  ];
});
const cursor = ref(0);

let debounceTimer: any = null;

function open() {
  visible.value = true;
  loadHistory();
  setTimeout(() => inputRef.value?.focus?.(), 50);
}
function close() {
  visible.value = false;
  q.value = '';
  result.value = { orders: [], refunds: [], exchanges: [], spus: [] };
  cursor.value = 0;
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    visible.value ? close() : open();
  } else if (e.key === 'Escape' && visible.value) {
    close();
  } else if (visible.value && flatItems.value.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor.value = Math.min(cursor.value + 1, flatItems.value.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor.value = Math.max(cursor.value - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = flatItems.value[cursor.value]; if (it) { pushHistory(q.value.trim()); go(it.path); } }
  }
}

async function doSearch() {
  const kw = q.value.trim();
  if (kw.length < 2) {
    result.value = { orders: [], refunds: [], exchanges: [], spus: [] };
    cursor.value = 0;
    return;
  }
  loading.value = true;
  try {
    const tasks: Promise<any>[] = [];
    if (auth.canSeeOms) tasks.push(omsApi.quickSearch(kw)); else tasks.push(Promise.resolve({ data: {} }));
    if (auth.canSeePim) tasks.push(pimApi.quickSearch(kw)); else tasks.push(Promise.resolve({ data: {} }));
    const [omsRes, pimRes]: any[] = await Promise.all(tasks);
    result.value = {
      orders: omsRes?.data?.orders || [],
      refunds: omsRes?.data?.refunds || [],
      exchanges: omsRes?.data?.exchanges || [],
      spus: pimRes?.data?.spus || [],
    };
    cursor.value = 0;
  } catch {
    result.value = { orders: [], refunds: [], exchanges: [], spus: [] };
  } finally {
    loading.value = false;
  }
}

watch(q, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 200);
});

function go(path: string) {
  pushHistory(q.value.trim());
  close();
  router.push(path);
}
function useHistory(kw: string) { q.value = kw; }

function fmtAmount(cents: number) { return '¥' + (cents / 100).toFixed(2); }

const totalCount = computed(() =>
  result.value.orders.length + result.value.refunds.length + result.value.exchanges.length + result.value.spus.length
);

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

defineExpose({ open, close });
</script>

<template>
  <el-dialog v-model="visible" :show-close="false" width="640px" top="80px" :modal="true" class="qs-dialog" @close="close">
    <template #header>
      <div class="qs-head">
        <span class="qs-icon">⌘K</span>
        <el-input ref="inputRef" v-model="q" placeholder="搜订单号 SO* / 退款号 RF* / 换货号 EX* / 手机号 / SPU code 或名称" clearable />
        <!-- iter-65 Q44-04 快捷键提示 -->
        <span class="qs-kbds"><kbd>↑</kbd><kbd>↓</kbd>选 <kbd>↵</kbd>跳 <kbd>esc</kbd>关</span>
      </div>
    </template>

    <div v-if="loading" class="qs-empty">搜索中…</div>
    <div v-else-if="!q.trim()" class="qs-hint">
      <p>⌘K / Ctrl+K 随处可呼出</p>
      <!-- iter-65 Q44-03 历史 -->
      <div v-if="history.length" class="qs-history">
        <div class="qs-history-head">
          <span>最近搜索</span>
          <el-button text size="small" @click="clearHistory">清除</el-button>
        </div>
        <el-tag v-for="h in history" :key="h" @click="useHistory(h)" style="cursor: pointer; margin: 4px 4px 0 0;">{{ h }}</el-tag>
      </div>
      <p style="margin-top: 12px;">支持：</p>
      <ul>
        <li><b>SO</b>* — 订单号 / 收货人 / 快递号</li>
        <li><b>RF</b>* — 退款号</li>
        <li><b>EX</b>* — 换货号</li>
        <li>11 位数字 — 手机号反查订单</li>
        <li>SPU code 或名称（跳商品列表自动带 q 筛选）</li>
      </ul>
    </div>
    <div v-else-if="totalCount === 0" class="qs-empty">无匹配结果</div>

    <div v-else class="qs-results">
      <div v-if="result.orders.length" class="qs-group">
        <div class="qs-group-title">📦 订单（{{ result.orders.length }}）</div>
        <div v-for="(o, idx) in result.orders" :key="o.order_no" class="qs-row" :class="{ active: flatItems[cursor]?.label === o.order_no }" @click="go(`/oms/orders/${o.order_no}`)">
          <div class="qs-no">{{ o.order_no }}</div>
          <div class="qs-meta">
            <span class="qs-tag">{{ o.status }}</span>
            <span>¥{{ (o.total_amount / 100).toFixed(2) }}</span>
            <span v-if="o.express_no">📮 {{ o.express_no }}</span>
            <span class="qs-time">{{ o.created_at }}</span>
          </div>
        </div>
      </div>

      <div v-if="result.refunds.length" class="qs-group">
        <div class="qs-group-title">↩️ 退款（{{ result.refunds.length }}）</div>
        <div v-for="r in result.refunds" :key="r.refund_no" class="qs-row" :class="{ active: flatItems[cursor]?.label === r.refund_no }" @click="go('/oms/refunds')">
          <div class="qs-no">{{ r.refund_no }}</div>
          <div class="qs-meta">
            <span class="qs-tag">{{ r.status }}</span>
            <span>{{ fmtAmount(r.amount) }}</span>
            <span>{{ r.type }}</span>
            <span class="qs-time">订单 {{ r.order_no }}</span>
          </div>
        </div>
      </div>

      <div v-if="result.exchanges.length" class="qs-group">
        <div class="qs-group-title">🔄 换货（{{ result.exchanges.length }}）</div>
        <div v-for="e in result.exchanges" :key="e.exchange_no" class="qs-row" :class="{ active: flatItems[cursor]?.label === e.exchange_no }" @click="go('/oms/exchanges')">
          <div class="qs-no">{{ e.exchange_no }}</div>
          <div class="qs-meta">
            <span class="qs-tag">{{ e.status }}</span>
            <span class="qs-time">订单 {{ e.order_no }}</span>
          </div>
        </div>
      </div>

      <div v-if="result.spus.length" class="qs-group">
        <div class="qs-group-title">🛍 SPU（{{ result.spus.length }}）</div>
        <div v-for="s in result.spus" :key="s.id" class="qs-row" :class="{ active: flatItems[cursor]?.label === s.code }" @click="go(`/pim/products?q=${encodeURIComponent(s.code)}`)">
          <img v-if="s.main_image" :src="s.main_image" class="qs-img" />
          <div class="qs-no">{{ s.code }} · {{ s.name }}</div>
          <div class="qs-meta">
            <span class="qs-tag">{{ s.status }}</span>
            <span>¥{{ (s.base_price / 100).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.qs-head { display: flex; align-items: center; gap: 12px; }
.qs-icon { background: #F0F0F0; border-radius: 4px; padding: 4px 8px; font-size: 12px; color: #717171; font-family: monospace; }
.qs-kbds { font-size: 11px; color: #999; white-space: nowrap; }
.qs-kbds kbd { background: #F0F0F0; border-radius: 3px; padding: 1px 4px; margin: 0 2px; font-family: monospace; }
.qs-hint { color: #717171; font-size: 13px; line-height: 1.7; }
.qs-hint ul { padding-left: 20px; margin: 8px 0 0; }
.qs-history { background: #F7F7F7; padding: 10px 12px; border-radius: 6px; margin-top: 8px; }
.qs-history-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #717171; }
.qs-empty { color: #999; text-align: center; padding: 30px 0; }
.qs-results { max-height: 480px; overflow-y: auto; }
.qs-group { margin-bottom: 12px; }
.qs-group-title { font-size: 12px; color: #717171; font-weight: 600; padding: 4px 0; border-bottom: 1px solid #EEE; margin-bottom: 4px; }
.qs-row { padding: 8px 8px; border-radius: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.qs-row:hover, .qs-row.active { background: #FEF0F0; }
.qs-no { font-weight: 500; color: #222; }
.qs-meta { color: #717171; font-size: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
.qs-time { margin-left: auto; }
.qs-tag { background: #FFE9EE; color: #FF385C; padding: 0 6px; border-radius: 3px; }
.qs-img { width: 24px; height: 24px; object-fit: cover; border-radius: 3px; vertical-align: middle; margin-right: 6px; }
</style>
