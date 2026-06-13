<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { omsApi, pimApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const router = useRouter();
const auth = useAuthStore();

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);
const statusFilter = ref('');
const keyword = ref('');
const storeFilter = ref<number | ''>('');
const stores = ref<any[]>([]);
const storeMap = ref<Record<number, string>>({});

// iter-42 EFF-01 高级搜索
const advancedOpen = ref(false);
const advanced = ref({
  phone: '', user_id: '' as string | number, sku_code: '',
  amount_min_yuan: '' as string | number, amount_max_yuan: '' as string | number,
  start_date: '', end_date: '',
});

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending_pay', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'picking', label: '拣货中' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

async function load() {
  loading.value = true;
  try {
    const params: any = {
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
      store_id: storeFilter.value || undefined,
      page: page.value, size: size.value,
    };
    // iter-42 EFF-01 高级搜索
    if (advanced.value.phone) params.phone = advanced.value.phone;
    if (advanced.value.user_id) params.user_id = Number(advanced.value.user_id);
    if (advanced.value.sku_code) params.sku_code = advanced.value.sku_code;
    if (advanced.value.amount_min_yuan) params.amount_min_cents = Math.round(Number(advanced.value.amount_min_yuan) * 100);
    if (advanced.value.amount_max_yuan) params.amount_max_cents = Math.round(Number(advanced.value.amount_max_yuan) * 100);
    if (advanced.value.start_date) params.start_date = advanced.value.start_date;
    if (advanced.value.end_date) params.end_date = advanced.value.end_date;
    const res: any = await omsApi.orderList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
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

function fmtPrice(cents: number) {
  return '¥' + (cents / 100).toFixed(2);
}

function goDetail(row: any) {
  router.push(`/oms/orders/${row.order_no}`);
}

const exporting = ref(false);
// 多选 + 批量取消（iter-18）
const selectedRows = ref<any[]>([]);
const canBatchCancel = computed(() =>
  selectedRows.value.length > 0 &&
  selectedRows.value.every(r => r.status === 'pending_pay' || r.status === 'paid')
);
const batching = ref(false);
function onSelectionChange(rows: any[]) { selectedRows.value = rows; }
async function onBatchCancel() {
  if (!canBatchCancel.value) { ElMessage.warning('选中的订单需全部为 pending_pay 或 paid'); return; }
  try {
    const { value: reason } = await ElMessageBox.prompt(`批量取消 ${selectedRows.value.length} 单`, '原因', { inputPlaceholder: '简述', inputValidator: v => !!v && v.length <= 50 || '请输入 1-50 字' });
    batching.value = true;
    const nos = selectedRows.value.map(r => r.order_no);
    const res: any = await omsApi.batchCancelOrders(nos, reason);
    const ok = res.data?.ok_count ?? 0, failed = res.data?.failed_count ?? 0;
    ElMessage[failed > 0 ? 'warning' : 'success'](`成功 ${ok} / 失败 ${failed}`);
    if (failed > 0 && res.data?.failed) console.warn('批量取消失败明细:', res.data.failed);
    await load();
  } catch { return; }
  finally { batching.value = false; }
}

async function onExport() {
  exporting.value = true;
  try {
    await omsApi.exportOrders({
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
    });
    ElMessage.success('导出已开始');
  } catch (e: any) {
    ElMessage.error(e?.message || e?.msg || '导出失败');
  } finally { exporting.value = false; }
}

onMounted(async () => { await loadStores(); await load(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">订单</h2>
        <p class="page-desc">OMS /api/v1/admin/order/list</p>
      </div>
      <div class="filters">
        <el-select v-if="auth.canSelectStore && stores.length > 1" v-model="storeFilter" placeholder="全部店铺" clearable style="width: 200px;" @change="page = 1; load()">
          <el-option v-for="s in stores" :key="s.id" :label="`${s.name} (id=${s.id})`" :value="s.id" />
        </el-select>
        <el-input v-model="keyword" placeholder="订单号 / 收货人 / 手机号" clearable style="width: 240px;" @keyup.enter="page = 1; load()" @clear="page = 1; load()" />
        <el-select v-model="statusFilter" placeholder="状态过滤" clearable style="width: 160px;" @change="page = 1; load()">
          <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button type="primary" @click="page = 1; load()">查询</el-button>
        <el-button @click="load">刷新</el-button>
        <el-button :loading="exporting" @click="onExport">导出 CSV</el-button>
        <el-button type="danger" :disabled="!canBatchCancel" :loading="batching" @click="onBatchCancel">批量取消 ({{ selectedRows.length }})</el-button>
        <el-button text :type="advancedOpen ? 'primary' : ''" @click="advancedOpen = !advancedOpen">
          高级搜索 {{ advancedOpen ? '▲' : '▼' }}
        </el-button>
      </div>
    </div>

    <!-- iter-42 EFF-01 高级搜索（可折叠）-->
    <el-card v-show="advancedOpen" class="advanced-search" shadow="never">
      <el-form inline :model="advanced" label-width="80px" size="small">
        <el-form-item label="手机号"><el-input v-model="advanced.phone" placeholder="收货人手机" clearable style="width:180px;" /></el-form-item>
        <el-form-item label="用户 ID"><el-input v-model="advanced.user_id" clearable style="width:140px;" /></el-form-item>
        <el-form-item label="SKU 反查"><el-input v-model="advanced.sku_code" placeholder="SKU code" clearable style="width:180px;" /></el-form-item>
        <el-form-item label="金额(元)">
          <el-input v-model="advanced.amount_min_yuan" placeholder="最小" clearable style="width:100px;" />
          <span style="margin: 0 6px;">→</span>
          <el-input v-model="advanced.amount_max_yuan" placeholder="最大" clearable style="width:100px;" />
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker v-model="advanced.start_date" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width:140px;" />
          <span style="margin: 0 6px;">→</span>
          <el-date-picker v-model="advanced.end_date" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width:140px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="page = 1; load()">应用高级搜索</el-button>
          <el-button @click="Object.assign(advanced, { phone:'', user_id:'', sku_code:'', amount_min_yuan:'', amount_max_yuan:'', start_date:'', end_date:'' }); page = 1; load()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="list" v-loading="loading" stripe border @row-click="goDetail" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="50" :selectable="(row: any) => row.status === 'pending_pay' || row.status === 'paid'" />
      <el-table-column v-if="auth.canSelectStore && stores.length > 1" label="店铺" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.store_id === 1" type="info" size="small">{{ storeMap[row.store_id] || '平台' }}</el-tag>
          <el-tag v-else size="small">{{ storeMap[row.store_id] || `id=${row.store_id}` }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="order_no" label="订单号" width="220" />
      <el-table-column prop="user_id" label="用户 ID" width="80" />
      <el-table-column label="金额" width="140">
        <template #default="{ row }"><span class="price">{{ fmtPrice(row.total_amount) }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column prop="express_no" label="快递单号" width="200" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="paid_at" label="支付时间" width="180" />
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
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.advanced-search { margin-bottom: 16px; background: #FAFAFA; }
.price { color: #FF385C; font-weight: 600; }
.pagination { margin-top: 16px; justify-content: flex-end; display: flex; }
::v-deep(.el-table__row) { cursor: pointer; }
</style>
