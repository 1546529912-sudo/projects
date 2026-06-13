<script setup lang="ts">
import { ref } from 'vue'
import { sendSmsCode } from '@/api/auth'

const props = defineProps<{ phone: string }>()
const emit = defineEmits<{ sent: []; error: [string] }>()

const counting = ref(0)
const sending = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function startCountdown(sec = 60) {
  counting.value = sec
  timer = setInterval(() => {
    counting.value--
    if (counting.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function send() {
  if (!/^1[3-9]\d{9}$/.test(props.phone)) {
    emit('error', '请输入正确的手机号')
    return
  }
  sending.value = true
  try {
    await sendSmsCode(props.phone)
    startCountdown(60)
    emit('sent')
  } catch (e: any) {
    emit('error', e?.response?.data?.message || '验证码发送失败')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="sms-btn"
    :disabled="counting > 0 || sending"
    @click="send"
  >
    <span v-if="sending">发送中…</span>
    <span v-else-if="counting > 0">{{ counting }} 秒后重发</span>
    <span v-else>获取验证码</span>
  </button>
</template>

<style scoped>
.sms-btn {
  height: 48px;
  padding: 0 18px;
  background: var(--color-canvas);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.sms-btn:disabled {
  color: var(--color-muted-soft);
  border-color: var(--color-hairline);
  cursor: not-allowed;
}
</style>
