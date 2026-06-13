import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/home/HomePage.vue'),
    },
    {
      path: '/health',
      name: 'health',
      component: () => import('@/views/health/HealthPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/products',
      name: 'product-list',
      component: () => import('@/views/product/ProductListPage.vue'),
    },
    {
      path: '/products/:id(\\d+)',
      name: 'product-detail',
      component: () => import('@/views/product/ProductDetailPage.vue'),
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/cart/CartPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/cart/CheckoutPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'order-list',
      component: () => import('@/views/order/OrderListPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:id(\\d+)',
      name: 'order-detail',
      component: () => import('@/views/order/OrderDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/payments/:orderId(\\d+)',
      name: 'payment',
      component: () => import('@/views/cart/PaymentPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/profile/MePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/company-auth',
      name: 'company-auth',
      component: () => import('@/views/profile/CompanyAuthPage.vue'),
      meta: { requiresAuth: true },
    },

    // iter-20: 管理后台统一布局（左侧菜单 + 右侧 RouterView）
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardPage.vue'),
        },
        {
          path: 'stock-alerts',
          name: 'admin-stock-alerts',
          component: () => import('@/views/admin/StockAlertsPage.vue'),
        },
        {
          path: 'bad-cases',
          name: 'admin-bad-cases',
          component: () => import('@/views/admin/BadCasesPage.vue'),
        },
        {
          path: 'failed-jobs',
          name: 'admin-failed-jobs',
          component: () => import('@/views/admin/FailedJobsPage.vue'),
        },
        {
          path: 'companies',
          name: 'admin-companies',
          component: () => import('@/views/admin/CompanyReviewPage.vue'),
        },
        {
          path: 'products',
          name: 'admin-products',
          component: () => import('@/views/admin/ProductListPage.vue'),
        },
        {
          path: 'products/new',
          name: 'admin-product-new',
          component: () => import('@/views/admin/ProductFormPage.vue'),
        },
        {
          path: 'products/:id(\\d+)/edit',
          name: 'admin-product-edit',
          component: () => import('@/views/admin/ProductFormPage.vue'),
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('@/views/admin/OrderListPage.vue'),
        },
        {
          path: 'knowledge',
          name: 'admin-knowledge',
          component: () => import('@/views/admin/KnowledgePage.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.isLoggedIn && !auth.user) await auth.fetchMe()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'profile' }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }
  return true
})

export default router
