import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

function genTraceId() {
  return 'admin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function makeClient(): AxiosInstance {
  const instance = axios.create({ baseURL: '', timeout: 8000 });

  instance.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('admin_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    cfg.headers['X-Trace-Id'] = genTraceId();
    return cfg;
  });

  instance.interceptors.response.use(
    (res) => {
      if (res.data && typeof res.data === 'object' && 'code' in res.data) {
        if (res.data.code === 0) return res.data;
        return Promise.reject(res.data);
      }
      return res.data;
    },
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        const target = location.pathname.startsWith('/pda') ? '/pda/login' : '/login';
        if (location.pathname !== target) location.href = target;
      }
      return Promise.reject(err);
    }
  );

  return instance;
}

export const http = makeClient();

export const get = <T = any>(url: string, params?: Record<string, any>, cfg?: AxiosRequestConfig) =>
  http.get<any, T>(url, { ...cfg, params });

export const post = <T = any>(url: string, data?: any, cfg?: AxiosRequestConfig) =>
  http.post<any, T>(url, data, cfg);

export const put = <T = any>(url: string, data?: any, cfg?: AxiosRequestConfig) =>
  http.put<any, T>(url, data, cfg);

export const del = <T = any>(url: string, cfg?: AxiosRequestConfig) =>
  http.delete<any, T>(url, cfg);

export const upload = <T = any>(url: string, file: File, fieldName = 'file', cfg?: AxiosRequestConfig) => {
  const form = new FormData();
  form.append(fieldName, file);
  return http.post<any, T>(url, form, {
    ...cfg,
    headers: { ...(cfg?.headers || {}), 'Content-Type': 'multipart/form-data' },
  });
};

// iter-18 文件下载（带 Authorization header 的 CSV/Excel 流）
export async function downloadFile(url: string, params: Record<string, any> = {}): Promise<void> {
  const token = localStorage.getItem('admin_token') || '';
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  const res = await fetch(url + (qs ? '?' + qs : ''), {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) {
    let msg = '下载失败';
    try { const j = await res.json(); msg = j.msg || msg; } catch {}
    throw new Error(msg + ' (HTTP ' + res.status + ')');
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename="?([^";]+)"?/);
  const filename = m ? m[1] : 'export.csv';
  const a = document.createElement('a');
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
