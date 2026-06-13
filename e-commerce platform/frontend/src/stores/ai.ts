import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as aiApi from '@/api/ai'
import type { AiConversation, AiMessage, AiQuotation, AiSource } from '@/api/ai'

export const useAiStore = defineStore('ai', () => {
  const drawerOpen = ref(false)
  const conversation = ref<AiConversation | null>(null)
  const messages = ref<AiMessage[]>([])
  const sending = ref(false)
  const error = ref<string | null>(null)
  /** sku_id → 已被某条 AI 消息附带的 quotation */
  const quotationByMessageId = ref<Record<number, AiQuotation>>({})

  const collectedContext = computed(() => conversation.value?.context_json ?? {})
  const transferred = computed(() => conversation.value?.transferred ?? false)

  function open() {
    drawerOpen.value = true
  }

  function close() {
    drawerOpen.value = false
  }

  function resetSession() {
    conversation.value = null
    messages.value = []
    quotationByMessageId.value = {}
    error.value = null
  }

  async function ensureConversation(source: AiSource = 'floating', productId?: number, skuId?: number) {
    if (conversation.value) return conversation.value
    const res = await aiApi.createConversation({ source, product_id: productId, sku_id: skuId })
    conversation.value = res.data.conversation
    messages.value = []
    if (productId || skuId) {
      // 第一条欢迎语
      messages.value.push({
        id: -1,
        conversation_id: res.data.conversation.id,
        sender_type: 'ai',
        content: productId
          ? `您正在查看的商品已带入对话。请告诉我需要的数量、厚度、是否有特殊认证要求，我可以为您快速生成报价。`
          : `您好！请描述需求（材料 / 形态 / 数量），我帮您匹配商品并报价。`,
        confidence: null,
        meta: null,
        created_at: new Date().toISOString(),
      })
    }
    return conversation.value!
  }

  async function send(text: string) {
    if (!text.trim()) return
    if (!conversation.value) await ensureConversation('floating')

    sending.value = true
    error.value = null
    try {
      const res = await aiApi.sendMessage(conversation.value!.id, text.trim())
      const t = res.data
      // 移除欢迎语占位（id<0）
      messages.value = messages.value.filter((m) => m.id > 0)
      messages.value.push(t.user_message, t.ai_message)
      conversation.value = t.conversation
      if (t.quotation) quotationByMessageId.value[t.ai_message.id] = t.quotation
    } catch (e: any) {
      error.value = e?.response?.data?.message || '消息发送失败'
    } finally {
      sending.value = false
    }
  }

  async function addQuotationToCart(quotationId: number) {
    const res = await aiApi.addQuotationToCart(quotationId)
    return res.data
  }

  return {
    drawerOpen,
    conversation,
    messages,
    sending,
    error,
    quotationByMessageId,
    collectedContext,
    transferred,
    open,
    close,
    resetSession,
    ensureConversation,
    send,
    addQuotationToCart,
  }
})
