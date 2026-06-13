import http, { type ApiResponse } from './http'

export type AiSource = 'detail_page' | 'global_chat' | 'inquiry_form' | 'floating'

export interface AiConversation {
  id: number
  user_id: number
  session_id: string
  source: AiSource
  intent: string | null
  context_json: Record<string, unknown> | null
  transferred: boolean
  transferred_at: string | null
  is_business: boolean
  created_at: string
  updated_at: string
}

export interface AiMessage {
  id: number
  conversation_id: number
  sender_type: 'user' | 'ai' | 'human'
  content: string
  confidence: string | null
  meta: Record<string, any> | null
  created_at: string
}

export interface QuotationItem {
  sku_id: number
  sku_code: string
  name: string
  qty: number
  unit_price: string
  total: string
}

export interface AiQuotation {
  id: number
  quotation_no: string
  conversation_id: number | null
  user_id: number
  items: QuotationItem[]
  total_amount: string
  valid_until: string
  status: 'active' | 'used' | 'expired' | 'cancelled'
  order_id: number | null
  remark: string | null
  created_at: string
}

export interface TurnResponse {
  conversation: AiConversation
  user_message: AiMessage
  ai_message: AiMessage
  quotation: AiQuotation | null
}

export function createConversation(payload: { source: AiSource; product_id?: number; sku_id?: number }) {
  return http.post<ApiResponse<{ conversation: AiConversation }>, ApiResponse<{ conversation: AiConversation }>>(
    '/ai/conversations',
    payload,
  )
}

export function getConversation(id: number) {
  return http.get<
    ApiResponse<{ conversation: AiConversation & { messages: AiMessage[] } }>,
    ApiResponse<{ conversation: AiConversation & { messages: AiMessage[] } }>
  >(`/ai/conversations/${id}`)
}

export function sendMessage(conversationId: number, content: string) {
  return http.post<ApiResponse<TurnResponse>, ApiResponse<TurnResponse>>(
    `/ai/conversations/${conversationId}/messages`,
    { content },
  )
}

export function addQuotationToCart(quotationId: number) {
  return http.post<ApiResponse<{ added: number; quotation_no: string }>, ApiResponse<{ added: number; quotation_no: string }>>(
    `/ai/quotations/${quotationId}/add-to-cart`,
  )
}
