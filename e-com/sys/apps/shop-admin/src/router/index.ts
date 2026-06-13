import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/Login.vue'),
  },
  // iter-45 EFF-07 WMS PDA H5
  {
    path: '/pda/login',
    component: () => import('@/pages/pda/Login.vue'),
    meta: { pda: true },
  },
  {
    path: '/pda',
    component: () => import('@/layouts/PdaLayout.vue'),
    meta: { requiresAuth: true, pda: true },
    children: [
      { path: '',                  name: 'pda-home',            component: () => import('@/pages/pda/Home.vue'),            meta: { pdaTitle: 'WMS PDA' } },
      { path: 'picking',           name: 'pda-picking',         component: () => import('@/pages/pda/PickingList.vue'),     meta: { pdaTitle: '拣货任务' } },
      { path: 'picking/:id',       name: 'pda-picking-detail',  component: () => import('@/pages/pda/PickingDetail.vue'),   meta: { pdaTitle: '扫码拣货' } },
      { path: 'inbound',           name: 'pda-inbound',         component: () => import('@/pages/pda/InboundList.vue'),     meta: { pdaTitle: '入库扫码' } },
      { path: 'inbound/:no',       name: 'pda-inbound-detail',  component: () => import('@/pages/pda/InboundDetail.vue'),   meta: { pdaTitle: '入库详情' } },
    ],
  },
  {
    path: '/',
    component: () => import('@/components/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard',          name: 'dashboard',          component: () => import('@/pages/Dashboard.vue') },
      { path: 'todos',              name: 'todos',              component: () => import('@/pages/Todos.vue') },
      { path: 'oms/dead-letter',    name: 'oms-dead-letter',    component: () => import('@/pages/oms/DeadLetter.vue') },

      { path: 'pim/dashboard',      name: 'pim-dashboard',      component: () => import('@/pages/pim/Dashboard.vue') },
      { path: 'pim/audit-log',      name: 'pim-audit-log',      component: () => import('@/pages/pim/AuditLog.vue') },
      { path: 'pim/products',       name: 'pim-products',       component: () => import('@/pages/pim/Products.vue') },
      { path: 'pim/products/new',         name: 'pim-product-new',    component: () => import('@/pages/pim/ProductEdit.vue') },
      { path: 'pim/products/edit/:id',    name: 'pim-product-edit',   component: () => import('@/pages/pim/ProductEdit.vue') },
      { path: 'pim/products/:sku',  name: 'pim-product-detail', component: () => import('@/pages/pim/ProductDetail.vue') },
      { path: 'pim/categories',     name: 'pim-categories',     component: () => import('@/pages/pim/Categories.vue') },
      { path: 'pim/brands',         name: 'pim-brands',         component: () => import('@/pages/pim/Brands.vue') },
      { path: 'pim/templates',      name: 'pim-templates',      component: () => import('@/pages/pim/Templates.vue') },
      { path: 'pim/image-library',  name: 'pim-image-library',  component: () => import('@/pages/pim/ImageLibrary.vue') },

      { path: 'oms/orders',         name: 'oms-orders',         component: () => import('@/pages/oms/Orders.vue') },
      { path: 'oms/orders/:no',     name: 'oms-order-detail',   component: () => import('@/pages/oms/OrderDetail.vue') },
      { path: 'oms/inventory',      name: 'oms-inventory',      component: () => import('@/pages/oms/Inventory.vue') },
      { path: 'oms/refunds',        name: 'oms-refunds',        component: () => import('@/pages/oms/Refunds.vue') },
      { path: 'oms/exchanges',      name: 'oms-exchanges',      component: () => import('@/pages/oms/Exchanges.vue') },
      { path: 'oms/stores',         name: 'oms-stores',         component: () => import('@/pages/oms/Stores.vue') },
      { path: 'oms/audit-log',      name: 'oms-audit-log',      component: () => import('@/pages/oms/AuditLog.vue') },
      { path: 'oms/admin-users',    name: 'oms-admin-users',    component: () => import('@/pages/oms/AdminUsers.vue') },
      { path: 'oms/reconcile',      name: 'oms-reconcile',      component: () => import('@/pages/oms/Reconcile.vue') },
      { path: 'oms/settlement',     name: 'oms-settlement',     component: () => import('@/pages/oms/Settlement.vue') },
      { path: 'oms/webhooks',       name: 'oms-webhooks',       component: () => import('@/pages/oms/Webhooks.vue') },
      { path: 'oms/withdrawals',    name: 'oms-withdrawals',    component: () => import('@/pages/oms/Withdrawals.vue') },
      { path: 'oms/system-config',  name: 'oms-system-config',  component: () => import('@/pages/oms/SystemConfig.vue') },

      { path: 'marketing/coupons',  name: 'marketing-coupons',  component: () => import('@/pages/marketing/Coupons.vue') },
      { path: 'marketing/coupon-rules', name: 'marketing-coupon-rules', component: () => import('@/pages/marketing/CouponRules.vue') },
      { path: 'marketing/reviews',  name: 'marketing-reviews',  component: () => import('@/pages/marketing/Reviews.vue') },
      { path: 'marketing/banners',  name: 'marketing-banners',  component: () => import('@/pages/marketing/Banners.vue') },
      { path: 'marketing/featured', name: 'marketing-featured', component: () => import('@/pages/marketing/Featured.vue') },
      { path: 'marketing/topics',   name: 'marketing-topics',   component: () => import('@/pages/marketing/Topics.vue') },
      { path: 'marketing/calendar', name: 'marketing-calendar', component: () => import('@/pages/marketing/MarketingCalendar.vue') },

      { path: 'wms/outbound',       name: 'wms-outbound',       component: () => import('@/pages/wms/Outbound.vue') },
      { path: 'wms/outbound/:no',   name: 'wms-outbound-detail',component: () => import('@/pages/wms/OutboundDetail.vue') },
      { path: 'wms/inbound',        name: 'wms-inbound',        component: () => import('@/pages/wms/Inbound.vue') },
      { path: 'wms/inventory',      name: 'wms-inventory',      component: () => import('@/pages/wms/Inventory.vue') },
      { path: 'wms/locations',      name: 'wms-locations',      component: () => import('@/pages/wms/Locations.vue') },
      { path: 'wms/warehouses',     name: 'wms-warehouses',     component: () => import('@/pages/wms/Warehouses.vue') },
      { path: 'wms/stock-takes',    name: 'wms-stock-takes',    component: () => import('@/pages/wms/StockTakes.vue') },
      { path: 'wms/transfers',      name: 'wms-transfers',      component: () => import('@/pages/wms/Transfers.vue') },
      { path: 'wms/picking-tasks',  name: 'wms-picking-tasks',  component: () => import('@/pages/wms/PickingTasks.vue') },
      { path: 'wms/inventory-log',  name: 'wms-inventory-log',  component: () => import('@/pages/wms/InventoryLog.vue') },
      { path: 'wms/reconcile',      name: 'wms-reconcile',      component: () => import('@/pages/wms/Reconcile.vue') },
      { path: 'wms/dashboard',      name: 'wms-dashboard',      component: () => import('@/pages/wms/Dashboard.vue') },
      { path: 'wms/stock-alerts',   name: 'wms-stock-alerts',   component: () => import('@/pages/wms/StockAlerts.vue') },
      { path: 'wms/schedules',      name: 'wms-schedules',      component: () => import('@/pages/wms/StockTakeSchedules.vue') },
      { path: 'wms/settings',       name: 'wms-settings',       component: () => import('@/pages/wms/Settings.vue') },

      // iter-46~49 BI 数据洞察
      { path: 'bi/rfm',             name: 'bi-rfm',             component: () => import('@/pages/bi/Rfm.vue') },
      { path: 'bi/funnel',          name: 'bi-funnel',          component: () => import('@/pages/bi/Funnel.vue') },
      { path: 'bi/sku-lifecycle',   name: 'bi-sku-lifecycle',   component: () => import('@/pages/bi/SkuLifecycle.vue') },
      { path: 'bi/alerts',          name: 'bi-alerts',          component: () => import('@/pages/bi/Alerts.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('admin_token')) {
    return to.meta.pda ? '/pda/login' : '/login';
  }
});

export default router;
