<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SmsCodeButton from '@/components/SmsCodeButton.vue'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  phone: '',
  code: '',
  password: '',
  agree: false,
})
const error = ref('')
const success = ref('')

async function submit() {
  error.value = ''
  success.value = ''
  if (!form.agree) {
    error.value = '请勾选并同意服务协议'
    return
  }
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    error.value = '请输入正确的手机号'
    return
  }
  if (!/^\d{6}$/.test(form.code)) {
    error.value = '请输入 6 位验证码'
    return
  }
  if (form.password && form.password.length < 8) {
    error.value = '密码至少 8 位'
    return
  }
  try {
    await auth.register(form.phone, form.code, form.password || undefined)
    success.value = '注册成功，正在跳转…'
    setTimeout(() => router.push({ name: 'profile' }), 500)
  } catch (e: any) {
    error.value = e?.response?.data?.message || '注册失败，请重试'
  }
}
</script>

<template>
  <section class="auth-shell">
    <div class="auth-card">
      <h1>注册中研复材账号</h1>
      <p class="subtitle">仅需手机号即可完成注册</p>

      <label class="field">
        <span>手机号</span>
        <input v-model.trim="form.phone" maxlength="11" placeholder="138 0000 0000" />
      </label>

      <label class="field">
        <span>验证码</span>
        <div class="combo">
          <input v-model.trim="form.code" maxlength="6" placeholder="6 位验证码" />
          <SmsCodeButton :phone="form.phone" @error="(m) => (error = m)" />
        </div>
      </label>

      <label class="field">
        <span>密码（选填）</span>
        <input
          v-model="form.password"
          type="password"
          placeholder="≥8 位；不填则后续仅支持验证码登录"
        />
      </label>

      <label class="agree">
        <input v-model="form.agree" type="checkbox" />
        <span>已阅读并同意《服务协议》《隐私政策》</span>
      </label>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <button class="primary" :disabled="auth.loading" @click="submit">
        {{ auth.loading ? '提交中…' : '注 册' }}
      </button>

      <div class="footer">
        已有账号？<router-link to="/login">去登录</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-shell {
  min-height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-section) var(--space-base);
  background: var(--color-surface-soft);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-xxl);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.subtitle {
  color: var(--color-muted);
  margin: var(--space-xs) 0 var(--space-lg);
  font-size: 14px;
}

.field {
  display: block;
  margin-bottom: var(--space-base);
}

.field > span {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: var(--space-xs);
}

.field input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-ink);
  background: var(--color-canvas);
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border: 2px solid var(--color-ink);
  padding: 0 13px;
}

.combo {
  display: flex;
  gap: var(--space-sm);
}

.combo input {
  flex: 1;
}

.agree {
  display: flex;
  gap: var(--space-sm);
  font-size: 13px;
  color: var(--color-muted);
  margin: var(--space-base) 0;
  align-items: center;
}

.error {
  color: var(--color-error);
  font-size: 13px;
  margin: var(--space-xs) 0;
}

.success {
  color: var(--color-success);
  font-size: 13px;
  margin: var(--space-xs) 0;
}

.primary {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: var(--space-sm);
}

.primary:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.primary:not(:disabled):hover {
  background: var(--color-primary-active);
}

.footer {
  text-align: center;
  margin-top: var(--space-lg);
  font-size: 13px;
  color: var(--color-muted);
}

.footer a {
  color: var(--color-primary);
  font-weight: 500;
}
</style>
