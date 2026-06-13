<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);
const statusFilter = ref('');

// 编辑 dialog
const editVisible = ref(false);
const editMode = ref<'create' | 'update'>('create');
const submitting = ref(false);
const form = reactive({
  id: 0,
  name: '',
  type: 'threshold' as 'threshold' | 'percent',
  scope_type: 'all' as 'all' | 'spu' | 'category',
  scope_value_text: '',  // 逗号分隔的 id 列表
  discount_value_yuan: 10,  // 输入时用元；提交时换算
  discount_percent: 15,     // percent 类型用 1-99 整数
  min_amount_yuan: 99,
  max_discount_yuan: null as number | null,
  total_count: 1000,
  per_user_limit: 1,
  valid_from: '',
  valid_to: '',
});

function fenToYuan(fen: number | string | null): string {
  if (fen === null || fen === undefined || fen === '') return '-';
  return (Number(fen) / 100).toFixed(2);
}

function describe(row: any): string {
  if (row.type === 'threshold') {
    return `满 ¥${fenToYuan(row.min_amount)} 减 ¥${fenToYuan(row.discount_value)}`;
  }
  const cap = row.max_discount ? `，封顶 ¥${fenToYuan(row.max_discount)}` : '';
  return `满 ¥${fenToYuan(row.min_amount)} 减 ${row.discount_value}%${cap}`;
}

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.couponList({
      page: page.value, size: size.value,
      status: statusFilter.value || undefined,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

function onAdd() {
  editMode.value = 'create';
  const today = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const later = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 16).replace('T', ' ');
  Object.assign(form, {
    id: 0, name: '', type: 'threshold',
    scope_type: 'all', scope_value_text: '',
    discount_value_yuan: 10, discount_percent: 15,
    min_amount_yuan: 99, max_discount_yuan: null,
    total_count: 1000, per_user_limit: 1,
    valid_from: today, valid_to: later,
  });
  editVisible.value = true;
}

function onEdit(row: any) {
  editMode.value = 'update';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    type: row.type,
    discount_value_yuan: row.type === 'threshold' ? Number(row.discount_value) / 100 : 0,
    discount_percent: row.type === 'percent' ? Number(row.discount_value) : 0,
    min_amount_yuan: Number(row.min_amount) / 100,
    max_discount_yuan: row.max_discount !== null ? Number(row.max_discount) / 100 : null,
    total_count: row.total_count,
    per_user_limit: row.per_user_limit,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
  });
  editVisible.value = true;
}

async function onSubmit() {
  if (!form.name.trim()) { ElMessage.warning('名称必填'); return; }
  if (form.valid_from >= form.valid_to) { ElMessage.warning('结束时间必须晚于开始时间'); return; }

  submitting.value = true;
  try {
    if (editMode.value === 'create') {
      const discount_value = form.type === 'threshold'
        ? Math.round(form.discount_value_yuan * 100)
        : form.discount_percent;
      if (form.type === 'threshold' && discount_value <= 0) {
        ElMessage.warning('减免金额必须 > 0'); submitting.value = false; return;
      }
      if (form.type === 'percent' && (form.discount_percent < 1 || form.discount_percent > 99)) {
        ElMessage.warning('折扣百分比必须 1-99'); submitting.value = false; return;
      }
      const scopeValue = form.scope_type === 'all' ? undefined :
        form.scope_value_text.split(/[,，\s]+/).filter(Boolean).map(s => parseInt(s, 10)).filter(n => n > 0);
      if (form.scope_type !== 'all' && (!scopeValue || !scopeValue.length)) {
        ElMessage.warning(`scope_type=${form.scope_type} 需填 id 列表`); submitting.value = false; return;
      }
      await omsApi.couponCreate({
        name: form.name,
        type: form.type,
        scope_type: form.scope_type,
        scope_value: scopeValue,
        discount_value,
        min_amount: Math.round(form.min_amount_yuan * 100),
        max_discount: form.max_discount_yuan !== null
          ? Math.round(form.max_discount_yuan * 100) : null,
        total_count: form.total_count,
        per_user_limit: form.per_user_limit,
        valid_from: form.valid_from,
        valid_to: form.valid_to,
      } as any);
      ElMessage.success('已新增');
    } else {
      await omsApi.couponUpdate(form.id, {
        name: form.name,
        valid_to: form.valid_to,
        total_count: form.total_count,
        per_user_limit: form.per_user_limit,
        max_discount: form.max_discount_yuan !== null
          ? Math.round(form.max_discount_yuan * 100) : null,
      });
      ElMessage.success('已更新');
    }
    editVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '操作失败');
  } finally { submitting.value = false; }
}

