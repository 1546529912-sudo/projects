<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ keyword: '', uploader: '', page: 1, size: 24 });

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.uploader) params.uploader = filters.uploader;
    const res: any = await pimApi.imageLibraryList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认从图片库移除该图？（盘上文件保留）`, '确认', { type: 'warning' }); }
  catch { return; }
  try {
    await pimApi.imageLibraryDelete(row.id);
    ElMessage.success('已移除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

function copyUrl(row: any) {
  navigator.clipboard?.writeText(row.url);
  ElMessage.success('URL 已复制：' + row.url);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">图片库</h2>
        <p class="page-desc">PIM /admin/image-library · 所有上传图片自动归集，可复用 / 移除 / 复制 URL</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="文件名">
        <el-input v-model="filters.keyword" clearable placeholder="原文件名 LIKE" style="width:200px;" />
      </el-form-item>
      <el-form-item label="上传人">
        <el-input v-model="filters.uploader" clearable style="width:160px;" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
      </el-form-item>
    </el-form>

    <div v-loading="loading" class="grid">
      <div v-for="row in list" :key="row.id" class="cell">
        <div class="thumb">
          <img :src="row.url" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.opacity = '0.2'" />
        </div>
        <div class="meta">
          <div class="name" :title="row.original_name">{{ row.original_name || '(无名)' }}</div>
          <div class="info">
            <span>{{ row.size_kb }} KB</span>
            <span>·</span>
            <span>{{ row.uploader }}</span>
            <el-tag v-if="row.used_count > 0" type="success" size="small" style="margin-left:auto;">
              {{ row.used_count }} 引用
            </el-tag>
          </div>
          <div class="info time">{{ row.created_at }}</div>
        </div>
        <div class="actions">
          <el-button size="small" @click="copyUrl(row)">复制 URL</el-button>
          <el-button size="small" type="danger" text @click="onDelete(row)">移除</el-button>
        </div>
      </div>
      <div v-if="!loading && !list.length" class="empty">暂无图片，上传后会自动入库</div>
    </div>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[24, 48, 96]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.cell { background: #FFFFFF; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
.thumb { width: 100%; aspect-ratio: 1; background: #F7F7F7; display: flex; align-items: center; justify-content: center; }
.thumb img { max-width: 100%; max-height: 100%; object-fit: cover; }
.meta { padding: 8px 10px; }
.name { font-size: 12px; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.info { font-size: 11px; color: #717171; margin-top: 2px; }
.time { margin-top: 0; }
.actions { display: flex; justify-content: space-between; padding: 6px 10px 10px; }
.empty { grid-column: 1 / -1; padding: 60px 0; text-align: center; color: #999; }
</style>
