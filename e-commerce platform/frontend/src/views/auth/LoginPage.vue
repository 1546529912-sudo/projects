<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SmsCodeButton from '@/components/SmsCodeButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'password' | 'sms' | 'wechat'>('password')

const form = reactive({
  phone: '',
  password: '',
  code: '',
})
const error = ref('')

async function submit() {
  error.value = ''
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    error.value = '请输入正确的手机号'
    return
  }
  try {
    if (mode.value === 'password') {
      if (!form.password) {
        error.value = '请输入密码'
        return
      }
      await auth.login(form.phone, form.password)
    } else {
      if (!/^\d{6}$/.test(form.code)) {
        error.value = '请输入 6 位验证码'
        return
      }
      await auth.login(form.phone, undefined, form.code)
    }
    const redirect = (route.query.redirect as string) || '/profile'
    router.push(redirect)
  } catch (e: any) {
    error.value = e?.response?.data?.message || '登录失败，请检查账号'
  }
}

async function doWechatMock() {
  error.value = ''
  try {
    // Stub：本地无真实微信开放平台。点击直接走 mock_openid 通道
    const code = 'mock-code-' + Date.now()
    const mockOpenid = 'wx_mock_' + Math.random().toString(36).slice(2, 10)
    await auth.wechatLogin(code, mockOpenid)
    router.push('/profile')
  } catch (e: any) {
    error.value = e?.response?.data?.message || '微信登录失败'
  }
}
</script>

<template>
  <section class="auth-shell">
    <div class="auth-card">
      <h1>登录中研复材</h1>

      <div class="tabs">
        <button
          :class="{ active: mode === 'password' }"
          @click="mode = 'password'"
        >密码登录</button>
        <button
          :class="{ active: mode === 'sms' }"
          @click="mode = 'sms'"
        >验证码登录</button>
        <button
          :class="{ active: mode === 'wechat' }"
          @click="mode = 'wechat'"
        >微信登录</button>
      </div>

      <template v-if="mode !== 'wechat'">
        <label class="field">
          <span>手机号</span>
          <input v-model.trim="form.phone" maxlength="11" placeholder="138 0000 0000" />
        </label>

        <label v-if="mode === 'password'" class="field">
          <span>密码</span>
          <input v-model="form.password" type="password" placeholder="密码" />
        </label>

        <label v-else class="field">
          <span>验证码</span>
          <div class="combo">
            <input v-model.trim="form.code" maxlength="6" placeholder="6 位验证码" />
            <SmsCodeButton :phone="form.phone" @error="(m) => (error = m)" />
          </div>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="primary" :disabled="auth.loading" @click="submit">
          {{ auth.loading ? '登录中…' : '登 录' }}
        </button>
      </template>

      <template v-else>
        <p class="wechat-tip">真实接入需配置微信开放平台 AppID。当前为 Mock 通道（自动生成测试账号）。</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="wechat-btn" :disabled="auth.loading" @click="doWechatMock">
          模拟微信授权
        </button>
      </template>

      <div class="footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
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
  margin: 0 0 var(--space-lg);
}

.tabs {
  display: flex;
  gap: var(--space-base);
  border-bottom: 1px solid var(--color-hairline-soft);
  margin-bottom: var(--space-lg);
}

.tabs button {
  background: transparent;
  border: none;
  padding: var(--space-sm) var(--space-xs);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tabs button.active {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
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

.error {
  color: var(--color-error);
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

.wechat-tip {
  color: var(--color-muted);
  font-size: 13px;
  margin-bottom: var(--space-base);
  padding: var(--space-md);
  background: var(--color-surface-soft);
  border-radius: var(--radius-sm);
}

.wechat-btn {
  width: 100%;
  height: 48px;
  background: #07c160;
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.wechat-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
