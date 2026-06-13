<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '@/stores/ai'
import { useCartStore } from '@/stores/cart'
import http, { type ApiResponse } from '@/api/http'

const ai = useAiStore()
const cart = useCartStore()
const router = useRouter()

const input = ref('')
const scroller = ref<HTMLElement | null>(null)
const adding = ref<number | null>(null)

// iter-13: 用户对 AI 消息的 thumbs 状态（本地缓存，避免重复提交）
const feedbackByMsg = ref<Record<number, 'good' | 'bad'>>({})
const submittingFb = ref<number | null>(null)
const reasonOpenFor = ref<number | null>(null)
const reasonText = ref('')

async function submitFeedback(messageId: number, rating: 'good' | 'bad') {
  submittingFb.value = messageId
  try {
    await http.post<ApiResponse<any>, ApiResponse<any>>('/ai/feedbacks', { message_id: messageId, rating })
    feedbackByMsg.value[messageId] = rating
    // 差评额外问理由
    if (rating === 'bad') reasonOpenFor.value = messageId
  } catch (e: any) {
    alert(e?.response?.data?.message || '反馈失败')
  } finally {
    submittingFb.value = null
  }
}

async function submitReason(messageId: number) {
  const text = reasonText.value.trim()
  if (!text) {
    reasonOpenFor.value = null
    reasonText.value = ''
    return
  }
  try {
    await http.post<ApiResponse<any>, ApiResponse<any>>('/ai/feedbacks', {
      message_id: messageId, rating: 'bad', reason: text,
    })
    reasonOpenFor.value = null
    reasonText.value = ''
  } catch (e: any) {
    alert(e?.response?.data?.message || '提交失败')
  }
}

const contextChips = computed(() => {
  const c = ai.collectedContext as Record<string, any>
  const chips: { label: string; value: string }[] = []
  if (c.material) chips.push({ label: '材料', value: friendlyMaterial(c.material) })
  if (c.form) chips.push({ label: '形态', value: friendlyForm(c.form) })
  if (c.qty) chips.push({ label: '数量', value: `${c.qty} kg` })
  if (c.thickness_mm) chips.push({ label: '厚度', value: `${c.thickness_mm} mm` })
  if (c.product_id) chips.push({ label: '商品', value: `#${c.product_id}` })
  return chips
})

function friendlyMaterial(m: string) {
  return { carbon_fiber: '碳纤维', glass_fiber: '玻璃纤维', aramid: '芳纶', prepreg: '预浸料' }[m] || m
}
function friendlyForm(f: string) {
  return { plate: '板材', tube: '管材', cloth: '布材' }[f] || f
}

