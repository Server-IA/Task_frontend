import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { Logo, LogoMark } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { cn } from '@/lib/utils'

/** Pantallas públicas: cada página elige su marco (`SplitShell` o `CenteredShell`). */
export function AuthLayout() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <Outlet />
    </div>
  )
}

/**
 * Login y registro: panel de marca a la izquierda (logo, nombre y `panel`) y el formulario a la derecha.
 * En pantallas pequeñas el panel se oculta.
 */
export function SplitShell({ caption, panel, children }) {
  return (
    <div className="flex min-h-svh gap-3.5 p-2 sm:p-3.5">
      <aside className="hidden flex-[1_1_520px] flex-col rounded-[22px] bg-sidebar px-8 py-6.5 text-sidebar-foreground lg:flex">
        <p className="font-mono text-[11px] text-sidebar-muted">~/acceso</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-9 py-7">
          <div className="flex flex-col items-center gap-4 text-center">
            <LogoMark className="size-18" />
            <div>
              <p className="font-display text-[46px] leading-none font-extrabold tracking-[-0.03em]">TaskFlow</p>
              <p className="mt-2.5 font-mono text-xs text-sidebar-muted">// {caption}</p>
            </div>
          </div>
          {panel}
        </div>
        <p className="text-center font-mono text-[11px] text-sidebar-muted">© 2026 TaskFlow</p>
      </aside>
      <main className="relative flex flex-[1_1_480px] items-center justify-center px-4 py-16">
        <Link to="/" aria-label="TaskFlow" className="absolute top-3 left-3 lg:hidden">
          <Logo />
        </Link>
        <div className="absolute top-2 right-2">
          <ThemeToggle />
        </div>
        <div className="flex w-full max-w-[400px] flex-col gap-5.5">{children}</div>
      </main>
    </div>
  )
}

/** Resto de pantallas públicas: tarjeta centrada sobre un fondo punteado, con logo arriba y pie. */
export function CenteredShell({ meta, children, footer }) {
  return (
    <div
      className="flex min-h-svh flex-col bg-background px-5 py-6 sm:px-7"
      style={{ backgroundImage: 'radial-gradient(var(--dot) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" aria-label="TaskFlow">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {meta && <div className="font-mono text-xs text-muted-foreground">{meta}</div>}
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4.5 py-8">{children}</main>
      <footer className="flex flex-wrap justify-between gap-2.5 font-mono text-[11px] text-muted-foreground">
        <span>© 2026 TaskFlow</span>
        {footer}
      </footer>
    </div>
  )
}

/** Tarjeta de las pantallas centradas. */
export function AuthCard({ className, children, ...props }) {
  return (
    <section
      className={cn('flex w-full max-w-[480px] flex-col gap-5 rounded-[22px] border bg-card p-6 sm:p-7.5', className)}
      {...props}
    >
      {children}
    </section>
  )
}

/** Ruta en monoespaciada, título grande y descripción de las pantallas de acceso. */
export function AuthHeader({ path, title, description, size = 'lg' }) {
  useEffect(() => {
    document.title = `${title} · TaskFlow`
  }, [title])

  return (
    <div>
      {path && <p className="font-mono text-xs text-muted-foreground">{path}</p>}
      <h1
        className={cn(
          'mt-1.5 font-display leading-[1.05] font-extrabold tracking-[-0.02em]',
          size === 'lg' ? 'text-[38px]' : 'text-[34px]',
        )}
      >
        {title}
      </h1>
      {description && <div className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{description}</div>}
    </div>
  )
}

const ICON_TONES = {
  accent: 'bg-accent-soft text-accent-text',
  ok: 'bg-ok-soft text-ok',
  late: 'bg-late-soft text-late',
}

/** Ícono grande de 64 px para las pantallas de estado (correo, verificado, error). */
export function AuthIcon({ tone = 'accent', children }) {
  return (
    <span aria-hidden="true" className={cn('flex size-16 items-center justify-center rounded-[18px]', ICON_TONES[tone])}>
      {children}
    </span>
  )
}
