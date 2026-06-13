<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ stream: '', page: 1, size: 20 });

const detailVisible = ref(false);
const detailJson = ref('');
const detailTitle = ref('');

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.stream) params.stream = filters.stream;
    const res: any = await omsApi.deadLetterList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function showPayload(row: any) {
  detailTitle.value = `${row.stream} · event=${row.event_id}`;
  detailJson.value = JSON.stringify(row.payload, null, 2);
  detailVisible.value = true;
}

async function onReplay(row: any) {
  try {
    await ElMessageBox.confirm(
      `重新投递这条死信？将把 payload 重新 XADD 回 stream ${row.stream}，让 consumer 再消费一次`,
      '一键 replay', { type: 'warning' }
    );
  } catch { return; }
  try {
    const res: any = await omsApi.deadLetterReplay(row.id);
    ElMessage.success(`已 replay · 新 message_id=${res.data?.new_message_id}`);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || 'replay 失败'); }
}

function isReplayed(row: any): boolean {
  return typeof row.error === 'string' && row.error.includes('replayed at');
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">死信中心</h2>
        <p class="page-desc">EFF-08 · 事件总线 + Webhook 失败死信 · 一键 replay 重投 · iter-42</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="Stream">
        <el-input v-model="filters.stream" placeholder="如 webhook.order.completed" clearable style="width:280px;" @keyup.enter="filters.page=1; load()" />
      </el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page=1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="stream" label="Stream" min-width="200" />
      <el-table-column prop="event_id" label="event_id" width="200" />
      <el-table-column prop="retry_count" label="重试次数" width="100" />
      <el-table-column prop="error" label="错误" min-width="280">
        <template #default="{ row }">
          <span :style="{ color: isReplayed(row) ? '#67C23A' : '#F56C6C' }">
            {{ (row.error || '').slice(0, 120) }}{{ (row.error || '').length > 120 ? '...' : '' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showPayload(row)">payload</el-button>
          <el-button size="small" type="primary" @click="onReplay(row)">replay</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="detailVisible" :title="detailTitle" width="640px">
      <pre class="json-view">{{ detailJson }}</pre>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.json-view {
  background: #F7F7F7; border: 1px solid #DDD; border-radius: 6px;
  padding: 12px 16px; margin: 0;
  font-family: monospace; font-size: 12px; line-height: 1.5;
  max-height: 480px; overflow: auto; white-space: pre-wrap; word-break: break-all;
}
</style>
