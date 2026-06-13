<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ref, onMounted } from 'vue';
import { wmsApi } from '@/apis';

const router = useRouter();
const auth = useAuthStore();
const counts = ref({ picking: 0, inbound: 0 });
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const [pickRes, inRes]: any[] = await Promise.all([
      wmsApi.pickingTaskList({ status: 'assigned', operator: auth.username, page: 1, size: 1 }),
      wmsApi.inboundList({ status: 'pending', page: 1, size: 1 }),
    ]);
    counts.value = {
      picking: pickRes?.data?.total || 0,
      inbound: inRes?.data?.total || 0,
    };
  } catch {} finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <div class="home">
    <div class="hello">
      <div>欢迎 <b>{{ auth.name || auth.username }}</b></div>
      <div class="role">角色：{{ auth.role }}</div>
    </div>

    <div class="card" @click="router.push('/pda/picking')">
      <div class="icon">📦</div>
      <div class="meta">
        <div class="title">拣货任务</div>
        <div class="sub">{{ loading ? '加载中…' : `我的待处理 ${counts.picking}` }}</div>
      </div>
      <div class="arrow">›</div>
    </div>

    <div class="card" @click="router.push('/pda/inbound')">
      <div class="icon">📥</div>
      <div class="meta">
        <div class="title">入库扫码</div>
        <div class="sub">{{ loading ? '加载中…' : `待入库 ${counts.inbound}` }}</div>
      </div>
      <div class="arrow">›</div>
    </div>

    <button class="pda-big-btn refresh" @click="load">刷新</button>
  </div>
</template>

<style scoped>
.home { padding: 4px; }
.hello { padding: 8px 4px 14px; color: #717171; font-size: 13px; }
.hello .role { margin-top: 4px; color: #999; font-size: 12px; }
.card {
  background: #FFF; border-radius: 10px;
  padding: 18px 16px; margin-bottom: 12px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer;
}
.card:active { background: #F7F7F7; }
.card .icon { font-size: 32px; }
.card .meta { flex: 1; }
.card .title { font-size: 17px; font-weight: 600; color: #222; }
.card .sub { font-size: 13px; color: #717171; margin-top: 2px; }
.card .arrow { font-size: 24px; color: #DDD; }
.refresh { background: #F7F7F7; color: #717171; margin-top: 16px; }
</style>
