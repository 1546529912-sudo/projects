<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { omsApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';

const auth = useAuthStore();

const balance = ref<any>({ balance: 0, settled_net: 0, pending_withdraw: 0, paid_withdraw: 0 });
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const statusFilter = ref('');
const page = ref(1);
const size = ref(20);

const applyOpen = ref(false);
const applyForm = ref({ amount_yuan: '' as string | number, remark: '' });
const submitting = ref(false);

async function loadBalance() {
  try {
    const res: any = await omsApi.withdrawalBalance();
    balance.value = res?.data || balance.value;
  } catch (e: any) {
    if (e?.code !== 400) ElMessage.warning(e?.msg || '');
  }
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await omsApi.withdrawalList({ status: statusFilter.value || undefined, page: page.value, size: size.value });
    list.value = res?.data?.list || [];
    total.value = res?.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

async function load() {
  if (auth.canApplyWithdrawal) await loadBalance();
  await loadList();
}

function openApply() {
  applyForm.value = { amount_yuan: '', remark: '' };
  applyOpen.value = true;
}

async function submitApply() {
  const yuan = Number(applyForm.value.amount_yuan);
  if (!yuan || yuan <= 0) { ElMessage.warning('请输入金额（元）'); return; }
  submitting.value = true;
  try {
    const amount = Math.round(yuan * 100);
    await omsApi.withdrawalApply({ amount, remark: applyForm.value.remark });
    ElMessage.success('已提交申请，等待平台审批');
    applyOpen.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '申请失败');
  } finally { submitting.value = false; }
}

async function approve(row: any) {
  try {
    await ElMessageBox.confirm(`确认通过提现 ${row.withdrawal_no}（¥${fmtAmount(row.amount)}）？通过后扣减余额`, '审批通过', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.withdrawalApprove(row.withdrawal_no);
    ElMessage.success('已审批通过');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '失败'); }
}

async function reject(row: any) {
  let reason = '';
  try {
    const { value } = await ElMessageBox.prompt('请填拒绝原因', `拒绝 ${row.withdrawal_no}`, { inputValidator: v => !!v && v.length <= 200 || '请输入 1-200 字' });
    reason = value;
  } catch { return; }
  try {
    await omsApi.withdrawalReject(row.withdrawal_no, reason);
    ElMessage.success('已拒绝');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '失败'); }
}

async function pay(row: any) {
  let method = 'bank', ref = '';
  try {
    const { value } = await ElMessageBox.prompt('请填打款流水号', `打款 ${row.withdrawal_no}（¥${fmtAmount(row.amount)}）`, { inputPlaceholder: '银行流水号 / 支付宝订单号' });
    ref = value;
  } catch { return; }
  try {
    await omsApi.withdrawalPay(row.withdrawal_no, method, ref);
    ElMessage.success('已标记打款');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '失败'); }
}

function fmtAmount(cents: number) { return (cents / 100).toFixed(2); }

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过 / 待打款' },
  { value: 'paid', label: '已打款' },
  { value: 'rejected', label: '已拒绝' },
];

const statusTagType = (s: string) => ({
  pending: 'warning', approved: 'primary', paid: 'success', rejected: 'danger',
}[s] || 'info');

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">商家提现</h2>
        <p class="page-desc">Q35-03 / Q39-03 多商家收口 · {{ auth.canApplyWithdrawal ? '商家自助申请 + 平台审批打款' : '平台审批 + 打款' }} · iter-50</p>
      </div>
      <div class="filters">
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 160px;" @change="page = 1; loadList()">
          <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-button @click="load">刷新</el-button>
        <el-button v-if="auth.canApplyWithdrawal" type="primary" @click="openApply">💰 申请提现</el-button>
      </div>
    </div>

    <!-- 余额卡（仅商家可见）-->
    <div v-if="auth.canApplyWithdrawal" class="balance-row">
      <div class="bal-card hot">
        <div class="lbl">可提现余额</div>
        <div class="num">¥{{ fmtAmount(balance.balance) }}</div>
      </div>
      <div class="bal-card">
        <div class="lbl">累计结算净额</div>
        <div class="num small">¥{{ fmtAmount(balance.settled_net) }}</div>
      </div>
      <div class="bal-card warn">
        <div class="lbl">审批中（已锁定）</div>
        <div class="num small">¥{{ fmtAmount(balance.pending_withdraw) }}</div>
      </div>
      <div class="bal-card good">
        <div class="lbl">累计已打款</div>
        <div class="num small">¥{{ fmtAmount(balance.paid_withdraw) }}</div>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="withdrawal_no" label="单号" width="200" />
      <el-table-column v-if="!auth.canApplyWithdrawal" prop="store_id" label="店铺" width="80" />
      <el-table-column label="金额（元）" width="120">
        <template #default="{ row }"><span class="price">¥{{ fmtAmount(row.amount) }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="requested_by" label="申请人" width="120" />
      <el-table-column prop="created_at" label="申请时间" width="170" />
      <el-table-column prop="approved_by" label="审批人" width="100" />
      <el-table-column prop="paid_method" label="打款方式" width="100" />
      <el-table-column prop="paid_ref" label="流水号" min-width="160" />
      <el-table-column prop="remark" label="备注" min-width="140" />
      <el-table-column label="操作" width="220" fixed="right" v-if="auth.canApproveWithdrawal">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button size="small" type="primary" @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
          </template>
          <el-button v-else-if="row.status === 'approved'" size="small" type="success" @click="pay(row)">标记打款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size"
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      layout="prev, pager, next, total"
      style="margin-top:16px; justify-content: flex-end;"
      @current-change="loadList"
    />

    <!-- 申请弹框 -->
    <el-dialog v-model="applyOpen" title="申请提现" width="420px">
      <el-form label-width="100px">
        <el-form-item label="可提现">
          <span class="price">¥{{ fmtAmount(balance.balance) }}</span>
        </el-form-item>
        <el-form-item label="提现金额（元）" required>
          <el-input v-model="applyForm.amount_yuan" type="number" placeholder="最大可提 ¥{{ fmtAmount(balance.balance) }}" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="applyForm.remark" type="textarea" :rows="2" maxlength="200" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 8px; }
.balance-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.bal-card { background: #FFF; border: 1px solid #EEE; border-radius: 8px; padding: 14px 16px; border-left: 4px solid #DDD; }
.bal-card.hot { border-left-color: #FF385C; }
.bal-card.warn { border-left-color: #E6A23C; }
.bal-card.good { border-left-color: #67C23A; }
.bal-card .lbl { color: #717171; font-size: 12px; }
.bal-card .num { font-size: 24px; font-weight: 700; color: #222; margin-top: 4px; }
.bal-card .num.small { font-size: 16px; }
.price { color: #FF385C; font-weight: 600; }
</style>
