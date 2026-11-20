interface Props {
  title?: string
  hint?: string
  action?: React.ReactNode
}

export function EmptyState({
  title = 'Nothing to see here',
  hint,
  action,
}: Props) {
  return (
    <div className="empty-state">
      <div className="empty-illustration" aria-hidden>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <rect x="10" y="18" width="52" height="40" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.35" />
          <path d="M22 34h28M22 42h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          <circle cx="52" cy="22" r="10" fill="var(--brand-soft)" />
          <path d="M48 22h8M52 18v8" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2>{title}</h2>
      {hint ? <p>{hint}</p> : null}
      {action}
    </div>
  )
}
