import { useEffect, useSyncExternalStore } from 'react'
import { usePreferencesStore } from '@/stores/preferencesStore'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function subscribeToSystemTheme(callback) {
  const query = darkQuery()
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

/** Tema elegido ('light' | 'dark' | 'system') y el que realmente se aplica ('light' | 'dark'). */
export function useTheme() {
  const theme = usePreferencesStore((state) => state.theme)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const systemIsDark = useSyncExternalStore(subscribeToSystemTheme, () => darkQuery().matches)
  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme
  return { theme, setTheme, resolvedTheme }
}

/** Mantiene la clase `dark` de <html> sincronizada con la preferencia. Se usa una vez en la raíz. */
export function useApplyTheme() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const root = document.documentElement
    if (root.classList.contains('dark') === (resolvedTheme === 'dark')) return
    // Se cambia el tema sin transiciones y se reactivan en el siguiente cuadro
    root.classList.add('tf-no-transitions')
    root.classList.toggle('dark', resolvedTheme === 'dark')
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('tf-no-transitions')))
    return () => {
      cancelAnimationFrame(frame)
      root.classList.remove('tf-no-transitions')
    }
  }, [resolvedTheme])
}
