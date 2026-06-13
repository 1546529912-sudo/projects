import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as cartApi from '@/api/cart'
import type { CartItem, CartTotals } from '@/api/cart'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const totals = ref<CartTotals>({
    item_count: 0,
    selected_count: 0,
    selected_qty: 0,
    product_amount: '0.00',
    shipping_fee: '0.00',
    total_amount: '0.00',
  })
  const loading = ref(false)
  const lastSyncAt = ref<number>(0)

  const badgeCount = computed(() => totals.value.item_count)

  function applyView(view: { items: CartItem[]; totals: CartTotals }) {
    items.value = view.items
    totals.value = view.totals
    lastSyncAt.value = Date.now()
  }

  async function refresh() {
    loading.value = true
    try {
      const res = await cartApi.getCart()
      applyView(res.data)
    } finally {
      loading.value = false
    }
  }

  async function add(sku_id: number, qty: number) {
    const res = await cartApi.addToCart(sku_id, qty)
    applyView(res.data)
  }

  async function updateQty(id: number, qty: number) {
    const res = await cartApi.updateCartItem(id, { qty })
    applyView(res.data)
  }

  async function toggleSelected(id: number, selected: boolean) {
    const res = await cartApi.updateCartItem(id, { selected })
    applyView(res.data)
  }

  async function selectAll(selected: boolean) {
    const res = await cartApi.selectAllItems(selected)
    applyView(res.data)
  }

  async function remove(id: number) {
    const res = await cartApi.removeCartItem(id)
    applyView(res.data)
  }

  async function clearInvalid() {
    const res = await cartApi.clearInvalidItems()
    applyView(res.data)
  }

  function reset() {
    items.value = []
    totals.value = {
      item_count: 0,
      selected_count: 0,
      selected_qty: 0,
      product_amount: '0.00',
      shipping_fee: '0.00',
      total_amount: '0.00',
    }
  }

  return {
    items,
    totals,
    loading,
    badgeCount,
    refresh,
    add,
    updateQty,
    toggleSelected,
    selectAll,
    remove,
    clearInvalid,
    reset,
  }
})
