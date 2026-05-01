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
    <header
      className="flex items-center justify-between sticky top-0 z-10 flex-shrink-0"
      style={{
        padding: '0 28px',
        height: '52px',
        background: 'var(--bg)',
        borderBottom: '0.5px solid var(--line)',
      }}
    >
      <nav className="flex items-center gap-1" style={{ fontSize: '13px', color: 'var(--text3)', letterSpacing: '-0.1px' }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{crumb.label}</span>
            ) : (
              <a href={crumb.href ?? '#'} style={{ color: 'var(--text3)' }}>{crumb.label}</a>
            )}
          </span>
        ))}
      </nav>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </header>
  )
}
