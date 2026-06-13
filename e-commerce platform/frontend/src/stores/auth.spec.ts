import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/auth', () => ({
  login: vi.fn().mockResolvedValue({
    code: 0,
    data: {
      user: { id: 1, phone: '138****8000', role: 'individual', active_role: 'individual' },
      access_token: 'fake-token',
      expires_in: 7200,
    },
  }),
  register: vi.fn().mockResolvedValue({
    code: 0,
    data: {
      user: { id: 2, phone: '138****8001', role: 'individual', active_role: 'individual' },
      access_token: 'register-token',
      expires_in: 7200,
    },
  }),
  fetchMe: vi.fn().mockResolvedValue({
    code: 0,
    data: { id: 1, phone: '138****8000', role: 'enterprise', active_role: 'enterprise' },
  }),
  logout: vi.fn().mockResolvedValue({ code: 0 }),
  switchRole: vi.fn().mockResolvedValue({ code: 0, data: { active_role: 'individual' } }),
  wechatCallback: vi.fn(),
}))

import { useAuthStore } from './auth'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('auth store', () => {
  it('initially is not logged in', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('login sets token + user and persists token to localStorage', async () => {
    const auth = useAuthStore()
    await auth.login('13800138000', 'password123')

    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('fake-token')
    expect(localStorage.getItem('access_token')).toBe('fake-token')
    expect(auth.user?.id).toBe(1)
  })

  it('register sets state similarly', async () => {
    const auth = useAuthStore()
    await auth.register('13800138001', '123456')
    expect(auth.token).toBe('register-token')
  })

  it('fetchMe replaces user info (e.g. role upgrade to enterprise)', async () => {
    const auth = useAuthStore()
    await auth.login('13800138000', 'password123')
    expect(auth.user?.role).toBe('individual')
    await auth.fetchMe()
    expect(auth.user?.role).toBe('enterprise')
    expect(auth.isEnterprise).toBe(true)
  })

  it('switchRole updates active_role locally', async () => {
    const auth = useAuthStore()
    await auth.login('13800138000', 'password123')
    auth.user!.role = 'enterprise'
    await auth.switchRole('individual')
    expect(auth.user?.active_role).toBe('individual')
  })

  it('logout clears state and removes token from localStorage', async () => {
    const auth = useAuthStore()
    await auth.login('13800138000', 'password123')
    expect(localStorage.getItem('access_token')).toBe('fake-token')
    await auth.logout()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
