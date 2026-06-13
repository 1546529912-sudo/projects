<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const route = useRoute();
const router = useRouter();
const orderNo = computed(() => route.params.no as string);

const order = ref<any>(null);
const items = ref<any[]>([]);
const statusLog = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.orderDetail(orderNo.value);
    order.value = res.data?.order;
    items.value = res.data?.items || [];
    statusLog.value = res.data?.status_log || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function fmtPrice(cents: number) {
  return '¥' + (cents / 100).toFixed(2);
}

const canCancel = computed(() => order.value && ['pending_pay', 'paid'].includes(order.value.status));
const canRecover = computed(() => order.value?.status === 'exception');

const recoverDialog = ref(false);
const recoverForm = reactive({ to_status: 'paid', reason: '' });

async function onAdminCancel() {
  try {
    const { value } = await ElMessageBox.prompt('管理员强制取消，paid 订单会同步解锁库存。', '取消订单', {
      inputPlaceholder: '取消原因',
      inputValue: 'admin 处理',
      confirmButtonText: '确认取消',
      cancelButtonText: '不取消',
      type: 'warning',
    });
    await omsApi.cancelOrder(orderNo.value, value || 'admin 处理');
    ElMessage.success('已取消');
    await load();
  } catch (e: any) {
    if (e === 'cancel' || e?.message === 'cancel') return;
    ElMessage.error(e?.msg || '取消失败');
  }
}

function openRecover() { Object.assign(recoverForm, { to_status: 'paid', reason: '' }); recoverDialog.value = true; }

async function onRecover() {
  if (!recoverForm.reason) { ElMessage.warning('请填理由'); return; }
  try {
    await omsApi.recoverOrder(orderNo.value, recoverForm.to_status, recoverForm.reason);
    ElMessage.success('已恢复');
    recoverDialog.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '恢复失败');
  }
}

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <div class="page-head">
      <h2 class="page-title">订单 · {{ orderNo }}</h2>
      <div>
        <el-button type="danger" :disabled="!canCancel" @click="onAdminCancel">管理员取消</el-button>
        <el-button :disabled="!canRecover" @click="openRecover">异常恢复</el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-card v-if="order" class="card">
      <template #header>
        <div class="card-header">
          <span>订单信息</span>
          <StatusTag :status="order.status" />
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="订单号">{{ order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="用户 ID">{{ order.user_id }}</el-descriptions-item>
        <el-descriptions-item label="幂等键">{{ order.idempotency_key }}</el-descriptions-item>
        <el-descriptions-item label="商品金额">{{ fmtPrice(order.goods_amount) }}</el-descriptions-item>
        <el-descriptions-item label="运费">{{ fmtPrice(order.freight) }}</el-descriptions-item>
        <el-descriptions-item label="应付总额">
          <span class="price">{{ fmtPrice(order.total_amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="快递单号">{{ order.express_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="trace_id">{{ order.trace_id }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ order.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="order?.address" class="card">
      <template #header>收货地址</template>
      <div>
        <strong>{{ order.address.name }}</strong>
        <span class="phone">{{ order.address.phone }}</span>
      </div>
      <div class="detail">
        {{ order.address.province }} {{ order.address.city }} {{ order.address.district }} {{ order.address.detail }}
      </div>
    </el-card>

    <el-card class="card">
      <template #header>商品 ({{ items.length }} 项)</template>
      <el-table :data="items" stripe border>
        <el-table-column prop="sku_code" label="SKU" width="160" />
        <el-table-column label="商品">
          <template #default="{ row }">{{ row.sku_snapshot?.spu_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="qty" label="数量" width="80" />
        <el-table-column label="单价" width="120">
          <template #default="{ row }">{{ fmtPrice(row.unit_price) }}</template>
        </el-table-column>
        <el-table-column label="小计" width="140">
          <template #default="{ row }"><span class="price">{{ fmtPrice(row.subtotal) }}</span></template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="card">
      <template #header>状态时间线</template>
      <el-timeline>
        <el-timeline-item v-if="order?.created_at" :timestamp="order.created_at">下单</el-timeline-item>
        <el-timeline-item v-if="order?.paid_at" :timestamp="order.paid_at" color="#FF385C">支付成功</el-timeline-item>
        <el-timeline-item v-if="order?.shipped_at" :timestamp="order.shipped_at" color="#FF385C">WMS 出库 · {{ order.express_no }}</el-timeline-item>
        <el-timeline-item v-if="order?.completed_at" :timestamp="order.completed_at" color="#67C23A">已完成</el-timeline-item>
        <el-timeline-item v-if="order?.cancelled_at" :timestamp="order.cancelled_at" color="#909399">已取消（{{ order.cancel_reason }}）</el-timeline-item>
      </el-timeline>
    </el-card>

    <el-card class="card">
      <template #header>状态变更日志（status_log）</template>
      <el-table :data="statusLog" stripe>
        <el-table-column prop="created_at" label="时间" width="180" />
        <el-table-column label="转换">
          <template #default="{ row }">
            <span class="from">{{ row.from_status || '初始' }}</span>
            →
            <StatusTag :status="row.to_status" />
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作者" width="160" />
        <el-table-column prop="source" label="来源" width="140" />
        <el-table-column prop="remark" label="备注" />
      </el-table>
    </el-card>

    <el-dialog v-model="recoverDialog" title="异常订单恢复" width="400px">
      <el-form :model="recoverForm" label-width="80px">
        <el-form-item label="目标状态">
          <el-select v-model="recoverForm.to_status" style="width:100%;">
            <el-option label="paid 已支付" value="paid" />
            <el-option label="picking 拣货中" value="picking" />
            <el-option label="shipped 已发货" value="shipped" />
            <el-option label="completed 已完成" value="completed" />
            <el-option label="cancelled 已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="理由" required>
          <el-input v-model="recoverForm.reason" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recoverDialog = false">取消</el-button>
        <el-button type="primary" @click="onRecover">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.price { color: #FF385C; font-weight: 600; }
.phone { color: #717171; margin-left: 12px; }
.detail { color: #555; margin-top: 8px; }
.from { color: #717171; margin-right: 8px; }
</style>
