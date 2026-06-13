<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const STATUS_LABELS: Record<string, { label: string; type: any }> = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  suspended: { label: '已暂停', type: 'danger' },
  closed: { label: '已关闭', type: 'info' },
};

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', keyword: '', page: 1, size: 20 });

// 新建 / 详情弹窗
const createVisible = ref(false);
const createForm = reactive({
  code: '', name: '', description: '', logo_url: '',
  contact_name: '', contact_phone: '', business_license: '',
  commission_rate: 0.05,
});

const detailVisible = ref(false);
const detail = ref<any>(null);

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.status) params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    const res: any = await omsApi.storeList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onCreate() {
  Object.assign(createForm, {
    code: '', name: '', description: '', logo_url: '',
    contact_name: '', contact_phone: '', business_license: '',
    commission_rate: 0.05,
  });
  createVisible.value = true;
}

async function onSubmitCreate() {
  if (!createForm.code.trim() || !createForm.name.trim()) {
    ElMessage.warning('code / name 必填'); return;
  }
  try {
    await omsApi.storeCreate(createForm);
    ElMessage.success('已创建（待审批）');
    createVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '创建失败'); }
}

async function openDetail(id: number) {
  try {
    const res: any = await omsApi.storeDetail(id);
    detail.value = res.data;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
}

async function onApprove(id: number) {
  try { await ElMessageBox.confirm('确认通过此店铺申请？将自动创建店主账号（store_owner）', '确认', { type: 'warning' }); } catch { return; }
  try {
    const res: any = await omsApi.storeApprove(id);
    const acc = res.data?.auto_account;
    if (acc?.username) {
      ElMessageBox.alert(
        `已通过 + 自动创建店主账号：<br/><br/>` +
        `<b>账号：</b> <code>${acc.username}</code><br/>` +
        `<b>密码：</b> <code>${acc.password || '(已存在账号，沿用原密码)'}</code><br/><br/>` +
        `<span style="color:#F56C6C">⚠️ 密码只显示一次，请告知店主</span>`,
        '店铺已通过',
        { type: 'success', dangerouslyUseHTMLString: true, confirmButtonText: '我知道了' }
      );
    } else {
      ElMessage.success('已通过');
    }
    await load(); if (detail.value?.store?.id === id) openDetail(id);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onSuspend(id: number) {
  let reason = '';
  try {
    const r: any = await ElMessageBox.prompt('暂停原因（违规、对账异常等）', '暂停店铺', {
      inputValidator: (v) => !!v?.trim() || '必填', confirmButtonText: '暂停', cancelButtonText: '取消',
    });
    reason = r.value;
  } catch { return; }
  try {
    await omsApi.storeSuspend(id, reason);
    ElMessage.success('已暂停');
    await load(); if (detail.value?.store?.id === id) openDetail(id);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onResume(id: number) {
  try { await ElMessageBox.confirm('恢复此店铺？', '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.storeResume(id);
    ElMessage.success('已恢复');
    await load(); if (detail.value?.store?.id === id) openDetail(id);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onUpdateCommission(row: any) {
  let rate = 0;
  try {
    const r: any = await ElMessageBox.prompt(`新抽佣率（0-0.5，当前 ${row.commission_rate}）`, '调整抽佣', {
      inputPattern: /^0(\.\d+)?|0\.5$/,
      inputErrorMessage: '请输入 0-0.5 之间的小数',
      inputValue: String(row.commission_rate),
      confirmButtonText: '保存',
    });
    rate = parseFloat(r.value);
  } catch { return; }
  try {
    await omsApi.storeUpdateCommission(row.id, rate);
    ElMessage.success(`已调整为 ${(rate * 100).toFixed(2)}%`);
    await load(); if (detail.value?.store?.id === row.id) openDetail(row.id);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onAddAdmin(id: number) {
  let adminId = 0; let role: 'store_owner' | 'store_staff' = 'store_owner';
  try {
    const r: any = await ElMessageBox.prompt('admin_user_id（管理员管理页面中的 ID）', '添加店铺管理员', {
      inputValidator: (v) => /^\d+$/.test(v) || '必须是数字',
      confirmButtonText: '下一步',
    });
    adminId = parseInt(r.value, 10);
    const r2: any = await ElMessageBox.prompt('角色：store_owner / store_staff', '添加店铺管理员', {
      inputValidator: (v) => ['store_owner', 'store_staff'].includes(v) || '只能 store_owner 或 store_staff',
      inputValue: 'store_owner',
      confirmButtonText: '保存',
    });
    role = r2.value as any;
  } catch { return; }
  try {
    await omsApi.storeAddAdmin(id, adminId, role);
    ElMessage.success('已绑定');
    if (detail.value?.store?.id === id) openDetail(id);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onRemoveAdmin(storeId: number, adminUserId: number) {
  try { await ElMessageBox.confirm(`移除该管理员对此店的权限？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.storeRemoveAdmin(storeId, adminUserId);
    ElMessage.success('已移除');
    if (detail.value?.store?.id === storeId) openDetail(storeId);
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

const fmtRate = (v: any) => v == null ? '—' : (parseFloat(v) * 100).toFixed(2) + '%';

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">店铺管理</h2>
        <p class="page-desc">BIZ-08 iter-35 架构地基 · 平台多商家入驻；id=1 为平台自营店，存量数据归此店</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建店铺</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:200px;">
          <el-option v-for="(v, k) in STATUS_LABELS" :key="k" :label="v.label" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="filters.keyword" placeholder="code / name" clearable style="width:240px;" />
      </el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page = 1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="code" width="160" />
      <el-table-column label="名称" min-width="180">
        <template #default="{ row }">
          <strong v-if="row.id === 1" style="color:#FF385C">{{ row.name }}</strong>
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="STATUS_LABELS[row.status]?.type || 'info'" size="small">
            {{ STATUS_LABELS[row.status]?.label || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="抽佣率" width="100">
        <template #default="{ row }">{{ fmtRate(row.commission_rate) }}</template>
      </el-table-column>
      <el-table-column prop="contact_name" label="联系人" width="120" />
      <el-table-column prop="contact_phone" label="联系电话" width="140" />
      <el-table-column prop="created_at" label="创建时间" width="160" />
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.id)">详情</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="success" @click="onApprove(row.id)">通过</el-button>
          <el-button v-if="row.status === 'approved' && row.id !== 1" size="small" type="danger" @click="onSuspend(row.id)">暂停</el-button>
          <el-button v-if="row.status === 'suspended'" size="small" type="primary" @click="onResume(row.id)">恢复</el-button>
          <el-button v-if="row.id !== 1" size="small" @click="onUpdateCommission(row)">改抽佣</el-button>
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

    <!-- 新建弹窗 -->
    <el-dialog v-model="createVisible" title="新建店铺（pending 状态，需审批）" width="640px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="code" required><el-input v-model="createForm.code" placeholder="唯一识别，如 shop-iphone" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="createForm.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="createForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="createForm.contact_name" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="createForm.contact_phone" /></el-form-item>
        <el-form-item label="营业执照号"><el-input v-model="createForm.business_license" /></el-form-item>
        <el-form-item label="抽佣率">
          <el-input-number v-model="createForm.commission_rate" :min="0" :max="0.5" :step="0.01" :precision="4" />
          <span class="hint">0.05 = 5% · 范围 0~0.5</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmitCreate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="店铺详情" width="720px">
      <div v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="ID">{{ detail.store.id }}</el-descriptions-item>
          <el-descriptions-item label="code">{{ detail.store.code }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detail.store.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="STATUS_LABELS[detail.store.status]?.type || 'info'" size="small">
              {{ STATUS_LABELS[detail.store.status]?.label || detail.store.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="抽佣率">{{ fmtRate(detail.store.commission_rate) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail.store.contact_name || '—' }} / {{ detail.store.contact_phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="营业执照" :span="2">{{ detail.store.business_license || '—' }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ detail.store.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审批" :span="2">
            <span v-if="detail.store.approved_at">{{ detail.store.approved_at }} by {{ detail.store.approved_by }}</span>
            <span v-else style="color:#999">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="暂停" :span="2">
            <span v-if="detail.store.suspended_at" style="color:#F56C6C">{{ detail.store.suspended_at }} · {{ detail.store.suspended_reason }}</span>
            <span v-else style="color:#999">—</span>
          </el-descriptions-item>
        </el-descriptions>

        <div style="display:flex;justify-content:space-between;align-items:center;margin: 16px 0 8px;">
          <h4 style="margin: 0;">店铺管理员（{{ detail.admins.length }}）</h4>
          <el-button v-if="detail.store.id !== 1" size="small" type="primary" @click="onAddAdmin(detail.store.id)">添加管理员</el-button>
        </div>
        <el-table :data="detail.admins" border size="small">
          <el-table-column prop="admin_user_id" label="ID" width="60" />
          <el-table-column prop="username" label="账号" width="120" />
          <el-table-column prop="admin_name" label="姓名" width="120" />
          <el-table-column label="角色" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.role }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="绑定时间" width="180" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button v-if="detail.store.id !== 1" size="small" type="danger" text @click="onRemoveAdmin(detail.store.id, row.admin_user_id)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.hint { margin-left: 12px; color: #999; font-size: 12px; }
</style>
