<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const STATUS_LABELS: Record<string, { label: string; type: any }> = {
  pending_approve: { label: '待审批', type: 'warning' },
  approved: { label: '已通过 · 等寄回', type: 'primary' },
  received_old: { label: '已收旧货 · 待发新', type: 'primary' },
  sent_new: { label: '新货已发 · 待签收', type: 'success' },
  completed: { label: '已完成', type: 'success' },
  rejected: { label: '已拒绝', type: 'info' },
  cancelled: { label: '已取消', type: 'info' },
};

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', order_no: '', exchange_no: '', user_id: '', page: 1, size: 20 });

const detailVisible = ref(false);
const detail = ref<any>(null);

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.status) params.status = filters.status;
    if (filters.order_no) params.order_no = filters.order_no;
    if (filters.exchange_no) params.exchange_no = filters.exchange_no;
    if (filters.user_id) params.user_id = Number(filters.user_id);
    const res: any = await omsApi.exchangeList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function openDetail(no: string) {
  try {
    const res: any = await omsApi.exchangeDetail(no);
    detail.value = res.data;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
}

async function onApprove(no: string) {
  try { await ElMessageBox.confirm(`确认通过换货「${no}」？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.exchangeApprove(no);
    ElMessage.success('已通过');
    await load(); if (detail.value?.exchange?.exchange_no === no) openDetail(no);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onReject(no: string) {
  let reason = '';
  try {
    const r: any = await ElMessageBox.prompt('请填写拒绝原因', '拒绝换货', {
      inputValidator: (v) => !!v?.trim() || '必填', confirmButtonText: '拒绝', cancelButtonText: '取消',
    });
    reason = r.value;
  } catch { return; }
  try {
    await omsApi.exchangeReject(no, reason);
    ElMessage.success('已拒绝');
    await load(); if (detail.value?.exchange?.exchange_no === no) openDetail(no);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onReceivedOld(no: string) {
  let tracking = '', note = '';
  try {
    const t: any = await ElMessageBox.prompt('请填写用户寄回的物流单号（选填，缺省 -）', '标记收到旧货', {
      confirmButtonText: '下一步', cancelButtonText: '取消',
    });
    tracking = t.value || '';
    const n: any = await ElMessageBox.prompt('备注（如旧货状况，选填）', '标记收到旧货', {
      confirmButtonText: '保存', cancelButtonText: '取消', inputValue: '包装完好',
    });
    note = n.value || '';
  } catch { return; }
  try {
    await omsApi.exchangeReceivedOld(no, { tracking_no_old: tracking, note });
    ElMessage.success('已标记 received_old');
    await load(); if (detail.value?.exchange?.exchange_no === no) openDetail(no);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onSentNew(no: string) {
  let tracking = '';
  try {
    const r: any = await ElMessageBox.prompt('请填写新货物流单号（必填）', '标记新货已发出', {
      inputValidator: (v) => !!v?.trim() || '必填', confirmButtonText: '保存', cancelButtonText: '取消',
    });
    tracking = r.value;
  } catch { return; }
  try {
    await omsApi.exchangeSentNew(no, tracking);
    ElMessage.success('已标记 sent_new');
    await load(); if (detail.value?.exchange?.exchange_no === no) openDetail(no);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onComplete(no: string) {
  try { await ElMessageBox.confirm(`标记换货「${no}」完成？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.exchangeComplete(no);
    ElMessage.success('已完成');
    await load(); if (detail.value?.exchange?.exchange_no === no) openDetail(no);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">换货审批</h2>
        <p class="page-desc">OMS /admin/exchange · 用户申请换货后在此审批 + 跟踪物流（iter-34）</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:200px;">
          <el-option v-for="(v, k) in STATUS_LABELS" :key="k" :label="v.label" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="订单号"><el-input v-model="filters.order_no" clearable style="width:200px;" /></el-form-item>
      <el-form-item label="换货号"><el-input v-model="filters.exchange_no" clearable style="width:200px;" /></el-form-item>
      <el-form-item label="用户 ID"><el-input v-model="filters.user_id" clearable style="width:120px;" /></el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page = 1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="exchange_no" label="换货号" width="200" />
      <el-table-column prop="order_no" label="订单号" width="180" />
      <el-table-column prop="user_id" label="用户" width="80" />
      <el-table-column label="状态" width="200">
        <template #default="{ row }">
          <el-tag :type="STATUS_LABELS[row.status]?.type || 'info'" size="small">
            {{ STATUS_LABELS[row.status]?.label || row.status }}
          </el-tag>
          <el-tag v-if="row.needs_second_review" type="warning" size="small" style="margin-left:4px;">⚑ 待 super 二审</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="180" />
      <el-table-column prop="created_at" label="创建时间" width="160" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.exchange_no)">详情</el-button>
          <el-button v-if="row.status === 'pending_approve'" size="small" type="success" @click="onApprove(row.exchange_no)">通过</el-button>
          <el-button v-if="row.status === 'pending_approve'" size="small" type="danger" @click="onReject(row.exchange_no)">拒绝</el-button>
          <el-button v-if="row.status === 'approved'" size="small" type="primary" @click="onReceivedOld(row.exchange_no)">收到旧货</el-button>
          <el-button v-if="row.status === 'received_old'" size="small" type="primary" @click="onSentNew(row.exchange_no)">发新货</el-button>
          <el-button v-if="row.status === 'sent_new'" size="small" type="success" @click="onComplete(row.exchange_no)">完成</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="detailVisible" title="换货详情" width="720px">
      <div v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="换货号">{{ detail.exchange.exchange_no }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="STATUS_LABELS[detail.exchange.status]?.type || 'info'" size="small">
              {{ STATUS_LABELS[detail.exchange.status]?.label || detail.exchange.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="订单号">{{ detail.exchange.order_no }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detail.exchange.user_id }}</el-descriptions-item>
          <el-descriptions-item label="原因" :span="2">{{ detail.exchange.reason }}</el-descriptions-item>
          <el-descriptions-item label="审批" :span="2">
            <span v-if="detail.exchange.approved_at">{{ detail.exchange.approved_at }} by {{ detail.exchange.approved_by }}</span>
            <span v-else-if="detail.exchange.rejected_at" style="color:#F56C6C">{{ detail.exchange.rejected_at }} 拒绝: {{ detail.exchange.reject_reason }}</span>
            <span v-else style="color:#999">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="旧货回收" :span="2">
            <span v-if="detail.exchange.received_old_at">
              {{ detail.exchange.received_old_at }} ·
              单号 {{ detail.exchange.tracking_no_old || '-' }} ·
              备注 {{ detail.exchange.received_old_note || '-' }}
            </span>
            <span v-else style="color:#999">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="新货发出" :span="2">
            <span v-if="detail.exchange.sent_new_at">
              {{ detail.exchange.sent_new_at }} · 单号 {{ detail.exchange.tracking_no_new }}
            </span>
            <span v-else style="color:#999">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="完成时间" :span="2">{{ detail.exchange.completed_at || '—' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px;">换货明细（{{ detail.items.length }} 行）</h4>
        <el-table :data="detail.items" border size="small">
          <el-table-column prop="old_sku_code" label="旧 SKU" width="140" />
          <el-table-column prop="new_sku_code" label="新 SKU" width="140" />
          <el-table-column prop="qty" label="数量" width="80" />
          <el-table-column prop="item_reason" label="行原因" min-width="160" />
        </el-table>

        <div v-if="detail.exchange.evidence_images?.length" style="margin-top: 16px;">
          <h4 style="margin: 0 0 8px;">凭证图</h4>
          <el-image
            v-for="(url, idx) in detail.exchange.evidence_images" :key="idx"
            :src="url" :preview-src-list="detail.exchange.evidence_images" :initial-index="idx"
            style="width:100px;height:100px;margin-right:8px;border:1px solid #eee;border-radius:4px;"
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
