<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pimApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import ImageUpload from '@/components/ImageUpload.vue';
import StatusTag from '@/components/StatusTag.vue';

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id) || 0);
const isCreate = computed(() => route.path.endsWith('/new'));
const loading = ref(false);
const saving = ref(false);
const skus = ref<any[]>([]);
const categories = ref<any[]>([]);
const brands = ref<any[]>([]);

interface SpuAttr { name: string; code: string; type: string; options?: string[]; required?: boolean; value?: string; }
const form = reactive({
  code: '',
  name: '',
  category_id: 0,
  brand_id: 0,
  base_price: 0, // 分
  main_images: [] as string[],
  selling_points: [] as string[],
  attrs: [] as SpuAttr[],
  detail_html: '',
  status: 'draft',
});
const sellingPointInput = ref('');

// iter-30 B: 属性模板
const templates = ref<any[]>([]);
const selectedTemplateId = ref<number | null>(null);

async function loadTemplates() {
  try {
    const res: any = await pimApi.templateList();
    templates.value = (res.data?.list || []).filter((t: any) => t.status === 'enabled');
  } catch {}
}

function applyTemplate() {
  const tpl = templates.value.find(t => t.id === selectedTemplateId.value);
  if (!tpl) { ElMessage.warning('请选择模板'); return; }
  const existCodes = new Set(form.attrs.map(a => a.code));
  let added = 0;
  for (const a of (tpl.attrs || [])) {
    if (existCodes.has(a.code)) continue;
    form.attrs.push({
      name: a.name, code: a.code, type: a.type || 'text',
      options: a.options || [], required: !!a.required, value: '',
    });
    added++;
  }
  ElMessage.success(`已新增 ${added} 项属性${added < (tpl.attrs?.length || 0) ? `（${(tpl.attrs?.length || 0) - added} 项已存在跳过）` : ''}`);
}

function removeAttr(i: number) { form.attrs.splice(i, 1); }

// SKU dialog
const skuDialog = ref(false);
const skuIsEdit = ref(false);
const skuForm = reactive({
  sku_code: '',
  spu_id: 0,
  price: 0,
  status: 'enabled',
  weight: null as number | null,
  sales_attrs_json: '{}',
});

async function loadOptions() {
  try {
    const [c, b]: any = await Promise.all([pimApi.categoryList(), pimApi.brandList()]);
    categories.value = c.data?.list || [];
    brands.value = b.data?.list || [];
  } catch {}
}

