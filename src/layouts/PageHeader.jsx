import { Fragment, useEffect } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'

/**
 * Encabezado de cada página: migas de pan a la izquierda y acciones a la derecha.
 * @param {{ breadcrumbs: { label: React.ReactNode, to?: string }[], actions?: React.ReactNode, children?: React.ReactNode, className?: string }} props
 */
export function PageHeader({ breadcrumbs = [], actions, children, className }) {
  const openSidebar = useLayoutStore((state) => state.setMobileSidebarOpen)

  // Título de la pestaña: de lo más específico a lo más general («Issues · Sitio web · TaskFlow»)
  const titleParts = breadcrumbs.map((crumb) => crumb.label).filter((label) => typeof label === 'string')
  const documentTitle = [...titleParts.reverse(), 'TaskFlow'].join(' · ')
  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])

  return (
    <header className={cn('flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 md:hidden"
        onClick={() => openSidebar(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </Button>
      <nav aria-label="Ruta" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          return (
            <Fragment key={index}>
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className="truncate text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn('truncate', isLast ? 'font-medium' : 'text-muted-foreground')}>
                  {crumb.label}
                </span>
              )}
            </Fragment>
          )
        })}
      </nav>
      {children}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Contenedor con scroll para el contenido de la página. */
export function PageBody({ className, children }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}
