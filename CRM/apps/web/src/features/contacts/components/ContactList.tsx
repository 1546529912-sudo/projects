import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, Star, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { listContacts, deleteContact } from '../api/contacts.api';
import { ContactForm } from './ContactForm';

interface ContactListProps {
  customerId: string;
  canEdit?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  decision_maker: '决策者',
  influencer: '影响者',
  user: '使用者',
  finance: '财务',
  unknown: '未知',
};

export function ContactList({ customerId, canEdit = true }: ContactListProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', customerId],
    queryFn: () => listContacts(customerId),
  });

  async function handleDelete(id: string) {
    if (!confirm('确认删除该联系人？')) return;
    await deleteContact(id);
    queryClient.invalidateQueries({ queryKey: ['contacts', customerId] });
  }

  function handleSuccess() {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['contacts', customerId] });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">联系人 <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{contacts.length}</span></h3>
        {canEdit && (
          <Button variant="secondary" className="h-7 px-2.5 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            添加
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-muted)]">加载中...</div>
      ) : contacts.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-[var(--border-default)] py-6 text-center text-sm text-[var(--text-muted)]">
          暂无联系人
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-[7px] border border-[var(--border-default)] p-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-heading)]">
                  {c.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[var(--text-heading)]">{c.name}</span>
                    {c.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    {c.decisionRole && (
                      <span className="rounded-[4px] bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                        {ROLE_LABELS[c.decisionRole] ?? c.decisionRole}
                      </span>
                    )}
                  </div>
                  {c.position && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{c.position}</div>}
                  <div className="mt-1 flex items-center gap-3">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-body)]">
                        <Phone className="h-3 w-3" />{c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-body)]">
                        <Mail className="h-3 w-3" />{c.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-[var(--text-muted)] transition hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="添加联系人">
        <ContactForm customerId={customerId} onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
