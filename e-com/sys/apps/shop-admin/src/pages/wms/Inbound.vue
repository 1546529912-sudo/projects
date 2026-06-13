<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', warehouse_code: '', page: 1, size: 20 });

// iter-22 上架推荐
const recommendVisible = ref(false);
const recLoading = ref(false);
const recList = ref<any[]>([]);
const recForm = reactive({ warehouse_code: 'WH-DEFAULT', sku_code: '', qty: 1 });
async function onRecommend() {
  if (!recForm.sku_code) { ElMessage.warning('请输 SKU'); return; }
  recLoading.value = true;
  try {
    const res: any = await wmsApi.recommendLocations({
      sku_code: recForm.sku_code,
      qty: recForm.qty,
      warehouse_code: recForm.warehouse_code,
      top_n: 3,
    });
    recList.value = res.data || [];
    if (!recList.value.length) ElMessage.info('该仓库无可用库位');
  } catch (e: any) { ElMessage.error(e?.msg || '推荐失败'); }
  finally { recLoading.value = false; }
}
const warehouses = ref<any[]>([]);

const detailVisible = ref(false);
const detailOrder = ref<any>(null);
const detailItems = ref<any[]>([]);

const dialogVisible = ref(false);
const submitting = ref(false);
const form = reactive({
  warehouse_code: '',
  source_type: 'purchase',
  refund_no: '',
  remark: '',
  items: [] as { sku_code: string; expected_qty: number; batch_no: string }[],
});

// SKU 远程搜索（基于 wms_products，iter-13/iter-14）
const skuLoading = ref(false);
const skuOptions = ref<any[]>([]);
async function onSkuSearch(keyword: string) {
  skuLoading.value = true;
  try {
    const res: any = await wmsApi.productList({ keyword, active: '1', page: 1, size: 30 });
    skuOptions.value = res.data?.list || [];
  } catch { skuOptions.value = []; }
  finally { skuLoading.value = false; }
}

async function loadWarehouses() {
  try {
    const res: any = await wmsApi.warehouseList();
    warehouses.value = res.data?.list || [];
  } catch {}
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.status) params.status = filters.status;
    if (filters.warehouse_code) params.warehouse_code = filters.warehouse_code;
    const res: any = await wmsApi.inboundList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

async function onShowDetail(row: any) {
  try {
    const res: any = await wmsApi.inboundDetail(row.inbound_no);
    detailOrder.value = res.data?.order;
    detailItems.value = res.data?.items || [];
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
}

function onAdd() {
  Object.assign(form, {
    warehouse_code: warehouses.value[0]?.warehouse_code || '',
    source_type: 'purchase', refund_no: '', remark: '',
    items: [{ sku_code: '', expected_qty: 1, batch_no: '' }],
  });
  onSkuSearch('');
  dialogVisible.value = true;
}
function addItem() { form.items.push({ sku_code: '', expected_qty: 1, batch_no: '' }); }
function removeItem(idx: number) { form.items.splice(idx, 1); }

async function onSubmit() {
  if (!form.warehouse_code) { ElMessage.warning('请选仓库'); return; }
  const validItems = form.items.filter(it => it.sku_code && it.expected_qty > 0);
  if (!validItems.length) { ElMessage.warning('至少一条有效明细'); return; }
  submitting.value = true;
  if (form.source_type === 'return' && !form.refund_no) {
    ElMessage.warning('退货入库必须填 refund_no'); return;
  }
  try {
    await wmsApi.inboundCreate({
      warehouse_code: form.warehouse_code,
      source_type: form.source_type,
      refund_no: form.refund_no || undefined,
      remark: form.remark,
      items: validItems,
    });
    ElMessage.success('已创建');
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '创建失败'); }
  finally { submitting.value = false; }
}

