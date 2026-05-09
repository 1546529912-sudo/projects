export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-card border border-[var(--border-default)] bg-white p-8 text-center">
      <div className="text-sm font-medium text-[var(--text-heading)]">{title}</div>
      {description ? <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p> : null}
    </div>
  );
}
