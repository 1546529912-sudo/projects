import http, { type ApiResponse } from './http'

export interface ProductCard {
  id: number
  name: string
  model: string
  main_image_url: string | null
  price: string | null
  price_from?: boolean
  stock: number
  stock_status: 'in_stock' | 'out_of_stock'
  sku_count?: number
}

export interface SkuSpec {
  key: string
  value: string
  unit: string | null
}

export interface PriceTier {
  min_qty: number
  max_qty: number | null
  unit_price: string
}

export interface SkuDetail {
  id: number
  sku_code: string
  base_price: string
  stock: number
  stock_status: 'in_stock' | 'out_of_stock'
  specs: SkuSpec[]
  price_tiers: PriceTier[]
  price_range: { min: string; max: string }
}

export interface ProductDetail {
  id: number
  name: string
  model: string
  keywords: string | null
  main_image_url: string | null
  detail_images: string[] | null
  description: string | null
  spec_pdf_url: string | null
  category: { id: number; name: string; slug: string } | null
  skus: SkuDetail[]
  price_range: { min: string; max: string } | null
  view_count: number
}

export interface ListParams {
  keyword?: string
  category_id?: number
  min_price?: number
  max_price?: number
  sort?: 'price' | 'sales' | 'latest'
  order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface PaginatedProducts {
  items: ProductCard[]
  total: number
  page: number
  per_page: number
}

export function listProducts(params: ListParams = {}) {
  return http.get<ApiResponse<PaginatedProducts>, ApiResponse<PaginatedProducts>>('/products', {
    params,
  })
}

export function recommended() {
  return http.get<ApiResponse<{ items: ProductCard[] }>, ApiResponse<{ items: ProductCard[] }>>(
    '/products/recommended',
  )
}

export function productDetail(id: number) {
  return http.get<ApiResponse<ProductDetail>, ApiResponse<ProductDetail>>(`/products/${id}`)
}

/* ---------- admin ---------- */
export interface AdminProduct {
  id: number
  category_id: number
  name: string
  model: string
  keywords: string | null
  main_image_url: string | null
  description: string | null
  status: 'draft' | 'active' | 'inactive'
  view_count: number
  base_price: string | null
  stock: number | null
  stock_threshold?: number | null
  created_at: string
  updated_at: string
}

export interface AdminProductPayload {
  category_id: number
  name: string
  model: string
  keywords?: string
  main_image_url?: string
  description?: string
  status?: 'draft' | 'active' | 'inactive'
  base_price: number
  stock: number
  stock_threshold?: number
}

export function adminListProducts(params: { keyword?: string; status?: string; page?: number; per_page?: number } = {}) {
  return http.get<
    ApiResponse<{ items: AdminProduct[]; total: number; page: number; per_page: number }>,
    ApiResponse<{ items: AdminProduct[]; total: number; page: number; per_page: number }>
  >('/admin/products', { params })
}

export function adminGetProduct(id: number) {
  return http.get<ApiResponse<{ product: AdminProduct }>, ApiResponse<{ product: AdminProduct }>>(
    `/admin/products/${id}`,
  )
}

export function adminCreateProduct(payload: AdminProductPayload) {
  return http.post<ApiResponse<{ product: AdminProduct }>, ApiResponse<{ product: AdminProduct }>>(
    '/admin/products',
    payload,
  )
}

export function adminUpdateProduct(id: number, payload: Partial<AdminProductPayload>) {
  return http.put<ApiResponse<{ product: AdminProduct }>, ApiResponse<{ product: AdminProduct }>>(
    `/admin/products/${id}`,
    payload,
  )
}

export function adminToggleProduct(id: number) {
  return http.post<ApiResponse<{ id: number; status: string }>, ApiResponse<{ id: number; status: string }>>(
    `/admin/products/${id}/toggle`,
  )
}
