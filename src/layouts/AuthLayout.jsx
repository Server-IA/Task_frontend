import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { Logo, LogoMark } from '@/components/common/Logo'
import { SplashStage } from '@/components/common/Splash'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { t } from '@/i18n'
import { INTRO, markFirstScreen, markLoginIntroShown, peekIntro } from '@/lib/intro'
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
 * La entrada animada del login cuando es la primera pantalla al abrir la app (`lib/intro`):
 *  1. `wait`: una tapa del color del fondo con el logo de carga en el centro, mientras termina de dibujarse.
 *  2. `go`: el logo vuela hasta el del panel de marca, la tapa se desvanece y el contenido entra por partes (CSS).
 *  3. `done`: todo quieto, sin estilos de la entrada.
 * `landed` dice si el logo ya aterrizó: ahí se quita la tapa y se ve el logo de verdad.
 */
function useLoginIntro(enabled) {
  const [intro] = useState(() => (enabled ? peekIntro() : null))
  const [phase, setPhase] = useState(intro ? 'wait' : null)
  const [landed, setLanded] = useState(false)
  const markRef = useRef(null)
  const coverRef = useRef(null)
  const groundRef = useRef(null)
  const flyRef = useRef(null)

  useEffect(() => {
    markFirstScreen()
    markLoginIntroShown()
  }, [])

  useEffect(() => {
    if (!intro) return undefined
    const timer = setTimeout(() => setPhase('go'), Math.max(0, INTRO.draw - intro.elapsed) + INTRO.hold)
    return () => clearTimeout(timer)
  }, [intro])

  useLayoutEffect(() => {
    if (phase !== 'go') return undefined
    const settle = setTimeout(() => setPhase('done'), INTRO.settle)
    const land = () => setLanded(true)
    const fly = flyRef.current
    const target = markRef.current?.getBoundingClientRect()
    const animations = []
    if (fly && target && target.width > 0) {
      // El logo va de donde está (el centro) a donde lo espera el del panel; la tapa se va mientras tanto
      const from = fly.getBoundingClientRect()
      const dx = target.left + target.width / 2 - (from.left + from.width / 2)
      const dy = target.top + target.height / 2 - (from.top + from.height / 2)
      const timing = { duration: INTRO.fly, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
      animations.push(
        fly.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${target.width / from.width})` }], timing),
        groundRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out', fill: 'forwards' }),
      )
    } else if (coverRef.current) {
      // Sin panel de marca a la vista (ventana angosta): la tapa entera se desvanece
      animations.push(coverRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' }))
    }
    if (animations.length) animations[0].finished.then(land, () => {})
    else land()
    return () => {
      clearTimeout(settle)
      animations.forEach((animation) => animation.cancel())
    }
  }, [phase])

  const cover = phase && phase !== 'done' && !landed && (
    <div ref={coverRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      <div ref={groundRef} className="absolute inset-0 bg-background" />
      {/* Tras cerrar sesión no hay nada cargando: el logo espera en el centro sin la línea */}
      <SplashStage markRef={flyRef} line={phase === 'wait' && !intro.fromLogout} />
    </div>
  )
  return { phase, cover, markRef, markHidden: Boolean(phase) && !landed }
}

/**
 * Login y registro: panel de marca a la izquierda (logo, nombre y `panel`) y el formulario a la derecha.
 * En pantallas pequeñas el panel se oculta. Con `intro`, si es la primera pantalla al abrir la app entra animada
 * (`useLoginIntro`): lo que lleva `tf-intro-item` y los hijos del formulario aparecen por partes, en el orden de `--i`.
 */
export function SplitShell({ caption, panel, children, intro = false }) {
  const { phase, cover, markRef, markHidden } = useLoginIntro(intro)
  return (
    <div data-intro={phase ?? undefined} className="flex min-h-svh gap-3.5 p-2 sm:p-3.5">
      {cover}
      <aside className="tf-intro-aside hidden flex-[1_1_520px] flex-col rounded-[22px] bg-sidebar px-8 py-6.5 text-sidebar-foreground lg:flex">
        <p className="font-mono text-[11px] text-sidebar-muted">{t('~/acceso')}</p>
        <div className={cn('flex flex-1 flex-col items-center justify-center gap-9 py-7', !phase && 'tf-fade')}>
          <div className="flex flex-col items-center gap-4 text-center">
            <span ref={markRef} className={cn('block', markHidden && 'opacity-0')}>
              <LogoMark className="size-18" />
            </span>
            <div>
              <p className="tf-intro-item font-display text-[46px] leading-none font-extrabold tracking-[-0.03em]" style={{ '--i': 0 }}>
                TaskFlow
              </p>
              <p className="tf-intro-item mt-2.5 font-mono text-xs text-sidebar-muted" style={{ '--i': 1 }}>
                // {caption}
              </p>
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
        <div className="tf-intro-item absolute top-2 right-2 flex items-center gap-0.5" style={{ '--i': 0 }}>
          <LanguageToggle />
          <ThemeToggle />
        </div>
        {/* La clase no cambia al terminar la entrada: si pasara a `tf-enter`, el formulario volvería a animarse */}
        <div className={cn('flex w-full max-w-[400px] flex-col gap-5.5', phase ? 'tf-intro-list' : 'tf-enter')}>{children}</div>
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
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="tf-enter flex flex-1 flex-col items-center justify-center gap-4.5 py-8">{children}</main>
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
