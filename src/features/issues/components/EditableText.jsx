import { useLayoutEffect, useRef, useState } from 'react'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { cn } from '@/lib/utils'

/**
 * Texto editable en el sitio (título y descripción del issue). Guarda al salir del campo;
 * Escape descarta los cambios. En modo `singleLine`, Enter también guarda.
 */
export function EditableText({ value, onSave, placeholder, singleLine = false, maxLength, className, disabled }) {
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef(null)
  // Escape descarta: el blur que sigue no debe guardar el borrador (el estado aún no se actualizó)
  const cancelled = useRef(false)

  // Si el valor cambia en el servidor (otra edición), se refleja aquí
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value ?? '')
  }

  // Ajusta la altura al contenido
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [draft])

  const discard = () => {
    cancelled.current = true
    setDraft(value ?? '')
    ref.current?.blur()
  }
  // Con cambios, Escape solo los descarta: no cierra también el panel o el diálogo de alrededor
  useLocalEscape(ref, discard, draft !== (value ?? ''))

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const next = singleLine ? draft.trim() : draft
    if (singleLine && !next) {
      setDraft(value ?? '')
      return
    }
    if (next !== (value ?? '')) onSave(next)
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      disabled={disabled}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => setDraft(singleLine ? event.target.value.replace(/\n/g, ' ') : event.target.value)}
      onFocus={() => {
        cancelled.current = false
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') discard()
        if (singleLine && event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'w-full resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 outline-none hover:bg-accent/40 focus:bg-accent/40 focus:ring-2 focus:ring-ring/40 disabled:opacity-70',
        className,
      )}
    />
  )
}