async function onAutoComplete(row: any) {
  try {
    await ElMessageBox.confirm(`一键完成入库单「${row.inbound_no}」？将自动 +N 实物库存并推 wms.inventory.changed 事件`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    const res: any = await wmsApi.inboundAutoComplete(row.inbound_no);
    ElMessage.success('已入库, 事件发布: ' + (res.data?.event_published ? '✓' : '失败'));
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onCancel(row: any) {
  try {
    await ElMessageBox.confirm(`取消入库单「${row.inbound_no}」？`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await wmsApi.inboundCancel(row.inbound_no);
    ElMessage.success('已取消'); await load();
  } catch (e: any) { ElMessage.error(e?.msg || '取消失败'); }
}

onMounted(async () => { await loadWarehouses(); await load(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">入库管理</h2>
        <p class="page-desc">WMS /api/v1/inbound · 创建 + 一键完成（替代 PDA 扫码流程）</p>
      </div>
      <div>
        <el-button type="success" @click="recommendVisible = true">智能推荐库位</el-button>
        <el-button type="primary" @click="onAdd">新建入库单</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <!-- iter-22 上架推荐预览 -->
    <el-dialog v-model="recommendVisible" title="智能推荐 Top3 库位（iter-22）" width="640px">
      <el-form :model="recForm" inline label-width="80px">
        <el-form-item label="仓库">
          <el-select v-model="recForm.warehouse_code" style="width:160px;">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="SKU">
          <el-input v-model="recForm.sku_code" placeholder="如 SPU001-001" style="width:200px;" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="recForm.qty" :min="1" />
        </el-form-item>
        <el-button type="primary" @click="onRecommend" :loading="recLoading">推荐</el-button>
      </el-form>
      <el-table :data="recList" border style="margin-top:8px;">
        <el-table-column label="排名" type="index" width="60" />
        <el-table-column prop="location_code" label="库位" width="140" />
        <el-table-column prop="zone" label="分区" width="80" />
        <el-table-column label="黄金" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_golden" type="warning">是</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="current_qty" label="当前占用" width="100" />
        <el-table-column prop="score" label="分数" width="80" />
        <el-table-column label="推荐理由" min-width="200">
          <template #default="{ row }">
            <div v-for="(r, i) in row.reasons" :key="i">· {{ r }}</div>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:140px;">
          <el-option label="pending 待处理" value="pending" />
          <el-option label="received 已入库" value="received" />
          <el-option label="cancelled 已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item label="仓库">
        <el-select v-model="filters.warehouse_code" placeholder="全部" clearable style="width:180px;">
          <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="inbound_no" label="入库单号" width="200" />
      <el-table-column prop="warehouse_code" label="仓库" width="140" />
      <el-table-column prop="source_type" label="来源" width="120" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column prop="received_at" label="入库时间" width="180" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onShowDetail(row)">明细</el-button>
          <el-button size="small" type="success" v-if="row.status === 'pending'" @click="onAutoComplete(row)">一键完成</el-button>
          <el-button size="small" type="danger" v-if="row.status === 'pending'" @click="onCancel(row)">取消</el-button>
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

    <el-dialog v-model="dialogVisible" title="新建入库单" width="640px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="仓库" required>
          <el-select v-model="form.warehouse_code" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="form.source_type" style="width:100%;">
            <el-option label="purchase 采购入库" value="purchase" />
            <el-option label="return 退货入库" value="return" />
            <el-option label="transfer 调拨入库" value="transfer" />
            <el-option label="init 初始化" value="init" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.source_type === 'return'" label="退款单号" required>
          <el-input v-model="form.refund_no" placeholder="对应 OMS 退款单号 RFxxxx" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="明细" required>
          <div style="width:100%;">
            <el-table :data="form.items" border size="small">
              <el-table-column label="SKU" min-width="260">
                <template #default="{ row }">
                  <el-select
                    v-model="row.sku_code"
                    filterable remote :remote-method="onSkuSearch" :loading="skuLoading"
                    placeholder="输入 SKU 编码或商品名搜索"
                    style="width:100%;"
                  >
                    <el-option
                      v-for="p in skuOptions"
                      :key="p.sku_code"
                      :label="`${p.sku_code} · ${p.spu_name}${p.sku_name ? ' / ' + p.sku_name : ''}`"
                      :value="p.sku_code"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100">
                <template #default="{ row }"><el-input-number v-model="row.expected_qty" :min="1" style="width:100%;" controls-position="right" /></template>
              </el-table-column>
              <el-table-column label="批次号">
                <template #default="{ row }"><el-input v-model="row.batch_no" placeholder="选填，默认 BATCH-yyyymmdd" /></template>
              </el-table-column>
              <el-table-column label="" width="60">
                <template #default="{ $index }"><el-button size="small" type="danger" @click="removeItem($index)">×</el-button></template>
              </el-table-column>
            </el-table>
            <el-button @click="addItem" style="margin-top: 8px;">+ 添加一行</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="入库单明细" width="640px">
      <div v-if="detailOrder">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="单号">{{ detailOrder.inbound_no }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ detailOrder.warehouse_code }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detailOrder.status" /></el-descriptions-item>
          <el-descriptions-item label="来源">{{ detailOrder.source_type }}</el-descriptions-item>
          <el-descriptions-item label="入库时间">{{ detailOrder.received_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailOrder.created_at }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="detailItems" border size="small" style="margin-top:12px;">
          <el-table-column prop="sku_code" label="SKU" width="140" />
          <el-table-column label="商品" min-width="200">
            <template #default="{ row }">
              <div v-if="row.spu_name">
                <div>{{ row.spu_name }}</div>
                <div v-if="row.product_sku_name" style="color:#999;font-size:12px;">{{ row.product_sku_name }}</div>
              </div>
              <span v-else style="color:#bbb;">- 未同步 -</span>
            </template>
          </el-table-column>
          <el-table-column prop="expected_qty" label="预期" width="80" />
          <el-table-column prop="actual_qty" label="实收" width="80" />
          <el-table-column prop="shelved_qty" label="已上架" width="80" />
          <el-table-column prop="location_code" label="库位" width="140" />
          <el-table-column prop="batch_no" label="批次" width="120" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
