import { get, post, put, del, downloadFile } from './http';

export const omsApi = {
  health: () => get('/health/oms'),
  orderList: (params: {
    status?: string; keyword?: string; store_id?: number;
    phone?: string; user_id?: number; sku_code?: string;
    amount_min_cents?: number; amount_max_cents?: number;
    start_date?: string; end_date?: string;
    page?: number; size?: number;
  } = {}) => get('/api/oms/admin/order/list', params),
  orderDetail: (no: string) => get(`/api/oms/admin/order/${no}`),
  inventoryList: () => get('/api/oms/admin/inventory/list'),
  stats: (params: { days?: number } = {}) => get('/api/oms/admin/stats', params),
  deadLetter: (params: { stream?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/dead-letter', params),
  auditLog: (params: { action?: string; operator?: string; target_type?: string; target_id?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/audit-log', params),

  // 写
  cancelOrder: (no: string, reason: string) =>
    post(`/api/oms/admin/order/${no}/cancel`, { reason }),
  recoverOrder: (no: string, toStatus: string, reason: string) =>
    post(`/api/oms/admin/order/${no}/recover`, { to_status: toStatus, reason }),
  adjustInventory: (sku: string, data: { available?: number; buffer_qty?: number; reason?: string }) =>
    put(`/api/oms/admin/inventory/${encodeURIComponent(sku)}`, data),

  // 退款（admin，iter-15）
  refundList: (params: { status?: string; type?: string; order_no?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/refund/list', params),
  refundDetail: (no: string) => get(`/api/oms/admin/refund/${no}`),
  refundApprove: (no: string) => post(`/api/oms/admin/refund/${no}/approve`, {}),
  refundReject: (no: string, reason: string) => post(`/api/oms/admin/refund/${no}/reject`, { reason }),
  refundConfirm: (no: string) => post(`/api/oms/admin/refund/${no}/confirm`, {}),

  // 批量操作（iter-18）
  batchCancelOrders: (order_nos: string[], reason: string) =>
    post('/api/oms/admin/order/batch-cancel', { order_nos, reason }),
  batchApproveRefunds: (refund_nos: string[]) =>
    post('/api/oms/admin/refund/batch-approve', { refund_nos }),
  batchRejectRefunds: (refund_nos: string[], reason: string) =>
    post('/api/oms/admin/refund/batch-reject', { refund_nos, reason }),

  // 导出 CSV（iter-18，运营对账用）
  exportOrders: (params: { status?: string; keyword?: string } = {}) =>
    downloadFile('/api/oms/admin/order/export', params),
  exportRefunds: (params: { status?: string; type?: string; keyword?: string } = {}) =>
    downloadFile('/api/oms/admin/refund/export', params),
  exportInventory: () => downloadFile('/api/oms/admin/inventory/export'),

  // 优惠券管理（iter-19，super_admin + sales_ops）
  couponList: (params: { status?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/coupon/list', params),
  couponCreate: (data: {
    name: string; type: 'threshold' | 'percent';
    discount_value: number; min_amount?: number; max_discount?: number | null;
    total_count?: number; per_user_limit?: number;
    valid_from: string; valid_to: string;
  }) => post('/api/oms/admin/coupon', data),
  couponUpdate: (id: number, data: {
    name?: string; valid_to?: string; total_count?: number; per_user_limit?: number; max_discount?: number | null;
  }) => put(`/api/oms/admin/coupon/${id}`, data),
  couponDisable: (id: number) => post(`/api/oms/admin/coupon/${id}/disable`, {}),

  // iter-27 Q19-02 自动发券规则
  couponRuleList: () => get('/api/oms/admin/coupon-rule/list'),
  couponRuleCreate: (data: { name: string; trigger_type: string; coupon_id: number; per_user_limit?: number; enabled?: number; remark?: string }) =>
    post('/api/oms/admin/coupon-rule', data),
  couponRuleUpdate: (id: number, data: { name?: string; enabled?: number; per_user_limit?: number; remark?: string }) =>
    put(`/api/oms/admin/coupon-rule/${id}`, data),
  couponRuleDelete: (id: number) => del(`/api/oms/admin/coupon-rule/${id}`),

  // 评价审核（iter-20，super_admin + sales_ops）
  reviewList: (params: { status?: string; spu_id?: number; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/review/list', params),
  reviewHide: (id: number) => post(`/api/oms/admin/review/${id}/hide`, {}),
  reviewRestore: (id: number) => post(`/api/oms/admin/review/${id}/restore`, {}),

  // admin 用户管理（iter-17，仅 super_admin）
  adminLogin: (data: { username: string; password: string }) => post('/api/oms/admin/login', data),
  adminMe: () => get('/api/oms/admin/me'),
  adminUserList: (params: { page?: number; size?: number } = {}) => get('/api/oms/admin/user/list', params),
  adminUserCreate: (data: { username: string; password: string; name: string; role: string }) => post('/api/oms/admin/user', data),
  adminUserUpdate: (id: number, data: { name?: string; role?: string; status?: string }) => put(`/api/oms/admin/user/${id}`, data),
  adminUserChangePassword: (id: number, new_password: string) => post(`/api/oms/admin/user/${id}/change-password`, { new_password }),
  adminUserDelete: (id: number) => del(`/api/oms/admin/user/${id}`),

  // iter-28 A1 webhook
  webhookList: () => get('/api/oms/admin/webhook/list'),
  webhookCreate: (data: { name: string; url: string; events: string[]; secret?: string; enabled?: number; retry_max?: number }) =>
    post('/api/oms/admin/webhook', data),
  webhookUpdate: (id: number, data: { name?: string; url?: string; events?: string[]; enabled?: number; retry_max?: number }) =>
    put(`/api/oms/admin/webhook/${id}`, data),
  webhookDelete: (id: number) => del(`/api/oms/admin/webhook/${id}`),
  webhookTest: (id: number) => post(`/api/oms/admin/webhook/${id}/test`, {}),

  // iter-26 P0-2 OMS 视角对账（super_admin）
  omsReconcileList: (params: { page?: number; size?: number } = {}) => get('/api/oms/admin/reconcile/list', params),
  omsReconcileDetail: (no: string) => get(`/api/oms/admin/reconcile/${no}`),
  omsReconcileCreate: (data: { scope_type?: 'all' | 'sku'; scope_value?: string }) => post('/api/oms/admin/reconcile', data),
  omsReconcileConfirm: (no: string) => post(`/api/oms/admin/reconcile/${no}/confirm`, {}),

  // iter-26 P0-3 财务结算单（super_admin + sales_ops）
  settlementList: (params: { type?: string; status?: string; start_date?: string; end_date?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/settlement/list', params),
  settlementDetail: (no: string) => get(`/api/oms/admin/settlement/${no}`),
  settlementSettle: (no: string) => post(`/api/oms/admin/settlement/${no}/settle`, {}),
  settlementExport: (params: { type?: string; start_date?: string; end_date?: string } = {}) =>
    downloadFile('/api/oms/admin/settlement/export', params),

  // iter-35 BIZ-08-1 店铺管理（super_admin 独占）
  storeList: (params: { status?: string; keyword?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/store/list', params),
  storeDetail: (id: number) => get(`/api/oms/admin/store/${id}`),
  storeCreate: (data: any) => post('/api/oms/admin/store', data),
  storeApprove: (id: number) => post(`/api/oms/admin/store/${id}/approve`, {}),
  storeSuspend: (id: number, reason: string) => post(`/api/oms/admin/store/${id}/suspend`, { reason }),
  storeResume: (id: number) => post(`/api/oms/admin/store/${id}/resume`, {}),
  storeUpdateCommission: (id: number, commission_rate: number) =>
    post(`/api/oms/admin/store/${id}/commission`, { commission_rate }),
  storeAddAdmin: (id: number, admin_user_id: number, role: 'store_owner' | 'store_staff' = 'store_owner') =>
    post(`/api/oms/admin/store/${id}/admins`, { admin_user_id, role }),
  storeRemoveAdmin: (id: number, adminUserId: number) =>
    del(`/api/oms/admin/store/${id}/admins/${adminUserId}`),

  // iter-34 换货
  exchangeList: (params: { status?: string; order_no?: string; exchange_no?: string; user_id?: number; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/exchange/list', params),
  exchangeDetail: (no: string) => get(`/api/oms/admin/exchange/${no}`),
  exchangeApprove: (no: string) => post(`/api/oms/admin/exchange/${no}/approve`, {}),
  exchangeReject: (no: string, reason: string) => post(`/api/oms/admin/exchange/${no}/reject`, { reason }),
  exchangeReceivedOld: (no: string, data: { tracking_no_old?: string; note?: string }) =>
    post(`/api/oms/admin/exchange/${no}/received-old`, data),
  exchangeSentNew: (no: string, tracking_no_new: string) =>
    post(`/api/oms/admin/exchange/${no}/sent-new`, { tracking_no_new }),
  exchangeComplete: (no: string) => post(`/api/oms/admin/exchange/${no}/complete`, {}),

  // iter-40 BIZ-09-1 内容运营
  bannerList: (params: { position?: string; status?: string; store_id?: number | string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/banner/list', params),
  bannerCreate: (data: any) => post('/api/oms/admin/banner', data),
  bannerUpdate: (id: number, data: any) => put(`/api/oms/admin/banner/${id}`, data),
  bannerDelete: (id: number) => del(`/api/oms/admin/banner/${id}`),
  featuredList: (params: { position?: string; status?: string; spu_id?: number; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/featured/list', params),
  featuredCreate: (data: any) => post('/api/oms/admin/featured', data),
  featuredUpdate: (id: number, data: any) => put(`/api/oms/admin/featured/${id}`, data),
  featuredDelete: (id: number) => del(`/api/oms/admin/featured/${id}`),

  // iter-42 EFF 第 1 轮
  todosCounts: () => get('/api/oms/admin/todos/counts'),
  deadLetterList: (params: { stream?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/dead-letter', params),
  deadLetterReplay: (id: number) => post(`/api/oms/admin/dead-letter/${id}/replay`, {}),

  // iter-44 EFF-02 ⌘K 全局快速搜索
  quickSearch: (q: string) => get('/api/oms/admin/quick-search', { q }),

  // iter-46 BI-01 用户 RFM 分层
  rfmAnalysis: (params: { days?: number; segment?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/bi/rfm', params),

  // iter-47 BI-02 订单漏斗
  funnelAnalysis: (params: { days?: number } = {}) => get('/api/oms/admin/bi/funnel', params),

  // iter-49 BI-04 异常预警面板
  alertSummary: () => get('/api/oms/admin/bi/alerts'),

  // iter-53 Q46-02 RFM 分群一键发券
  rfmGrantCoupon: (data: { segment: string; coupon_id: number; days?: number }) =>
    post('/api/oms/admin/bi/rfm/grant-coupon', data),

  // iter-52 系统配置 KV
  configList: (params: { category?: string } = {}) => get('/api/oms/admin/config/list', params),
  configUpdate: (kv: Record<string, any>) => put('/api/oms/admin/config', { kv }),

  // iter-50 商家提现 Q35-03/Q39-03
  withdrawalBalance: (params: { store_id?: number } = {}) => get('/api/oms/admin/withdrawal/balance', params),
  withdrawalList: (params: { status?: string; store_id?: number; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/withdrawal/list', params),
  withdrawalApply: (data: { amount: number; remark?: string }) => post('/api/oms/admin/withdrawal', data),
  withdrawalApprove: (no: string) => post(`/api/oms/admin/withdrawal/${no}/approve`, {}),
  withdrawalReject: (no: string, reason: string) => post(`/api/oms/admin/withdrawal/${no}/reject`, { reason }),
  withdrawalPay: (no: string, method: string, ref: string) => post(`/api/oms/admin/withdrawal/${no}/pay`, { method, ref }),

  // iter-41 BIZ-09-2 专题 + 营销日历
  topicList: (params: { status?: string; keyword?: string; page?: number; size?: number } = {}) =>
    get('/api/oms/admin/topic/list', params),
  topicDetail: (id: number) => get(`/api/oms/admin/topic/${id}`),
  topicCreate: (data: any) => post('/api/oms/admin/topic', data),
  topicUpdate: (id: number, data: any) => put(`/api/oms/admin/topic/${id}`, data),
  topicDelete: (id: number) => del(`/api/oms/admin/topic/${id}`),
  topicAddItems: (id: number, spu_ids: number[]) => post(`/api/oms/admin/topic/${id}/items`, { spu_ids }),
  topicRemoveItem: (id: number, spuId: number) => del(`/api/oms/admin/topic/${id}/items/${spuId}`),
  marketingCalendar: (params: { start?: string; end?: string } = {}) =>
    get('/api/oms/admin/marketing-calendar', params),
};
