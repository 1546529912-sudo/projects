import http, { type ApiResponse } from './http'

export interface Category {
  id: number
  parent_id: number | null
  name: string
  slug: string
  icon_url: string | null
  sort_order: number
}

export function listCategories() {
  return http.get<ApiResponse<Category[]>, ApiResponse<Category[]>>('/categories')
}
