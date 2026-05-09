import { useAuthStore } from '@/features/auth/store/auth.store';
import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface QuotationItem {
  id: string;
  productId: string | null;
  name: string;
  unit: string | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  lineTotal: string;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  quoteNo: string;
  opportunityId: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string | null;
  totalAmount: string;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  items: QuotationItem[];
}

export interface Product {
  id: string;
  name: string;
  code: string | null;
  unit: string | null;
  unitPrice: string;
  minPrice: string | null;
  isActive: boolean;
}

export interface CreateQuotationInput {
  validUntil?: string;
  notes?: string;
  items: Array<{
    productId?: string;
    name: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
}

export async function listQuotations(opportunityId: string) {
  const res = await http.get<ApiResponse<Quotation[]>>(`/opportunities/${opportunityId}/quotations`);
  return res.data.data;
}

export async function createQuotation(opportunityId: string, input: CreateQuotationInput) {
  const res = await http.post<ApiResponse<Quotation>>(`/opportunities/${opportunityId}/quotations`, input);
  return res.data.data;
}

export async function updateQuotationStatus(id: string, status: string) {
  const res = await http.patch<ApiResponse<Quotation>>(`/quotations/${id}`, { status });
  return res.data.data;
}

export async function listProducts() {
  const res = await http.get<ApiResponse<Product[]>>('/products');
  return res.data.data;
}

export async function createProduct(input: { name: string; code?: string; unit?: string; unitPrice: number }) {
  const res = await http.post<ApiResponse<Product>>('/products', input);
  return res.data.data;
}

export async function updateProduct(id: string, input: { name?: string; code?: string; unit?: string; unitPrice?: number; minPrice?: number; isActive?: boolean }) {
  const res = await http.patch<ApiResponse<Product>>(`/products/${id}`, input);
  return res.data.data;
}

// ── Quotation Approvals ──────────────────────────────────────────────────────

export interface QuotationApprovalItem {
  id: string;
  status: string;
  createdAt: string;
  quotation: {
    id: string;
    quoteNo: string;
    totalAmount: string;
    opportunity: { id: string; title: string } | null;
    customer: { id: string; name: string } | null;
    createdBy: { id: string; name: string } | null;
  };
}

export async function listQuotationApprovals(): Promise<QuotationApprovalItem[]> {
  const res = await http.get<ApiResponse<QuotationApprovalItem[]>>('/quotation-approvals');
  const list = res.data.data;
  return Array.isArray(list) ? list : [];
}

export async function reviewQuotationApproval(id: string, approved: boolean, reviewNote?: string) {
  const res = await http.post<ApiResponse<{ ok: boolean; approved: boolean }>>(
    `/quotation-approvals/${id}/review`,
    { approved, reviewNote },
  );
  return res.data.data;
}

export function openQuotationPrint(id: string) {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
  const url = `${base}/quotations/${id}/print`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write('<p>加载报价单中…</p>');
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.text())
    .then((html) => {
      w.document.open();
      w.document.write(html);
      w.document.close();
    })
    .catch(() => w.close());
}
