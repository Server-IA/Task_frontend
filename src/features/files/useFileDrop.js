import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Si lo que se arrastra trae archivos (del escritorio), no texto ni un elemento de la página. */
export const dragHasFiles = (dataTransfer) => Boolean(dataTransfer && [...(dataTransfer.types ?? [])].includes('Files'))

/** Cuántos archivos se arrastran (el navegador lo dice antes de soltar en `items`; si no, `null`). */
export function draggedFileCount(dataTransfer) {
  const items = dataTransfer?.items
  if (!items) return null
  const count = [...items].filter((item) => item.kind === 'file').length
  return count || null
}

/** Si el puntero está sobre un texto en edición (descripción o comentario): ahí suelta el editor, no el panel. */
const isEditorTarget = (target) => Boolean(target?.closest?.('[contenteditable="true"]'))

const IDLE = { dragging: false, count: null, overEditor: false }

/**
 * Soltar archivos sobre un área (el panel o la página de la tarea): mientras se arrastran archivos encima,
 * `dragging` (para mostrar el velo); al soltarlos, `onFiles`.
 * `dragenter` y `dragleave` llegan por cada elemento hijo que se cruza: se cuentan y el velo se va cuando la cuenta
 * vuelve a 0. Los editores que manejan su propio soltar cortan el `drop` (stopPropagation) y el panel no lo ve: por eso
 * cualquier `drop` o `dragend` en la ventana también lo reinicia.
 * @param {{ onFiles: (files: File[]) => void }} options
 * @returns {{ dragging: boolean, count: number | null, overEditor: boolean,
 *             handlers: Record<'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop', (event: DragEvent) => void> }}
 */
export function useFileDrop({ onFiles }) {
  const depthRef = useRef(0)
  const onFilesRef = useRef(onFiles)
  const [state, setState] = useState(IDLE)

  useEffect(() => {
    onFilesRef.current = onFiles
  }, [onFiles])

  const reset = useCallback(() => {
    depthRef.current = 0
    setState(IDLE)
  }, [])

  useEffect(() => {
    if (!state.dragging) return undefined
    window.addEventListener('drop', reset, true)
    window.addEventListener('dragend', reset, true)
    return () => {
      window.removeEventListener('drop', reset, true)
      window.removeEventListener('dragend', reset, true)
    }
  }, [state.dragging, reset])

  const handlers = useMemo(
    () => ({
      onDragEnter(event) {
        if (!dragHasFiles(event.dataTransfer)) return
        event.preventDefault()
        depthRef.current += 1
        const overEditor = isEditorTarget(event.target)
        setState((current) =>
          current.dragging && current.overEditor === overEditor
            ? current
            : { dragging: true, count: current.dragging ? current.count : draggedFileCount(event.dataTransfer), overEditor },
        )
      },
      onDragOver(event) {
        if (!dragHasFiles(event.dataTransfer)) return
        // Sin esto el navegador no deja soltar (y abriría el archivo en la pestaña)
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        const overEditor = isEditorTarget(event.target)
        setState((current) => (current.overEditor === overEditor ? current : { ...current, overEditor }))
      },
      onDragLeave(event) {
        if (!dragHasFiles(event.dataTransfer)) return
        depthRef.current = Math.max(0, depthRef.current - 1)
        if (depthRef.current === 0) setState(IDLE)
      },
      onDrop(event) {
        if (!dragHasFiles(event.dataTransfer)) return
        event.preventDefault()
        depthRef.current = 0
        setState(IDLE)
        const files = [...(event.dataTransfer.files ?? [])]
        if (files.length) onFilesRef.current?.(files)
      },
    }),
    [],
  )

  return { ...state, handlers }
}
