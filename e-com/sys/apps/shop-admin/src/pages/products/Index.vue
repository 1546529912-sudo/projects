<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apis } from '@/apis';
import { ElMessage } from 'element-plus';

const products = ref<any[]>([]);
const loading = ref(true);
const healthOk = ref(false);
const healthData = ref<any>(null);

async function loadProducts() {
  loading.value = true;
  try {
    const res: any = await apis.productList({ page: 1, size: 50 });
    products.value = res.data?.list || [];
  } catch (err: any) {
    ElMessage.error(err?.msg || '加载商品失败');
  } finally {
    loading.value = false;
  }
}

async function checkHealth() {
  try {
    const res: any = await apis.health();
    healthOk.value = res.data?.db === 'ok' && res.data?.redis === 'ok';
    healthData.value = res.data;
  } catch {
    healthOk.value = false;
  }
}

onMounted(() => {
  checkHealth();
  loadProducts();
});

function fmtPrice(n: number) {
  return '¥' + (n / 100).toFixed(2);
}
</script>

<template>
  <div class="admin-layout">
    <!-- 顶栏 -->
    <header class="header">
      <span class="brand">电商商城 · 后台</span>
      <span class="health">
        <el-tag :type="healthOk ? 'success' : 'danger'" size="small">
          pim-backend {{ healthOk ? '正常' : '异常' }}
        </el-tag>
        <span v-if="healthData" class="health-info">
          ｜ db: {{ healthData.db }}  redis: {{ healthData.redis }}
        </span>
      </span>
    </header>

    <div class="body">
      <!-- 侧栏 -->
      <aside class="side">
        <el-menu default-active="/products" :collapse="false" router>
          <el-menu-item index="/products">
            <span>商品管理</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 主区 -->
      <main class="main">
        <h2 class="page-title">商品列表（Phase 1 骨架）</h2>
        <p class="page-desc">数据来自 pim-backend 的 spus 表（含 seed）</p>

        <el-table :data="products" v-loading="loading" stripe border>
          <el-table-column prop="code" label="SPU 编码" width="160" />
          <el-table-column prop="name" label="商品名称" />
          <el-table-column label="价格" width="140">
            <template #default="{ row }">
              <span class="price">{{ fmtPrice(row.base_price) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="category_id" label="类目 ID" width="100" />
          <el-table-column prop="brand_id" label="品牌 ID" width="100" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #DDDDDD;
  display: flex;
  align-items: center;
  padding: 0 24px;
  justify-content: space-between;
}
.brand {
  font-size: 18px;
  font-weight: 600;
  color: #FF385C;
}
.health-info {
  font-size: 12px;
  color: #717171;
  margin-left: 8px;
}
.body {
  flex: 1;
  display: flex;
  background: #F7F7F7;
  overflow: hidden;
}
.side {
  width: 200px;
  background: #FFFFFF;
  border-right: 1px solid #DDDDDD;
}
.main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.page-title {
  margin: 0 0 4px;
  color: #222222;
  font-size: 22px;
}
.page-desc {
  color: #717171;
  margin: 0 0 24px;
  font-size: 13px;
}
.price {
  color: #FF385C;
  font-weight: 600;
}
</style>
