'use client'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function Topbar({ breadcrumbs, actions }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-7 py-4 bg-[var(--bg2)] sticky top-0 z-10" style={{ boxShadow: '0 1px 0 var(--line), 0 2px 12px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 text-[0.82rem] text-[var(--text3)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-40">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-[var(--text)] font-medium">{crumb.label}</span>
              ) : (
                <a
                  href={crumb.href ?? '#'}
                  className="text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>
      {actions && (
        <div className="flex items-center gap-[10px]">{actions}</div>
      )}
    </header>
  )
}
