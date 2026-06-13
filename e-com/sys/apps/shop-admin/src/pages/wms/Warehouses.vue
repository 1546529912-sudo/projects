<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi, pimApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const auth = useAuthStore();
const list = ref<any[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const storeFilter = ref<number | ''>('');
const stores = ref<any[]>([]);
const storeMap = ref<Record<number, string>>({});
const form = reactive({
  warehouse_code: '',
  warehouse_name: '',
  store_id: 1,
  warehouse_type: 'self',
  address: '',
  contact: '',
  phone: '',
  status: 'enabled',
});

async function load() {
  loading.value = true;
  try {
    const params: any = {};
    if (storeFilter.value) params.store_id = storeFilter.value;
    const res: any = await wmsApi.warehouseList(params);
    list.value = res.data?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadStores() {
  try {
    const res: any = await pimApi.storeList();
    stores.value = res.data?.list || [];
    storeMap.value = Object.fromEntries(stores.value.map((x: any) => [x.id, x.name]));
  } catch {}
}

function resetForm() {
  Object.assign(form, {
    warehouse_code: '', warehouse_name: '', store_id: 1, warehouse_type: 'self',
    address: '', contact: '', phone: '', status: 'enabled',
  });
}
function onAdd() { resetForm(); isEdit.value = false; dialogVisible.value = true; }
function onEdit(row: any) {
  Object.assign(form, {
    warehouse_code: row.warehouse_code, warehouse_name: row.warehouse_name,
    address: row.address || '', contact: row.contact || '', phone: row.phone || '',
    status: row.status || 'enabled',
  });
  isEdit.value = true; dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.warehouse_code || !form.warehouse_name) {
    ElMessage.warning('编码和名称必填'); return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await wmsApi.warehouseUpdate(form.warehouse_code, {
        warehouse_name: form.warehouse_name, address: form.address,
        contact: form.contact, phone: form.phone, status: form.status,
      });
      ElMessage.success('已更新');
    } else {
      await wmsApi.warehouseCreate({
        warehouse_code: form.warehouse_code, warehouse_name: form.warehouse_name,
        store_id: form.store_id, warehouse_type: form.warehouse_type,
        address: form.address, contact: form.contact, phone: form.phone,
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
  try { await ElMessageBox.confirm(`确认删除仓库「${row.warehouse_name}」？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await wmsApi.warehouseDelete(row.warehouse_code);
    ElMessage.success('已删除'); await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

onMounted(async () => { await loadStores(); await load(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">仓库管理</h2>
        <p class="page-desc">WMS /api/v1/warehouse 增删改查</p>
      </div>
      <div style="display:flex;gap:8px;">
        <el-select v-if="auth.canSelectStore && stores.length > 1" v-model="storeFilter" placeholder="全部店铺" clearable style="width:200px;" @change="load">
          <el-option v-for="s in stores" :key="s.id" :label="`${s.name} (id=${s.id})`" :value="s.id" />
        </el-select>
        <el-button type="primary" @click="onAdd">新增仓库</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="warehouse_code" label="编码" width="160" />
      <el-table-column v-if="auth.canSelectStore && stores.length > 1" label="店铺" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.store_id === 1" type="info" size="small">{{ storeMap[row.store_id] || '平台' }}</el-tag>
          <el-tag v-else size="small">{{ storeMap[row.store_id] || `id=${row.store_id}` }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.warehouse_type === 'self' ? 'success' : 'warning'" size="small">
            {{ row.warehouse_type === 'self' ? '自营' : '商家仓' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="warehouse_name" label="仓库名" width="200" />
      <el-table-column prop="address" label="地址" />
      <el-table-column prop="contact" label="联系人" width="120" />
      <el-table-column prop="phone" label="电话" width="160" />
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑仓库' : '新增仓库'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="编码" required>
          <el-input v-model="form.warehouse_code" :disabled="isEdit" placeholder="如 WH-DEFAULT" />
        </el-form-item>
        <el-form-item label="仓库名" required>
          <el-input v-model="form.warehouse_name" />
        </el-form-item>
        <el-form-item v-if="!isEdit && auth.canSelectStore" label="所属店铺">
          <el-select v-model="form.store_id" placeholder="选择店铺" style="width:100%;">
            <el-option v-for="s in stores" :key="s.id" :label="`${s.name} (id=${s.id})`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="仓库类型">
          <el-radio-group v-model="form.warehouse_type">
            <el-radio value="self">自营</el-radio>
            <el-radio value="merchant">商家仓</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
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
</style>
