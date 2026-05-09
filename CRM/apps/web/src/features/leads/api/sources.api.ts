import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface SourceItem {
  id: string;
  name: string;
  label: string;
}

export interface SourceCategory {
  category: string;
  categoryLabel: string;
  items: SourceItem[];
}

export async function listSources(): Promise<SourceCategory[]> {
  const res = await http.get<ApiResponse<SourceCategory[]>>('/sources');
  const list = res.data.data;
  return Array.isArray(list) ? list : [];
}
