<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', outbound_no: '', operator: '', page: 1, size: 20 });

const STATUS_LABEL: Record<string, { label: string; tag: string }> = {
  pending:   { label: '待分配', tag: 'info' },
  assigned:  { label: '已分配', tag: 'primary' },
  partial:   { label: '部分拣货', tag: 'warning' },
  picked:    { label: '已完成', tag: 'success' },
  cancelled: { label: '已取消', tag: 'danger' },
};

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.pickingTaskList({
      status: filters.status || undefined,
      outbound_no: filters.outbound_no || undefined,
      operator: filters.operator || undefined,
      page: filters.page, size: filters.size,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onAssign(row: any) {
  try {
    const { value } = await ElMessageBox.prompt(`分配拣货任务 #${row.id} (${row.outbound_no})`, '分配操作员', {
      inputValue: 'warehouse',
      inputPlaceholder: '操作员账号',
      inputValidator: (v) => !!v || '不能为空',
    });
    await wmsApi.pickingTaskAssign(row.id, value);
    ElMessage.success(`已分配给 ${value}`);
    await load();
  } catch { return; }
}

async function onScan(row: any) {
  try {
    const { value } = await ElMessageBox.prompt(
      `扫描上报 ${row.sku_code}@${row.location_code}（期望 ${row.expected_qty}，已拣 ${row.picked_qty}）`,
      '增量上报',
      { inputType: 'number', inputValue: '1', inputValidator: (v) => parseInt(v, 10) > 0 || '必须 > 0' },
    );
    await wmsApi.pickingTaskScan(row.id, parseInt(value, 10));
    ElMessage.success('已上报');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

async function onComplete(row: any) {
  try {
    await ElMessageBox.confirm(`一键完成 #${row.id}？picked_qty 直接置为 expected ${row.expected_qty}`, '确认', { type: 'warning' });
    await wmsApi.pickingTaskComplete(row.id);
    ElMessage.success('已完成');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">拣货任务</h2>
        <p class="page-desc">WMS /picking-task · iter-24 P1-1 · 仓管员分配 + 扫描上报 + 完成</p>
      </div>
      <div>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" class="filters">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:160px" @change="load">
          <el-option v-for="(v, k) in STATUS_LABEL" :key="k" :label="v.label" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="出库单号">
        <el-input v-model="filters.outbound_no" placeholder="OB..." clearable style="width:200px" @change="load" />
      </el-form-item>
      <el-form-item label="操作员">
        <el-input v-model="filters.operator" placeholder="账号" clearable style="width:160px" @change="load" />
      </el-form-item>
      <el-button @click="load">查询</el-button>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="outbound_no" label="出库单" width="200" />
      <el-table-column prop="sku_code" label="SKU" width="140" />
      <el-table-column prop="location_code" label="库位" width="140" />
      <el-table-column prop="batch_no" label="批次" width="120" />
      <el-table-column label="期望/已拣" width="120">
        <template #default="{ row }">
          <span :class="{ 'progress-full': row.picked_qty >= row.expected_qty }">
            {{ row.picked_qty }} / {{ row.expected_qty }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="STATUS_LABEL[row.status]?.tag as any || ''">{{ STATUS_LABEL[row.status]?.label || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="操作员" width="120" />
      <el-table-column prop="assigned_at" label="分配时间" width="170" />
      <el-table-column prop="picked_at" label="完成时间" width="170" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'picked' && row.status !== 'cancelled'" size="small" @click="onAssign(row)">分配</el-button>
          <el-button v-if="row.status !== 'picked' && row.status !== 'cancelled'" size="small" type="primary" @click="onScan(row)">扫描</el-button>
          <el-button v-if="row.status !== 'picked' && row.status !== 'cancelled'" size="small" type="success" @click="onComplete(row)">完成</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page" v-model:page-size="filters.size"
      :total="total" :page-sizes="[10, 20, 50]"
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
.progress-full { color: #67C23A; font-weight: bold; }
</style>
