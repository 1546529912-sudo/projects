<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { shopApi, pimApi, omsApi, wmsApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';
import QuickSearch from '@/components/QuickSearch.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

interface BackendHealth { name: string; ok: boolean; data: any; }
const backends = ref<BackendHealth[]>([
  { name: 'shop', ok: false, data: null },
  { name: 'pim',  ok: false, data: null },
  { name: 'oms',  ok: false, data: null },
  { name: 'wms',  ok: false, data: null },
]);

const apiByName: Record<string, () => Promise<any>> = {
  shop: shopApi.health,
  pim:  pimApi.health,
  oms:  omsApi.health,
  wms:  wmsApi.health,
};

async function refreshHealth() {
  await Promise.all(backends.value.map(async (b) => {
    try {
      const res: any = await apiByName[b.name]();
      const d = res?.data || {};
      b.data = d;
      b.ok = d.db === 'ok' && d.redis === 'ok';
    } catch {
      b.ok = false;
      b.data = null;
    }
  }));
}

const activeMenu = computed(() => route.path);
const quickSearchRef = ref<any>(null);
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

const ROLE_LABEL: Record<string, string> = {
  super_admin: '管理员',
  warehouse: '仓管',
  sales_ops: '销售运营',
  store_owner: '店主',
  store_staff: '店员',
  editor: '商品编辑',
};
const roleLabel = computed(() => ROLE_LABEL[auth.role] || auth.role);

function onLogout() {
  auth.logout();
  router.push('/login');
}

onMounted(refreshHealth);
</script>

<template>
  <el-container class="admin-layout">
    <el-header class="header">
      <div class="brand">电商商城 · 后台</div>
      <div class="health-bar">
        <el-button class="qs-btn" size="small" @click="quickSearchRef?.open?.()">
          🔍 快速搜索 <span class="qs-kbd">{{ isMac ? '⌘' : 'Ctrl+' }}K</span>
        </el-button>
        <el-tag
          v-for="b in backends"
          :key="b.name"
          :type="b.ok ? 'success' : 'danger'"
          size="small"
          class="health-tag"
        >
          {{ b.name }}: {{ b.ok ? 'ok' : 'down' }}
        </el-tag>
        <el-button text @click="refreshHealth">刷新</el-button>
      </div>
      <div class="user">
        <span class="username">{{ auth.name || auth.username || 'admin' }}<span v-if="auth.role" class="role-tag">{{ roleLabel }}</span></span>
        <el-button text type="danger" @click="onLogout">退出</el-button>
      </div>
    </el-header>

    <el-container>
      <el-aside width="220px" class="aside">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/dashboard">总览</el-menu-item>
          <el-menu-item index="/todos">📋 待办中心</el-menu-item>

          <el-sub-menu v-if="auth.canSeePim" index="pim">
            <template #title>PIM 商品中心</template>
            <el-menu-item index="/pim/dashboard">PIM 总览</el-menu-item>
            <el-menu-item index="/pim/products">商品 (SPU)</el-menu-item>
            <el-menu-item index="/pim/categories">类目</el-menu-item>
            <el-menu-item index="/pim/brands">品牌</el-menu-item>
            <el-menu-item index="/pim/templates">属性模板</el-menu-item>
            <el-menu-item index="/pim/image-library">图片库</el-menu-item>
            <el-menu-item index="/pim/audit-log">操作日志</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="auth.canSeeOms" index="oms">
            <template #title>OMS 订单中心</template>
            <el-menu-item index="/oms/orders">订单</el-menu-item>
            <el-menu-item index="/oms/inventory">库存四态</el-menu-item>
            <el-menu-item index="/oms/refunds">退款审批</el-menu-item>
            <el-menu-item index="/oms/exchanges">换货审批</el-menu-item>
            <el-menu-item index="/oms/settlement">财务结算单</el-menu-item>
            <el-menu-item v-if="auth.isSuperAdmin" index="/oms/reconcile">WMS 对账</el-menu-item>
            <el-menu-item v-if="auth.isSuperAdmin" index="/oms/webhooks">Webhook 订阅</el-menu-item>
            <el-menu-item v-if="auth.canSeeWithdrawal" index="/oms/withdrawals">💰 商家提现</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="auth.canSeeMarketing" index="marketing">
            <template #title>营销</template>
            <el-menu-item index="/marketing/coupons">优惠券</el-menu-item>
            <el-menu-item index="/marketing/coupon-rules">自动发券规则</el-menu-item>
            <el-menu-item index="/marketing/reviews">评价审核</el-menu-item>
            <el-menu-item index="/marketing/banners">Banner 管理</el-menu-item>
            <el-menu-item index="/marketing/featured">推荐位</el-menu-item>
            <el-menu-item index="/marketing/topics">专题管理</el-menu-item>
            <el-menu-item index="/marketing/calendar">营销日历</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="auth.canSeeWms" index="wms">
            <template #title>WMS 仓储中心</template>
            <el-menu-item index="/wms/dashboard">WMS 总览</el-menu-item>
            <el-menu-item index="/wms/inbound">入库管理</el-menu-item>
            <el-menu-item index="/wms/outbound">出库单</el-menu-item>
            <el-menu-item index="/wms/picking-tasks">拣货任务</el-menu-item>
            <el-menu-item index="/wms/inventory">实物库存</el-menu-item>
            <el-menu-item index="/wms/stock-alerts">低库存预警</el-menu-item>
            <el-menu-item index="/wms/inventory-log">库存日志</el-menu-item>
            <el-menu-item index="/wms/stock-takes">实时盘点</el-menu-item>
            <el-menu-item index="/wms/schedules">盘点定时</el-menu-item>
            <el-menu-item index="/wms/transfers">调拨</el-menu-item>
            <el-menu-item index="/wms/reconcile">OMS 对账</el-menu-item>
            <el-menu-item index="/wms/locations">库位</el-menu-item>
            <el-menu-item index="/wms/warehouses">仓库</el-menu-item>
            <el-menu-item v-if="auth.isSuperAdmin" index="/wms/settings">WMS 配置</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="auth.canSeeBi" index="bi">
            <template #title>📊 BI 数据洞察</template>
            <el-menu-item index="/bi/rfm">用户 RFM 分层</el-menu-item>
            <el-menu-item index="/bi/funnel">订单漏斗</el-menu-item>
            <el-menu-item index="/bi/sku-lifecycle">SKU 生命周期</el-menu-item>
            <el-menu-item index="/bi/alerts">🚨 异常预警</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="auth.isSuperAdmin" index="system">
            <template #title>系统管理</template>
            <el-menu-item index="/oms/stores">店铺管理</el-menu-item>
            <el-menu-item index="/oms/admin-users">管理员用户</el-menu-item>
            <el-menu-item index="/oms/audit-log">操作日志</el-menu-item>
            <el-menu-item index="/oms/dead-letter">死信中心</el-menu-item>
            <el-menu-item index="/oms/system-config">⚙️ 系统参数</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
    <QuickSearch ref="quickSearchRef" />
  </el-container>
</template>

<style scoped>
.admin-layout { height: 100vh; overflow: hidden; }
.header {
  background: #FFFFFF;
  border-bottom: 1px solid #DDDDDD;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.brand {
  font-size: 18px;
  font-weight: 600;
  color: #FF385C;
  width: 220px;
}
.health-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.health-tag {
  text-transform: uppercase;
}
.qs-btn {
  background: #F7F7F7;
  border-color: #DDD;
  color: #717171;
}
.qs-kbd {
  background: #FFF;
  border: 1px solid #DDD;
  border-radius: 3px;
  padding: 0 4px;
  margin-left: 6px;
  font-family: monospace;
  font-size: 11px;
}
.user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  color: #717171;
  font-size: 13px;
}
.role-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: #FFE9EE;
  color: #FF385C;
  font-size: 11px;
  border-radius: 4px;
}
.aside {
  background: #FFFFFF;
  border-right: 1px solid #DDDDDD;
  overflow-y: auto;
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
  flex-shrink: 0;
}
.main {
  background: #F7F7F7;
  padding: 24px;
  overflow-y: auto;
  height: calc(100vh - 60px);
}
</style>
