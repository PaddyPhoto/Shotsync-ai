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
        padding: '14px 28px',
        background: 'rgba(245,245,247,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
      }}
    >
      <nav className="flex items-center gap-1" style={{ fontSize: '12px', color: '#aeaeb2', letterSpacing: '-0.1px' }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{crumb.label}</span>
            ) : (
              <a href={crumb.href ?? '#'} style={{ color: '#aeaeb2' }} className="hover:text-[#1d1d1f] transition-colors">
                {crumb.label}
              </a>
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
