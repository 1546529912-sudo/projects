import { useState, useEffect, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { createCustomer } from '../api/customers.api';
import { listSources } from '@/features/leads/api/sources.api';
import type { SourceCategory } from '@/features/leads/api/sources.api';
import type { CreateCustomerInput } from '../api/customers.api';
import { getSystemConfig, listCustomFields, listRequiredFieldRules, type CustomFieldDef, type RequiredFieldRule } from '@/features/settings/api/admin.api';
import { useAuthStore } from '@/features/auth/store/auth.store';

const DEFAULT_INDUSTRIES = ['制造业', '零售', '金融', '医疗', '教育', '房地产', '互联网', '政府', '物流', '其他'];
const DEFAULT_COMPANY_SIZES = ['1-50人', '51-200人', '201-1000人', '1000人以上', '上市公司'];
const DEFAULT_REGIONS = ['华东', '华南', '华北', '华中', '西南', '西北', '东北', '港澳台', '海外'];

interface CustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({ onSuccess, onCancel }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCustomerInput>({
    name: '',
    companyName: '',
    primaryContactName: '',
    primaryPhone: '',
    primaryEmail: '',
    level: 'C',
    sourceCategory: '',
    sourceDetail: '',
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: sourceCategoriesData } = useQuery<SourceCategory[]>({
    queryKey: ['sources'],
    queryFn: listSources,
    staleTime: 5 * 60 * 1000,
  });
  const sourceCategories: SourceCategory[] = sourceCategoriesData ?? [];

  const { data: industriesConfig } = useQuery({ queryKey: ['system-config', 'industry_types'], queryFn: () => getSystemConfig('industry_types'), staleTime: 5 * 60 * 1000 });
  const { data: sizesConfig } = useQuery({ queryKey: ['system-config', 'company_sizes'], queryFn: () => getSystemConfig('company_sizes'), staleTime: 5 * 60 * 1000 });
  const { data: regionsConfig } = useQuery({ queryKey: ['system-config', 'regions'], queryFn: () => getSystemConfig('regions'), staleTime: 5 * 60 * 1000 });

  const industries: string[] = (industriesConfig?.value as string[] | null) ?? DEFAULT_INDUSTRIES;
  const companySizes: string[] = (sizesConfig?.value as string[] | null) ?? DEFAULT_COMPANY_SIZES;
  const regions: string[] = (regionsConfig?.value as string[] | null) ?? DEFAULT_REGIONS;

  const { data: customFieldDefs = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields', 'customer'],
    queryFn: () => listCustomFields('customer'),
    staleTime: 5 * 60 * 1000,
  });
  const activeCustomFields = customFieldDefs.filter((f) => f.isActive);

  function evaluateCondition(f: (typeof activeCustomFields)[0]): boolean {
    if (!f.conditionLogic) return true;
    const { operator, rules } = f.conditionLogic;
    const results = rules.map((r) => {
      const actual = String((form as any)[r.field] ?? customFieldValues[r.field] ?? '').toLowerCase();
      const expected = Array.isArray(r.value) ? r.value.map((v) => v.toLowerCase()) : String(r.value).toLowerCase();
      switch (r.op) {
        case 'eq': return actual === expected;
        case 'neq': return actual !== expected;
        case 'contains': return actual.includes(expected as string);
        case 'in': return (expected as string[]).includes(actual);
        default: return true;
      }
    });
    return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  // Initialize defaults for newly loaded custom fields
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const { user: actor } = useAuthStore();
  const { data: requiredRules = [] } = useQuery<RequiredFieldRule[]>({
    queryKey: ['required-field-rules', 'customer'],
    queryFn: () => listRequiredFieldRules('customer'),
    staleTime: 5 * 60 * 1000,
  });

  function isFieldRequired(fieldKey: string): boolean {
    return requiredRules.some((r) => {
      if (!r.isActive || r.fieldKey !== fieldKey) return false;
      if (r.ruleType === 'global') return true;
      if (r.ruleType === 'role' && r.roleValue === actor?.role) return true;
      return false;
    });
  }

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (defaultsApplied || activeCustomFields.length === 0) return;
    const defaults: Record<string, any> = {};
    for (const f of activeCustomFields) {
      if (f.defaultValue != null && f.defaultValue !== '') defaults[f.fieldKey] = f.defaultValue;
    }
    if (Object.keys(defaults).length > 0) {
      setCustomFieldValues((prev) => ({ ...defaults, ...prev }));
    }
    setDefaultsApplied(true);
  }, [activeCustomFields, defaultsApplied]);

  const subcategories = sourceCategories.find((c) => c.category === selectedCategory)?.items ?? [];

  function set(key: keyof CreateCustomerInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    set('sourceCategory', category);
    set('sourceDetail', '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('客户名称必填'); return; }
    // Dynamic required field validation
    const FORM_KEYS: Record<string, string> = {
      primaryPhone: '手机号', primaryEmail: '邮箱', primaryContactName: '联系人',
      companyName: '公司名称', region: '地区', industry: '行业', sourceCategory: '来源',
    };
    for (const [key, label] of Object.entries(FORM_KEYS)) {
      if (isFieldRequired(key) && !String((form as any)[key] ?? '').trim()) {
        setError(`${label}为必填项（必填规则配置）`);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      await createCustomer({
        ...form,
        name: form.name.trim(),
        companyName: form.companyName?.trim() || undefined,
        primaryContactName: form.primaryContactName?.trim() || undefined,
        primaryPhone: form.primaryPhone?.trim() || undefined,
        primaryEmail: form.primaryEmail?.trim() || undefined,
        sourceCategory: form.sourceCategory?.trim() || undefined,
        sourceDetail: form.sourceDetail?.trim() || undefined,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">客户名称 *</span>
        <Input value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => set('name', e.target.value)} placeholder="请输入客户名称" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">公司名称</span>
          <Input value={form.companyName} onChange={(e: ChangeEvent<HTMLInputElement>) => set('companyName', e.target.value)} placeholder="公司名称" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">联系人</span>
          <Input value={form.primaryContactName} onChange={(e: ChangeEvent<HTMLInputElement>) => set('primaryContactName', e.target.value)} placeholder="联系人姓名" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">手机号</span>
          <Input value={form.primaryPhone} onChange={(e: ChangeEvent<HTMLInputElement>) => set('primaryPhone', e.target.value)} placeholder="13800000000" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">邮箱</span>
          <Input value={form.primaryEmail} onChange={(e: ChangeEvent<HTMLInputElement>) => set('primaryEmail', e.target.value)} placeholder="email@example.com" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">客户级别</span>
          <Select value={form.level} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('level', e.target.value as any)}>
            <option value="A">A 级</option>
            <option value="B">B 级</option>
            <option value="C">C 级</option>
            <option value="D">D 级</option>
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">来源大类</span>
          <Select value={selectedCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleCategoryChange(e.target.value)}>
            <option value="">请选择</option>
            {sourceCategories.map((c) => (
              <option key={c.category} value={c.category}>{c.categoryLabel}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">来源小类</span>
          <Select
            value={form.sourceDetail}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => set('sourceDetail', e.target.value)}
            disabled={!selectedCategory || subcategories.length === 0}
          >
            <option value="">请选择</option>
            {subcategories.map((item: { name: string; label: string }) => (
              <option key={item.name} value={item.name}>{item.label}</option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">行业</span>
          <Select value={form.industry ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('industry', e.target.value)}>
            <option value="">请选择</option>
            {industries.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">规模</span>
          <Select value={form.companySize ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('companySize', e.target.value)}>
            <option value="">请选择</option>
            {companySizes.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-heading)]">地区</span>
          <Select value={form.region ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('region', e.target.value)}>
            <option value="">请选择</option>
            {regions.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </label>
      </div>

      {activeCustomFields.length > 0 && (
        <div className="space-y-3 border-t border-[var(--border-default)] pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">自定义字段</div>
          {activeCustomFields.filter((f) => evaluateCondition(f)).map((f) => (
            <label key={f.fieldKey} className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                {f.label}{f.required && <span className="ml-0.5 text-red-500">*</span>}
              </span>
              {f.fieldType === 'autonumber' ? (
                <div className="flex h-9 items-center rounded-[7px] border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 text-sm text-[var(--text-muted)] italic">
                  保存时自动生成（{f.options ?? '{seq:4}'}）
                </div>
              ) : f.fieldType === 'select' ? (
                <Select
                  value={customFieldValues[f.fieldKey] ?? ''}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCustomFieldValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                  className="w-full"
                >
                  <option value="">— 请选择 —</option>
                  {(f.options ?? '').split(',').filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : f.fieldType === 'boolean' ? (
                <div className="flex gap-3">
                  {['是', '否'].map((v) => (
                    <label key={v} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name={`cf_${f.fieldKey}`} value={v} checked={customFieldValues[f.fieldKey] === v} onChange={() => setCustomFieldValues((p) => ({ ...p, [f.fieldKey]: v }))} />
                      {v}
                    </label>
                  ))}
                </div>
              ) : f.fieldType === 'textarea' ? (
                <textarea
                  value={customFieldValues[f.fieldKey] ?? ''}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCustomFieldValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                  rows={3}
                  required={f.required}
                  className="w-full resize-none rounded-[7px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                />
              ) : f.fieldType === 'address' ? (() => {
                const addr = customFieldValues[f.fieldKey] ?? {};
                const setAddr = (k: string, v: string) => setCustomFieldValues((p) => ({ ...p, [f.fieldKey]: { ...(p[f.fieldKey] ?? {}), [k]: v } }));
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={addr.province ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddr('province', e.target.value)} placeholder="省/直辖市" />
                      <Input value={addr.city ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddr('city', e.target.value)} placeholder="城市" />
                      <Input value={addr.district ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddr('district', e.target.value)} placeholder="区/县" />
                    </div>
                    <Input value={addr.detail ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddr('detail', e.target.value)} placeholder="详细地址" />
                  </div>
                );
              })() : (
                <Input
                  type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                  value={customFieldValues[f.fieldKey] ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomFieldValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                  required={f.required}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-[7px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-[var(--error)]">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>{loading ? '创建中...' : '创建客户'}</Button>
      </div>
    </form>
  );
}
