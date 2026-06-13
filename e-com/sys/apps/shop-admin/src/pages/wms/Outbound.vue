<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { wmsApi } from '@/apis';
import { ElMessage } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const router = useRouter();
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.outboundList({ page: page.value, size: size.value });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function goDetail(row: any) {
  router.push(`/wms/outbound/${row.outbound_no}`);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">出库单</h2>
        <p class="page-desc">WMS /api/v1/outbound/list（与 OMS picking_orders.picking_no 对齐）</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe border @row-click="goDetail">
      <el-table-column prop="outbound_no" label="出库单号" width="220" />
      <el-table-column prop="oms_order_no" label="OMS 订单号" width="220" />
      <el-table-column prop="warehouse_code" label="仓库" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column prop="express_no" label="快递单号" width="200" />
      <el-table-column prop="shipped_at" label="发货时间" width="180" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
    </el-table>

    <el-pagination
      v-if="total > size"
      class="pagination"
      v-model:current-page="page"
      :page-size="size"
      :total="total"
      layout="prev, pager, next, total"
      @current-change="load"
    />
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
::v-deep(.el-table__row) { cursor: pointer; }
</style>
