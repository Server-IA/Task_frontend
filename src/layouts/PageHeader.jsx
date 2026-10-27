import { Fragment, useEffect } from 'react'
import { Link } from 'react-router'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'

/**
 * Encabezado de cada página como tarjeta: ruta en monoespaciada («equipo-diseno / web / tareas»),
 * título grande en Bricolage, descripción, acciones a la derecha y, debajo, `children` (pestañas, filtros…).
 * @param {{
 *   path?: { label: string, to?: string }[],
 *   title: React.ReactNode,
 *   titleAddon?: React.ReactNode,
 *   leading?: React.ReactNode,
 *   description?: React.ReactNode,
 *   documentTitle?: string[],
 *   actions?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function PageHeader({ path = [], title, titleAddon, leading, description, documentTitle, actions, children, className }) {
  const openSidebar = useLayoutStore((state) => state.setMobileSidebarOpen)

  // Título de la pestaña: de lo más específico a lo más general («Tareas · Sitio web · TaskFlow»)
  const tabTitle = [...(documentTitle ?? [typeof title === 'string' ? title : '']), 'TaskFlow'].filter(Boolean).join(' · ')
  useEffect(() => {
    document.title = tabTitle
  }, [tabTitle])

  return (
    <header className={cn('tf-panel shrink-0 px-5 py-4', className)}>
      <div className="flex flex-wrap items-end gap-3.5">
        {leading}
        <div className="min-w-0 flex-[1_1_320px]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 size-7 md:hidden"
              onClick={() => openSidebar(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-4" />
            </Button>
            {path.length > 0 && (
              <nav aria-label="Ruta" className="tf-path min-w-0 truncate">
                {path.map((crumb, index) => (
                  <Fragment key={index}>
                    {index > 0 && <span aria-hidden="true"> / </span>}
                    {crumb.to ? (
                      <Link to={crumb.to} className="hover:text-foreground hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </Fragment>
                ))}
              </nav>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="tf-title min-w-0 break-words">{title}</h1>
            {titleAddon}
          </div>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}

/** Contenedor con scroll para el contenido de la página. */
export function PageBody({ className, children }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}

