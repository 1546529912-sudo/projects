<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', type: '', keyword: '', page: 1, size: 20 });

const detailVisible = ref(false);
const detail = ref<any>(null);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.keyword) params.keyword = filters.keyword;
    const res: any = await omsApi.refundList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

async function onShowDetail(row: any) {
  try {
    const res: any = await omsApi.refundDetail(row.refund_no);
    detail.value = res.data;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
}

async function onApprove(row: any) {
  try {
    await ElMessageBox.confirm(`通过退款 ${row.refund_no}？${row.type === 'return_refund' ? '将 reserve 库存等待退货回仓' : 'refund_only 会自动 unlock 库存并完成'}`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.refundApprove(row.refund_no);
    ElMessage.success('已审批通过');
    detailVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '审批失败'); }
}

async function onReject(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('拒绝原因', '拒绝退款', { inputPlaceholder: '简述拒绝理由', inputValidator: v => !!v && v.length <= 200 || '请输入 1-200 字' });
    await omsApi.refundReject(row.refund_no, value);
    ElMessage.success('已拒绝');
    detailVisible.value = false;
    await load();
  } catch { return; }
}

async function onConfirm(row: any) {
  try {
    await ElMessageBox.confirm(`确认完成退款 ${row.refund_no}？`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.refundConfirm(row.refund_no);
    ElMessage.success('退款完成');
    detailVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

function fmtAmount(cents: number) { return '¥' + ((cents || 0) / 100).toFixed(2); }
function typeLabel(t: string) { return t === 'refund_only' ? '仅退款' : '退货退款'; }

function parseEvidence(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; }
}

const exporting = ref(false);
// 多选 + 批量审批（iter-18）
const selectedRows = ref<any[]>([]);
const canBatch = computed(() =>
  selectedRows.value.length > 0 &&
  selectedRows.value.every(r => r.status === 'pending_approve')
);
const batching = ref(false);
function onSelectionChange(rows: any[]) { selectedRows.value = rows; }
async function onBatchApprove() {
  if (!canBatch.value) { ElMessage.warning('选中的需全部为 pending_approve'); return; }
  try {
    await ElMessageBox.confirm(`批量通过 ${selectedRows.value.length} 笔退款？`, '确认', { type: 'warning' });
  } catch { return; }
  batching.value = true;
  try {
    const nos = selectedRows.value.map(r => r.refund_no);
    const res: any = await omsApi.batchApproveRefunds(nos);
    const ok = res.data?.ok_count ?? 0, failed = res.data?.failed_count ?? 0;
    ElMessage[failed > 0 ? 'warning' : 'success'](`成功 ${ok} / 失败 ${failed}`);
    if (failed > 0) console.warn('失败明细:', res.data.failed);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '批量操作失败'); }
  finally { batching.value = false; }
}
async function onBatchReject() {
  if (!canBatch.value) { ElMessage.warning('选中的需全部为 pending_approve'); return; }
  try {
    const { value: reason } = await ElMessageBox.prompt(`批量拒绝 ${selectedRows.value.length} 笔退款`, '原因', { inputPlaceholder: '简述', inputValidator: v => !!v && v.length <= 200 || '请输入 1-200 字' });
    batching.value = true;
    const nos = selectedRows.value.map(r => r.refund_no);
    const res: any = await omsApi.batchRejectRefunds(nos, reason);
    const ok = res.data?.ok_count ?? 0, failed = res.data?.failed_count ?? 0;
    ElMessage[failed > 0 ? 'warning' : 'success'](`成功 ${ok} / 失败 ${failed}`);
    if (failed > 0) console.warn('失败明细:', res.data.failed);
    await load();
  } catch { return; }
  finally { batching.value = false; }
}

async function onExport() {
  exporting.value = true;
  try {
    await omsApi.exportRefunds({
      status: filters.status || undefined,
      type: filters.type || undefined,
      keyword: filters.keyword || undefined,
    });
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
        <h2 class="page-title">退款审批</h2>
        <p class="page-desc">OMS /api/v1/admin/refund · pending_approve → approved → received_back → refunded</p>
      </div>
      <div>
        <el-button @click="load">刷新</el-button>
        <el-button :loading="exporting" @click="onExport">导出 CSV</el-button>
        <el-button type="success" :disabled="!canBatch" :loading="batching" @click="onBatchApprove">批量通过 ({{ selectedRows.length }})</el-button>
        <el-button type="danger" :disabled="!canBatch" :loading="batching" @click="onBatchReject">批量拒绝</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:160px;">
          <el-option label="pending_approve 待审批" value="pending_approve" />
          <el-option label="approved 已通过" value="approved" />
          <el-option label="received_back 已收货" value="received_back" />
          <el-option label="refunded 已退款" value="refunded" />
          <el-option label="rejected 已拒绝" value="rejected" />
          <el-option label="closed_overtime 超时关闭" value="closed_overtime" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="filters.type" placeholder="全部" clearable style="width:140px;">
          <el-option label="仅退款" value="refund_only" />
          <el-option label="退货退款" value="return_refund" />
        </el-select>
      </el-form-item>
      <el-form-item label="搜索">
        <el-input v-model="filters.keyword" placeholder="退款单号 / 订单号" clearable style="width:240px;" @keyup.enter="filters.page = 1; load()" @clear="filters.page = 1; load()" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border @selection-change="onSelectionChange">
      <el-table-column type="selection" width="50" :selectable="(row: any) => row.status === 'pending_approve'" />
      <el-table-column prop="refund_no" label="退款单号" width="200" />
      <el-table-column prop="order_no" label="原订单号" width="200" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="180">
        <template #default="{ row }">
          <StatusTag :status="row.status" />
          <el-tag v-if="row.needs_second_review" type="warning" size="small" style="margin-left:4px;">⚑ 待 super 二审</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">{{ fmtAmount(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" />
      <el-table-column prop="created_at" label="申请时间" width="180" />
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onShowDetail(row)">明细</el-button>
          <el-button size="small" type="success" v-if="row.status === 'pending_approve'" @click="onApprove(row)">通过</el-button>
          <el-button size="small" type="danger" v-if="row.status === 'pending_approve'" @click="onReject(row)">拒绝</el-button>
          <el-button size="small" type="primary" v-if="row.status === 'received_back'" @click="onConfirm(row)">确认退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="detailVisible" title="退款单明细" width="700px">
      <div v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="退款单号">{{ detail.refund.refund_no }}</el-descriptions-item>
          <el-descriptions-item label="原订单号">{{ detail.refund.order_no }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeLabel(detail.refund.type) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detail.refund.status" /></el-descriptions-item>
          <el-descriptions-item label="金额">{{ fmtAmount(detail.refund.amount) }}</el-descriptions-item>
          <el-descriptions-item label="申请原因">{{ detail.refund.reason }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ detail.refund.created_at }}</el-descriptions-item>
          <el-descriptions-item label="审批时间">{{ detail.refund.approved_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货时间">{{ detail.refund.received_back_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="退款时间">{{ detail.refund.refunded_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="拒绝原因" v-if="detail.refund.reject_reason">{{ detail.refund.reject_reason }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="detail.items" border size="small" style="margin-top:12px;">
          <el-table-column prop="sku_code" label="SKU" width="160" />
          <el-table-column prop="qty" label="退款数量" width="100" />
        </el-table>

        <div v-if="parseEvidence(detail.refund.evidence_images).length" style="margin-top:16px;">
          <div style="font-weight:600;margin-bottom:8px;">凭证图片</div>
          <el-image
            v-for="(img, idx) in parseEvidence(detail.refund.evidence_images)"
            :key="idx"
            :src="img"
            :preview-src-list="parseEvidence(detail.refund.evidence_images)"
            :initial-index="idx"
            fit="cover"
            style="width:96px;height:96px;border-radius:6px;margin-right:8px;"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
