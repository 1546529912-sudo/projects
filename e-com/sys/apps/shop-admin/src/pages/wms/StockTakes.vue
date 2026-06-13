<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);
const statusFilter = ref('');

// 创建 dialog
const createVisible = ref(false);
const submitting = ref(false);
const form = reactive({
  warehouse_code: 'WH-DEFAULT',
  scope_type: 'all' as 'all'|'zone'|'location'|'sku',
  scope_value: '',
  remark: '',
});

// 详情 + 录入 dialog
const detailVisible = ref(false);
const detail = ref<any>(null);
const detailItems = ref<any[]>([]);

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', in_progress: '盘点中', completed: '已完成', cancelled: '已取消',
};
const SCOPE_LABEL: Record<string, string> = {
  all: '全仓', zone: '分区', location: '库位', sku: 'SKU',
};
const tagType = (s: string) => ({ draft: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger' }[s] || '');

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.stockTakeList({
      page: page.value, size: size.value,
      status: statusFilter.value || undefined,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

function onCreate() {
  Object.assign(form, { warehouse_code: 'WH-DEFAULT', scope_type: 'all', scope_value: '', remark: '' });
  createVisible.value = true;
}

async function onSubmitCreate() {
  if (form.scope_type !== 'all' && !form.scope_value.trim()) {
    ElMessage.warning('请填写 scope_value'); return;
  }
  submitting.value = true;
  try {
    await wmsApi.stockTakeCreate({
      warehouse_code: form.warehouse_code,
      scope_type: form.scope_type,
      scope_value: form.scope_value || undefined,
      remark: form.remark,
    });
    ElMessage.success('盘点单已创建');
    createVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '创建失败');
  } finally { submitting.value = false; }
}

async function openDetail(no: string) {
  try {
    const res: any = await wmsApi.stockTakeDetail(no);
    detail.value = res.data?.take;
    detailItems.value = res.data?.items || [];
    detailVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载详情失败');
  }
}

async function onStart() {
  if (!detail.value) return;
  try {
    await wmsApi.stockTakeStart(detail.value.take_no);
    ElMessage.success('已起盘');
    await openDetail(detail.value.take_no);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '起盘失败'); }
}

async function onRecord(item: any) {
  try {
    const { value } = await ElMessageBox.prompt(`录入实际数量（系统:${item.system_qty}）`, item.sku_code + ' @ ' + item.location_code, {
      inputType: 'number',
      inputValue: String(item.actual_qty ?? item.system_qty),
    });
    await wmsApi.stockTakeRecord(detail.value.take_no, item.id, parseInt(value, 10));
    ElMessage.success('已录入');
    await openDetail(detail.value.take_no);
  } catch { return; }
}

async function onComplete() {
  try {
    await ElMessageBox.confirm('完成盘点？将按已录入差异自动调整 inventory。未录入的明细按无差异处理。', '确认', { type: 'warning' });
    await wmsApi.stockTakeComplete(detail.value.take_no);
    ElMessage.success('已完成，库存已调差');
    detailVisible.value = false;
    await load();
  } catch (e: any) {
    if (e?.msg) ElMessage.error(e.msg);
  }
}

async function onCancel(no: string) {
  try {
    await ElMessageBox.confirm(`取消盘点单 ${no}？`, '确认', { type: 'warning' });
    await wmsApi.stockTakeCancel(no);
    ElMessage.success('已取消');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">实时盘点</h2>
        <p class="page-desc">WMS /stock-take · 起盘 snapshot → 录入 → 完成 tx 内自动调差</p>
      </div>
      <div>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:140px;margin-right:8px" @change="load">
          <el-option v-for="(label, k) in STATUS_LABEL" :key="k" :label="label" :value="k" />
        </el-select>
        <el-button type="primary" @click="onCreate">新建盘点单</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="take_no" label="单号" width="220" />
      <el-table-column prop="warehouse_code" label="仓库" width="120" />
      <el-table-column label="范围" width="180">
        <template #default="{ row }">
          {{ SCOPE_LABEL[row.scope_type] }}{{ row.scope_value ? ' / ' + row.scope_value : '' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="tagType(row.status) as any">{{ STATUS_LABEL[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_by" label="创建人" width="120" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="completed_at" label="完成时间" width="180" />
      <el-table-column prop="remark" label="备注" min-width="120" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.take_no)">详情</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'in_progress'" size="small" type="danger" @click="onCancel(row.take_no)">取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" v-model:page-size="size"
      :total="total" :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load" @size-change="load"
    />

    <!-- 创建 dialog -->
    <el-dialog v-model="createVisible" title="新建盘点单" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="仓库" required>
          <el-input v-model="form.warehouse_code" />
        </el-form-item>
        <el-form-item label="范围" required>
          <el-radio-group v-model="form.scope_type">
            <el-radio value="all">全仓</el-radio>
            <el-radio value="zone">分区</el-radio>
            <el-radio value="location">库位</el-radio>
            <el-radio value="sku">SKU</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scope_type !== 'all'" :label="SCOPE_LABEL[form.scope_type]" required>
          <el-input v-model="form.scope_value" :placeholder="form.scope_type === 'zone' ? '如 A' : (form.scope_type === 'location' ? '如 A-01-01-01' : '如 SPU001-001')" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 详情 dialog -->
    <el-dialog v-model="detailVisible" :title="`盘点详情 ${detail?.take_no || ''}`" width="900px">
      <div v-if="detail" class="detail-head">
        <div>仓库: <b>{{ detail.warehouse_code }}</b> · 范围: {{ SCOPE_LABEL[detail.scope_type] }} {{ detail.scope_value ? '/ ' + detail.scope_value : '' }}</div>
        <div>状态: <el-tag :type="tagType(detail.status) as any">{{ STATUS_LABEL[detail.status] }}</el-tag></div>
      </div>
      <div class="actions">
        <el-button v-if="detail?.status === 'draft'" type="primary" @click="onStart">起盘 (snapshot)</el-button>
        <el-button v-if="detail?.status === 'in_progress'" type="success" @click="onComplete">完成盘点（自动调差）</el-button>
      </div>

      <el-table :data="detailItems" border stripe style="margin-top:12px;">
        <el-table-column prop="sku_code" label="SKU" width="140" />
        <el-table-column prop="location_code" label="库位" width="140" />
        <el-table-column prop="batch_no" label="批次" width="100" />
        <el-table-column prop="system_qty" label="系统数量" width="100" />
        <el-table-column label="实际数量" width="100">
          <template #default="{ row }">
            <span v-if="row.actual_qty === null">-</span>
            <span v-else>{{ row.actual_qty }}</span>
          </template>
        </el-table-column>
        <el-table-column label="差异" width="100">
          <template #default="{ row }">
            <span v-if="row.diff === null">-</span>
            <span v-else :class="{ 'diff-plus': row.diff > 0, 'diff-minus': row.diff < 0 }">
              {{ row.diff > 0 ? '+' : '' }}{{ row.diff }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="detail?.status === 'in_progress'" size="small" @click="onRecord(row)">录入</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.detail-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
.actions { padding: 8px 0; }
.diff-plus { color: #67C23A; font-weight: bold; }
.diff-minus { color: #FF385C; font-weight: bold; }
</style>
