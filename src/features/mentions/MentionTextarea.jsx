import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { ROLE_LABELS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { filterPeople, findMentionQuery, insertMention, splitDisplayMentions } from './mentions'

/**
 * Área de texto de un comentario con menciones. Al escribir «@» se abre la lista de personas del proyecto, que se
 * filtra con lo que sigue; ↑ ↓ eligen y Enter o Tab insertan «@Nombre». Las menciones se resaltan detrás del texto
 * (una capa con el mismo tamaño y tipografía) y al guardar se convierten en tokens (`draft.toBody()`).
 *
 * `fieldClassName` se aplica igual al textarea y a la capa de resaltado: deben medir lo mismo.
 * `onEscape` (opcional) recibe Escape cuando la lista está cerrada, sin cerrar el panel que lo contiene.
 * @param {{ draft: ReturnType<typeof import('./hooks').useMentionDraft>, people: (import('@/api/types').UserSummary & { role?: string })[],
 *           label: string, fieldClassName?: string, className?: string, onKeyDown?: (event: React.KeyboardEvent) => void,
 *           onEscape?: () => void, placeholder?: string, rows?: number, maxLength?: number, autoFocus?: boolean }} props
 */
export function MentionTextarea({ draft, people, label, fieldClassName, className, onKeyDown, onEscape, rows = 2, ...props }) {
  const currentUserId = useSessionStore((state) => state.user?.id)
  const wrapperRef = useRef(null)
  const textareaRef = useRef(null)
  const listId = useId()
  const [caret, setCaret] = useState(null)
  // Búsqueda que se cerró con Escape o tras insertar (por la posición de su @): no se vuelve a abrir sola
  const [dismissedAt, setDismissedAt] = useState(null)
  const [highlight, setHighlight] = useState({ key: null, index: 0 })

  const query = caret == null ? null : findMentionQuery(draft.text, caret)
  const known = query && draft.mentions.some((mention) => query.query.startsWith(mention.name))
  const candidates = query && !known ? filterPeople(people.filter((person) => person.id !== currentUserId), query.query) : []
  const open = Boolean(query) && query.start !== dismissedAt && candidates.length > 0
  const queryKey = query ? `${query.start}:${query.query}` : null
  const activeIndex = highlight.key === queryKey ? Math.min(highlight.index, candidates.length - 1) : 0

  const segments = useMemo(() => splitDisplayMentions(draft.text, draft.mentions), [draft.text, draft.mentions])

  // Crece con el contenido (sin barra de scroll, así la capa de resaltado queda alineada)
  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [draft.text])

  useLocalEscape(
    wrapperRef,
    () => (open ? setDismissedAt(query.start) : onEscape?.()),
    open || Boolean(onEscape),
  )

  const choose = (person) => {
    const result = insertMention(draft.text, { start: query.start, end: caret }, person)
    draft.addMention(result.text, result.mention)
    setDismissedAt(query.start)
    setCaret(result.caret)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(result.caret, result.caret)
    })
  }

  const handleKeyDown = (event) => {
    if (open) {
      const move = (step) => {
        event.preventDefault()
        setHighlight({ key: queryKey, index: (activeIndex + step + candidates.length) % candidates.length })
      }
      if (event.key === 'ArrowDown') return move(1)
      if (event.key === 'ArrowUp') return move(-1)
      const enter = event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey
      if (enter || event.key === 'Tab') {
        event.preventDefault()
        return choose(candidates[activeIndex])
      }
    }
    onKeyDown?.(event)
  }

  const syncCaret = (event) => setCaret(event.currentTarget.selectionStart)

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div
        aria-hidden="true"
        className={cn(
          fieldClassName,
          'pointer-events-none absolute inset-0 overflow-hidden break-words whitespace-pre-wrap text-transparent',
        )}
      >
        {segments.map((segment, index) =>
          segment.type === 'text' ? (
            <Fragment key={index}>{segment.text}</Fragment>
          ) : (
            <span key={index} className="rounded-[4px] bg-accent-soft shadow-[0_0_0_2px_var(--accent-soft)]">
              @{segment.name}
            </span>
          ),
        )}
        {'​'}
      </div>
      <textarea
        ref={textareaRef}
        rows={rows}
        value={draft.text}
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onChange={(event) => {
          const { value, selectionStart } = event.target
          draft.setText(value)
          setCaret(selectionStart)
          // Si se borró la @ cerrada (o se escribe otra), la lista vuelve a abrirse sola
          const next = findMentionQuery(value, selectionStart)
          if (!next || next.start !== dismissedAt) setDismissedAt(null)
        }}
        onSelect={syncCaret}
        onClick={syncCaret}
        onBlur={() => setCaret(null)}
        onKeyDown={handleKeyDown}
        className={cn(
          fieldClassName,
          'relative block w-full resize-none overflow-hidden break-words whitespace-pre-wrap bg-transparent outline-none placeholder:text-muted-foreground',
        )}
        {...props}
      />
      {open && (
        <div className="tf-pop absolute bottom-full left-0 z-30 mb-1.5 w-[min(320px,100%)] overflow-hidden rounded-[14px] border bg-popover text-popover-foreground shadow-xl">
          <p className="px-3 pt-2 pb-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
            Personas del proyecto
          </p>
          <ul id={listId} role="listbox" aria-label="Mencionar a" className="flex flex-col gap-0.5 px-1.5 pb-1.5">
            {candidates.map((person, index) => (
              <li
                key={person.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown sin foco: el textarea no pierde el cursor antes del clic
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(person)}
                onMouseMove={() => index !== activeIndex && setHighlight({ key: queryKey, index })}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-sm transition-colors duration-100',
                  index === activeIndex && 'bg-accent-soft',
                )}
              >
                <UserAvatar user={person} size="sm" />
                <span className={cn('min-w-0 flex-1 truncate', index === activeIndex ? 'font-semibold' : 'font-medium')}>
                  {person.fullName}
                </span>
                {person.role && <span className="shrink-0 text-xs text-muted-foreground">{ROLE_LABELS[person.role]}</span>}
              </li>
            ))}
          </ul>
          <p className="flex gap-3 border-t bg-subtle px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
            <span>
              <kbd className="text-foreground">↑ ↓</kbd> elegir
            </span>
            <span>
              <kbd className="text-foreground">↵</kbd> insertar
            </span>
            <span>
              <kbd className="text-foreground">esc</kbd> cerrar
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
