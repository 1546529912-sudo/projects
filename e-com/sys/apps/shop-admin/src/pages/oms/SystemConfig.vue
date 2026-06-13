<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const list = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const edits = ref<Record<string, string>>({});

const CATEGORY_LABEL: Record<string, string> = {
  refund_threshold: '💰 退款阈值二审',
  exchange_threshold: '🔄 换货阈值二审',
  sku_lifecycle: '🛍 SKU 生命周期',
  alert: '🚨 异常预警阈值',
  withdrawal: '💵 提现限额',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.configList();
    list.value = res?.data?.list || [];
    edits.value = {};
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

const grouped = computed(() => {
  const out: Record<string, any[]> = {};
  for (const c of list.value) {
    if (!out[c.category]) out[c.category] = [];
    out[c.category].push(c);
  }
  return out;
});

const dirtyCount = computed(() => Object.keys(edits.value).length);

function setEdit(key: string, value: string, original: string) {
  if (value === original) delete edits.value[key];
  else edits.value[key] = value;
  // trigger reactivity
  edits.value = { ...edits.value };
}

async function save() {
  if (!dirtyCount.value) { ElMessage.warning('无修改'); return; }
  saving.value = true;
  try {
    const res: any = await omsApi.configUpdate(edits.value);
    ElMessage.success(`已保存 ${res?.data?.changed_count || 0} 项`);
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">系统参数</h2>
        <p class="page-desc">iter-52 · 阈值后台可配（退款/换货阈值 + SKU 阶段 + 预警 + 提现限额）</p>
      </div>
      <div class="filters">
        <el-tag v-if="dirtyCount > 0" type="warning">{{ dirtyCount }} 项待保存</el-tag>
        <el-button @click="load" :loading="loading">刷新</el-button>
        <el-button type="primary" :disabled="!dirtyCount" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>

    <el-card v-for="(items, cat) in grouped" :key="cat" class="cat-card" shadow="never">
      <template #header>
        <span class="cat-title">{{ CATEGORY_LABEL[cat] || cat }}</span>
      </template>
      <el-form label-width="280px" size="small">
        <el-form-item v-for="c in items" :key="c.config_key" :label="c.config_key">
          <div class="cfg-row">
            <el-input
              :model-value="edits[c.config_key] ?? c.config_value"
              @update:model-value="(v: string) => setEdit(c.config_key, v, c.config_value)"
              style="width: 200px;"
            />
            <span v-if="edits[c.config_key] !== undefined" class="changed">已改（原 {{ c.config_value }}）</span>
            <span class="desc">{{ c.description }}</span>
            <span v-if="c.updated_by" class="meta">last by {{ c.updated_by }} @ {{ c.updated_at }}</span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.filters { display: flex; gap: 12px; align-items: center; }
.cat-card { margin-bottom: 16px; }
.cat-title { font-weight: 600; font-size: 15px; }
.cfg-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.changed { color: #E6A23C; font-size: 12px; }
.desc { color: #717171; font-size: 12px; flex: 1; }
.meta { color: #C0C4CC; font-size: 11px; }
</style>
