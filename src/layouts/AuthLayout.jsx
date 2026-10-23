import { Link, Outlet } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'

/** Pantallas públicas: tarjeta centrada con el logo arriba. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-full flex-col bg-muted/40">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" aria-label="TaskFlow">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/** Encabezado común de las tarjetas de autenticación. */
export function AuthHeader({ title, description }) {
  return (
    <div className="mb-6 space-y-1.5 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
