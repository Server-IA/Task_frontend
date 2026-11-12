import { Component, lazy, Suspense, useEffect } from 'react'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { MarkdownView } from './MarkdownView'

/**
 * El editor (TipTap/ProseMirror) va en un archivo aparte que se descarga la primera vez que se usa, o antes, en
 * un momento libre del navegador (`usePreloadRichEditor`). Mientras llega se ve el mismo texto, sin saltos.
 */
const RichEditor = lazy(() => import('../editor/RichEditor'))

let loading = null
/** Empieza a descargar el editor (por ejemplo, al pasar el mouse por la descripción). */
export function preloadRichEditor() {
  loading ??= import('../editor/RichEditor').catch(() => {
    loading = null
  })
  return loading
}

/** Descarga el editor cuando el navegador está libre (al abrir una tarea). */
export function usePreloadRichEditor() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => preloadRichEditor(), { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(() => preloadRichEditor(), 1500)
    return () => clearTimeout(id)
  }, [])
}

/**
 * El editor cargado bajo demanda. Acepta las mismas props que RichEditor; `fallback` reemplaza lo que se ve
 * mientras carga (por defecto, el texto con el mismo formato).
 */
export function LazyRichEditor({ fallback, ...props }) {
  const text = fallback ?? (
    <div className={props.className}>
      <MarkdownView
        markdown={props.value}
        size={props.size}
        className={cn(props.contentClassName, !props.value && 'text-muted-foreground')}
      />
    </div>
  )
  return (
    <EditorLoadBoundary fallback={text}>
      <Suspense fallback={text}>
        <RichEditor {...props} />
      </Suspense>
    </EditorLoadBoundary>
  )
}

/**
 * Si el archivo del editor no llega (sin conexión, o una versión nueva publicada mientras la pestaña seguía abierta),
 * se ve el texto con un aviso en su lugar, en vez de que se caiga toda la página («Algo salió mal»). No hay
 * «Reintentar»: el navegador recuerda el import que falló y no lo vuelve a pedir; solo recargar lo trae.
 */
export class EditorLoadBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    const { fallback, children } = this.props
    if (!this.state.failed) return children
    return (
      <div className="flex flex-col gap-1.5">
        {fallback}
        <p role="alert" className="flex flex-wrap items-center gap-x-2 px-3 pb-1 text-xs text-late">
          {t('No se pudo cargar el editor. Revisa tu conexión y recarga la página.')}
          <button
            type="button"
            className="rounded-sm font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => window.location.reload()}
          >
            {t('Recargar')}
          </button>
        </p>
      </div>
    )
  }
}
