<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import ImageUpload from '@/components/ImageUpload.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filters = reactive({ status: '', keyword: '', page: 1, size: 20 });

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  code: '', name: '', banner_image_url: '', description: '',
  start_at: '', end_at: '', sort: 0, status: 'enabled',
});

const detailVisible = ref(false);
const detail = ref<any>(null);
const addSpuId = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const params: any = { page: filters.page, size: filters.size };
    if (filters.status) params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    const res: any = await omsApi.topicList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, {
    code: '', name: '', banner_image_url: '', description: '',
    start_at: '', end_at: '', sort: 0, status: 'enabled',
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
    code: row.code, name: row.name,
    banner_image_url: row.banner_image_url || '', description: row.description || '',
    start_at: row.start_at || '', end_at: row.end_at || '',
    sort: row.sort || 0, status: row.status || 'enabled',
  });
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.code || !form.name) { ElMessage.warning('code / name 必填'); return; }
  try {
    const payload: any = {
      name: form.name, banner_image_url: form.banner_image_url || null,
      description: form.description || null,
      start_at: form.start_at || null, end_at: form.end_at || null,
      sort: form.sort, status: form.status,
    };
    if (!isEdit.value) payload.code = form.code;
    if (isEdit.value && editingId.value) {
      await omsApi.topicUpdate(editingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await omsApi.topicCreate(payload);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认删除专题「${row.name}」？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    await omsApi.topicDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

async function onOpenDetail(id: number) {
  try {
    const res: any = await omsApi.topicDetail(id);
    detail.value = res.data;
    detailVisible.value = true;
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
}

async function onAddSpu() {
  if (!detail.value?.topic?.id || !addSpuId.value) { ElMessage.warning('请填 SPU ID'); return; }
  try {
    const res: any = await omsApi.topicAddItems(detail.value.topic.id, [addSpuId.value]);
    detail.value = res.data;
    addSpuId.value = null;
    ElMessage.success('已添加');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '添加失败'); }
}

async function onRemoveSpu(spuId: number) {
  try { await ElMessageBox.confirm(`从该专题移除 SPU#${spuId}？`, '确认', { type: 'warning' }); } catch { return; }
  try {
    const res: any = await omsApi.topicRemoveItem(detail.value.topic.id, spuId);
    detail.value = res.data;
    ElMessage.success('已移除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '移除失败'); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">营销专题</h2>
        <p class="page-desc">OMS /admin/topic · 大促/活动落地页 + 关联 SPU · iter-41 BIZ-09-2</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建专题</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:120px;" @change="filters.page=1; load()">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item label="搜索"><el-input v-model="filters.keyword" clearable style="width:220px;" @keyup.enter="filters.page=1; load()" /></el-form-item>
      <el-form-item><el-button type="primary" @click="filters.page=1; load()">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="code" label="code" width="140" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="Banner" width="120">
        <template #default="{ row }">
          <el-image v-if="row.banner_image_url" :src="row.banner_image_url" :preview-src-list="[row.banner_image_url]" style="width:80px;height:48px;object-fit:cover;border-radius:4px;" />
          <span v-else style="color:#bbb;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="商品数" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.item_count > 0 ? 'success' : 'info'">{{ row.item_count || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间段" width="320">
        <template #default="{ row }">
          <div style="font-size:12px;color:#717171;">
            {{ row.start_at || '不限' }}<br/>→ {{ row.end_at || '不限' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
            {{ row.status === 'enabled' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onOpenDetail(row.id)">详情 / 关联商品</el-button>
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <!-- 创建/编辑 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑专题' : '新建专题'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="code" required>
          <el-input v-model="form.code" :disabled="isEdit" placeholder="唯一识别，如 618-2026" />
        </el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="Banner">
          <ImageUpload v-model="form.banner_image_url" enable-library />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="活动介绍" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="form.start_at" type="datetime" placeholder="不限" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="form.end_at" type="datetime" placeholder="不限" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 + 关联商品 -->
    <el-dialog v-model="detailVisible" title="专题详情 + 关联商品" width="720px">
      <div v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="code">{{ detail.topic.code }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detail.topic.name }}</el-descriptions-item>
          <el-descriptions-item label="时间段" :span="2">
            {{ detail.topic.start_at || '不限' }} → {{ detail.topic.end_at || '不限' }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ detail.topic.description || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div style="display:flex;justify-content:space-between;align-items:center;margin: 16px 0 8px;">
          <h4 style="margin: 0;">关联商品（{{ detail.items.length }}）</h4>
          <div style="display:flex;gap:8px;">
            <el-input-number v-model="addSpuId" :min="1" placeholder="SPU ID" style="width:130px;" />
            <el-button type="primary" size="small" @click="onAddSpu">添加</el-button>
          </div>
        </div>
        <el-table :data="detail.items" border size="small">
          <el-table-column prop="spu_id" label="SPU ID" width="100" />
          <el-table-column label="商品" width="280">
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px;">
                <el-image v-if="row.spu_main_image" :src="row.spu_main_image" style="width:40px;height:40px;border-radius:4px;" />
                <div>
                  <div>{{ row.spu_name || '—' }}</div>
                  <div style="font-size:12px;color:#FF385C;">¥{{ row.spu_price_yuan || '—' }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.spu_status === 'published' ? 'success' : 'warning'" size="small">{{ row.spu_status || '—' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="onRemoveSpu(row.spu_id)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
