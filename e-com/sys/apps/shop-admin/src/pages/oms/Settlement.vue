<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const netAmountYuan = ref('0.00');
const filters = reactive({
  type: '', status: '', start_date: '', end_date: '',
  page: 1, size: 20,
});

const fenToYuan = (fen: number) => (Number(fen) / 100).toFixed(2);

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.settlementList({
      type: filters.type || undefined,
      status: filters.status || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      page: filters.page, size: filters.size,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
    netAmountYuan.value = res.data?.net_amount_yuan || '0.00';
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onSettle(row: any) {
  try {
    await ElMessageBox.confirm(`确认入账 ${row.settlement_no}？标记 settled，仅状态变化`, '确认', { type: 'warning' });
    await omsApi.settlementSettle(row.settlement_no);
    ElMessage.success('已入账');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

async function onExport() {
  try {
    await omsApi.settlementExport({
      type: filters.type || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    });
    ElMessage.success('已下载');
  } catch (e: any) { ElMessage.error(e?.msg || '导出失败'); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">财务结算单</h2>
        <p class="page-desc">OMS /admin/settlement · iter-26 P0-3 · order confirm / refund refunded 自动落单</p>
      </div>
      <div>
        <el-button @click="onExport">导出 CSV</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-card class="net-card">
      <div class="net-row">
        <div>
          <span class="net-label">当前筛选条件下 净金额（订单 + 退款负数）：</span>
          <span class="net-value">¥{{ netAmountYuan }}</span>
        </div>
        <div class="net-meta">{{ total }} 条记录</div>
      </div>
    </el-card>

    <el-form inline :model="filters" class="filters">
      <el-form-item label="类型">
        <el-select v-model="filters.type" placeholder="全部" clearable style="width:160px" @change="load">
          <el-option label="订单" value="order" />
          <el-option label="退款" value="refund" />
          <el-option label="平台抽佣" value="platform_commission" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:140px" @change="load">
          <el-option label="未入账" value="unsettled" />
          <el-option label="已入账" value="settled" />
        </el-select>
      </el-form-item>
      <el-form-item label="起始">
        <el-input v-model="filters.start_date" placeholder="YYYY-MM-DD" style="width:160px" @change="load" />
      </el-form-item>
      <el-form-item label="结束">
        <el-input v-model="filters.end_date" placeholder="YYYY-MM-DD" style="width:160px" @change="load" />
      </el-form-item>
      <el-button @click="load">查询</el-button>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="settlement_no" label="结算单号" width="220" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'order' ? 'success' : 'warning'">{{ row.type === 'order' ? '订单' : '退款' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ref_no" label="关联单号" width="220" />
      <el-table-column prop="user_id" label="用户" width="80" />
      <el-table-column label="金额 (元)" width="120">
        <template #default="{ row }">
          <span :class="row.amount < 0 ? 'amt-neg' : 'amt-pos'">
            {{ row.amount < 0 ? '-' : '' }}¥{{ fenToYuan(Math.abs(row.amount)) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="商品额" width="100">
        <template #default="{ row }">{{ fenToYuan(row.goods_amount) }}</template>
      </el-table-column>
      <el-table-column label="运费" width="80">
        <template #default="{ row }">{{ fenToYuan(row.freight) }}</template>
      </el-table-column>
      <el-table-column label="优惠" width="80">
        <template #default="{ row }">{{ fenToYuan(row.discount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'settled' ? 'success' : 'info'">{{ row.status === 'settled' ? '已入账' : '未入账' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="settled_at" label="入账时间" width="180" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'unsettled'" size="small" type="primary" @click="onSettle(row)">入账</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page" v-model:page-size="filters.size"
      :total="total" :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load" @size-change="load"
    />
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.net-card { margin-bottom: 16px; border-left: 4px solid #67C23A; }
.net-row { display: flex; justify-content: space-between; align-items: center; }
.net-label { color: #717171; font-size: 13px; }
.net-value { font-size: 24px; font-weight: bold; color: #67C23A; margin-left: 8px; }
.net-meta { color: #999; font-size: 13px; }
.filters { margin-bottom: 12px; padding: 12px; background: #fafafa; border-radius: 4px; }
.amt-pos { color: #67C23A; font-weight: bold; }
.amt-neg { color: #FF385C; font-weight: bold; }
</style>
