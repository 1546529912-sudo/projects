import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';
import type { SourceCategory } from '@/features/leads/api/sources.api';

export type { SourceCategory };
export { listSources } from '@/features/leads/api/sources.api';

export async function createSource(dto: {
  category: string;
  categoryLabel: string;
  name: string;
  label: string;
  sortOrder?: number;
}) {
  const res = await http.post<ApiResponse<{ id: string; category: string; name: string; label: string }>>('/sources', dto);
  return res.data.data;
}

export async function updateSource(id: string, dto: Partial<{ label: string; isActive: boolean; sortOrder: number }>) {
  const res = await http.patch<ApiResponse<{ id: string }>>(`/sources/${id}`, dto);
  return res.data.data;
}

export async function deleteSource(id: string) {
  const res = await http.delete<ApiResponse<{ ok: boolean }>>(`/sources/${id}`);
  return res.data.data;
}
