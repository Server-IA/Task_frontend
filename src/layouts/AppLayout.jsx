import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { Sidebar } from './Sidebar'

/** Layout de la app con sesión: sidebar (drawer en móvil) + contenido. */
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
    <div className="flex h-full">
      <aside
        className={cn(
          'hidden shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Navegación principal</SheetDescription>
          <Sidebar collapsed={false} />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
