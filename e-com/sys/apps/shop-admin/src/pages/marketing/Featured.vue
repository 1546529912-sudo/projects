<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const POSITION_LABELS: Record<string, string> = {
  home_hot: '首页热门',
  home_new: '首页新品',
  category_top: '类目页置顶',
  detail_related: '详情页相关',
};

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ position: '', status: '', spu_id: '', page: 1, size: 20 });

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  position: 'home_hot', spu_id: 0, sort: 0, status: 'enabled',
  valid_from: '', valid_to: '',
});

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.position) params.position = filters.position;
    if (filters.status) params.status = filters.status;
    if (filters.spu_id) params.spu_id = Number(filters.spu_id);
    const res: any = await omsApi.featuredList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onCreate() {
  isEdit.value = false; editingId.value = null;
  Object.assign(form, { position: 'home_hot', spu_id: 0, sort: 0, status: 'enabled', valid_from: '', valid_to: '' });
  dialogVisible.value = true;
}

function onEdit(row: any) {
  isEdit.value = true; editingId.value = row.id;
  Object.assign(form, {
    position: row.position, spu_id: row.spu_id, sort: row.sort || 0, status: row.status,
    valid_from: row.valid_from || '', valid_to: row.valid_to || '',
  });
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.spu_id) { ElMessage.warning('SPU ID 必填'); return; }
  const payload: any = {
    position: form.position, sort: form.sort, status: form.status,
    valid_from: form.valid_from || null, valid_to: form.valid_to || null,
  };
  if (!isEdit.value) payload.spu_id = form.spu_id;
  try {
    if (isEdit.value && editingId.value) {
      await omsApi.featuredUpdate(editingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await omsApi.featuredCreate(payload);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认删除推荐位 SPU#${row.spu_id} (${POSITION_LABELS[row.position]})？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.featuredDelete(row.id);
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
        <h2 class="page-title">推荐位</h2>
        <p class="page-desc">OMS /admin/featured · 首页热门/新品 + 类目置顶 + 详情相关 · iter-40 BIZ-09-1</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新增推荐</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom:12px;">
      <el-form-item label="位置">
        <el-select v-model="filters.position" placeholder="全部" clearable style="width:180px;" @change="filters.page=1; load()">
          <el-option v-for="(v,k) in POSITION_LABELS" :key="k" :label="v" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:120px;" @change="filters.page=1; load()">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item label="SPU ID"><el-input v-model="filters.spu_id" clearable style="width:120px;" /></el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page=1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column label="位置" width="140">
        <template #default="{ row }"><el-tag size="small">{{ POSITION_LABELS[row.position] || row.position }}</el-tag></template>
      </el-table-column>
      <el-table-column label="SPU" width="240">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px;">
            <el-image v-if="row.spu_main_image" :src="row.spu_main_image" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" />
            <div>
              <div>#{{ row.spu_id }}</div>
              <div style="font-size:12px;color:#717171;">{{ row.spu_name || '—' }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
            {{ row.status === 'enabled' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期" width="240">
        <template #default="{ row }">
          <div style="font-size:11px;color:#717171;">{{ row.valid_from || '不限' }} → {{ row.valid_to || '不限' }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="160" />
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑推荐' : '新增推荐'" width="540px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="位置" required>
          <el-radio-group v-model="form.position">
            <el-radio v-for="(v,k) in POSITION_LABELS" :key="k" :value="k">{{ v }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="SPU ID" required>
          <el-input-number v-model="form.spu_id" :min="1" :disabled="isEdit" />
          <span class="hint">在 PIM 商品页查 SPU 的 ID</span>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
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
