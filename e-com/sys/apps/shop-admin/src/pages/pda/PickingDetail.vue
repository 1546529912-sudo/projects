<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { wmsApi } from '@/apis';

const router = useRouter();
const route = useRoute();
const id = Number(route.params.id);
const task = ref<any>(null);
const scanInput = ref('');
const scanInputRef = ref<any>(null);
const loading = ref(false);
const submitting = ref(false);
const toast = ref<{ msg: string; type: 'ok' | 'err' } | null>(null);

const remaining = computed(() => task.value ? Math.max(0, task.value.expected_qty - task.value.picked_qty) : 0);
const isDone = computed(() => task.value && task.value.status === 'picked');

// iter-65 Q45-01 摄像头扫码（getUserMedia + BarcodeDetector / jsQR fallback）
const cameraOn = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
let stream: MediaStream | null = null;
let scanLoopId: any = null;

async function toggleCamera() {
  if (cameraOn.value) { stopCamera(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    cameraOn.value = true;
    await nextTick();
    if (videoRef.value) { videoRef.value.srcObject = stream; await videoRef.value.play(); }
    loopScan();
  } catch (e: any) {
    showToast(e?.message || '摄像头不可用', 'err');
    cameraOn.value = false;
  }
}
function stopCamera() {
  cameraOn.value = false;
  if (scanLoopId) cancelAnimationFrame(scanLoopId);
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}
async function loopScan() {
  if (!cameraOn.value || !videoRef.value) return;
  // 优先用 BarcodeDetector（Chrome 88+/Safari 16+）
  // @ts-ignore
  if (window.BarcodeDetector) {
    // @ts-ignore
    const det = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
    try {
      const codes = await det.detect(videoRef.value);
      if (codes && codes.length) {
        scanInput.value = codes[0].rawValue;
        await onScan();
        stopCamera();
        return;
      }
    } catch {}
  }
  scanLoopId = requestAnimationFrame(loopScan);
}

// iter-65 Q45-03 离线队列：失败时入 localStorage，连上网络后自动 flush
const OFFLINE_KEY = 'pda_offline_picking';
function queueOffline(payload: any) {
  try {
    const q = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    q.push({ ...payload, _ts: Date.now() });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
  } catch {}
}
async function flushOffline() {
  let q: any[] = [];
  try { q = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); } catch {}
  if (!q.length) return;
  const remaining: any[] = [];
  for (const p of q) {
    try { await wmsApi.pickingTaskScan(p.id, p.qty); } catch { remaining.push(p); }
  }
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
  if (q.length !== remaining.length) showToast(`已补传 ${q.length - remaining.length} 条`, 'ok');
}
window.addEventListener('online', flushOffline);

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.pickingTaskDetail(id);
    task.value = res?.data;
    await nextTick();
    scanInputRef.value?.focus?.();
  } catch {} finally { loading.value = false; }
}

function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
  toast.value = { msg, type };
  setTimeout(() => { toast.value = null; }, 1500);
}

async function onScan() {
  if (submitting.value || !task.value) return;
  const code = scanInput.value.trim();
  if (!code) return;
  if (code !== task.value.sku_code) {
    showToast(`SKU 不匹配（应扫 ${task.value.sku_code}）`, 'err');
    scanInput.value = '';
    scanInputRef.value?.focus?.();
    return;
  }
  submitting.value = true;
  try {
    const res: any = await wmsApi.pickingTaskScan(id, 1);
    task.value = res?.data;
    scanInput.value = '';
    if (task.value.status === 'picked') {
      showToast('已完成 ✅', 'ok');
      setTimeout(() => router.push('/pda/picking'), 1000);
    } else {
      showToast(`+1（${task.value.picked_qty}/${task.value.expected_qty}）`, 'ok');
      await nextTick();
      scanInputRef.value?.focus?.();
    }
  } catch (e: any) {
    // iter-65 Q45-03 离线兜底
    if (!navigator.onLine) {
      queueOffline({ id, qty: 1 });
      showToast('离线已暂存 ✓', 'ok');
      task.value.picked_qty += 1;
    } else {
      showToast(e?.msg || '上报失败', 'err');
    }
  } finally { submitting.value = false; }
}

