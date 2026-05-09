import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import type { AdminUser, Department, CreateUserInput, UpdateUserInput, UserRole } from '../api/admin.api';

interface Props {
  user?: AdminUser | null;
  departments: Department[];
  users: AdminUser[];
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ user, departments, users, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'sales');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '');
  const [managerId, setManagerId] = useState(user?.managerId ?? '');
  const [salesRegion, setSalesRegion] = useState(user?.salesRegion ?? '');
  const [salesIndustry, setSalesIndustry] = useState(user?.salesIndustry ?? '');
  const [salesGroup, setSalesGroup] = useState(user?.salesGroup ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = !user;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data: any = {
        name,
        role,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(managerId ? { managerId } : {}),
        salesRegion: salesRegion || null,
        salesIndustry: salesIndustry || null,
        salesGroup: salesGroup || null,
      };
      if (isCreate) data.password = password;
      else if (password) data.password = password;
      await onSubmit(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block col-span-2">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">姓名 *</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">手机号</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11位手机号" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">邮箱</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">角色 *</span>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full">
            <option value="sales">销售</option>
            <option value="manager">销售组长</option>
            <option value="director">销售总监</option>
            <option value="admin">管理员</option>
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
            {isCreate ? '初始密码 *' : '重置密码（留空不修改）'}
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={isCreate}
            minLength={6}
            placeholder="至少6位"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">所属部门</span>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full">
            <option value="">— 无 —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">直属上级</span>
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full">
            <option value="">— 无 —</option>
            {users.filter((u) => u.id !== user?.id).map((u) => (
              <option key={u.id} value={u.id}>{u.name}（{{ admin: '管理员', director: '总监', manager: '组长', sales: '销售' }[u.role] ?? u.role}）</option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">负责地区</span>
          <Input value={salesRegion} onChange={(e) => setSalesRegion(e.target.value)} placeholder="如：华东、广东省…" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">负责行业</span>
          <Input value={salesIndustry} onChange={(e) => setSalesIndustry(e.target.value)} placeholder="如：制造业、金融…" />
        </label>

        <label className="block col-span-2">
          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">销售组</span>
          <Input value={salesGroup} onChange={(e) => setSalesGroup(e.target.value)} placeholder="如：A组、华南团队…" />
        </label>
      </div>

      {error && (
        <div className="rounded-[7px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>
          {loading ? '提交中...' : isCreate ? '创建用户' : '保存修改'}
        </Button>
      </div>
    </form>
  );
}