async function onSend() {
  const text = input.value
  if (!text.trim() || ai.sending) return
  input.value = ''
  await ai.send(text)
  await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

watch(() => ai.messages.length, scrollToBottom)
watch(() => ai.drawerOpen, async (v) => v && (await scrollToBottom()))

async function addQuotationToCart(quotationId: number) {
  adding.value = quotationId
  try {
    const res = await ai.addQuotationToCart(quotationId)
    await cart.refresh()
    alert(`已加入购物车（${res.added} 件商品）`)
    ai.close()
    router.push({ name: 'cart' })
  } catch (e: any) {
    alert(e?.response?.data?.message || '加入购物车失败')
  } finally {
    adding.value = null
  }
}

function newSession() {
  if (!confirm('开启新对话？当前对话记录会保留但抽屉重置')) return
  ai.resetSession()
}

const quickPrompts = [
  '碳纤维板 100kg 多少钱',
  '芳纶 1414 有现货吗',
  'T700 3MM 板材规格',
]

function pickPrompt(p: string) {
  input.value = p
}
</script>

<template>
  <Teleport to="body">
    <Transition name="scrim-fade">
      <div v-if="ai.drawerOpen" class="scrim" @click="ai.close()"></div>
    </Transition>

    <Transition name="slide-in">
      <aside v-if="ai.drawerOpen" class="drawer" role="dialog" aria-label="AI 助手">
        <header>
          <div class="title">
            <span class="dot"></span>
            <span>AI 助手</span>
            <small v-if="ai.transferred">已转人工</small>
          </div>
          <div class="actions">
            <button class="icon" @click="newSession" aria-label="新对话">⟳</button>
            <button class="icon" @click="ai.close()" aria-label="关闭">×</button>
          </div>
        </header>

        <div v-if="contextChips.length" class="chips">
          <span class="chip" v-for="(c, i) in contextChips" :key="i">
            <em>{{ c.label }}</em> {{ c.value }}
          </span>
        </div>

        <div class="messages" ref="scroller">
          <p v-if="ai.messages.length === 0" class="empty">
            您好！我是中研复材 AI 助手。试着问我：
          </p>
          <div v-if="ai.messages.length === 0" class="prompts">
            <button v-for="p in quickPrompts" :key="p" @click="pickPrompt(p)">{{ p }}</button>
          </div>

          <article
            v-for="m in ai.messages"
            :key="m.id"
            class="msg"
            :class="m.sender_type"
          >
            <div class="bubble">{{ m.content }}</div>

            <!-- RAG 来源标注（presale 命中知识库时）-->
            <div
              v-if="m.sender_type === 'ai' && m.meta?.sources && m.meta.sources.length > 0"
              class="sources"
            >
              <span class="src-label">📚 来源：</span>
              <span v-for="(s, idx) in m.meta.sources" :key="s.id" class="src-chip">
                {{ s.title }}<span v-if="idx < m.meta.sources.length - 1">、</span>
              </span>
            </div>

            <!-- iter-13: AI 消息下方的踩/赞 -->
            <div v-if="m.sender_type === 'ai'" class="fb-bar">
              <button
                class="fb"
                :class="{ active: feedbackByMsg[m.id] === 'good' }"
                :disabled="submittingFb === m.id"
                title="赞一下"
                @click="submitFeedback(m.id, 'good')"
              >👍</button>
              <button
                class="fb"
                :class="{ active: feedbackByMsg[m.id] === 'bad' }"
                :disabled="submittingFb === m.id"
                title="踩一下"
                @click="submitFeedback(m.id, 'bad')"
              >👎</button>
              <span v-if="feedbackByMsg[m.id]" class="fb-thanks">谢谢反馈</span>
            </div>
            <div v-if="reasonOpenFor === m.id" class="fb-reason">
              <input
                v-model="reasonText"
                placeholder="（可选）哪里不对？回答错了 / 价格不准 / 答非所问…"
                @keydown.enter.prevent="submitReason(m.id)"
              />
              <button @click="submitReason(m.id)">提交</button>
              <button class="skip" @click="reasonOpenFor = null">跳过</button>
            </div>

            <!-- 如果该 AI 消息附带报价单，渲染卡片 -->
            <div
              v-if="m.sender_type === 'ai' && ai.quotationByMessageId[m.id]"
              class="quote-card"
            >
              <header>
                <span>报价单</span>
                <span class="qno">{{ ai.quotationByMessageId[m.id].quotation_no }}</span>
              </header>
              <table>
                <tr v-for="i in ai.quotationByMessageId[m.id].items" :key="i.sku_id">
                  <td class="prod">
                    <div class="pname">{{ i.name }}</div>
                    <div class="mono">{{ i.sku_code }}</div>
                  </td>
                  <td class="num">¥{{ i.unit_price }}</td>
                  <td class="num">×{{ i.qty }}</td>
                  <td class="num bold">¥{{ i.total }}</td>
                </tr>
              </table>
              <footer>
                <div>
                  <strong>合计 ¥{{ ai.quotationByMessageId[m.id].total_amount }}</strong>
                  <span class="hint">7 天内有效</span>
                </div>
                <button
                  class="quote-cta"
                  :disabled="adding === ai.quotationByMessageId[m.id].id"
                  @click="addQuotationToCart(ai.quotationByMessageId[m.id].id)"
                >
                  {{ adding === ai.quotationByMessageId[m.id].id ? '处理中…' : '一键加入购物车' }}
                </button>
              </footer>
            </div>
          </article>

          <div v-if="ai.sending" class="thinking">AI 正在输入<span>...</span></div>
        </div>

        <footer class="input-bar">
          <textarea
            v-model="input"
            placeholder="描述您的需求…（Enter 发送 / Shift+Enter 换行）"
            rows="2"
            :disabled="ai.transferred"
            @keydown.enter.exact.prevent="onSend"
          ></textarea>
          <button
            class="send"
            :disabled="ai.sending || ai.transferred || !input.trim()"
            @click="onSend"
          >发送</button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  z-index: 90;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 420px;
  max-width: 100vw;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-hairline);
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.06);
}

.scrim-fade-enter-active, .scrim-fade-leave-active { transition: opacity 200ms; }
.scrim-fade-enter-from, .scrim-fade-leave-to { opacity: 0; }
.slide-in-enter-active, .slide-in-leave-active { transition: transform 240ms ease-out; }
.slide-in-enter-from, .slide-in-leave-to { transform: translateX(100%); }

header {
  padding: var(--space-base) var(--space-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-hairline-soft);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 15px;
  font-weight: 600;
}

