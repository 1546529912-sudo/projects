<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { wmsApi } from '@/apis';

const router = useRouter();
const list = ref<any[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.inboundList({ status: 'pending', page: 1, size: 50 });
    list.value = res?.data?.list || [];
  } catch {} finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="!list.length" class="empty">暂无待入库单</div>

    <div v-for="row in list" :key="row.inbound_no" class="pda-card task" @click="router.push(`/pda/inbound/${row.inbound_no}`)">
      <div class="row">
        <span class="no">{{ row.inbound_no }}</span>
        <span class="status">{{ row.status }}</span>
      </div>
      <div class="row meta">
        <span v-if="row.warehouse_code">🏭 {{ row.warehouse_code }}</span>
        <span v-if="row.created_at">{{ row.created_at }}</span>
      </div>
      <div class="row meta">
        <span v-if="row.source_type">来源 {{ row.source_type }}</span>
        <span v-if="row.refund_no">退货 {{ row.refund_no }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty { text-align: center; color: #999; padding: 40px 0; }
.task { cursor: pointer; }
.task:active { background: #F7F7F7; }
.task .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 14px; }
.task .no { font-weight: 600; color: #222; font-size: 15px; }
.task .meta { color: #717171; font-size: 12px; gap: 12px; }
.task .meta span { margin-right: 12px; }
.task .status { background: #FEF6EC; color: #E6A23C; font-size: 12px; padding: 2px 8px; border-radius: 3px; }
</style>
