<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ action: '', operator: '', target_type: '', target_id: '', page: 1, size: 20 });

// 详情弹窗
const detailVisible = ref(false);
const detailTitle = ref('');
const detailJson = ref('');
function showDetail(label: string, row: any, field: 'before' | 'after') {
  const data = row[field];
  detailTitle.value = `${label} · ${row.action} · ${row.target_type}/${row.target_id}`;
  detailJson.value = data == null ? '（无数据）' : JSON.stringify(data, null, 2);
  detailVisible.value = true;
}
function copyJson() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(detailJson.value)
      .then(() => ElMessage.success('已复制到剪贴板'))
      .catch(() => ElMessage.error('复制失败'));
  }
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.action) params.action = filters.action;
    if (filters.operator) params.operator = filters.operator;
    if (filters.target_type) params.target_type = filters.target_type;
    if (filters.target_id) params.target_id = filters.target_id;
    const res: any = await omsApi.auditLog(params);
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
        <h2 class="page-title">操作日志</h2>
        <p class="page-desc">OMS /api/v1/admin/audit-log · 所有 admin 写操作 append-only 审计</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="动作">
        <el-select v-model="filters.action" placeholder="全部" clearable style="width:200px;">
          <el-option label="order.force_cancel 强制取消" value="order.force_cancel" />
          <el-option label="order.recover 异常恢复" value="order.recover" />
          <el-option label="inventory.adjust 库存调整" value="inventory.adjust" />
          <el-option label="refund.approve 通过退款" value="refund.approve" />
          <el-option label="refund.reject 拒绝退款" value="refund.reject" />
          <el-option label="refund.confirm 确认退款" value="refund.confirm" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人"><el-input v-model="filters.operator" clearable style="width:140px;" /></el-form-item>
      <el-form-item label="对象类型">
        <el-select v-model="filters.target_type" placeholder="全部" clearable style="width:120px;">
          <el-option label="order" value="order" />
          <el-option label="refund" value="refund" />
          <el-option label="sku" value="sku" />
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
      <el-table-column label="变更前" width="100" align="center">
        <template #default="{ row }">
          <el-button v-if="row.before != null" link type="primary" size="small" @click="showDetail('变更前', row, 'before')">查看</el-button>
          <span v-else style="color:#bbb;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="变更后" width="100" align="center">
        <template #default="{ row }">
          <el-button v-if="row.after != null" link type="primary" size="small" @click="showDetail('变更后', row, 'after')">查看</el-button>
          <span v-else style="color:#bbb;">—</span>
        </template>
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

    <el-dialog v-model="detailVisible" :title="detailTitle" width="640px">
      <pre class="json-view">{{ detailJson }}</pre>
      <template #footer>
        <el-button @click="copyJson">复制 JSON</el-button>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.json-view {
  background: #F7F7F7;
  border: 1px solid #DDD;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #222;
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