.title .dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-success);
}

.title small {
  background: var(--color-surface-strong);
  color: var(--color-muted);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  margin-left: var(--space-xs);
}

.actions {
  display: flex;
  gap: var(--space-xs);
}

.icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--color-body);
}

.chips {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-primary-tint);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.chip {
  background: white;
  border: 1px solid var(--color-primary-disabled);
  color: var(--color-primary-active);
  font-size: 12px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

.chip em {
  font-style: normal;
  color: var(--color-muted);
  margin-right: 4px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-base) var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
}

.empty {
  color: var(--color-muted);
  font-size: 13px;
  margin: var(--space-sm) 0;
}

.prompts {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.prompts button {
  background: var(--color-surface-soft);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  font-size: 13px;
  color: var(--color-body);
  cursor: pointer;
}

.prompts button:hover { background: var(--color-primary-tint); border-color: var(--color-primary-disabled); }

.msg { display: flex; flex-direction: column; gap: var(--space-xs); }
.msg.user { align-items: flex-end; }
.msg.ai, .msg.human { align-items: flex-start; }

.bubble {
  max-width: 80%;
  padding: var(--space-sm) var(--space-base);
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg.user .bubble {
  background: var(--color-primary);
  color: white;
  border-bottom-right-radius: var(--radius-xs);
}

.msg.ai .bubble, .msg.human .bubble {
  background: var(--color-surface-soft);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline-soft);
  border-bottom-left-radius: var(--radius-xs);
}

.sources {
  margin-top: var(--space-xs);
  font-size: 11px;
  color: var(--color-muted);
  max-width: 80%;
  line-height: 1.5;
}

.src-label {
  margin-right: var(--space-xs);
}

.src-chip {
  color: var(--color-primary-active);
}

.quote-card {
  width: 100%;
  background: var(--color-canvas);
  border: 1px solid var(--color-primary-disabled);
  border-radius: var(--radius-md);
  margin-top: var(--space-sm);
  overflow: hidden;
}

.quote-card header {
  background: var(--color-primary-tint);
  padding: var(--space-sm) var(--space-base);
  border-bottom: 1px solid var(--color-hairline-soft);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}

.quote-card .qno {
  font-family: var(--font-mono);
  color: var(--color-muted);
  font-weight: 400;
}

.quote-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.quote-card td {
  padding: var(--space-sm) var(--space-base);
  border-bottom: 1px solid var(--color-hairline-soft);
}

.quote-card td:last-child { border-bottom: none; }

.quote-card .prod { width: 50%; }
.quote-card .pname { font-weight: 500; }
.quote-card .mono { font-family: var(--font-mono); font-size: 11px; color: var(--color-muted); margin-top: 2px; }
.quote-card .num { text-align: right; }
.quote-card .bold { color: var(--color-primary); font-weight: 600; }

.quote-card footer {
  padding: var(--space-sm) var(--space-base);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surface-soft);
}

.quote-card footer strong {
  color: var(--color-primary);
  font-size: 15px;
  margin-right: var(--space-xs);
}

.quote-card .hint {
  color: var(--color-muted);
  font-size: 11px;
}

.quote-cta {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.quote-cta:disabled { background: var(--color-primary-disabled); cursor: not-allowed; }
.quote-cta:hover:not(:disabled) { background: var(--color-primary-active); }

.thinking {
  font-size: 12px;
  color: var(--color-muted);
}

.thinking span {
  display: inline-block;
  animation: dots 1s infinite;
}

@keyframes dots {
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}

.input-bar {
  padding: var(--space-sm) var(--space-base);
  border-top: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
}

.input-bar textarea {
  flex: 1;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  font-size: 14px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
}

.input-bar textarea:focus { border-color: var(--color-primary); }

.send {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.send:disabled { background: var(--color-primary-disabled); cursor: not-allowed; }

/* iter-13 反馈条 */
.fb-bar { display: flex; gap: 6px; align-items: center; margin-top: 6px; padding-left: 4px; }
.fb {
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
}
.fb:hover { opacity: 1; }
.fb.active { opacity: 1; background: var(--color-surface-soft); border-color: var(--color-primary); }
.fb-thanks { font-size: 11px; color: var(--color-muted); }
.fb-reason {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding-left: 4px;
}
.fb-reason input {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--color-hairline);
  border-radius: 4px;
}
.fb-reason button {
  font-size: 12px;
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: white;
  border-radius: 4px;
  padding: 2px 10px;
  cursor: pointer;
}
.fb-reason button.skip {
  background: transparent;
  color: var(--color-muted);
  border-color: var(--color-hairline);
}
</style>
