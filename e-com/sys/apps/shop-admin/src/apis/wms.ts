import { get, post, put, del } from './http';

export const wmsApi = {
  health: () => get('/health/wms'),

  // 读
  warehouseList: (params: Record<string, any> = {}) => get('/api/wms/warehouse/list', params),
  locationList: (warehouseCode?: string) =>
    get('/api/wms/location/list', warehouseCode ? { warehouse_code: warehouseCode } : {}),
  inventoryList: (params: Record<string, any> | string = {}) =>
    get('/api/wms/inventory/list', typeof params === 'string' ? { sku_code: params } : params),
  outboundList: (params: { page?: number; size?: number } = {}) =>
    get('/api/wms/outbound/list', params),
  outboundDetail: (no: string) => get(`/api/wms/outbound/${no}`),
  autoComplete: (no: string) => post(`/api/wms/outbound/${no}/auto-complete`),

  // 仓库写
  warehouseDetail: (code: string) => get(`/api/wms/warehouse/${encodeURIComponent(code)}`),
  warehouseCreate: (data: any) => post('/api/wms/warehouse', data),
  warehouseUpdate: (code: string, data: any) => put(`/api/wms/warehouse/${encodeURIComponent(code)}`, data),
  warehouseDelete: (code: string) => del(`/api/wms/warehouse/${encodeURIComponent(code)}`),

  // 库位写
  locationDetail: (code: string) => get(`/api/wms/location/${encodeURIComponent(code)}`),
  locationCreate: (data: any) => post('/api/wms/location', data),
  locationBatch: (data: any) => post('/api/wms/location/batch', data),
  locationUpdate: (code: string, data: any) => put(`/api/wms/location/${encodeURIComponent(code)}`, data),
  locationDelete: (code: string) => del(`/api/wms/location/${encodeURIComponent(code)}`),

  // 入库
  inboundList: (params: Record<string, any> = {}) => get('/api/wms/inbound/list', params),
  inboundDetail: (no: string) => get(`/api/wms/inbound/${no}`),
  inboundCreate: (data: any) => post('/api/wms/inbound', data, {
    headers: { 'Idempotency-Key': 'ib-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) },
  }),
  inboundAutoComplete: (no: string) => post(`/api/wms/inbound/${no}/auto-complete`),
  inboundCancel: (no: string) => post(`/api/wms/inbound/${no}/cancel`),

  // 商品（PIM 同步 read replica，iter-13）
  productList: (params: { keyword?: string; active?: string; page?: number; size?: number } = {}) =>
    get('/api/wms/product/list', params),

  // iter-22 盘点
  stockTakeList: (params: { warehouse_code?: string; status?: string; page?: number; size?: number } = {}) =>
    get('/api/wms/stock-take/list', params),
  stockTakeDetail: (no: string) => get(`/api/wms/stock-take/${no}`),
  stockTakeCreate: (data: { warehouse_code: string; scope_type: 'all'|'zone'|'location'|'sku'; scope_value?: string; remark?: string }) =>
    post('/api/wms/stock-take', data),
  stockTakeStart: (no: string) => post(`/api/wms/stock-take/${no}/start`, {}),
  stockTakeRecord: (no: string, itemId: number, actualQty: number) =>
    post(`/api/wms/stock-take/${no}/items/${itemId}`, { actual_qty: actualQty }),
  stockTakeComplete: (no: string) => post(`/api/wms/stock-take/${no}/complete`, {}),
  stockTakeCancel: (no: string) => post(`/api/wms/stock-take/${no}/cancel`, {}),

  // iter-22 调拨
  transferList: (params: { status?: string; from_warehouse?: string; to_warehouse?: string; page?: number; size?: number } = {}) =>
    get('/api/wms/transfer/list', params),
  transferDetail: (no: string) => get(`/api/wms/transfer/${no}`),
  transferCreate: (data: {
    from_warehouse: string; to_warehouse: string;
    remark?: string;
    items: Array<{ from_location: string; to_location: string; sku_code: string; batch_no?: string; qty: number }>;
  }) => post('/api/wms/transfer', data),
  transferShip: (no: string) => post(`/api/wms/transfer/${no}/ship`, {}),
  transferReceive: (no: string) => post(`/api/wms/transfer/${no}/receive`, {}),
  transferCancel: (no: string) => post(`/api/wms/transfer/${no}/cancel`, {}),

  // iter-22 上架推荐
  recommendLocations: (data: { sku_code: string; qty: number; warehouse_code: string; top_n?: number }) =>
    post('/api/wms/inbound/recommend-locations', data),

  // iter-24 P0-1 库存日志
  inventoryLogList: (params: { sku_code?: string; location_code?: string; change_type?: string; ref_no?: string; page?: number; size?: number } = {}) =>
    get('/api/wms/inventory-log/list', params),

  // iter-24 P1-1 拣货任务
  pickingTaskList: (params: { status?: string; outbound_no?: string; operator?: string; page?: number; size?: number } = {}) =>
    get('/api/wms/picking-task/list', params),
  pickingTaskDetail: (id: number) => get(`/api/wms/picking-task/${id}`),
  pickingTaskAssign: (id: number, operator: string) => post(`/api/wms/picking-task/${id}/assign`, { operator }),
  pickingTaskScan: (id: number, incr_qty: number) => post(`/api/wms/picking-task/${id}/scan`, { incr_qty }),
  pickingTaskComplete: (id: number) => post(`/api/wms/picking-task/${id}/complete`, {}),

  // iter-24 P1-2 对账
  reconcileList: (params: { page?: number; size?: number } = {}) => get('/api/wms/reconcile/list', params),
  reconcileDetail: (no: string) => get(`/api/wms/reconcile/${no}`),
  reconcileCreate: (data: { scope_type?: 'all' | 'sku'; scope_value?: string }) => post('/api/wms/reconcile', data),
  reconcileConfirm: (no: string) => post(`/api/wms/reconcile/${no}/confirm`, {}),

  // iter-25 WMS Dashboard
  wmsStats: (params: { days?: number } = {}) => get('/api/wms/wms-stats', params),

  // iter-25 低库存预警 + iter-32 A webhook
  stockAlertList: () => get('/api/wms/stock-alert/list'),
  stockAlertRules: () => get('/api/wms/stock-alert/rules'),
  stockAlertRuleUpsert: (data: { sku_code: string; threshold: number; enabled?: number; remark?: string; notify_webhook_url?: string | null; notify_cooldown_minutes?: number }) =>
    post('/api/wms/stock-alert/rules', data),
  stockAlertRuleDelete: (sku: string) => del(`/api/wms/stock-alert/rules/${encodeURIComponent(sku)}`),

  // iter-32 B 盘点定时调度
  scheduleList: () => get('/api/wms/stock-take-schedule/list'),
  scheduleDetail: (id: number) => get(`/api/wms/stock-take-schedule/${id}`),
  scheduleCreate: (data: any) => post('/api/wms/stock-take-schedule', data),
  scheduleUpdate: (id: number, data: any) => put(`/api/wms/stock-take-schedule/${id}`, data),
  scheduleDelete: (id: number) => del(`/api/wms/stock-take-schedule/${id}`),
  scheduleTriggerNow: (id: number) => post(`/api/wms/stock-take-schedule/${id}/trigger`, {}),

  // iter-32 C WMS 配置
  configGet: (key: string) => get(`/api/wms/config/${encodeURIComponent(key)}`),
  configSet: (key: string, value: any, description?: string) =>
    post(`/api/wms/config/${encodeURIComponent(key)}`, { value, description }),
  locationWeightsPreview: () => get('/api/wms/config/location-weights/preview'),
};
