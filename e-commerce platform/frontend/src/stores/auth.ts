import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import type { AuthUser } from '@/api/auth'

const TOKEN_KEY = 'access_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isEnterprise = computed(() => user.value?.role === 'enterprise')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const companyStatus = computed(() => user.value?.company?.status ?? null)

  function setToken(t: string | null) {
    token.value = t
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  }

  async function login(phone: string, password?: string, code?: string) {
    loading.value = true
    try {
      const res = await authApi.login({ phone, password, code })
      setToken(res.data.access_token)
      user.value = res.data.user
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function register(phone: string, code: string, password?: string) {
    loading.value = true
    try {
      const res = await authApi.register({ phone, code, password })
      setToken(res.data.access_token)
      user.value = res.data.user
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function wechatLogin(code: string, mockOpenid?: string) {
    loading.value = true
    try {
      const res = await authApi.wechatCallback(code, mockOpenid)
      setToken(res.data.access_token)
      user.value = res.data.user
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const res = await authApi.fetchMe()
      user.value = res.data
      return res.data
    } catch {
      setToken(null)
      user.value = null
      return null
    }
  }

  async function logout() {
    try {
      if (token.value) await authApi.logout()
    } catch {
      // 即使后端调用失败也清本地
    } finally {
      setToken(null)
      user.value = null
    }
  }

  async function switchRole(role: 'individual' | 'enterprise') {
    await authApi.switchRole(role)
    if (user.value) user.value.active_role = role
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    isEnterprise,
    isAdmin,
    companyStatus,
    login,
    register,
    wechatLogin,
    fetchMe,
    logout,
    switchRole,
  }
})