async function loadDetail() {
  if (isCreate.value) return;
  loading.value = true;
  try {
    const res: any = await pimApi.spuDetail(id.value);
    const spu = res.data?.spu;
    if (!spu) { ElMessage.error('SPU 不存在'); return; }
    Object.assign(form, {
      code: spu.code, name: spu.name,
      category_id: spu.category_id, brand_id: spu.brand_id || 0,
      base_price: spu.base_price || 0,
      main_images: Array.isArray(spu.main_images) ? spu.main_images : [],
      selling_points: Array.isArray(spu.selling_points) ? spu.selling_points : [],
      attrs: Array.isArray(spu.attrs) ? spu.attrs : [],
      detail_html: spu.detail_html || '',
      status: spu.status,
    });
    skus.value = res.data?.skus || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function addSellingPoint() {
  const v = sellingPointInput.value.trim();
  if (!v) return;
  if (form.selling_points.length >= 5) {
    ElMessage.warning('最多 5 个卖点');
    return;
  }
  form.selling_points.push(v);
  sellingPointInput.value = '';
}
function removeSellingPoint(idx: number) { form.selling_points.splice(idx, 1); }

async function onSaveSpu() {
  if (!form.code || !form.name) { ElMessage.warning('编码和名称必填'); return; }
  if (!form.category_id) { ElMessage.warning('请选类目'); return; }
  if (!form.main_images.length) { ElMessage.warning('至少上传 1 张主图'); return; }

  saving.value = true;
  try {
    if (isCreate.value) {
      const res: any = await pimApi.spuCreate({
        code: form.code, name: form.name,
        category_id: form.category_id, brand_id: form.brand_id || null,
        base_price: form.base_price,
        main_images: form.main_images, selling_points: form.selling_points,
        attrs: form.attrs,
        detail_html: form.detail_html,
      });
      ElMessage.success('已创建');
      const newId = res.data?.spu?.id;
      if (newId) router.replace(`/pim/products/edit/${newId}`);
    } else {
      await pimApi.spuUpdate(id.value, {
        name: form.name, category_id: form.category_id, brand_id: form.brand_id || null,
        base_price: form.base_price,
        main_images: form.main_images, selling_points: form.selling_points,
        attrs: form.attrs,
        detail_html: form.detail_html,
      });
      ElMessage.success('已保存');
      await loadDetail();
    }
  } catch (e: any) {
    ElMessage.error(e?.msg || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function onPublish() {
  try {
    await pimApi.spuPublish(id.value);
    ElMessage.success('已发布');
    await loadDetail();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}
async function onOffline() {
  try {
    await pimApi.spuOffline(id.value);
    ElMessage.success('已下架');
    await loadDetail();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

function resetSkuForm() {
  Object.assign(skuForm, {
    sku_code: '', spu_id: id.value,
    price: form.base_price, status: 'enabled', weight: null,
    sales_attrs_json: '{}',
  });
}
function onAddSku() { resetSkuForm(); skuIsEdit.value = false; skuDialog.value = true; }
function onEditSku(row: any) {
  Object.assign(skuForm, {
    sku_code: row.sku_code, spu_id: row.spu_id,
    price: row.price, status: row.status,
    weight: row.weight !== null && row.weight !== undefined ? Number(row.weight) : null,
    sales_attrs_json: JSON.stringify(row.sales_attrs || {}, null, 2),
  });
  skuIsEdit.value = true;
  skuDialog.value = true;
}
async function onSaveSku() {
  if (!skuForm.sku_code) { ElMessage.warning('sku_code 必填'); return; }
  if (skuForm.price <= 0) { ElMessage.warning('price 必须大于 0'); return; }
  let salesAttrs: any = {};
  try {
    salesAttrs = JSON.parse(skuForm.sales_attrs_json || '{}');
    if (typeof salesAttrs !== 'object') throw new Error('not object');
  } catch { ElMessage.error('sales_attrs 必须是合法 JSON 对象'); return; }
  try {
    if (skuIsEdit.value) {
      await pimApi.skuUpdate(skuForm.sku_code, {
        price: skuForm.price, status: skuForm.status, weight: skuForm.weight, sales_attrs: salesAttrs,
      });
    } else {
      await pimApi.skuCreate({
        sku_code: skuForm.sku_code, spu_id: id.value,
        price: skuForm.price, weight: skuForm.weight, sales_attrs: salesAttrs,
      });
    }
    ElMessage.success('已保存');
    skuDialog.value = false;
    await loadDetail();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}
async function onDeleteSku(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除 SKU「${row.sku_code}」？`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await pimApi.skuDelete(row.sku_code);
    ElMessage.success('已删除');
    await loadDetail();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

onMounted(async () => {
  await loadOptions();
  await loadTemplates();
  await loadDetail();
});
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <el-button @click="router.back()">← 返回</el-button>
        <h2 class="page-title">{{ isCreate ? '新建 SPU' : '编辑 SPU #' + id }}</h2>
        <StatusTag v-if="!isCreate" :status="form.status" />
      </div>
      <div v-if="!isCreate">
        <el-button type="success" v-if="form.status !== 'published'" @click="onPublish">发布</el-button>
        <el-button v-if="form.status === 'published'" @click="onOffline">下架</el-button>
      </div>
    </div>

    <el-card v-loading="loading">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="SPU 编码" required>
              <el-input v-model="form.code" :disabled="!isCreate" placeholder="如 SPU001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="类目" required>
              <el-select v-model="form.category_id" style="width:100%;">
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="品牌">
              <el-select v-model="form.brand_id" clearable style="width:100%;">
                <el-option :label="'(无)'" :value="0" />
                <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="基础价(分)">
              <el-input-number v-model="form.base_price" :min="0" style="width:100%;" />
              <span style="margin-left:8px;color:#999;font-size:12px;">¥{{ (form.base_price/100).toFixed(2) }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="主图" required>
          <ImageUpload v-model="form.main_images" multiple :max="5" enable-library />
        </el-form-item>

        <el-form-item label="卖点">
          <div style="width:100%;">
            <el-tag v-for="(sp, idx) in form.selling_points" :key="idx" closable @close="removeSellingPoint(idx)" style="margin-right:8px;margin-bottom:6px;">
              {{ sp }}
            </el-tag>
            <el-input v-model="sellingPointInput" placeholder="输入卖点回车添加（最多 5 个）" @keyup.enter="addSellingPoint" style="width:300px;" />
            <el-button @click="addSellingPoint" style="margin-left:8px;">添加</el-button>
          </div>
        </el-form-item>

        <el-form-item label="属性">
          <div style="width:100%;">
            <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;">
              <el-select v-model="selectedTemplateId" placeholder="选择属性模板" clearable style="width:240px;">
                <el-option v-for="t in templates" :key="t.id" :label="`${t.name}（${t.attrs?.length||0} 项）`" :value="t.id" />
              </el-select>
              <el-button @click="applyTemplate" :disabled="!selectedTemplateId">应用模板</el-button>
              <span style="color:#999;font-size:12px;">已存在的 code 会跳过，不会覆盖你已填的值</span>
            </div>
            <div v-for="(a, i) in form.attrs" :key="i" class="attr-row">
              <el-tag size="small" :type="a.required ? 'danger' : 'info'" style="min-width:90px;text-align:center;">
                {{ a.name }}<span v-if="a.required">*</span>
              </el-tag>
              <span class="attr-code">{{ a.code }}</span>
              <el-select v-if="a.type === 'select'" v-model="a.value" :placeholder="`选 ${a.name}`" style="width:200px;" clearable>
                <el-option v-for="opt in (a.options || [])" :key="opt" :label="opt" :value="opt" />
              </el-select>
              <el-input-number v-else-if="a.type === 'number'" v-model="a.value as any" style="width:200px;" />
              <el-input v-else v-model="a.value" :placeholder="`填 ${a.name}`" style="width:240px;" />
              <el-button text type="danger" @click="removeAttr(i)">删除</el-button>
            </div>
            <div v-if="!form.attrs.length" style="color:#999;font-size:12px;">暂无属性，选模板应用，或直接保存空</div>
          </div>
        </el-form-item>

        <el-form-item label="详情 HTML">
          <el-input v-model="form.detail_html" type="textarea" :rows="6" placeholder="支持 HTML，如 <p>内容...</p>" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSaveSpu">{{ isCreate ? '创建并继续编辑 SKU' : '保存' }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!isCreate" style="margin-top:16px;">
      <div class="page-head">
        <h3 style="margin:0;">SKU 列表（{{ skus.length }}）</h3>
        <el-button type="primary" @click="onAddSku">新增 SKU</el-button>
      </div>
      <el-table :data="skus" stripe border>
        <el-table-column prop="sku_code" label="SKU 编码" width="160" />
        <el-table-column label="价格" width="100">
          <template #default="{ row }"><span class="price">¥{{ (row.price/100).toFixed(2) }}</span></template>
        </el-table-column>
        <el-table-column label="销售属性">
          <template #default="{ row }">{{ JSON.stringify(row.sales_attrs || {}) }}</template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(kg)" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="onEditSku(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="onDeleteSku(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="skuDialog" :title="skuIsEdit ? '编辑 SKU' : '新增 SKU'" width="500px">
      <el-form :model="skuForm" label-width="100px">
        <el-form-item label="sku_code" required>
          <el-input v-model="skuForm.sku_code" :disabled="skuIsEdit" placeholder="如 SPU001-001" />
        </el-form-item>
        <el-form-item label="价格(分)" required>
          <el-input-number v-model="skuForm.price" :min="1" style="width:100%;" />
          <span style="margin-left:8px;color:#999;font-size:12px;">¥{{ (skuForm.price/100).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="重量(kg)">
          <el-input-number v-model="skuForm.weight" :min="0" :precision="3" :step="0.001" style="width:100%;" />
        </el-form-item>
        <el-form-item label="销售属性">
          <el-input v-model="skuForm.sales_attrs_json" type="textarea" :rows="3" placeholder='{"color":"黑","size":"M"}' />
        </el-form-item>
        <el-form-item label="状态" v-if="skuIsEdit">
          <el-radio-group v-model="skuForm.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="skuDialog = false">取消</el-button>
        <el-button type="primary" @click="onSaveSku">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.page-title { margin: 0 8px; display: inline-block; }
.price { color: #FF385C; font-weight: 600; }
.attr-row { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.attr-code { font-size: 11px; color: #999; min-width: 80px; font-family: monospace; }
</style>
