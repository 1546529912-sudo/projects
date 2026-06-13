<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pimApi } from '@/apis';
import { ElMessage } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

const route = useRoute();
const router = useRouter();
const sku = computed(() => route.params.sku as string);

const skuInfo = ref<any>(null);
const spuInfo = ref<any>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res: any = await pimApi.productDetail(sku.value);
    skuInfo.value = res.data?.sku;
    let spu = res.data?.spu;
    if (spu) {
      for (const k of ['main_images', 'selling_points', 'attrs']) {
        if (typeof spu[k] === 'string') {
          try { spu[k] = JSON.parse(spu[k]); } catch {}
        }
      }
    }
    spuInfo.value = spu;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function fmtPrice(cents: number) {
  return '¥' + (cents / 100).toFixed(2);
}

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <div class="page-head">
      <h2 class="page-title">商品详情 · {{ sku }}</h2>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="spuInfo" class="card">
      <template #header>SPU 基本信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="SPU 编码">{{ spuInfo.code }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ spuInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="基础价">
          <span class="price">{{ fmtPrice(spuInfo.base_price) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag :status="spuInfo.status" />
        </el-descriptions-item>
        <el-descriptions-item label="类目 ID">{{ spuInfo.category_id }}</el-descriptions-item>
        <el-descriptions-item label="品牌 ID">{{ spuInfo.brand_id }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ spuInfo.published_at }}</el-descriptions-item>
        <el-descriptions-item label="主图">
          <span v-for="(img, i) in spuInfo.main_images" :key="i" class="img-tag">{{ img }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="spuInfo?.selling_points?.length" class="card">
      <template #header>卖点</template>
      <ul class="bullet">
        <li v-for="(s, i) in spuInfo.selling_points" :key="i">{{ s }}</li>
      </ul>
    </el-card>

    <el-card v-if="skuInfo" class="card">
      <template #header>当前 SKU</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="SKU code">{{ skuInfo.sku_code }}</el-descriptions-item>
        <el-descriptions-item label="价格">{{ fmtPrice(skuInfo.price) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag :status="skuInfo.status" />
        </el-descriptions-item>
        <el-descriptions-item label="重量">{{ skuInfo.weight }} kg</el-descriptions-item>
        <el-descriptions-item label="销售属性" :span="2">{{ skuInfo.sales_attrs }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="spuInfo?.detail_html" class="card">
      <template #header>商品详情（富文本）</template>
      <div v-html="spuInfo.detail_html" class="rich-text"></div>
    </el-card>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0; }
.card { margin-bottom: 16px; }
.price { color: #FF385C; font-weight: 600; }
.img-tag { color: #717171; font-family: monospace; margin-right: 12px; }
.bullet { margin: 0; padding-left: 20px; }
.bullet li { line-height: 1.8; }
.rich-text { line-height: 1.8; }
</style>
