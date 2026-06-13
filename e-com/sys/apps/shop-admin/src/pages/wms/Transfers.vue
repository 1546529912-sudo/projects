<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const FULL_THRESHOLD = 500;

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);
const statusFilter = ref('');

// 创建对话框
const createVisible = ref(false);
const submitting = ref(false);
const form = reactive({
  from_warehouse: 'WH-DEFAULT',
  to_warehouse: 'WH-DEFAULT',
  remark: '',
  items: [] as Array<{
    from_location: string; to_location: string; sku_code: string; batch_no: string; qty: number;
  }>,
});

// 详情对话框
const detailVisible = ref(false);
const detail = ref<any>(null);
const detailItems = ref<any[]>([]);

// 仓库 + 库位 + inventory
const warehouses = ref<any[]>([]);
const fromLocations = ref<any[]>([]);
const toLocations = ref<any[]>([]);
const inventoryRows = ref<any[]>([]);
const skuLoading = ref(false);
const skuOptionsRaw = ref<any[]>([]);

async function onSkuSearch(keyword: string) {
  skuLoading.value = true;
  try {
    const res: any = await wmsApi.productList({ keyword, active: '1', page: 1, size: 30 });
    skuOptionsRaw.value = res.data?.list || [];
  } catch { skuOptionsRaw.value = []; }
  finally { skuLoading.value = false; }
}
async function loadWarehouses() {
  try {
    const res: any = await wmsApi.warehouseList();
    warehouses.value = res.data?.list || res.data || [];
  } catch (e) {}
}
async function loadFromLocations() {
  if (!form.from_warehouse) { fromLocations.value = []; return; }
  try {
    const res: any = await wmsApi.locationList(form.from_warehouse);
    fromLocations.value = res.data?.list || res.data || [];
  } catch (e) { fromLocations.value = []; }
}
async function loadToLocations() {
  if (!form.to_warehouse) { toLocations.value = []; return; }
  try {
    const res: any = await wmsApi.locationList(form.to_warehouse);
    toLocations.value = res.data?.list || res.data || [];
  } catch (e) { toLocations.value = []; }
}
async function loadInventory() {
  try {
    const res: any = await wmsApi.inventoryList();
    inventoryRows.value = (res.data?.list || []).filter((r: any) => r.status === 'normal');
  } catch { inventoryRows.value = []; }
}

// ===== 映射 =====
const invByLocation = computed(() => {
  const m: Record<string, any[]> = {};
  for (const r of inventoryRows.value) {
    const avail = (Number(r.quantity) || 0) - (Number(r.locked_quantity) || 0);
    (m[r.location_code] ||= []).push({ ...r, qty_avail: avail });
  }
  return m;
});
const occupancyByLocation = computed(() => {
  const m: Record<string, number> = {};
  for (const r of inventoryRows.value) m[r.location_code] = (m[r.location_code] || 0) + (Number(r.quantity) || 0);
  return m;
});
const locationsBySku = computed(() => {
  const m: Record<string, Set<string>> = {};
  for (const r of inventoryRows.value) {
    const avail = (Number(r.quantity) || 0) - (Number(r.locked_quantity) || 0);
    if (avail <= 0) continue;
    (m[r.sku_code] ||= new Set()).add(r.location_code);
  }
  return m;
});

