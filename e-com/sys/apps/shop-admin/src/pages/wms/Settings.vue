<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { wmsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const loading = ref(true);
const saving = ref(false);
const defaults = ref<Record<string, number>>({});
const form = reactive<Record<string, number>>({
  existing: 40, golden: 30, sameZone: 20, capacity: 10, capacityThreshold: 100,
});

const WEIGHT_LABEL: Record<string, string> = {
  existing: '已有该 SKU 加权',
  golden: '黄金库位加权',
  sameZone: '同分区加权',
  capacity: '容量充足加权',
  capacityThreshold: '容量充足阈值',
};
const WEIGHT_DESC: Record<string, string> = {
  existing: '已有该 SKU 的库位（聚集效应，方便拣货）',
  golden: '黄金库位（is_golden=1）',
  sameZone: '同分区已有该 SKU 的库位附近',
  capacity: '剩余容量充足',
  capacityThreshold: '容量阈值（当前总 quantity < 此值即视为充足）',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await wmsApi.locationWeightsPreview();
    defaults.value = res.data?.defaults || {};
    Object.assign(form, res.data?.effective || {});
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

async function onSave() {
  saving.value = true;
  try {
    await wmsApi.configSet('location_recommend_weights', {
      existing: form.existing, golden: form.golden, sameZone: form.sameZone,
      capacity: form.capacity, capacityThreshold: form.capacityThreshold,
    }, '上架推荐权重');
    ElMessage.success('已保存，下次入库推荐立即生效');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
  finally { saving.value = false; }
}

function onReset() {
  Object.assign(form, defaults.value);
  ElMessage.info('已恢复默认值（点保存生效）');
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">WMS 配置</h2>
        <p class="page-desc">iter-32 C · 调整上架推荐 LocationRecommendService 各项权重（不同仓型权重不同）</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>上架推荐权重</strong>
          <span style="color:#999;font-size:12px;">key = location_recommend_weights</span>
        </div>
      </template>

      <el-form :model="form" label-width="160px" style="max-width:680px;">
        <el-form-item v-for="key in ['existing','golden','sameZone','capacity']" :key="key" :label="WEIGHT_LABEL[key]">
          <el-input-number v-model="form[key]" :min="0" :max="200" :step="5" />
          <span class="hint">{{ WEIGHT_DESC[key] }} · 默认 {{ defaults[key] }} · key=<code>{{ key }}</code></span>
        </el-form-item>
        <el-divider>容量阈值</el-divider>
        <el-form-item :label="WEIGHT_LABEL.capacityThreshold">
          <el-input-number v-model="form.capacityThreshold" :min="1" :max="10000" :step="10" />
          <span class="hint">{{ WEIGHT_DESC.capacityThreshold }} · 默认 {{ defaults.capacityThreshold }} · key=<code>capacityThreshold</code></span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
          <el-button @click="onReset">恢复默认</el-button>
        </el-form-item>
      </el-form>

      <el-alert type="info" :closable="false" style="margin-top:16px;">
        <template #title>
          推荐打分 = <b>已有该 SKU 加权</b> × (是否聚集) + <b>黄金库位加权</b> × (是否黄金位) + <b>同分区加权</b> × (是否同分区) + <b>容量充足加权</b> × (是否充足)<br/>
          调权重后立刻生效，下次入库点"智能推荐"即看到新分数
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.hint { margin-left: 10px; color: #999; font-size: 12px; }
</style>
