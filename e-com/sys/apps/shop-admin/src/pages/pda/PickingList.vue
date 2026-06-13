<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { wmsApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const list = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref<'mine' | 'pending'>('mine');

async function load() {
  loading.value = true;
  try {
    const params: any = { page: 1, size: 50 };
    if (statusFilter.value === 'mine') {
      params.operator = auth.username;
    } else {
      params.status = 'pending';
    }
    const res: any = await wmsApi.pickingTaskList(params);
    list.value = (res?.data?.list || []).filter((x: any) => x.status !== 'picked' && x.status !== 'cancelled');
  } catch {} finally { loading.value = false; }
}

async function pickUp(row: any) {
  try {
    await wmsApi.pickingTaskAssign(row.id, auth.username);
    await load();
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <div class="tabs">
      <button :class="{ active: statusFilter === 'mine' }" @click="statusFilter = 'mine'; load()">我的任务</button>
      <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'; load()">待领取</button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="!list.length" class="empty">暂无任务</div>

    <div v-for="row in list" :key="row.id" class="pda-card task">
      <div class="row">
        <!-- iter-65 Q45-04 任务卡片图（来自 wms_products 同步的 image_url） -->
        <img v-if="row.image_url || row.sku_image" :src="row.image_url || row.sku_image" class="thumb" />
        <span class="sku">{{ row.sku_code }}</span>
        <span class="status" :class="row.status">{{ row.status }}</span>
      </div>
      <div class="row">
        <span>出库单 {{ row.outbound_no }}</span>
        <span class="qty">{{ row.picked_qty }} / {{ row.expected_qty }}</span>
      </div>
      <div v-if="row.location_code" class="row meta">📍 {{ row.location_code }}</div>
      <div class="actions">
        <button v-if="statusFilter === 'pending'" class="pda-big-btn primary" @click="pickUp(row)">领取此任务</button>
        <button v-else class="pda-big-btn primary" @click="router.push(`/pda/picking/${row.id}`)">开始扫码</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tabs button {
  flex: 1; height: 36px; background: #FFF; border: 1px solid #DDD;
  border-radius: 6px; color: #717171; font-size: 14px; cursor: pointer;
}
.tabs button.active { background: #FF385C; color: #FFF; border-color: #FF385C; }
.empty { text-align: center; color: #999; padding: 40px 0; }
.task .row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; margin-bottom: 6px;
}
.task .sku { font-weight: 600; color: #222; font-size: 16px; }
.task .qty { font-weight: 600; color: #FF385C; font-size: 18px; }
.task .meta { color: #717171; font-size: 13px; }
.task .status { font-size: 12px; padding: 2px 8px; border-radius: 3px; }
.task .status.pending { background: #FEF6EC; color: #E6A23C; }
.task .status.assigned { background: #ECF5FF; color: #409EFF; }
.task .status.partial { background: #FFE9EE; color: #FF385C; }
.actions { margin-top: 10px; }
.primary { background: #FF385C; color: #FFF; }
.thumb { width: 32px; height: 32px; border-radius: 4px; object-fit: cover; margin-right: 8px; }
</style>
