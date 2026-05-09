import { AlertTriangle } from 'lucide-react';
import type { DuplicateWarning } from '../api/leads.api';
import { displayCustomerName } from '@/shared/lib/customer-display';

const MATCH_LABELS: Record<string, string> = {
  phone: '手机号',
  email: '邮箱',
  company_contact: '公司+联系人',
};

interface DuplicateWarningProps {
  warnings: DuplicateWarning[];
}

export function DuplicateWarningPanel({ warnings }: DuplicateWarningProps) {
  if (!warnings.length) return null;

  return (
    <div className="rounded-[7px] border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        发现疑似重复（{warnings.length} 条）
      </div>
      <div className="space-y-1.5">
        {warnings.map((w, i) => (
          <div key={i} className="text-xs text-amber-700">
            <span className="font-medium">{displayCustomerName(w.name)}</span>
            <span className="ml-1 text-amber-600">
              ({w.type === 'lead' ? '线索' : '客户'} · {MATCH_LABELS[w.matchType]} 重复 · {w.isOwn ? '你的' : '他人的'})
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-amber-600">可继续提交，该线索将标记为「疑似重复」待处理。</p>
    </div>
  );
}
