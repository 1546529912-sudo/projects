<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const loading = ref(true);
const warehouses = ref<any[]>([]);

const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive({
  name: '', warehouse_code: '', scope_type: 'all', scope_value: '',
  schedule_type: 'daily', hour: 2, minute: 0,
  days_of_week: [] as number[], day_of_month: 1, enabled: 1,
});

const DOW_LABELS: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };

const fmtSchedule = (r: any) => {
  const t = `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;
  if (r.schedule_type === 'daily') return `每日 ${t}`;
  if (r.schedule_type === 'weekly') {
    const dows = (r.days_of_week ? (typeof r.days_of_week === 'string' ? JSON.parse(r.days_of_week) : r.days_of_week) : []);
    return `每周 ${dows.map((d: number) => DOW_LABELS[d] || d).join('、')} ${t}`;
  }
  if (r.schedule_type === 'monthly') return `每月 ${r.day_of_month}日 ${t}`;
  return r.schedule_type;
};

const fmtScope = (r: any) => {
  if (r.scope_type === 'all') return '全仓';
  return `${r.scope_type}=${r.scope_value || ''}`;
};

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.scheduleList();
    list.value = res.data?.list || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function loadWarehouses() {
  try {
    const res: any = await wmsApi.warehouseList();
    warehouses.value = res.data?.list || [];
  } catch {}
}

function onCreate() {
  editing.value = null;
  Object.assign(form, {
    name: '', warehouse_code: warehouses.value[0]?.warehouse_code || '',
    scope_type: 'all', scope_value: '',
    schedule_type: 'daily', hour: 2, minute: 0,
    days_of_week: [], day_of_month: 1, enabled: 1,
  });
  dialogVisible.value = true;
}

function onEdit(row: any) {
  editing.value = row;
  Object.assign(form, {
    name: row.name, warehouse_code: row.warehouse_code,
    scope_type: row.scope_type, scope_value: row.scope_value || '',
    schedule_type: row.schedule_type, hour: row.hour, minute: row.minute,
    days_of_week: row.days_of_week ? (typeof row.days_of_week === 'string' ? JSON.parse(row.days_of_week) : row.days_of_week) : [],
    day_of_month: row.day_of_month || 1, enabled: row.enabled,
  });
  dialogVisible.value = true;
}

async function onSave() {
  if (!form.name.trim() || !form.warehouse_code) { ElMessage.warning('名称 / 仓库必填'); return; }
  if (['zone', 'location', 'sku'].includes(form.scope_type) && !form.scope_value.trim()) {
    ElMessage.warning('scope_value 必填'); return;
  }
  const payload: any = {
    name: form.name, warehouse_code: form.warehouse_code,
    scope_type: form.scope_type, scope_value: form.scope_value || null,
    schedule_type: form.schedule_type, hour: form.hour, minute: form.minute,
    enabled: form.enabled,
  };
  if (form.schedule_type === 'weekly') payload.days_of_week = form.days_of_week;
  if (form.schedule_type === 'monthly') payload.day_of_month = form.day_of_month;
  try {
    if (editing.value) await wmsApi.scheduleUpdate(editing.value.id, payload);
    else await wmsApi.scheduleCreate(payload);
    ElMessage.success('已保存');
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`删除调度「${row.name}」？`, '确认', { type: 'warning' }); }
  catch { return; }
  try {
    await wmsApi.scheduleDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

async function onTrigger(row: any) {
  try {
    const res: any = await wmsApi.scheduleTriggerNow(row.id);
    ElMessage.success(`已建盘点单 ${res.data?.take_no || ''}`);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '触发失败'); }
}

onMounted(async () => { await loadWarehouses(); await load(); });
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">盘点定时调度</h2>
        <p class="page-desc">WMS /admin/stock-take-schedule · supervisord loop 每 60s 扫一次 · 到点自动建盘点单</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建调度</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="warehouse_code" label="仓库" width="120" />
      <el-table-column label="范围" width="180">
        <template #default="{ row }">{{ fmtScope(row) }}</template>
      </el-table-column>
      <el-table-column label="调度" width="220">
        <template #default="{ row }">{{ fmtSchedule(row) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近触发" width="160">
        <template #default="{ row }">
          <span style="font-size:12px;">{{ row.last_triggered_at || '—' }}</span>
          <div v-if="row.last_created_take_no" style="font-size:11px;color:#999;">{{ row.last_created_take_no }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="onTrigger(row)">手动触发</el-button>
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑调度' : '新建调度'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 每日全仓盘点" />
        </el-form-item>
        <el-form-item label="仓库" required>
          <el-select v-model="form.warehouse_code" placeholder="选择仓库">
            <el-option v-for="w in warehouses" :key="w.warehouse_code" :label="`${w.name} (${w.warehouse_code})`" :value="w.warehouse_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="范围">
          <el-radio-group v-model="form.scope_type">
            <el-radio value="all">全仓</el-radio>
            <el-radio value="zone">分区</el-radio>
            <el-radio value="location">库位</el-radio>
            <el-radio value="sku">SKU</el-radio>
          </el-radio-group>
          <el-input v-if="form.scope_type !== 'all'" v-model="form.scope_value" :placeholder="`输入 ${form.scope_type}`" style="margin-top:8px;" />
        </el-form-item>
        <el-form-item label="频率">
          <el-radio-group v-model="form.schedule_type">
            <el-radio value="daily">每日</el-radio>
            <el-radio value="weekly">每周</el-radio>
            <el-radio value="monthly">每月</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.schedule_type === 'weekly'" label="星期">
          <el-checkbox-group v-model="form.days_of_week">
            <el-checkbox v-for="d in [1,2,3,4,5,6,7]" :key="d" :value="d">{{ DOW_LABELS[d] }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="form.schedule_type === 'monthly'" label="每月几号">
          <el-input-number v-model="form.day_of_month" :min="1" :max="28" />
          <span class="hint">只支持 1-28（避开月底差异）</span>
        </el-form-item>
        <el-form-item label="时间" required>
          <el-input-number v-model="form.hour" :min="0" :max="23" style="width:120px;" /> :
          <el-input-number v-model="form.minute" :min="0" :max="59" style="width:120px;" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.hint { margin-left: 10px; color: #999; font-size: 12px; }
</style>
