<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

interface TodoItem { key: string; label: string; count: number; router: string; }

const router = useRouter();
const items = ref<TodoItem[]>([]);
const totalCount = ref(0);
const generatedAt = ref('');
const loading = ref(true);

const KEY_META: Record<string, { color: string; icon: string }> = {
  refund_pending: { color: '#E6A23C', icon: '↩️' },
  exchange_pending: { color: '#E6A23C', icon: '🔄' },
  orders_pending_pay: { color: '#909399', icon: '💳' },
  orders_to_ship: { color: '#36A2EB', icon: '📦' },
  stores_pending: { color: '#FF385C', icon: '🏪' },
  dead_letter: { color: '#F56C6C', icon: '⚠️' },
};

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.todosCounts();
    items.value = res.data?.items || [];
    totalCount.value = res.data?.total_count || 0;
    generatedAt.value = res.data?.generated_at || '';
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function goTo(item: TodoItem) {
  router.push(item.router);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">待办中心</h2>
        <p class="page-desc">EFF-05 · 各模块"待处理"统一入口 · iter-42</p>
      </div>
      <div>
        <el-button @click="load" :loading="loading">刷新</el-button>
      </div>
    </div>

    <el-alert
      type="info" :closable="false"
      style="margin-bottom:20px;"
    >
      <template #title>
        共 <strong style="color:#FF385C;font-size:18px;">{{ totalCount }}</strong> 项待处理 · 数据生成时间: {{ generatedAt }}
      </template>
    </el-alert>

    <div v-loading="loading" class="todo-grid">
      <div
        v-for="it in items" :key="it.key"
        class="todo-card"
        :class="{ urgent: it.count > 0 }"
        :style="{ borderLeftColor: KEY_META[it.key]?.color || '#909399' }"
        @click="goTo(it)"
      >
        <div class="todo-icon">{{ KEY_META[it.key]?.icon || '📋' }}</div>
        <div class="todo-body">
          <div class="todo-label">{{ it.label }}</div>
          <div class="todo-count" :style="{ color: it.count > 0 ? (KEY_META[it.key]?.color || '#909399') : '#bbb' }">
            {{ it.count }}
          </div>
        </div>
        <div class="todo-arrow">→</div>
      </div>
    </div>

    <div v-if="!loading && totalCount === 0" class="all-clear">
      🎉 太棒了！当前没有待处理事项
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }

.todo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.todo-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border-left: 4px solid #909399;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.todo-card.urgent { background: #FFF8F0; }
.todo-icon { font-size: 32px; }
.todo-body { flex: 1; }
.todo-label { color: #717171; font-size: 13px; margin-bottom: 4px; }
.todo-count { font-size: 28px; font-weight: 700; }
.todo-arrow { color: #ccc; font-size: 20px; }

.all-clear {
  text-align: center;
  padding: 60px 0;
  color: #67C23A;
  font-size: 18px;
  background: #F0F9EB;
  border-radius: 10px;
  margin-top: 20px;
}
</style>
