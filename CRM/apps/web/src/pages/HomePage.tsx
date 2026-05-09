import { useAuthStore } from '@/features/auth/store/auth.store';

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="rounded-card border border-[var(--border-default)] bg-white p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Slice 1</div>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-heading)]">工程脚手架与登录权限已就位</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        当前用户：{user?.name}。下一分片会实现客户列表、客户详情、新建客户、联系人和内联编辑。
      </p>
    </div>
  );
}
