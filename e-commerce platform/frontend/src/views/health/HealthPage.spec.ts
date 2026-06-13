import { describe, it, expect, vi } from 'vitest'
import { getHealth } from '@/api/health'

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      code: 0,
      message: 'ok',
      data: {
        service: 'zhongyan-platform-backend',
        version: '0.1.0',
        checks: {
          mysql: { ok: true },
          redis: { ok: true },
          ai_service: { ok: true },
        },
        timestamp: '2026-05-22T14:30:00+08:00',
      },
    }),
  },
}))

describe('Health API', () => {
  it('returns health payload', async () => {
    const res = await getHealth()
    expect(res.code).toBe(0)
    expect(res.data.checks.mysql.ok).toBe(true)
  })
})
