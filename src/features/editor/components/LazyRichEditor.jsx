import { lazy, Suspense, useEffect } from 'react'
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
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div className={props.className}>
            <MarkdownView
              markdown={props.value}
              size={props.size}
              className={cn(props.contentClassName, !props.value && 'text-muted-foreground')}
            />
          </div>
        )
      }
    >
      <RichEditor {...props} />
    </Suspense>
  )
}
