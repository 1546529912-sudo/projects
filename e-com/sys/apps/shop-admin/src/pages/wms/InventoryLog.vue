<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({
  sku_code: '', location_code: '', change_type: '', ref_no: '',
  page: 1, size: 50,
});

const CHANGE_TYPE: Record<string, { label: string; tag: string }> = {
  inbound:        { label: '入库 +N',     tag: 'success' },
  outbound:       { label: '出库 -N',     tag: 'danger' },
  lock:           { label: '锁定 +L',     tag: 'warning' },
  unlock:         { label: '解锁 -L',     tag: 'info' },
  stock_take_in:  { label: '盘盈 +N',     tag: 'success' },
  stock_take_out: { label: '盘亏 -N',     tag: 'danger' },
  transfer_out:   { label: '调出 -N',     tag: 'danger' },
  transfer_in:    { label: '调入 +N',     tag: 'success' },
};

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.inventoryLogList({
      sku_code: filters.sku_code || undefined,
      location_code: filters.location_code || undefined,
      change_type: filters.change_type || undefined,
      ref_no: filters.ref_no || undefined,
      page: filters.page,
      size: filters.size,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">库存变动日志</h2>
        <p class="page-desc">WMS /inventory-log · iter-24 P0-1 · 所有 quantity/locked 改动全表追溯</p>
      </div>
      <div>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" class="filters">
      <el-form-item label="SKU">
        <el-input v-model="filters.sku_code" placeholder="SKU 编码" clearable style="width:180px" @change="load" />
      </el-form-item>
      <el-form-item label="库位">
        <el-input v-model="filters.location_code" placeholder="库位" clearable style="width:160px" @change="load" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="filters.change_type" placeholder="全部" clearable style="width:160px" @change="load">
          <el-option v-for="(v, k) in CHANGE_TYPE" :key="k" :label="v.label" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="单号">
        <el-input v-model="filters.ref_no" placeholder="inbound/outbound/take/transfer no" clearable style="width:240px" @change="load" />
      </el-form-item>
      <el-button @click="load">查询</el-button>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="#" width="80" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="CHANGE_TYPE[row.change_type]?.tag as any || ''" size="small">
            {{ CHANGE_TYPE[row.change_type]?.label || row.change_type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sku_code" label="SKU" width="140" />
      <el-table-column prop="location_code" label="库位" width="140" />
      <el-table-column prop="batch_no" label="批次" width="160" />
      <el-table-column label="数量变化" width="140">
        <template #default="{ row }">
          <span v-if="row.delta !== 0" :class="row.delta > 0 ? 'delta-plus' : 'delta-minus'">
            {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
          </span>
          <span v-else class="muted">0</span>
        </template>
      </el-table-column>
      <el-table-column label="quantity" width="120">
        <template #default="{ row }">{{ row.before_quantity }} → {{ row.after_quantity }}</template>
      </el-table-column>
      <el-table-column label="locked" width="120">
        <template #default="{ row }">{{ row.before_locked }} → {{ row.after_locked }}</template>
      </el-table-column>
      <el-table-column prop="ref_no" label="关联单号" width="180" />
      <el-table-column prop="operator" label="操作员" width="100" />
      <el-table-column prop="remark" label="备注" min-width="150" />
      <el-table-column prop="created_at" label="时间" width="180" />
    </el-table>

    <el-pagination
      v-model:current-page="filters.page" v-model:page-size="filters.size"
      :total="total" :page-sizes="[20, 50, 100, 200]"
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
.filters { margin-bottom: 12px; padding: 12px; background: #fafafa; border-radius: 4px; }
.delta-plus { color: #67C23A; font-weight: bold; }
.delta-minus { color: #FF385C; font-weight: bold; }
.muted { color: #999; }
</style>
