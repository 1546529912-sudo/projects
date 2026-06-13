<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { wmsApi, pimApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const auth = useAuthStore();
const list = ref<any[]>([]);
const loading = ref(true);
const skuFilter = ref('');
const storeFilter = ref<number | ''>('');
const stores = ref<any[]>([]);
const storeMap = ref<Record<number, string>>({});

async function load() {
  loading.value = true;
  try {
    const params: any = {};
    if (skuFilter.value) params.sku_code = skuFilter.value;
    if (storeFilter.value) params.store_id = storeFilter.value;
    const res: any = await wmsApi.inventoryList(params);
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

onMounted(async () => { await loadStores(); await load(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">实物库存</h2>
        <p class="page-desc">WMS /api/v1/inventory/list</p>
      </div>
      <div class="filters">
        <el-select v-if="auth.canSelectStore && stores.length > 1" v-model="storeFilter" placeholder="全部店铺" clearable style="width:200px;" @change="load">
          <el-option v-for="s in stores" :key="s.id" :label="`${s.name} (id=${s.id})`" :value="s.id" />
        </el-select>
        <el-input v-model="skuFilter" placeholder="按 SKU 过滤" clearable style="width: 200px;" @keyup.enter="load" @clear="load" />
        <el-button @click="load">查询</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="sku_code" label="SKU" width="180" />
      <el-table-column v-if="auth.canSelectStore && stores.length > 1" label="店铺" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.store_id === 1" type="info" size="small">{{ storeMap[row.store_id] || '平台' }}</el-tag>
          <el-tag v-else size="small">{{ storeMap[row.store_id] || `id=${row.store_id}` }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="location_code" label="库位" width="160" />
      <el-table-column prop="batch_no" label="批次" width="120" />
      <el-table-column prop="quantity" label="实物 quantity" width="140" />
      <el-table-column prop="locked_quantity" label="锁定 locked" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" />
    </el-table>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 12px; }
</style>
