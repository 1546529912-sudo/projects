import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { OpportunityForm } from './OpportunityForm';
import { refreshDashboardQueries } from '@/features/dashboard/lib/refresh-dashboard-queries';
import { listOpportunities } from '../api/opportunities.api';
import { displayOpportunityTitle } from '@/shared/lib/customer-display';

const STAGE_LABELS: Record<string, string> = {
  initial_contact: '初步接触',
  proposal: '方案提案',
  negotiation: '商务谈判',
  closed_won: '赢单',
  closed_lost: '输单',
};

interface OpportunityListProps {
  customerId: string;
}

export function OpportunityList({ customerId }: OpportunityListProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['opportunities', customerId],
    queryFn: () => listOpportunities(customerId),
  });

  function handleSuccess() {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['opportunities', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    refreshDashboardQueries(queryClient);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">
          商机 <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{items.length}</span>
        </h3>
        <Button variant="secondary" className="h-7 px-2.5 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />新建商机
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-muted)]">加载中...</div>
      ) : items.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-[var(--border-default)] py-6 text-center text-sm text-[var(--text-muted)]">
          暂无商机
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-[7px] border border-[var(--border-default)] p-3 transition hover:bg-[var(--bg-hover)]">
              <div>
                <Link to={`/opportunities/${o.id}`} className="text-sm font-medium text-[var(--text-heading)] hover:text-[var(--action-primary)] hover:underline">
                  {displayOpportunityTitle(o.title)}
                </Link>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {STAGE_LABELS[o.stage] ?? o.stage} · {o.owner?.name}
                  {o.expectedCloseDate && ` · 预计 ${new Date(o.expectedCloseDate).toLocaleDateString('zh-CN')}`}
                </div>
              </div>
              <div className="text-sm font-semibold text-[var(--text-heading)]">
                ¥{Number(o.amount).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="新建商机">
        <OpportunityForm customerId={customerId} onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
