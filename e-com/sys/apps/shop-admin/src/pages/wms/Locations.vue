<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const list = ref<any[]>([]);
const loading = ref(true);
const warehouses = ref<any[]>([]);
const filterWarehouse = ref('');

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const form = reactive({
  location_code: '', warehouse_code: '', zone: 'A', rack: '01', level: '01',
  location_type: 'storage', max_weight: 0, max_volume: 0, is_golden: false, status: 'available',
});

const batchVisible = ref(false);
const batchForm = reactive({
  warehouse_code: '', zone: 'A',
  rack_from: 1, rack_to: 5,
  level_from: 1, level_to: 4,
  location_type: 'storage',
});
const batchSubmitting = ref(false);

async function loadWarehouses() {
  try {
    const res: any = await wmsApi.warehouseList();
    warehouses.value = res.data?.list || [];
  } catch {}
}

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.locationList(filterWarehouse.value || undefined);
    list.value = res.data?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, {
    location_code: '', warehouse_code: warehouses.value[0]?.warehouse_code || '',
    zone: 'A', rack: '01', level: '01', location_type: 'storage',
    max_weight: 0, max_volume: 0, is_golden: false, status: 'available',
  });
}
function onAdd() { resetForm(); isEdit.value = false; dialogVisible.value = true; }
function onEdit(row: any) {
  Object.assign(form, {
    location_code: row.location_code, warehouse_code: row.warehouse_code,
    zone: row.zone || '', rack: row.rack || '', level: row.level || '',
    location_type: row.location_type || 'storage',
    max_weight: row.max_weight ? Number(row.max_weight) : 0,
    max_volume: row.max_volume ? Number(row.max_volume) : 0,
    is_golden: !!row.is_golden, status: row.status || 'available',
  });
  isEdit.value = true; dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.location_code || !form.warehouse_code) {
    ElMessage.warning('库位编码和仓库必填'); return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await wmsApi.locationUpdate(form.location_code, {
        zone: form.zone, rack: form.rack, level: form.level,
        location_type: form.location_type,
        max_weight: form.max_weight || null, max_volume: form.max_volume || null,
        is_golden: form.is_golden, status: form.status,
      });
      ElMessage.success('已更新');
    } else {
      await wmsApi.locationCreate({
        location_code: form.location_code, warehouse_code: form.warehouse_code,
        zone: form.zone, rack: form.rack, level: form.level,
        location_type: form.location_type,
        max_weight: form.max_weight || null, max_volume: form.max_volume || null,
        is_golden: form.is_golden,
      });
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '操作失败');
  } finally { submitting.value = false; }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认删除库位「${row.location_code}」？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await wmsApi.locationDelete(row.location_code);
    ElMessage.success('已删除'); await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

function onBatch() {
  batchForm.warehouse_code = warehouses.value[0]?.warehouse_code || '';
  batchVisible.value = true;
}

async function onBatchSubmit() {
  if (!batchForm.warehouse_code) { ElMessage.warning('请选仓库'); return; }
  batchSubmitting.value = true;
  try {
    const res: any = await wmsApi.locationBatch(batchForm);
    ElMessage.success(`创建 ${res.data.created} 个，跳过 ${res.data.skipped} 个`);
    batchVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '生成失败'); }
  finally { batchSubmitting.value = false; }
}

onMounted(async () => {
  await loadWarehouses();
  await load();
});
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">库位管理</h2>
        <p class="page-desc">WMS /api/v1/location 增删改查 + 批量生成</p>
      </div>
      <div>
        <el-select v-model="filterWarehouse" placeholder="按仓库筛选" clearable style="width:200px;" @change="load">
          <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
        </el-select>
        <el-button type="success" @click="onBatch" style="margin-left:8px;">批量生成</el-button>
        <el-button type="primary" @click="onAdd">新增库位</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="location_code" label="库位编码" width="220" />
      <el-table-column prop="warehouse_code" label="仓库" width="140" />
      <el-table-column prop="zone" label="区" width="80" />
      <el-table-column prop="rack" label="排" width="80" />
      <el-table-column prop="level" label="层" width="80" />
      <el-table-column prop="location_type" label="类型" width="120" />
      <el-table-column label="金钻" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.is_golden" type="warning" size="small">金钻</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="max_weight" label="最大承重 (kg)" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑库位' : '新增库位'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="编码" required>
          <el-input v-model="form.location_code" :disabled="isEdit" placeholder="如 WH-DEFAULT-A-01-01" />
        </el-form-item>
        <el-form-item label="仓库" required>
          <el-select v-model="form.warehouse_code" :disabled="isEdit" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="8"><el-form-item label="区"><el-input v-model="form.zone" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="排"><el-input v-model="form.rack" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="层"><el-input v-model="form.level" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="类型">
          <el-select v-model="form.location_type" style="width:100%;">
            <el-option label="storage 存储" value="storage" />
            <el-option label="picking 拣货" value="picking" />
            <el-option label="staging 暂存" value="staging" />
            <el-option label="return 退货" value="return" />
            <el-option label="damaged 残次" value="damaged" />
          </el-select>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="承重 (kg)"><el-input-number v-model="form.max_weight" :min="0" :precision="3" style="width:100%;" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="容积 (m³)"><el-input-number v-model="form.max_volume" :min="0" :precision="3" style="width:100%;" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="金钻位"><el-switch v-model="form.is_golden" /></el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-select v-model="form.status" style="width:100%;">
            <el-option label="available" value="available" />
            <el-option label="occupied" value="occupied" />
            <el-option label="locked" value="locked" />
            <el-option label="disabled" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchVisible" title="批量生成库位" width="500px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="仓库" required>
          <el-select v-model="batchForm.warehouse_code" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="区"><el-input v-model="batchForm.zone" /></el-form-item>
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="排起"><el-input-number v-model="batchForm.rack_from" :min="1" style="width:100%;" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="排止"><el-input-number v-model="batchForm.rack_to" :min="1" style="width:100%;" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="层起"><el-input-number v-model="batchForm.level_from" :min="1" style="width:100%;" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="层止"><el-input-number v-model="batchForm.level_to" :min="1" style="width:100%;" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="类型">
          <el-select v-model="batchForm.location_type" style="width:100%;">
            <el-option label="storage 存储" value="storage" />
            <el-option label="picking 拣货" value="picking" />
            <el-option label="staging 暂存" value="staging" />
          </el-select>
        </el-form-item>
        <div style="color:#999;font-size:12px;">
          预生成数量：{{ (batchForm.rack_to - batchForm.rack_from + 1) * (batchForm.level_to - batchForm.level_from + 1) }} 个（最多 500）
        </div>
      </el-form>
      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="success" :loading="batchSubmitting" @click="onBatchSubmit">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
