<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { pimApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const router = useRouter();
const auth = useAuthStore();
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);

const filters = reactive({
  store_id: '' as string | number,
  status: '',
  category_id: '',
  brand_id: '',
  keyword: '',
  page: 1,
  size: 20,
});

const categories = ref<any[]>([]);
const brands = ref<any[]>([]);
const stores = ref<any[]>([]);
const storeMap = ref<Record<number, string>>({});

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: filters.page, size: filters.size };
    if (filters.store_id) params.store_id = Number(filters.store_id);
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.brand_id) params.brand_id = filters.brand_id;
    if (filters.keyword) params.keyword = filters.keyword;
    const res: any = await pimApi.spuAdminList(params);
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  try {
    const [c, b, s]: any = await Promise.all([
      pimApi.categoryList(),
      pimApi.brandList(),
      pimApi.storeList(),
    ]);
    categories.value = c.data?.list || [];
    brands.value = b.data?.list || [];
    stores.value = s.data?.list || [];
    storeMap.value = Object.fromEntries(stores.value.map((x: any) => [x.id, x.name]));
  } catch {}
}

function fmtPrice(cents: number) { return '¥' + (cents / 100).toFixed(2); }

function onCreate() { router.push('/pim/products/new'); }
function onEdit(row: any) { router.push(`/pim/products/edit/${row.id}`); }

async function onPublish(row: any) {
  try {
    await pimApi.spuPublish(row.id);
    ElMessage.success('已发布');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}
async function onOffline(row: any) {
  try {
    await pimApi.spuOffline(row.id);
    ElMessage.success('已下架');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}
async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？将同时软删 SKU`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await pimApi.spuDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

// iter-30 A: 导出 / 导入 CSV
function onExport() {
  const token = localStorage.getItem('admin_token') || '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.category_id) params.set('category_id', String(filters.category_id));
  if (filters.brand_id) params.set('brand_id', String(filters.brand_id));
  if (filters.keyword) params.set('keyword', filters.keyword);
  const url = `/api/pim/admin/spu/export?${params.toString()}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `spus-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      ElMessage.success('已开始下载');
    })
    .catch(() => ElMessage.error('导出失败'));
}

const importFileInput = ref<HTMLInputElement | null>(null);
function onImportClick() { importFileInput.value?.click(); }
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const res: any = await pimApi.spuImport(file);
    const d = res.data;
    const errMsg = d.errors?.length ? `\n${d.errors.slice(0, 5).join('\n')}${d.errors.length > 5 ? '\n...' : ''}` : '';
    ElMessageBox.alert(
      `处理 ${d.total_processed} 行 · 新增 ${d.created} · 更新 ${d.updated}` +
      (d.errors?.length ? ` · 错误 ${d.errors.length}` : '') + errMsg,
      '导入结果',
      { type: d.errors?.length ? 'warning' : 'success' }
    );
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '导入失败');
  } finally {
    if (input) input.value = '';
  }
}

onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">SPU 商品管理</h2>
        <p class="page-desc">PIM /api/v1/admin/spu 全 CRUD</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建 SPU</el-button>
        <el-button @click="onExport">导出 CSV</el-button>
        <el-button @click="onImportClick">导入 CSV</el-button>
        <input ref="importFileInput" type="file" accept=".csv" style="display:none;" @change="onImportFile" />
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-form inline :model="filters" style="margin-bottom: 12px;">
      <el-form-item v-if="auth.canSelectStore && stores.length > 1" label="店铺">
        <el-select v-model="filters.store_id" placeholder="全部店铺" clearable style="width:200px;">
          <el-option v-for="s in stores" :key="s.id" :label="`${s.name} (id=${s.id})`" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width:120px;">
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="已下架" value="offline" />
        </el-select>
      </el-form-item>
      <el-form-item label="类目">
        <el-select v-model="filters.category_id" placeholder="全部" clearable style="width:160px;">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌">
        <el-select v-model="filters.brand_id" placeholder="全部" clearable style="width:160px;">
          <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="搜索">
        <el-input v-model="filters.keyword" placeholder="SPU 名 / 编码" clearable style="width:200px;" @keyup.enter="filters.page = 1; load()" @clear="filters.page = 1; load()" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column v-if="auth.canSelectStore && stores.length > 1" label="店铺" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.store_id === 1" type="info" size="small">{{ storeMap[row.store_id] || '平台' }}</el-tag>
          <el-tag v-else size="small">{{ storeMap[row.store_id] || `id=${row.store_id}` }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="code" label="SPU 编码" width="120" />
      <el-table-column label="主图" width="80">
        <template #default="{ row }">
          <img v-if="row.main_images?.[0]" :src="row.main_images[0]" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" />
          <span v-else style="color:#bbb;font-size:12px;">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="商品名称" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }"><span class="price">{{ fmtPrice(row.base_price) }}</span></template>
      </el-table-column>
      <el-table-column prop="category_id" label="类目" width="80" />
      <el-table-column prop="brand_id" label="品牌" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="可用库存" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.stock_avail === 0 ? 'danger' : row.stock_avail < 30 ? 'warning' : 'success'">
            {{ row.stock_avail ?? 0 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="近 30 天销量" width="120">
        <template #default="{ row }">
          <span :style="{ color: row.month_sales_qty > 0 ? '#FF385C' : '#bbb', fontWeight: row.month_sales_qty > 0 ? 600 : 400 }">
            {{ row.month_sales_qty ?? 0 }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="success" v-if="auth.canPublishSpu && row.status !== 'published'" @click="onPublish(row)">发布</el-button>
          <el-button size="small" v-if="auth.canPublishSpu && row.status === 'published'" @click="onOffline(row)">下架</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.price { color: #FF385C; font-weight: 600; }
</style>