async function onDisable(row: any) {
  try {
    await ElMessageBox.confirm(`停用「${row.name}」？停用后不可恢复，用户已领的券仍可在有效期内使用。`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.couponDisable(row.id);
    ElMessage.success('已停用');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

const statusTag = (s: string) => s === 'active' ? 'success' : 'info';

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">优惠券</h2>
        <p class="page-desc">营销运营 · 满减 / 折扣两种类型 · super_admin + sales_ops 可见</p>
      </div>
      <div>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:140px;margin-right:8px" @change="load">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-button type="primary" @click="onAdd">新增优惠券</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'threshold' ? 'primary' : 'warning'">
            {{ row.type === 'threshold' ? '满减' : '折扣' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="规则" min-width="200">
        <template #default="{ row }">{{ describe(row) }}</template>
      </el-table-column>
      <el-table-column label="已领 / 总量" width="120">
        <template #default="{ row }">
          {{ row.claimed_count }} / {{ row.total_count === 0 ? '∞' : row.total_count }}
        </template>
      </el-table-column>
      <el-table-column prop="used_count" label="已用" width="80" />
      <el-table-column prop="per_user_limit" label="限领" width="80" />
      <el-table-column label="有效期" width="320">
        <template #default="{ row }">{{ row.valid_from }} ~ {{ row.valid_to }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button v-if="row.status === 'active'" size="small" type="danger" @click="onDisable(row)">停用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="editVisible" :title="editMode === 'create' ? '新增优惠券' : '编辑优惠券'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：满 99 减 10" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type" :disabled="editMode === 'update'">
            <el-radio value="threshold">满减</el-radio>
            <el-radio value="percent">折扣</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="适用范围" required>
          <el-radio-group v-model="form.scope_type" :disabled="editMode === 'update'">
            <el-radio value="all">全场</el-radio>
            <el-radio value="spu">商品（SPU id）</el-radio>
            <el-radio value="category">类目（id）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scope_type !== 'all'" :label="form.scope_type === 'spu' ? 'SPU id 列表' : '类目 id 列表'" required>
          <el-input v-model="form.scope_value_text" :disabled="editMode === 'update'" placeholder="逗号分隔，如 1,2,3" />
        </el-form-item>
        <el-form-item v-if="form.type === 'threshold'" label="减免金额" required>
          <el-input-number v-model="form.discount_value_yuan" :min="0.01" :precision="2" :step="1" :disabled="editMode === 'update'" />
          <span class="unit">元</span>
        </el-form-item>
        <el-form-item v-if="form.type === 'percent'" label="折扣百分比" required>
          <el-input-number v-model="form.discount_percent" :min="1" :max="99" :step="1" :disabled="editMode === 'update'" />
          <span class="unit">% off（15 = 8.5 折）</span>
        </el-form-item>
        <el-form-item v-if="form.type === 'percent'" label="封顶">
          <el-input-number v-model="form.max_discount_yuan" :min="0" :precision="2" :step="1" placeholder="不填=不封顶" />
          <span class="unit">元</span>
        </el-form-item>
        <el-form-item label="使用门槛">
          <el-input-number v-model="form.min_amount_yuan" :min="0" :precision="2" :step="10" :disabled="editMode === 'update'" />
          <span class="unit">元（商品金额 ≥ 此值方可用）</span>
        </el-form-item>
        <el-form-item label="总发放量">
          <el-input-number v-model="form.total_count" :min="0" :step="100" />
          <span class="unit">0 = 不限</span>
        </el-form-item>
        <el-form-item label="每人限领">
          <el-input-number v-model="form.per_user_limit" :min="1" :step="1" />
          <span class="unit">张</span>
        </el-form-item>
        <el-form-item label="生效时间" required>
          <el-input v-model="form.valid_from" placeholder="2026-05-29 00:00" :disabled="editMode === 'update'" />
        </el-form-item>
        <el-form-item label="失效时间" required>
          <el-input v-model="form.valid_to" placeholder="2026-06-29 23:59" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.unit { margin-left: 8px; color: #717171; font-size: 13px; }
</style>
