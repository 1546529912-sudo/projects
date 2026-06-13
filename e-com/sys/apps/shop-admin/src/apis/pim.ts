import { get, post, put, del, upload } from './http';

export const pimApi = {
  // 读
  health: () => get('/health/pim'),
  productList: (params: Record<string, any> = {}) => get('/api/pim/product/list', params),
  productDetail: (sku: string) => get(`/api/pim/product/${encodeURIComponent(sku)}`),
  skuDetail: (code: string) => get(`/api/pim/sku/${encodeURIComponent(code)}`),
  categoryList: () => get('/api/pim/category/list'),
  brandList: () => get('/api/pim/brand/list'),

  // 类目写
  categoryDetail: (id: number) => get(`/api/pim/admin/category/${id}`),
  categoryCreate: (data: any) => post('/api/pim/admin/category', data),
  categoryUpdate: (id: number, data: any) => put(`/api/pim/admin/category/${id}`, data),
  categoryDelete: (id: number) => del(`/api/pim/admin/category/${id}`),
  categoryReorder: (items: { id: number; sort: number }[]) =>
    post('/api/pim/admin/category/reorder', { items }),

  // 品牌写
  brandDetail: (id: number) => get(`/api/pim/admin/brand/${id}`),
  brandCreate: (data: any) => post('/api/pim/admin/brand', data),
  brandUpdate: (id: number, data: any) => put(`/api/pim/admin/brand/${id}`, data),
  brandDelete: (id: number) => del(`/api/pim/admin/brand/${id}`),

  // SPU
  spuAdminList: (params: Record<string, any> = {}) => get('/api/pim/admin/spu/list', params),
  spuDetail: (id: number) => get(`/api/pim/admin/spu/${id}`),
  spuCreate: (data: any) => post('/api/pim/admin/spu', data),
  spuUpdate: (id: number, data: any) => put(`/api/pim/admin/spu/${id}`, data),
  spuDelete: (id: number) => del(`/api/pim/admin/spu/${id}`),
  spuPublish: (id: number) => post(`/api/pim/admin/spu/${id}/publish`),
  spuOffline: (id: number) => post(`/api/pim/admin/spu/${id}/offline`),

  // SKU
  skuCreate: (data: any) => post('/api/pim/admin/sku', data),
  skuUpdate: (code: string, data: any) => put(`/api/pim/admin/sku/${encodeURIComponent(code)}`, data),
  skuDelete: (code: string) => del(`/api/pim/admin/sku/${encodeURIComponent(code)}`),

  // 图片上传
  uploadImage: (file: File) => upload('/api/pim/admin/upload/image', file),

  // iter-29: Dashboard + Audit log + 状态机轨迹
  adminStats: (params: Record<string, any> = {}) => get('/api/pim/admin/stats', params),
  auditLogList: (params: Record<string, any> = {}) => get('/api/pim/admin/audit-log', params),
  spuStatusLog: (id: number) => get(`/api/pim/admin/spu/${id}/status-log`),

  // iter-30 A: 导出/导入 SPU CSV（导出走原生 href，因要触发浏览器下载，下面只暴露 import）
  spuImport: (file: File) => upload('/api/pim/admin/spu/import', file),

  // iter-30 B: 属性模板
  templateList: () => get('/api/pim/admin/attribute-template/list'),
  templateDetail: (id: number) => get(`/api/pim/admin/attribute-template/${id}`),
  templateCreate: (data: any) => post('/api/pim/admin/attribute-template', data),
  templateUpdate: (id: number, data: any) => put(`/api/pim/admin/attribute-template/${id}`, data),
  templateDelete: (id: number) => del(`/api/pim/admin/attribute-template/${id}`),

  // iter-30 C: 图片库
  imageLibraryList: (params: Record<string, any> = {}) => get('/api/pim/admin/image-library/list', params),
  imageLibraryDelete: (id: number) => del(`/api/pim/admin/image-library/${id}`),

  // iter-36 BIZ-08-2 店铺列表（PIM 下拉用）
  storeList: () => get('/api/pim/admin/store-list'),

  // iter-44 EFF-02 ⌘K SPU 快速搜索
  quickSearch: (q: string) => get('/api/pim/admin/quick-search', { q }),

  // iter-48 BI-03 SKU 生命周期分析
  skuLifecycle: (params: { days?: number; stage?: string; page?: number; size?: number } = {}) =>
    get('/api/pim/admin/bi/sku-lifecycle', params),

  // iter-53 Q48-01 批量下架淘汰阶段
  skuLifecycleBatchOffline: (data: { stage?: string; days?: number } = {}) =>
    post('/api/pim/admin/bi/sku-lifecycle/batch-offline', data),
};