// ===== 行级选项 — 接收 row 上下文 =====
type LocOpt = { value: string; label: string; disabled: boolean; suffix: string };
function buildFromOptions(rowSku: string): LocOpt[] {
  return fromLocations.value.map((l: any) => {
    const code = l.location_code;
    const zone = l.zone ? ` (zone ${l.zone})` : '';
    const items = invByLocation.value[code] || [];
    if (rowSku) {
      const skuItems = items.filter((i: any) => i.sku_code === rowSku && i.qty_avail > 0);
      if (!skuItems.length) return { value: code, label: `${code}${zone}`, disabled: true, suffix: '无该 SKU' };
      const sumAvail = skuItems.reduce((s: number, i: any) => s + i.qty_avail, 0);
      return { value: code, label: `${code}${zone}`, disabled: false, suffix: `可用 ${sumAvail} 件` };
    }
    const totalAvail = items.reduce((s: number, i: any) => s + i.qty_avail, 0);
    if (!totalAvail) return { value: code, label: `${code}${zone}`, disabled: true, suffix: '无商品' };
    return { value: code, label: `${code}${zone}`, disabled: false, suffix: `${items.length} SKU / 可用 ${totalAvail}` };
  });
}
function buildToOptions(rowFromLoc: string): LocOpt[] {
  return toLocations.value.map((l: any) => {
    const code = l.location_code;
    const zone = l.zone ? ` (zone ${l.zone})` : '';
    const occupied = occupancyByLocation.value[code] || 0;
    if (rowFromLoc && code === rowFromLoc) return { value: code, label: `${code}${zone}`, disabled: true, suffix: '不能与源相同' };
    if (occupied >= FULL_THRESHOLD) return { value: code, label: `${code}${zone}`, disabled: true, suffix: `已满 (${occupied})` };
    return { value: code, label: `${code}${zone}`, disabled: false, suffix: `当前 ${occupied} 件` };
  });
}
function buildSkuOptions(rowFromLoc: string) {
  if (rowFromLoc) {
    const items = invByLocation.value[rowFromLoc] || [];
    const agg: Record<string, number> = {};
    for (const i of items) agg[i.sku_code] = (agg[i.sku_code] || 0) + i.qty_avail;
    return Object.entries(agg).map(([sku, q]) => ({
      value: sku, label: sku, disabled: q <= 0, suffix: q > 0 ? `可用 ${q} 件` : '已锁',
    }));
  }
  return skuOptionsRaw.value.map((p: any) => {
    const sku = p.sku_code;
    const hasIn = locationsBySku.value[sku];
    const name = p.spu_name || '';
    const skuName = p.sku_name ? ' / ' + p.sku_name : '';
    return {
      value: sku, label: `${sku} · ${name}${skuName}`,
      disabled: !hasIn, suffix: hasIn ? `在 ${hasIn.size} 个库位` : '当前无库存',
    };
  });
}

// 行级 batch 选项：根据 sku + from_location 推断可选批次
function buildBatchOptions(rowSku: string, rowFromLoc: string) {
  if (!rowSku || !rowFromLoc) return [] as Array<{value:string;label:string;disabled:boolean;suffix:string}>;
  const items = (invByLocation.value[rowFromLoc] || []).filter((i: any) => i.sku_code === rowSku && i.qty_avail > 0);
  return items.map((i: any) => ({
    value: i.batch_no, label: i.batch_no, disabled: false, suffix: `可用 ${i.qty_avail}`,
  }));
}

