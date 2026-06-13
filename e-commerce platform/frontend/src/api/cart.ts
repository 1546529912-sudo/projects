import http, { type ApiResponse } from './http'

export interface CartItem {
  id: number
  sku_id: number
  product_id: number | null
  product_name: string | null
  product_model: string | null
  main_image_url: string | null
  unit_price: string | null
  qty: number
  selected: boolean
  stock: number | null
  invalid: boolean
  insufficient: boolean
  subtotal: string
}

export interface CartTotals {
  item_count: number
  selected_count: number
  selected_qty: number
  product_amount: string
  shipping_fee: string
  total_amount: string
}

export interface CartView {
  items: CartItem[]
  totals: CartTotals
}

export function getCart() {
  return http.get<ApiResponse<CartView>, ApiResponse<CartView>>('/cart')
}

export function addToCart(sku_id: number, qty: number) {
  return http.post<ApiResponse<CartView>, ApiResponse<CartView>>('/cart/items', { sku_id, qty })
}

export function updateCartItem(id: number, payload: { qty?: number; selected?: boolean }) {
  return http.put<ApiResponse<CartView>, ApiResponse<CartView>>(`/cart/items/${id}`, payload)
}

export function removeCartItem(id: number) {
  return http.delete<ApiResponse<CartView>, ApiResponse<CartView>>(`/cart/items/${id}`)
}

export function selectAllItems(selected: boolean) {
  return http.post<ApiResponse<CartView>, ApiResponse<CartView>>('/cart/items/select-all', { selected })
}

export function clearInvalidItems() {
  return http.delete<ApiResponse<CartView>, ApiResponse<CartView>>('/cart/items/invalid')
}
