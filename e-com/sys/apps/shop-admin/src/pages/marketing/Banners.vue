<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import ImageUpload from '@/components/ImageUpload.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const POSITION_LABELS: Record<string, string> = {
  home: '首页轮播',
  category: '类目页',
  detail: '商品详情',
};
const LINK_TYPE_LABELS: Record<string, string> = {
  spu: '跳 SPU 详情',
  category: '跳类目',
  url: '跳外链',
  none: '不可点',
};

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ position: '', status: '', page: 1, size: 20 });

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  code: '', name: '', position: 'home',
  image_url: '', link_type: 'none', link_value: '',
  sort: 0, status: 'enabled',
  valid_from: '', valid_to: '',
});

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.position) params.position = filters.position;
    if (filters.status) params.status = filters.status;
    const res: any = await omsApi.bannerList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, {
    code: '', name: '', position: 'home',
    image_url: '', link_type: 'none', link_value: '',
    sort: 0, status: 'enabled', valid_from: '', valid_to: '',
  });
}

function onCreate() {
  isEdit.value = false; editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: any) {
  isEdit.value = true; editingId.value = row.id;
  Object.assign(form, {
    code: row.code, name: row.name, position: row.position,
    image_url: row.image_url, link_type: row.link_type || 'none', link_value: row.link_value || '',
    sort: row.sort || 0, status: row.status, valid_from: row.valid_from || '', valid_to: row.valid_to || '',
  });
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.code || !form.name || !form.image_url) {
    ElMessage.warning('code / name / image_url 必填'); return;
  }
  try {
    const payload: any = {
      name: form.name, position: form.position,
      image_url: form.image_url, link_type: form.link_type, link_value: form.link_value,
      sort: form.sort, status: form.status,
      valid_from: form.valid_from || null, valid_to: form.valid_to || null,
    };
    if (!isEdit.value) payload.code = form.code;
    if (isEdit.value && editingId.value) {
      await omsApi.bannerUpdate(editingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await omsApi.bannerCreate(payload);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认删除 Banner「${row.name}」？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.bannerDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">Banner 管理</h2>
        <p class="page-desc">OMS /admin/banner · 首页轮播 / 类目 / 详情页 Banner · iter-40 BIZ-09-1</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建 Banner</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom:12px;">
      <el-form-item label="位置">
        <el-select v-model="filters.position" placeholder="全部" clearable style="width:160px;" @change="filters.page=1; load()">
          <el-option v-for="(v,k) in POSITION_LABELS" :key="k" :label="v" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:120px;" @change="filters.page=1; load()">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="code" label="code" width="140" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="位置" width="120">
        <template #default="{ row }"><el-tag size="small">{{ POSITION_LABELS[row.position] || row.position }}</el-tag></template>
      </el-table-column>
      <el-table-column label="图片" width="140">
        <template #default="{ row }">
          <el-image v-if="row.image_url" :src="row.image_url" :preview-src-list="[row.image_url]" style="width:80px;height:48px;object-fit:cover;border-radius:4px;" />
        </template>
      </el-table-column>
      <el-table-column label="链接" width="200">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ LINK_TYPE_LABELS[row.link_type] || row.link_type }}</el-tag>
          <div v-if="row.link_value" style="font-size:11px;color:#999;">{{ row.link_value }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
            {{ row.status === 'enabled' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期" width="220">
        <template #default="{ row }">
          <div style="font-size:11px;color:#717171;">
            {{ row.valid_from || '不限' }} →
            {{ row.valid_to || '不限' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 Banner' : '新建 Banner'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="code" required>
          <el-input v-model="form.code" :disabled="isEdit" placeholder="唯一识别，如 home-001" />
        </el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="位置" required>
          <el-radio-group v-model="form.position">
            <el-radio v-for="(v,k) in POSITION_LABELS" :key="k" :value="k">{{ v }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图片" required>
          <ImageUpload v-model="form.image_url" enable-library />
        </el-form-item>
        <el-form-item label="链接类型">
          <el-radio-group v-model="form.link_type">
            <el-radio v-for="(v,k) in LINK_TYPE_LABELS" :key="k" :value="k">{{ v }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.link_type !== 'none'" label="链接值">
          <el-input v-model="form.link_value" :placeholder="form.link_type === 'spu' ? 'SPU ID' : form.link_type === 'category' ? '类目 ID' : 'URL'" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
          <span class="hint">数值小在前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker v-model="form.valid_from" type="datetime" placeholder="不限" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker v-model="form.valid_to" type="datetime" placeholder="不限" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">保存</el-button>
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
