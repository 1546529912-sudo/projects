<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const list = ref<any[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const submitting = ref(false);

const form = reactive({
  sku_code: '',
  available: 0,
  buffer_qty: 0,
  reason: '',
});

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.inventoryList();
    list.value = res.data?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function effective(row: any) {
  return Math.max(0, (row.available || 0) - (row.buffer_qty || 0));
}

function openAdjust(row: any) {
  Object.assign(form, {
    sku_code: row.sku_code,
    available: row.available || 0,
    buffer_qty: row.buffer_qty || 0,
    reason: '',
  });
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.reason) { ElMessage.warning('请填调整理由'); return; }
  submitting.value = true;
  try {
    await omsApi.adjustInventory(form.sku_code, {
      available: form.available,
      buffer_qty: form.buffer_qty,
      reason: form.reason,
    });
    ElMessage.success('已调整');
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '调整失败');
  } finally {
    submitting.value = false;
  }
}

const exporting = ref(false);
async function onExport() {
  exporting.value = true;
  try {
    await omsApi.exportInventory();
    ElMessage.success('导出已开始');
  } catch (e: any) {
    ElMessage.error(e?.message || e?.msg || '导出失败');
  } finally { exporting.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">库存四态</h2>
        <p class="page-desc">OMS /api/v1/admin/inventory · 可手动调整 available / buffer_qty</p>
      </div>
      <div>
        <el-button @click="load">刷新</el-button>
        <el-button :loading="exporting" @click="onExport">导出 CSV</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="sku_code" label="SKU" width="180" />
      <el-table-column prop="available" label="可用 available" width="120" />
      <el-table-column prop="locked" label="锁定 locked" width="120" />
      <el-table-column prop="reserved" label="预留 reserved" width="120" />
      <el-table-column prop="buffer_qty" label="安全垫 buffer" width="120" />
      <el-table-column label="有效可售" width="120">
        <template #default="{ row }">
          <span :class="{ low: effective(row) < 10 }">{{ effective(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openAdjust(row)">调整</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="手动调整库存" width="450px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="SKU">
          <el-input v-model="form.sku_code" disabled />
        </el-form-item>
        <el-form-item label="available">
          <el-input-number v-model="form.available" :min="0" style="width:100%;" />
        </el-form-item>
        <el-form-item label="buffer_qty">
          <el-input-number v-model="form.buffer_qty" :min="0" style="width:100%;" />
        </el-form-item>
        <el-form-item label="理由" required>
          <el-input v-model="form.reason" type="textarea" :rows="2" placeholder="必填，写入 inventory_log.operator" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.low { color: #FF385C; font-weight: 600; }
</style>
