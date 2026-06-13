<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const alerts = ref<any[]>([]);
const rules = ref<any[]>([]);
const loading = ref(true);

const ruleVisible = ref(false);
const submitting = ref(false);
const form = reactive({ sku_code: '', threshold: 10, enabled: 1, remark: '', notify_webhook_url: '', notify_cooldown_minutes: 60 });
const editingSku = ref('');

async function load() {
  loading.value = true;
  try {
    const [alertRes, ruleRes]: any = await Promise.all([
      wmsApi.stockAlertList(),
      wmsApi.stockAlertRules(),
    ]);
    alerts.value = alertRes.data?.list || [];
    rules.value = ruleRes.data?.list || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onAddRule() {
  editingSku.value = '';
  Object.assign(form, { sku_code: '', threshold: 10, enabled: 1, remark: '', notify_webhook_url: '', notify_cooldown_minutes: 60 });
  ruleVisible.value = true;
}

function onEditRule(row: any) {
  editingSku.value = row.sku_code;
  Object.assign(form, {
    sku_code: row.sku_code,
    threshold: Number(row.threshold),
    enabled: Number(row.enabled),
    remark: row.remark || '',
    notify_webhook_url: row.notify_webhook_url || '',
    notify_cooldown_minutes: row.notify_cooldown_minutes || 60,
  });
  ruleVisible.value = true;
}

async function onSubmitRule() {
  if (!form.sku_code.trim()) { ElMessage.warning('SKU 必填'); return; }
  if (form.threshold < 0) { ElMessage.warning('阈值 ≥ 0'); return; }
  submitting.value = true;
  try {
    await wmsApi.stockAlertRuleUpsert({ ...form });
    ElMessage.success('已保存');
    ruleVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
  finally { submitting.value = false; }
}

async function onDeleteRule(row: any) {
  try {
    await ElMessageBox.confirm(`删除 SKU ${row.sku_code} 的预警规则？`, '确认', { type: 'warning' });
    await wmsApi.stockAlertRuleDelete(row.sku_code);
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
        <h2 class="page-title">低库存预警</h2>
        <p class="page-desc">WMS /stock-alert · 规则 + 实时告警 · 仅展示和提醒，不影响库存</p>
      </div>
      <div>
        <el-button type="primary" @click="onAddRule">新增规则</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <!-- 当前告警 -->
    <el-card class="alert-card">
      <template #header>
        <div class="card-header">
          <strong>当前告警 ({{ alerts.length }})</strong>
          <span v-if="alerts.length > 0" class="alert-warn">⚠️ 有 {{ alerts.length }} 个 SKU 低于阈值</span>
          <span v-else class="alert-ok">✓ 全部库存安全</span>
        </div>
      </template>
      <el-table v-if="alerts.length > 0" :data="alerts" border stripe v-loading="loading">
        <el-table-column prop="sku_code" label="SKU" width="160" />
        <el-table-column prop="threshold" label="阈值" width="100" />
        <el-table-column prop="available" label="当前可用" width="120">
          <template #default="{ row }"><span class="diff-warn">{{ row.available }}</span></template>
        </el-table-column>
        <el-table-column prop="gap" label="缺口" width="100">
          <template #default="{ row }"><span class="diff-warn">-{{ row.gap }}</span></template>
        </el-table-column>
        <el-table-column prop="total_qty" label="quantity" width="100" />
        <el-table-column prop="total_locked" label="locked" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" />
      </el-table>
      <div v-else class="empty">暂无告警</div>
    </el-card>

    <!-- 规则列表 -->
    <el-card style="margin-top: 16px;">
      <template #header><strong>规则列表 ({{ rules.length }})</strong></template>
      <el-table :data="rules" v-loading="loading" border stripe>
        <el-table-column prop="sku_code" label="SKU" width="160" />
        <el-table-column prop="threshold" label="阈值" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" />
        <el-table-column label="Webhook 通知" width="200">
          <template #default="{ row }">
            <el-tag v-if="row.notify_webhook_url" type="success" size="small">已配 · 冷却 {{ row.notify_cooldown_minutes }}分</el-tag>
            <span v-else style="color:#bbb;font-size:12px;">未配</span>
          </template>
        </el-table-column>
        <el-table-column label="最近推送" width="160">
          <template #default="{ row }">
            <span style="font-size:12px;color:#717171;">{{ row.last_notified_at || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建人" width="100" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="onEditRule(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="onDeleteRule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="ruleVisible" :title="editingSku ? `编辑规则 ${editingSku}` : '新增预警规则'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="SKU" required>
          <el-input v-model="form.sku_code" :disabled="!!editingSku" placeholder="如 SPU001-001" />
        </el-form-item>
        <el-form-item label="阈值" required>
          <el-input-number v-model="form.threshold" :min="0" :step="1" />
          <span class="hint">当 WMS 总可用 (quantity-locked) &lt; 此值时告警</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-divider>外部通知（iter-32 A，可选）</el-divider>
        <el-form-item label="Webhook URL">
          <el-input v-model="form.notify_webhook_url" placeholder="如 企业微信/钉钉/飞书 机器人 URL，留空不推送" />
          <span class="hint">触发预警时 POST JSON · 头 X-Wms-Signature 含 HMAC-SHA256</span>
        </el-form-item>
        <el-form-item label="冷却分钟">
          <el-input-number v-model="form.notify_cooldown_minutes" :min="1" :step="5" />
          <span class="hint">同一规则推送后 N 分钟内不重复推</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.alert-card { border-left: 4px solid #FF385C; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.alert-warn { color: #FF385C; font-weight: bold; }
.alert-ok { color: #67C23A; }
.diff-warn { color: #FF385C; font-weight: bold; }
.empty { text-align: center; color: #999; padding: 32px 0; }
.hint { color: #909399; font-size: 12px; margin-left: 12px; }
</style>
