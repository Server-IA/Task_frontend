import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { CommandPalette } from '@/features/search/CommandPalette'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { Sidebar } from './Sidebar'

/** Layout de la app con sesión: sidebar (drawer en móvil) + contenido, y la paleta de comandos (Ctrl/⌘ K). */
export function AppLayout() {
  const collapsed = usePreferencesStore((state) => state.sidebarCollapsed)
  const mobileOpen = useLayoutStore((state) => state.mobileSidebarOpen)
  const setMobileOpen = useLayoutStore((state) => state.setMobileSidebarOpen)
  const location = useLocation()

  // Al navegar en móvil se cierra el drawer
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  return (
    <div className="tf-fade flex h-full gap-3.5 bg-background p-2 sm:p-3.5">
      <aside
        className={cn(
          'hidden shrink-0 overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:block',
          collapsed ? 'w-16' : 'w-62',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-none bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">{t('Menú')}</SheetTitle>
          <SheetDescription className="sr-only">{t('Navegación principal')}</SheetDescription>
          <Sidebar collapsed={false} />
        </SheetContent>
      </Sheet>

      <main tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        <OfflineBanner />
        {/* Cada página entra con una transición corta (la clave es la ruta, sin los parámetros de búsqueda) */}
        <div key={location.pathname} className="tf-enter flex min-h-0 flex-1 flex-col gap-3.5">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
    </div>
  )
}
