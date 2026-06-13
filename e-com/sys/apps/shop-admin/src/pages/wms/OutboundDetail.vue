<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const route = useRoute();
const router = useRouter();
const no = computed(() => route.params.no as string);

const order = ref<any>(null);
const items = ref<any[]>([]);
const tasks = ref<any[]>([]);
const loading = ref(true);
const completing = ref(false);

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.outboundDetail(no.value);
    order.value = res.data?.order;
    items.value = res.data?.items || [];
    tasks.value = res.data?.tasks || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onAutoComplete() {
  try {
    await ElMessageBox.confirm(
      '一键完成会模拟 PDA 拣货→复核→发货，并扣减实物库存且回传 OMS。继续？',
      '确认',
      { type: 'warning' }
    );
  } catch { return; }

  completing.value = true;
  try {
    const res: any = await wmsApi.autoComplete(no.value);
    ElMessage.success(`已发货 · 快递单号 ${res.data?.express_no || '-'}`);
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '操作失败');
  } finally {
    completing.value = false;
  }
}

const canAutoComplete = computed(() => order.value?.status === 'allocated');

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <div class="page-head">
      <h2 class="page-title">出库单 · {{ no }}</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="order" class="card">
      <template #header>
        <div class="card-header">
          <span>出库单信息</span>
          <div>
            <StatusTag :status="order.status" />
            <el-button
              v-if="canAutoComplete"
              type="primary"
              size="small"
              :loading="completing"
              style="margin-left: 12px;"
              @click="onAutoComplete"
            >一键完成</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="出库单号">{{ order.outbound_no }}</el-descriptions-item>
        <el-descriptions-item label="OMS 订单号">{{ order.oms_order_no }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ order.warehouse_code }}</el-descriptions-item>
        <el-descriptions-item label="快递公司">{{ order.express_company || '-' }}</el-descriptions-item>
        <el-descriptions-item label="快递单号">{{ order.express_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ order.shipped_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="order?.address" class="card">
      <template #header>收货地址</template>
      <div><strong>{{ order.address.name }}</strong><span class="phone">{{ order.address.phone }}</span></div>
      <div class="detail">{{ order.address.province }} {{ order.address.city }} {{ order.address.district }} {{ order.address.detail }}</div>
    </el-card>

    <el-card class="card">
      <template #header>出库明细</template>
      <el-table :data="items" stripe>
        <el-table-column prop="sku_code" label="SKU" width="160" />
        <el-table-column prop="qty" label="需要" width="80" />
        <el-table-column prop="picked_qty" label="已拣" width="80" />
        <el-table-column prop="location_code" label="分配库位" width="160" />
        <el-table-column prop="batch_no" label="批次" />
      </el-table>
    </el-card>

    <el-card class="card">
      <template #header>拣货任务 (PDA)</template>
      <el-table :data="tasks" stripe>
        <el-table-column prop="sort" label="顺序" width="60" />
        <el-table-column prop="location_code" label="库位" width="160" />
        <el-table-column prop="sku_code" label="SKU" width="160" />
        <el-table-column prop="expected_qty" label="预期" width="80" />
        <el-table-column prop="picked_qty" label="已拣" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column prop="picked_at" label="完成时间" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.phone { color: #717171; margin-left: 12px; }
.detail { color: #555; margin-top: 8px; }
</style>
