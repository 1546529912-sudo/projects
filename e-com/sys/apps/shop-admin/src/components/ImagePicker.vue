<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  multiple?: boolean;
  max?: number;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'select', urls: string[]): void;
}>();

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const filters = reactive({ keyword: '', page: 1, size: 24 });
const selected = ref<Set<string>>(new Set());

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.keyword) params.keyword = filters.keyword;
    const res: any = await pimApi.imageLibraryList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

watch(() => props.modelValue, (v) => {
  if (v) {
    selected.value = new Set();
    filters.page = 1;
    filters.keyword = '';
    load();
  }
});

function toggle(url: string) {
  if (props.multiple) {
    if (selected.value.has(url)) selected.value.delete(url);
    else {
      if (props.max && selected.value.size >= props.max) {
        ElMessage.warning(`最多 ${props.max} 张`); return;
      }
      selected.value.add(url);
    }
  } else {
    selected.value = new Set([url]);
  }
}

function onConfirm() {
  if (!selected.value.size) { ElMessage.warning('请先选图'); return; }
  emit('select', Array.from(selected.value));
  emit('update:modelValue', false);
}

function onClose() { emit('update:modelValue', false); }
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="从图片库选择"
    width="780px"
    :before-close="onClose"
    append-to-body
  >
    <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">
      <el-input v-model="filters.keyword" placeholder="搜索原文件名" clearable style="width:240px;" @keyup.enter="filters.page = 1; load()" />
      <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
      <span style="color:#999;font-size:12px;margin-left:auto;">
        已选 {{ selected.size }}<span v-if="multiple && max"> / {{ max }}</span>
      </span>
    </div>

    <div v-loading="loading" class="grid">
      <div
        v-for="row in list" :key="row.id"
        class="cell" :class="{ active: selected.has(row.url) }"
        @click="toggle(row.url)"
      >
        <div class="thumb">
          <img :src="row.url" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.opacity = '0.2'" />
          <div v-if="selected.has(row.url)" class="check">✓</div>
        </div>
        <div class="name" :title="row.original_name">{{ row.original_name || '(无名)' }}</div>
      </div>
      <div v-if="!loading && !list.length" class="empty">图片库为空，先去"上传"</div>
    </div>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[24, 48]"
      layout="total, prev, pager, next"
      style="margin-top:12px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button type="primary" @click="onConfirm">确认（{{ selected.size }}）</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 480px;
  overflow-y: auto;
}
.cell {
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  background: #FFFFFF;
  transition: border-color .15s;
}
.cell:hover { border-color: #FF385C66; }
.cell.active { border-color: #FF385C; }
.thumb {
  position: relative;
  aspect-ratio: 1;
  background: #F7F7F7;
  display: flex; align-items: center; justify-content: center;
}
.thumb img { max-width: 100%; max-height: 100%; object-fit: cover; }
.check {
  position: absolute; top: 4px; right: 4px;
  width: 22px; height: 22px; line-height: 22px; text-align: center;
  background: #FF385C; color: #fff; border-radius: 50%;
  font-size: 14px; font-weight: 700;
}
.name {
  padding: 4px 6px;
  font-size: 11px; color: #555;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.empty { grid-column: 1 / -1; padding: 60px 0; text-align: center; color: #999; }
</style>