// ===== 状态 =====
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', in_transit: '运输中', completed: '已完成', cancelled: '已取消',
};
const tagType = (s: string) => ({ draft: 'info', in_transit: 'warning', completed: 'success', cancelled: 'danger' }[s] || '');

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.transferList({
      page: page.value, size: size.value,
      status: statusFilter.value || undefined,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onCreate() {
  Object.assign(form, {
    from_warehouse: 'WH-DEFAULT', to_warehouse: 'WH-DEFAULT', remark: '',
    items: [{ from_location: '', to_location: '', sku_code: '', batch_no: 'INIT', qty: 1 }],
  });
  createVisible.value = true;
  if (!warehouses.value.length) await loadWarehouses();
  await Promise.all([loadFromLocations(), loadToLocations(), loadInventory()]);
  onSkuSearch('');
}

function addItem() {
  form.items.push({ from_location: '', to_location: '', sku_code: '', batch_no: 'INIT', qty: 1 });
}
function removeItem(idx: number) {
  if (form.items.length <= 1) {
    ElMessage.warning('至少保留一行明细');
    return;
  }
  form.items.splice(idx, 1);
}

// 行级联动：from 变 → 若 sku 不在新 from，清 sku + batch
function onRowFromChange(row: typeof form.items[0]) {
  if (!row.sku_code) { row.batch_no = 'INIT'; return; }
  const items = (invByLocation.value[row.from_location] || []).filter((i: any) => i.sku_code === row.sku_code && i.qty_avail > 0);
  if (!items.length) { row.sku_code = ''; row.batch_no = 'INIT'; }
  // 自动选第一个 batch
  else if (!items.find((i: any) => i.batch_no === row.batch_no)) row.batch_no = items[0].batch_no;
}
function onRowSkuChange(row: typeof form.items[0]) {
  if (!row.from_location) { row.batch_no = 'INIT'; return; }
  const items = (invByLocation.value[row.from_location] || []).filter((i: any) => i.sku_code === row.sku_code && i.qty_avail > 0);
  if (!items.length) { row.from_location = ''; row.batch_no = 'INIT'; }
  else if (!items.find((i: any) => i.batch_no === row.batch_no)) row.batch_no = items[0].batch_no;
}

async function onSubmitCreate() {
  if (!form.items.length) { ElMessage.warning('至少添加一行明细'); return; }
  for (let i = 0; i < form.items.length; i++) {
    const r = form.items[i];
    if (!r.from_location || !r.to_location || !r.sku_code) {
      ElMessage.warning(`行 ${i + 1} 库位或 SKU 未选`); return;
    }
    if (r.from_location === r.to_location) {
      ElMessage.warning(`行 ${i + 1} 源/目标库位相同`); return;
    }
    if (r.qty <= 0) {
      ElMessage.warning(`行 ${i + 1} 数量必须 > 0`); return;
    }
  }
  submitting.value = true;
  try {
    await wmsApi.transferCreate({ ...form });
    ElMessage.success(`已创建（${form.items.length} 行明细）`);
    createVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '创建失败'); }
  finally { submitting.value = false; }
}

async function openDetail(no: string) {
  try {
    const res: any = await wmsApi.transferDetail(no);
    detail.value = res.data?.head || res.data;
    detailItems.value = res.data?.items || [];
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载详情失败'); }
}

async function onShip(no: string) {
  try {
    await ElMessageBox.confirm(`确认起运 ${no}？将锁定源库位库存。`, '确认', { type: 'warning' });
    await wmsApi.transferShip(no);
    ElMessage.success('已起运');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}
async function onReceive(no: string) {
  try {
    await ElMessageBox.confirm(`确认接收 ${no}？将完成 from→to 库存转移。`, '确认', { type: 'warning' });
    await wmsApi.transferReceive(no);
    ElMessage.success('已接收');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}
async function onCancel(row: any) {
  try {
    await ElMessageBox.confirm(`取消 ${row.transfer_no}？${row.status === 'in_transit' ? '将释放所有源库位锁定。' : ''}`, '确认', { type: 'warning' });
    await wmsApi.transferCancel(row.transfer_no);
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
        <h2 class="page-title">调拨</h2>
        <p class="page-desc">WMS /transfer · 多 SKU 批量（iter-23）：一头多明细 + 行级 from/to 灵活</p>
      </div>
      <div>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:140px;margin-right:8px" @change="load">
          <el-option v-for="(label, k) in STATUS_LABEL" :key="k" :label="label" :value="k" />
        </el-select>
        <el-button type="primary" @click="onCreate">新建调拨单</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="transfer_no" label="单号" width="220" />
      <el-table-column label="源仓库" width="120" prop="from_warehouse" />
      <el-table-column label="目标仓库" width="120" prop="to_warehouse" />
      <el-table-column label="明细" width="180">
        <template #default="{ row }">
          <span v-if="row.item_count > 0">
            <el-tag size="small" type="primary">{{ row.item_count }} 行明细</el-tag>
          </span>
          <span v-else>
            <el-tag size="small" type="info">legacy 单 SKU</el-tag>
            <div class="legacy-detail">{{ row.sku_code }} × {{ row.qty }}</div>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="tagType(row.status) as any">{{ STATUS_LABEL[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_by" label="创建人" width="120" />
      <el-table-column prop="created_at" label="创建" width="180" />
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.transfer_no)">详情</el-button>
          <el-button v-if="row.status === 'draft'" size="small" type="primary" @click="onShip(row.transfer_no)">起运</el-button>
          <el-button v-if="row.status === 'in_transit'" size="small" type="success" @click="onReceive(row.transfer_no)">接收</el-button>
          <el-button v-if="row.status === 'draft' || row.status === 'in_transit'" size="small" type="danger" @click="onCancel(row)">取消</el-button>
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

    <!-- ===== 创建对话框（多明细行） ===== -->
    <el-dialog v-model="createVisible" title="新建调拨单（多 SKU 批量）" width="1100px" top="5vh">
      <el-form :model="form" label-width="100px">
        <el-form-item label="源仓库" required>
          <el-select v-model="form.from_warehouse" style="width:240px;" @change="loadFromLocations">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name || w.warehouse_code" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标仓库" required>
          <el-select v-model="form.to_warehouse" style="width:240px;" @change="loadToLocations">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="w.warehouse_name || w.warehouse_code" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" style="width:600px;" />
        </el-form-item>

        <el-form-item label="明细" required>
          <div style="width:100%;">
            <el-table :data="form.items" border size="small">
              <el-table-column label="#" type="index" width="50" />
              <el-table-column label="源库位" min-width="200">
                <template #default="{ row }">
                  <el-select v-model="row.from_location" filterable placeholder="选源库位"
                    style="width:100%;" @change="onRowFromChange(row)">
                    <el-option v-for="opt in buildFromOptions(row.sku_code)" :key="opt.value"
                      :value="opt.value" :disabled="opt.disabled" :label="opt.label">
                      <span>{{ opt.label }}</span>
                      <span class="opt-suffix" :class="{ 'opt-suffix-warn': opt.disabled }">{{ opt.suffix }}</span>
                    </el-option>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="SKU" min-width="220">
                <template #default="{ row }">
                  <el-select v-model="row.sku_code" filterable
                    :remote="!row.from_location" :remote-method="onSkuSearch" :loading="skuLoading"
                    :placeholder="row.from_location ? '从源库位 SKU 中选' : '输入 SKU 搜索'"
                    style="width:100%;" @change="onRowSkuChange(row)">
                    <el-option v-for="opt in buildSkuOptions(row.from_location)" :key="opt.value"
                      :value="opt.value" :disabled="opt.disabled" :label="opt.label">
                      <span>{{ opt.label }}</span>
                      <span class="opt-suffix" :class="{ 'opt-suffix-warn': opt.disabled }">{{ opt.suffix }}</span>
                    </el-option>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="批次" width="180">
                <template #default="{ row }">
                  <el-select v-if="buildBatchOptions(row.sku_code, row.from_location).length"
                    v-model="row.batch_no" filterable style="width:100%;">
                    <el-option v-for="opt in buildBatchOptions(row.sku_code, row.from_location)" :key="opt.value"
                      :value="opt.value" :label="opt.label">
                      <span>{{ opt.label }}</span>
                      <span class="opt-suffix">{{ opt.suffix }}</span>
                    </el-option>
                  </el-select>
                  <el-input v-else v-model="row.batch_no" placeholder="批次" />
                </template>
              </el-table-column>
              <el-table-column label="目标库位" min-width="200">
                <template #default="{ row }">
                  <el-select v-model="row.to_location" filterable placeholder="选目标库位" style="width:100%;">
                    <el-option v-for="opt in buildToOptions(row.from_location)" :key="opt.value"
                      :value="opt.value" :disabled="opt.disabled" :label="opt.label">
                      <span>{{ opt.label }}</span>
                      <span class="opt-suffix" :class="{ 'opt-suffix-warn': opt.disabled }">{{ opt.suffix }}</span>
                    </el-option>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.qty" :min="1" :step="1" style="width:100%;" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="" width="60">
                <template #default="{ $index }">
                  <el-button size="small" type="danger" @click="removeItem($index)">×</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button @click="addItem" style="margin-top: 8px;">+ 添加一行</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitCreate">创建（{{ form.items.length }} 行）</el-button>
      </template>
    </el-dialog>

    <!-- ===== 详情对话框 ===== -->
    <el-dialog v-model="detailVisible" :title="`调拨详情 ${detail?.transfer_no || ''}`" width="900px">
      <div v-if="detail" class="detail-head">
        <div>{{ detail.from_warehouse }} → {{ detail.to_warehouse }} · 创建人: {{ detail.created_by }} · {{ detail.created_at }}</div>
        <div>状态: <el-tag :type="tagType(detail.status) as any">{{ STATUS_LABEL[detail.status] }}</el-tag></div>
      </div>
      <el-table v-if="detailItems.length" :data="detailItems" border stripe style="margin-top:12px;">
        <el-table-column prop="line_no" label="#" width="60" />
        <el-table-column prop="sku_code" label="SKU" width="140" />
        <el-table-column prop="batch_no" label="批次" width="160" />
        <el-table-column prop="from_location" label="源库位" width="140" />
        <el-table-column prop="to_location" label="目标库位" width="140" />
        <el-table-column prop="qty" label="数量" width="100" />
      </el-table>
      <div v-else-if="detail" class="legacy-info">
        <p class="legacy-tag">legacy 单 SKU 模式（iter-22 老数据）</p>
        <p>{{ detail.sku_code }} · {{ detail.batch_no }} · 数量 {{ detail.qty }}</p>
        <p>{{ detail.from_location }} → {{ detail.to_location }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.opt-suffix { color: #909399; font-size: 12px; margin-left: 12px; float: right; }
.opt-suffix-warn { color: #FF385C; }
.legacy-detail { color: #909399; font-size: 12px; margin-top: 4px; }
.detail-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
.legacy-info { padding: 12px; background: #f7f7f7; border-radius: 4px; margin-top: 12px; }
.legacy-tag { color: #909399; font-size: 12px; margin: 0 0 8px 0; }
</style>
