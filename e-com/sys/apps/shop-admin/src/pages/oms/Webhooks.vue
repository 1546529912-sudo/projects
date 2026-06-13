<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const loading = ref(true);

const dlgVisible = ref(false);
const submitting = ref(false);
const editingId = ref(0);
const form = reactive({
  name: '', url: '', secret: '',
  events: [] as string[],
  enabled: 1, retry_max: 3,
});

const ALL_EVENTS = [
  { value: 'order.completed', label: 'order.completed（订单完成）' },
  { value: 'order.cancelled', label: 'order.cancelled（订单取消）' },
  { value: 'refund.refunded', label: 'refund.refunded（退款完成）' },
  { value: 'refund.approved', label: 'refund.approved（退款审批通过）' },
];

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.webhookList();
    list.value = res.data?.list || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onAdd() {
  editingId.value = 0;
  Object.assign(form, { name: '', url: '', secret: '', events: [], enabled: 1, retry_max: 3 });
  dlgVisible.value = true;
}

function onEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name, url: row.url, secret: row.secret || '',
    events: row.events || [], enabled: row.enabled, retry_max: row.retry_max,
  });
  dlgVisible.value = true;
}

async function onSubmit() {
  if (!form.name.trim() || !form.url.trim()) { ElMessage.warning('name + url 必填'); return; }
  if (!form.events.length) { ElMessage.warning('至少订阅 1 个事件'); return; }
  submitting.value = true;
  try {
    if (editingId.value > 0) {
      await omsApi.webhookUpdate(editingId.value, {
        name: form.name, url: form.url, events: form.events,
        enabled: form.enabled, retry_max: form.retry_max,
      });
    } else {
      await omsApi.webhookCreate({ ...form, secret: form.secret || undefined });
    }
    ElMessage.success('已保存');
    dlgVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
  finally { submitting.value = false; }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`删除订阅「${row.name}」？`, '确认', { type: 'warning' });
    await omsApi.webhookDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { if (e?.msg) ElMessage.error(e.msg); }
}

async function onTest(row: any) {
  try {
    await omsApi.webhookTest(row.id);
    ElMessage.success('已发起测试推送');
    setTimeout(() => load(), 1500);
  } catch (e: any) { ElMessage.error(e?.msg || '测试失败'); }
}

const successRate = (row: any) => {
  if (row.total_fired === 0) return '-';
  return ((row.total_success / row.total_fired) * 100).toFixed(1) + '%';
};

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">Webhook 订阅</h2>
        <p class="page-desc">OMS /admin/webhook · iter-28 A1 · order/refund 完成时推送给外部 URL · super_admin 独占</p>
      </div>
      <div>
        <el-button type="primary" @click="onAdd">新增订阅</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="url" label="URL" min-width="240">
        <template #default="{ row }"><span class="mono">{{ row.url }}</span></template>
      </el-table-column>
      <el-table-column label="订阅事件" min-width="220">
        <template #default="{ row }">
          <el-tag v-for="e in row.events" :key="e" size="small" style="margin-right:4px;">{{ e }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="累计推送" width="160">
        <template #default="{ row }">
          总 {{ row.total_fired }} · 成 {{ row.total_success }} · 失 {{ row.total_failed }}
        </template>
      </el-table-column>
      <el-table-column label="成功率" width="100">
        <template #default="{ row }">
          <span :class="{ 'rate-good': row.total_fired && row.total_success / row.total_fired >= 0.95, 'rate-warn': row.total_fired && row.total_success / row.total_fired < 0.95 }">
            {{ successRate(row) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="最近状态" width="120">
        <template #default="{ row }">
          <span v-if="row.last_status === null">-</span>
          <el-tag v-else :type="row.last_status >= 200 && row.last_status < 300 ? 'success' : 'danger'" size="small">
            {{ row.last_status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="last_fired_at" label="最近推送" width="170" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onTest(row)">测试推送</el-button>
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlgVisible" :title="editingId ? '编辑订阅' : '新增订阅'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：财务系统对接" />
        </el-form-item>
        <el-form-item label="URL" required>
          <el-input v-model="form.url" placeholder="https://your-app.com/webhook" />
        </el-form-item>
        <el-form-item label="订阅事件" required>
          <el-checkbox-group v-model="form.events">
            <el-checkbox v-for="ev in ALL_EVENTS" :key="ev.value" :value="ev.value">{{ ev.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="HMAC 密钥">
          <el-input v-model="form.secret" :disabled="!!editingId" placeholder="留空自动生成（创建后不可改）" />
        </el-form-item>
        <el-form-item label="重试次数">
          <el-input-number v-model="form.retry_max" :min="1" :max="10" :step="1" />
          <span class="hint">每次失败间隔 500ms 重试</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
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
.mono { font-family: monospace; font-size: 12px; }
.rate-good { color: #67C23A; font-weight: bold; }
.rate-warn { color: #FF385C; font-weight: bold; }
.hint { color: #909399; font-size: 12px; margin-left: 12px; }
</style>
