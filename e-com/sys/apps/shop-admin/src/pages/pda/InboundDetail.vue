<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { wmsApi } from '@/apis';

const router = useRouter();
const route = useRoute();
const no = String(route.params.no);
const detail = ref<any>(null);
const loading = ref(false);
const submitting = ref(false);
const toast = ref<{ msg: string; type: 'ok' | 'err' } | null>(null);

// iter-65 Q45-02 分步扫品 + 数量步长
const scanInput = ref('');
const scanned = ref<Record<string, number>>({}); // sku_code => qty
function onScan() {
  const code = scanInput.value.trim(); if (!code) return;
  const it = (detail.value?.items || []).find((x: any) => x.sku_code === code);
  if (!it) { showToast(`未识别 SKU：${code}`, 'err'); scanInput.value = ''; return; }
  scanned.value[code] = (scanned.value[code] || 0) + 1;
  if (scanned.value[code] > it.qty) { showToast('已超期望，自动 clamp', 'err'); scanned.value[code] = it.qty; }
  showToast(`${code} +1 (${scanned.value[code]}/${it.qty})`, 'ok');
  scanInput.value = '';
}
function bump(sku: string, delta: number, max: number) {
  scanned.value[sku] = Math.max(0, Math.min(max, (scanned.value[sku] || 0) + delta));
}
const allScanned = () => detail.value?.items?.every((it: any) => (scanned.value[it.sku_code] || 0) >= it.qty);

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.inboundDetail(no);
    const d = res?.data || {};
    detail.value = { ...(d.order || {}), items: d.items || [] };
  } catch {} finally { loading.value = false; }
}

function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
  toast.value = { msg, type };
  setTimeout(() => { toast.value = null; }, 1500);
}

async function complete() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await wmsApi.inboundAutoComplete(no);
    showToast('✅ 入库完成（已上架）', 'ok');
    setTimeout(() => router.push('/pda/inbound'), 1200);
  } catch (e: any) {
    showToast(e?.msg || '失败', 'err');
  } finally { submitting.value = false; }
}

onMounted(load);
</script>

<template>
  <div v-if="detail" class="detail">
    <div class="pda-card head">
      <div class="big">{{ no }}</div>
      <div v-if="detail.warehouse_code" class="sub">🏭 {{ detail.warehouse_code }}</div>
      <div v-if="detail.created_at" class="sub">📅 {{ detail.created_at }}</div>
      <div v-if="detail.refund_no" class="sub">↩️ 退货 {{ detail.refund_no }}</div>
    </div>

    <div v-if="detail.items?.length" class="pda-card items">
      <div class="title">物品清单（{{ detail.items.length }} 项）</div>
      <div v-for="(it, i) in detail.items" :key="i" class="item">
        <div class="sku">{{ it.sku_code }}</div>
        <div class="qty-controls">
          <button class="step" @click="bump(it.sku_code, -1, it.qty)">−</button>
          <span class="qty">{{ scanned[it.sku_code] || 0 }} / {{ it.qty }}</span>
          <button class="step" @click="bump(it.sku_code, +1, it.qty)">+</button>
        </div>
      </div>
    </div>

    <!-- iter-65 Q45-02 扫品分步 -->
    <div v-if="detail.status === 'pending'" class="pda-card scan">
      <label>扫品 SKU（自动 +1，可上方手动调整）</label>
      <input class="pda-input" v-model="scanInput" autocomplete="off" placeholder="扫码或手输 SKU" @keydown.enter="onScan" />
    </div>

    <div v-if="detail.status === 'pending'" class="pda-card actions">
      <button class="pda-big-btn primary" :disabled="submitting" @click="complete">
        ⚡ {{ allScanned() ? '全部扫齐 → 完成（推荐上架）' : '一键完成（跳过分步直接全收）' }}
      </button>
      <p class="tip">完成后自动按推荐 Top1 库位上架；PIM 同步 SKU 主数据；OMS available + N</p>
    </div>
    <div v-else class="pda-card done">
      <div class="ok">状态：{{ detail.status }}</div>
    </div>

    <div v-if="toast" class="toast" :class="toast.type">{{ toast.msg }}</div>
  </div>
  <div v-else class="empty">{{ loading ? '加载中…' : '入库单不存在' }}</div>
</template>

<style scoped>
.detail { padding-bottom: 80px; }
.head .big { font-size: 18px; font-weight: 700; color: #222; }
.head .sub { color: #717171; margin-top: 4px; font-size: 13px; }
.items .title { font-size: 14px; color: #717171; margin-bottom: 8px; }
.items .item {
  display: flex; justify-content: space-between; padding: 8px 0;
  border-bottom: 1px solid #F0F0F0; font-size: 14px;
}
.items .item:last-child { border-bottom: none; }
.items .sku { color: #222; }
.items .qty { color: #FF385C; font-weight: 600; }
.actions .tip { color: #999; font-size: 12px; margin: 10px 0 0; text-align: center; line-height: 1.5; }
.done .ok { font-size: 16px; color: #67C23A; text-align: center; padding: 20px 0; }
.primary { background: #FF385C; color: #FFF; }
.empty { text-align: center; color: #999; padding: 60px 0; }
.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 6px; color: #FFF;
  font-size: 15px; z-index: 200;
}
.toast.ok { background: #67C23A; }
.toast.err { background: #F56C6C; }
.qty-controls { display: flex; align-items: center; gap: 8px; }
.qty-controls .step { width: 28px; height: 28px; border-radius: 14px; border: 1px solid #DDD; background: #FFF; font-size: 16px; cursor: pointer; }
.scan label { display: block; color: #717171; font-size: 13px; margin-bottom: 8px; }
</style>
