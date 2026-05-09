import axios from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginInput, loginSchema } from '@crm/shared';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { login } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { account: '13800000001', password: 'Crm@2026' },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(values: LoginInput) {
    setError(null);
    try {
      const result = await login(values);
      setAuth(result);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError(
          '无法连接登录服务。请在项目根目录执行：pnpm docker:up，并单独启动后端 pnpm --filter @crm/api dev（默认 http://localhost:3001）。',
        );
        return;
      }
      const maybeError = err as { response?: { data?: { message?: string } } };
      setError(maybeError.response?.data?.message ?? '登录失败，请稍后重试');
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg-app)] px-6">
      <div className="w-full max-w-[420px] rounded-card border border-[var(--border-default)] bg-white p-8">
        <div className="mb-8">
          <div className="mb-4 grid h-9 w-9 place-items-center rounded-[7px] bg-[var(--action-primary)] text-sm font-bold text-white">C</div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-heading)]">登录 CRM</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">使用手机号或邮箱登录。连续输错 5 次后账号会锁定。</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">手机号或邮箱</span>
            <Input placeholder="13800000001" {...form.register('account')} />
            {form.formState.errors.account ? <span className="mt-1 block text-xs text-[var(--error)]">{form.formState.errors.account.message}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">密码</span>
            <Input type="password" placeholder="Crm@2026" {...form.register('password')} />
            {form.formState.errors.password ? <span className="mt-1 block text-xs text-[var(--error)]">{form.formState.errors.password.message}</span> : null}
          </label>

          {error ? <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div> : null}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '登录中...' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  );
}
