import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const cartApi = vi.hoisted(() => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  selectAllItems: vi.fn(),
  clearInvalidItems: vi.fn(),
}))

vi.mock('@/api/cart', () => cartApi)

import { useCartStore } from './cart'

const fakeView = (selectedQty = 0) => ({
  items: selectedQty > 0
    ? [{
        id: 1, sku_id: 10, product_id: 1, product_name: 'X', product_model: 'X-1',
        main_image_url: null, unit_price: '100.00', qty: selectedQty,
        selected: true, stock: 50, invalid: false, insufficient: false,
        subtotal: (100 * selectedQty).toFixed(2),
      }]
    : [],
  totals: {
    item_count: selectedQty > 0 ? 1 : 0,
    selected_count: selectedQty > 0 ? 1 : 0,
    selected_qty: selectedQty,
    product_amount: (100 * selectedQty).toFixed(2),
    shipping_fee: selectedQty > 0 ? '10.00' : '0.00',
    total_amount: (selectedQty > 0 ? 100 * selectedQty + 10 : 0).toFixed(2),
  },
})

beforeEach(() => {
  setActivePinia(createPinia())
  cartApi.getCart.mockResolvedValue({ code: 0, data: fakeView(0) })
  cartApi.addToCart.mockResolvedValue({ code: 0, data: fakeView(2) })
  cartApi.updateCartItem.mockResolvedValue({ code: 0, data: fakeView(5) })
  cartApi.removeCartItem.mockResolvedValue({ code: 0, data: fakeView(0) })
  cartApi.selectAllItems.mockResolvedValue({ code: 0, data: fakeView(2) })
  cartApi.clearInvalidItems.mockResolvedValue({ code: 0, data: fakeView(0) })
})

describe('cart store', () => {
  it('initially has 0 badge count', () => {
    const c = useCartStore()
    expect(c.badgeCount).toBe(0)
  })

  it('refresh fetches cart', async () => {
    const c = useCartStore()
    await c.refresh()
    expect(cartApi.getCart).toHaveBeenCalled()
  })

  it('add updates totals from response', async () => {
    const c = useCartStore()
    await c.add(10, 2)
    expect(c.totals.selected_qty).toBe(2)
    expect(c.badgeCount).toBe(1)
    expect(c.totals.total_amount).toBe('210.00')
  })

  it('updateQty calls api with qty', async () => {
    const c = useCartStore()
    await c.updateQty(1, 5)
    expect(cartApi.updateCartItem).toHaveBeenCalledWith(1, { qty: 5 })
    expect(c.totals.selected_qty).toBe(5)
  })

  it('remove clears state on empty response', async () => {
    const c = useCartStore()
    await c.add(10, 2)
    expect(c.badgeCount).toBe(1)
    await c.remove(1)
    expect(c.badgeCount).toBe(0)
  })

  it('reset clears items locally without API', () => {
    const c = useCartStore()
    c.totals.item_count = 5
    c.reset()
    expect(c.badgeCount).toBe(0)
  })
})
