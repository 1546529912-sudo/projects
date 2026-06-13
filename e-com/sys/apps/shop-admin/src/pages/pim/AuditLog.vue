<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ action: '', operator: '', target_type: '', target_id: '', page: 1, size: 20 });

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.action) params.action = filters.action;
    if (filters.operator) params.operator = filters.operator;
    if (filters.target_type) params.target_type = filters.target_type;
    if (filters.target_id) params.target_id = filters.target_id;
    const res: any = await pimApi.auditLogList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

function fmtJson(obj: any): string {
  if (obj == null) return '-';
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">PIM 操作日志</h2>
        <p class="page-desc">PIM /api/v1/admin/audit-log · SPU / SKU / 品牌 / 类目 append-only 审计（iter-29）</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="动作">
        <el-select v-model="filters.action" placeholder="全部" clearable style="width:220px;">
          <el-option label="spu.create 新建 SPU" value="spu.create" />
          <el-option label="spu.update 改 SPU" value="spu.update" />
          <el-option label="spu.publish 发布" value="spu.publish" />
          <el-option label="spu.offline 下架" value="spu.offline" />
          <el-option label="spu.delete 删除" value="spu.delete" />
          <el-option label="sku.create 新建 SKU" value="sku.create" />
          <el-option label="sku.update 改 SKU" value="sku.update" />
          <el-option label="sku.delete 删 SKU" value="sku.delete" />
          <el-option label="brand.create 建品牌" value="brand.create" />
          <el-option label="brand.update 改品牌" value="brand.update" />
          <el-option label="brand.delete 删品牌" value="brand.delete" />
          <el-option label="category.create 建类目" value="category.create" />
          <el-option label="category.update 改类目" value="category.update" />
          <el-option label="category.delete 删类目" value="category.delete" />
          <el-option label="category.reorder 类目排序" value="category.reorder" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人"><el-input v-model="filters.operator" clearable style="width:140px;" /></el-form-item>
      <el-form-item label="对象类型">
        <el-select v-model="filters.target_type" placeholder="全部" clearable style="width:120px;">
          <el-option label="spu" value="spu" />
          <el-option label="sku" value="sku" />
          <el-option label="brand" value="brand" />
          <el-option label="category" value="category" />
        </el-select>
      </el-form-item>
      <el-form-item label="对象 ID"><el-input v-model="filters.target_id" clearable style="width:200px;" /></el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page = 1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column prop="action" label="动作" width="180" />
      <el-table-column label="对象" width="240">
        <template #default="{ row }">{{ row.target_type }} / {{ row.target_id }}</template>
      </el-table-column>
      <el-table-column label="变更前" min-width="180">
        <template #default="{ row }"><code style="font-size:11px;color:#999;">{{ fmtJson(row.before) }}</code></template>
      </el-table-column>
      <el-table-column label="变更后" min-width="180">
        <template #default="{ row }"><code style="font-size:11px;color:#222;">{{ fmtJson(row.after) }}</code></template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="160" />
      <el-table-column prop="ip" label="IP" width="120" />
      <el-table-column prop="trace_id" label="trace" width="140" />
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
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