async function completeAll() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await wmsApi.pickingTaskComplete(id);
    showToast('已置完成 ✅', 'ok');
    setTimeout(() => router.push('/pda/picking'), 1000);
  } catch (e: any) {
    showToast(e?.msg || '失败', 'err');
  } finally { submitting.value = false; }
}

onMounted(load);
</script>

<template>
  <div v-if="task" class="detail">
    <div class="pda-card head">
      <div class="big">{{ task.sku_code }}</div>
      <div class="sub">出库单 {{ task.outbound_no }}</div>
      <div v-if="task.location_code" class="sub">📍 库位 {{ task.location_code }}</div>
    </div>

    <div class="pda-card progress">
      <div class="num">{{ task.picked_qty }} <span class="slash">/</span> {{ task.expected_qty }}</div>
      <div class="label">已拣 / 期望（剩 {{ remaining }}）</div>
      <div class="bar"><div class="fill" :style="{ width: (task.picked_qty / task.expected_qty * 100) + '%' }" /></div>
    </div>

    <div v-if="!isDone" class="pda-card scan">
      <label>扫 SKU 码（每次 +1）</label>
      <input
        ref="scanInputRef"
        class="pda-input"
        v-model="scanInput"
        :disabled="submitting"
        autocomplete="off"
        placeholder="扫码或手输 SKU"
        @keydown.enter="onScan"
      />
      <!-- iter-65 Q45-01 摄像头扫码 -->
      <button class="pda-big-btn primary" @click="toggleCamera">
        {{ cameraOn ? '⏹ 关闭摄像头' : '📷 摄像头扫码' }}
      </button>
      <video v-if="cameraOn" ref="videoRef" class="cam" autoplay playsinline muted></video>
      <button class="pda-big-btn ghost" @click="completeAll" :disabled="submitting">⚡ 一键完成（剩 {{ remaining }} 全置）</button>
    </div>
    <div v-else class="pda-card done">
      <div class="ok">✅ 已完成</div>
      <button class="pda-big-btn primary" @click="router.push('/pda/picking')">返回列表</button>
    </div>

    <div v-if="toast" class="toast" :class="toast.type">{{ toast.msg }}</div>
  </div>
  <div v-else class="empty">{{ loading ? '加载中…' : '任务不存在' }}</div>
</template>

<style scoped>
.detail { padding-bottom: 80px; }
.head .big { font-size: 22px; font-weight: 700; color: #222; }
.head .sub { color: #717171; margin-top: 4px; font-size: 13px; }
.progress { text-align: center; }
.progress .num { font-size: 36px; font-weight: 700; color: #FF385C; }
.progress .num .slash { color: #DDD; font-weight: 400; }
.progress .label { color: #717171; font-size: 13px; margin: 4px 0 12px; }
.progress .bar { height: 8px; background: #F0F0F0; border-radius: 4px; overflow: hidden; }
.progress .bar .fill { height: 100%; background: #FF385C; transition: width 0.2s; }
.scan label { display: block; color: #717171; font-size: 13px; margin-bottom: 8px; }
.scan input { margin-bottom: 12px; }
.done { text-align: center; }
.done .ok { font-size: 24px; color: #67C23A; padding: 20px 0; }
.ghost { background: #F7F7F7; color: #FF385C; border: 1px solid #FFB4C2; }
.primary { background: #FF385C; color: #FFF; }
.empty { text-align: center; color: #999; padding: 60px 0; }
.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 6px; color: #FFF;
  font-size: 15px; z-index: 200;
}
.toast.ok { background: #67C23A; }
.toast.err { background: #F56C6C; }
.cam { width: 100%; max-height: 240px; background: #000; border-radius: 6px; margin: 8px 0; }
</style>
