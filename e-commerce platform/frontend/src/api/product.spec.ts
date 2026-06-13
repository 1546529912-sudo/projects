import { describe, it, expect, vi, beforeEach } from 'vitest'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('./http', () => ({
  default: httpMock,
}))

import {
  listProducts,
  recommended,
  productDetail,
  adminCreateProduct,
  adminToggleProduct,
} from './product'

beforeEach(() => {
  httpMock.get.mockReset()
  httpMock.post.mockReset()
  httpMock.put.mockReset()
})

describe('product api', () => {
  it('listProducts forwards params to /products', async () => {
    httpMock.get.mockResolvedValue({ code: 0, data: { items: [], total: 0, page: 1, per_page: 12 } })
    await listProducts({ keyword: 'T700', sort: 'price', order: 'asc' })
    expect(httpMock.get).toHaveBeenCalledWith('/products', {
      params: { keyword: 'T700', sort: 'price', order: 'asc' },
    })
  })

  it('recommended hits /products/recommended', async () => {
    httpMock.get.mockResolvedValue({ code: 0, data: { items: [] } })
    await recommended()
    expect(httpMock.get).toHaveBeenCalledWith('/products/recommended')
  })

  it('productDetail builds correct URL', async () => {
    httpMock.get.mockResolvedValue({ code: 0, data: {} })
    await productDetail(42)
    expect(httpMock.get).toHaveBeenCalledWith('/products/42')
  })

  it('adminCreateProduct POSTs to /admin/products with payload', async () => {
    httpMock.post.mockResolvedValue({ code: 0, data: { product: {} } })
    await adminCreateProduct({
      category_id: 1,
      name: 'X',
      model: 'X-001',
      base_price: 100,
      stock: 10,
    })
    expect(httpMock.post).toHaveBeenCalledWith('/admin/products', expect.objectContaining({
      category_id: 1, name: 'X', model: 'X-001', base_price: 100, stock: 10,
    }))
  })

  it('adminToggleProduct POSTs to /admin/products/:id/toggle', async () => {
    httpMock.post.mockResolvedValue({ code: 0, data: { id: 7, status: 'inactive' } })
    await adminToggleProduct(7)
    expect(httpMock.post).toHaveBeenCalledWith('/admin/products/7/toggle')
  })
})
