import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { safeHref } from '../markdown/links'

/**
 * Editar un enlace: texto y dirección. Un código como «WEB-12» en el campo «Enlace» deja la referencia a la tarea
 * (texto plano, que se dibuja como pastilla).
 * @param {{ initial: { text: string, href: string, existing: boolean }, style: React.CSSProperties,
 *           onApply: (values: { text: string, href: string }) => void, onRemove: () => void, onClose: () => void }} props
 */
export function LinkPopover({ initial, style, onApply, onRemove, onClose }) {
  const [text, setText] = useState(initial.text)
  const [href, setHref] = useState(initial.href)
  const openable = safeHref(initial.href)

  const submit = () => {
    if (!href.trim()) {
      if (initial.existing) onRemove()
      else onClose()
      return
    }
    onApply({ text, href })
  }

  const field = 'rounded-[9px] border bg-background px-2.5 py-1.75 text-[13px] text-foreground outline-none focus:border-ring focus:shadow-[0_0_0_3px_var(--accent-soft)] dark:bg-input/30'
  return (
    // Un div y no un form: el editor puede estar dentro de otro formulario (Nueva tarea, plantillas)
    <div
      role="dialog"
      aria-label="Editar enlace"
      style={style}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.nativeEvent.isComposing) return
        event.preventDefault()
        event.stopPropagation()
        submit()
      }}
      className="tf-pop absolute z-40 flex w-[380px] max-w-full flex-col gap-2.5 rounded-[14px] border bg-popover p-3 text-[13px] leading-snug text-popover-foreground shadow-[0_18px_44px_rgb(35_32_27/0.22)]"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Texto
        <input value={text} onChange={(event) => setText(event.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Enlace
        <input
          value={href}
          onChange={(event) => setHref(event.target.value)}
          autoFocus
          placeholder="https://…"
          className={`${field} font-mono text-xs`}
        />
      </label>
      <span className="text-xs text-muted-foreground">
        También puedes pegar un código como <span className="font-mono text-foreground">WEB-12</span> para enlazar una tarea.
      </span>
      <span className="flex items-center gap-1.5 border-t pt-2.5">
        {openable && (
          <a href={openable} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.25 rounded-lg px-2 py-1.5 font-medium hover:bg-muted">
            <ExternalLink className="size-3.25" />
            Abrir
          </a>
        )}
        {initial.existing && (
          <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1.5 font-medium text-destructive hover:bg-muted">
            Quitar enlace
          </button>
        )}
        <button type="button" onClick={submit} className="ml-auto flex items-center gap-1.5 rounded-[9px] bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:brightness-95">
          Aplicar <kbd className="text-[11px]">↵</kbd>
        </button>
      </span>
    </div>
  )
}
