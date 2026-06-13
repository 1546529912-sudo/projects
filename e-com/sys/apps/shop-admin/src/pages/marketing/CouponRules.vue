<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const coupons = ref<any[]>([]);
const loading = ref(true);

const dlgVisible = ref(false);
const submitting = ref(false);
const editingId = ref(0);
const form = reactive({
  name: '', trigger_type: 'user_register' as 'user_register' | 'order_completed',
  coupon_id: 0, per_user_limit: 1, enabled: 1, remark: '',
});

const TRIGGER_LABEL: Record<string, string> = {
  user_register: '注册',
  order_completed: '订单完成（M3+ 留位）',
};

async function load() {
  loading.value = true;
  try {
    const [r1, r2]: any = await Promise.all([
      omsApi.couponRuleList(),
      omsApi.couponList({ status: 'active', size: 100 }),
    ]);
    list.value = r1.data?.list || [];
    coupons.value = r2.data?.list || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onAdd() {
  editingId.value = 0;
  Object.assign(form, {
    name: '', trigger_type: 'user_register', coupon_id: 0,
    per_user_limit: 1, enabled: 1, remark: '',
  });
  dlgVisible.value = true;
}

function onEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name, trigger_type: row.trigger_type, coupon_id: row.coupon_id,
    per_user_limit: row.per_user_limit, enabled: row.enabled, remark: row.remark || '',
  });
  dlgVisible.value = true;
}

async function onSubmit() {
  if (!form.name.trim()) { ElMessage.warning('name 必填'); return; }
  if (!form.coupon_id) { ElMessage.warning('coupon 必选'); return; }
  submitting.value = true;
  try {
    if (editingId.value > 0) {
      await omsApi.couponRuleUpdate(editingId.value, {
        name: form.name, enabled: form.enabled, per_user_limit: form.per_user_limit, remark: form.remark,
      });
    } else {
      await omsApi.couponRuleCreate({ ...form });
    }
    ElMessage.success('已保存');
    dlgVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
  finally { submitting.value = false; }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`删除规则「${row.name}」？`, '确认', { type: 'warning' });
    await omsApi.couponRuleDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">自动发券规则</h2>
        <p class="page-desc">iter-27 Q19-02 · 新人券 / 订单完成赠（M3+）等触发规则</p>
      </div>
      <div>
        <el-button type="primary" @click="onAdd">新增规则</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="name" label="规则名" min-width="180" />
      <el-table-column label="触发条件" width="180">
        <template #default="{ row }">{{ TRIGGER_LABEL[row.trigger_type] || row.trigger_type }}</template>
      </el-table-column>
      <el-table-column label="赠送优惠券" min-width="240">
        <template #default="{ row }">
          {{ row.coupon_name || ('id=' + row.coupon_id) }}
          <span class="muted">({{ row.coupon_type === 'threshold' ? '满减' : '折扣' }})</span>
        </template>
      </el-table-column>
      <el-table-column prop="per_user_limit" label="每人上限" width="100" />
      <el-table-column prop="granted_count" label="已发放" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="150" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlgVisible" :title="editingId ? '编辑规则' : '新增规则'" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="规则名" required>
          <el-input v-model="form.name" placeholder="如：新人注册赠 iPhone 券" />
        </el-form-item>
        <el-form-item label="触发条件" required>
          <el-select v-model="form.trigger_type" style="width:100%" :disabled="!!editingId">
            <el-option label="用户注册（首次登录）" value="user_register" />
            <el-option label="订单完成（M3+ 留位）" value="order_completed" disabled />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠券" required>
          <el-select v-model="form.coupon_id" filterable style="width:100%" :disabled="!!editingId">
            <el-option v-for="c in coupons" :key="c.id" :label="`#${c.id} ${c.name}（${c.type === 'threshold' ? '满减' : '折扣'}）`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="每人上限">
          <el-input-number v-model="form.per_user_limit" :min="1" :step="1" />
          <span class="hint">触发 N 次后停止</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.muted { color: #909399; font-size: 12px; margin-left: 6px; }
.hint { color: #909399; font-size: 12px; margin-left: 12px; }
</style>
