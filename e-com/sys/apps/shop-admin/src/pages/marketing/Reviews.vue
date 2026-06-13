<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);
const statusFilter = ref('');
const spuIdFilter = ref<number | undefined>(undefined);

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.reviewList({
      page: page.value, size: size.value,
      status: statusFilter.value || undefined,
      spu_id: spuIdFilter.value || undefined,
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

async function onHide(row: any) {
  try {
    await ElMessageBox.confirm(`隐藏评价 #${row.id}（${row.rating}星）？用户与详情页不再可见，可恢复。`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.reviewHide(row.id);
    ElMessage.success('已隐藏');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

async function onRestore(row: any) {
  try {
    await omsApi.reviewRestore(row.id);
    ElMessage.success('已恢复');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '操作失败'); }
}

const statusTag = (s: string) => s === 'active' ? 'success' : 'danger';
const truncate = (s: string, n = 60) => (s || '').length > n ? (s || '').slice(0, n) + '…' : (s || '');

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">评价审核</h2>
        <p class="page-desc">营销 / UGC · 隐藏≠删除（保留数据，随时恢复）· super_admin + sales_ops 可见</p>
      </div>
      <div>
        <el-input v-model.number="spuIdFilter" type="number" placeholder="SPU ID" style="width:120px;margin-right:8px" @change="load" clearable />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px;margin-right:8px" @change="load">
          <el-option label="已显示" value="active" />
          <el-option label="已隐藏" value="hidden" />
        </el-select>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="user_id" label="用户" width="80" />
      <el-table-column prop="order_no" label="订单号" width="200" />
      <el-table-column prop="sku_code" label="SKU" width="140" />
      <el-table-column prop="spu_id" label="SPU" width="80" />
      <el-table-column label="评分" width="100">
        <template #default="{ row }">
          <el-rate :model-value="row.rating" disabled />
        </template>
      </el-table-column>
      <el-table-column label="内容" min-width="200">
        <template #default="{ row }">{{ truncate(row.content) }}</template>
      </el-table-column>
      <el-table-column label="图片" width="120">
        <template #default="{ row }">
          <el-image
            v-for="(p, i) in row.images.slice(0,3)" :key="i"
            :src="p" :preview-src-list="row.images"
            style="width:36px;height:36px;border-radius:4px;margin-right:4px"
            fit="cover"
          />
          <span v-if="row.images.length > 3" class="more">+{{ row.images.length - 3 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ row.status === 'active' ? '显示' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'active'" size="small" type="danger" @click="onHide(row)">隐藏</el-button>
          <el-button v-else size="small" type="primary" @click="onRestore(row)">恢复</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
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
.more { color: #717171; font-size: 12px; margin-left: 4px; }
</style>
