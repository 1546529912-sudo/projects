<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);

const detailVisible = ref(false);
const detail = ref<any>(null);
const submitting = ref(false);
const createForm = reactive({ scope_type: 'all' as 'all' | 'sku', scope_value: '' });

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.omsReconcileList({ page: page.value, size: size.value });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onCreate() {
  if (createForm.scope_type === 'sku' && !createForm.scope_value.trim()) {
    ElMessage.warning('SKU 不能为空'); return;
  }
  submitting.value = true;
  try {
    const res: any = await omsApi.omsReconcileCreate({
      scope_type: createForm.scope_type,
      scope_value: createForm.scope_value || undefined,
    });
    const r = res.data;
    ElMessage.success(`对账完成：${r.total_skus} SKU 中 ${r.diff_count} 项不一致`);
    await load();
    detail.value = r;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '对账失败'); }
  finally { submitting.value = false; }
}

async function onOpenDetail(no: string) {
  try {
    const res: any = await omsApi.omsReconcileDetail(no);
    detail.value = res.data;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载详情失败'); }
}

async function onConfirm(no: string) {
  try {
    await ElMessageBox.confirm(`确认对账 ${no}？状态置为 confirmed，仅记录不修改库存`, '确认', { type: 'warning' });
    await omsApi.omsReconcileConfirm(no);
    ElMessage.success('已确认');
    detail.value.status = 'confirmed';
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

const statusTag = (s: string) => s === 'confirmed' ? 'success' : 'warning';

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">WMS 库存对账（OMS 视角）</h2>
        <p class="page-desc">OMS /admin/reconcile · iter-26 P0-2 · 比较 OMS.available vs SUM(WMS.quantity-locked) · super_admin 独占 · 仅记录不自动修复</p>
      </div>
      <div><el-button @click="load">刷新</el-button></div>
    </div>

    <el-card class="create-card">
      <template #header><strong>触发新对账</strong></template>
      <el-form inline :model="createForm">
        <el-form-item label="范围">
          <el-radio-group v-model="createForm.scope_type">
            <el-radio value="all">全量</el-radio>
            <el-radio value="sku">单 SKU</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createForm.scope_type === 'sku'" label="SKU">
          <el-input v-model="createForm.scope_value" placeholder="如 SPU001-001" style="width:200px" />
        </el-form-item>
        <el-button type="primary" :loading="submitting" @click="onCreate">触发对账</el-button>
      </el-form>
    </el-card>

    <el-table :data="list" v-loading="loading" stripe border style="margin-top:16px;">
      <el-table-column prop="reconcile_no" label="单号" width="240" />
      <el-table-column label="范围" width="160">
        <template #default="{ row }">{{ row.scope_type }}{{ row.scope_value ? ' / ' + row.scope_value : '' }}</template>
      </el-table-column>
      <el-table-column prop="total_skus" label="SKU 总数" width="100" />
      <el-table-column prop="diff_count" label="差异数" width="100">
        <template #default="{ row }">
          <span :class="row.diff_count > 0 ? 'diff-warn' : 'diff-ok'">{{ row.diff_count }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status) as any">{{ row.status === 'confirmed' ? '已确认' : '待确认' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_by" label="创建人" width="120" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button size="small" @click="onOpenDetail(row.reconcile_no)">查看明细</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" v-model:page-size="size" :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load" @size-change="load"
    />

    <el-dialog v-model="detailVisible" :title="`OMS 视角对账 ${detail?.reconcile_no || ''}`" width="1100px" top="5vh">
      <div v-if="detail" class="detail-head">
        <div>范围: {{ detail.scope_type }}{{ detail.scope_value ? ' / ' + detail.scope_value : '' }} · 创建人: {{ detail.created_by }} · {{ detail.created_at }}</div>
        <div>
          状态: <el-tag :type="statusTag(detail.status) as any">{{ detail.status === 'confirmed' ? '已确认' : '待确认' }}</el-tag>
          <el-button v-if="detail.status !== 'confirmed'" size="small" type="primary" style="margin-left:12px;" @click="onConfirm(detail.reconcile_no)">确认</el-button>
        </div>
      </div>
      <el-table :data="detail?.details || []" border stripe style="margin-top:12px;" :row-class-name="({row}) => row.match ? '' : 'row-diff'">
        <el-table-column prop="sku_code" label="SKU" width="140" />
        <el-table-column label="OMS available" width="120">
          <template #default="{ row }"><strong>{{ row.oms_avail }}</strong></template>
        </el-table-column>
        <el-table-column label="OMS locked" width="100" prop="oms_locked" />
        <el-table-column label="OMS reserved" width="110" prop="oms_reserved" />
        <el-table-column label="WMS quantity" width="120" prop="wms_qty" />
        <el-table-column label="WMS locked" width="100" prop="wms_locked" />
        <el-table-column label="WMS available" width="120">
          <template #default="{ row }"><strong>{{ row.wms_avail }}</strong></template>
        </el-table-column>
        <el-table-column label="差异 (OMS-WMS)" width="140">
          <template #default="{ row }">
            <span v-if="row.match" class="diff-ok">✓ 一致</span>
            <span v-else :class="row.diff > 0 ? 'diff-plus' : 'diff-minus'">{{ row.diff > 0 ? '+' : '' }}{{ row.diff }}</span>
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
.create-card { background: #fafafa; }
.diff-warn { color: #FF385C; font-weight: bold; }
.diff-ok { color: #67C23A; }
.diff-plus { color: #FF385C; font-weight: bold; }
.diff-minus { color: #E6A23C; font-weight: bold; }
.detail-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
:deep(.row-diff) { background: #fff8f8 !important; }
</style>
