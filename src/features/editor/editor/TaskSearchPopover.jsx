import { useState } from 'react'
import { StateIcon } from '@/components/common/StateIcon'
import { useIssueSearch } from '@/features/search/hooks'
import { cn } from '@/lib/utils'

/**
 * «Enlazar tarea» del menú «/»: busca tareas del workspace por código o título y deja su código en el texto
 * («WEB-12», que se dibuja como pastilla).
 * @param {{ slug: string, style: React.CSSProperties, onSelect: (issue: object) => void, onClose: () => void }} props
 */
export function TaskSearchPopover({ slug, style, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const { data: results = [], isFetching } = useIssueSearch(slug, query)
  const shown = query.trim() ? results : []
  const index = Math.min(active, Math.max(shown.length - 1, 0))

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (shown.length) setActive((index + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      if (shown[index]) onSelect(shown[index])
    } else if (event.key === 'Tab') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Enlazar tarea"
      style={style}
      className="tf-pop absolute z-40 flex w-[360px] max-w-full flex-col overflow-hidden rounded-[14px] border bg-popover text-popover-foreground shadow-[0_18px_44px_rgb(35_32_27/0.22)]"
    >
      <input
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Busca por código o título…"
        aria-label="Buscar tarea"
        className="border-b bg-transparent px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-muted-foreground"
      />
      <ul role="listbox" aria-label="Tareas" className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5">
        {shown.map((issue, itemIndex) => (
          <li
            key={issue.id}
            role="option"
            aria-selected={itemIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(issue)}
            onMouseMove={() => itemIndex !== index && setActive(itemIndex)}
            className={cn('flex cursor-pointer items-center gap-2 rounded-[9px] px-2 py-1.5 text-[13px]', itemIndex === index && 'bg-accent-soft')}
          >
            <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3.5" />
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
            <span className="min-w-0 flex-1 truncate">{issue.title}</span>
          </li>
        ))}
        {query.trim() && !isFetching && shown.length === 0 && <li className="px-2 py-1.5 text-[13px] text-muted-foreground">Sin resultados</li>}
        {!query.trim() && <li className="px-2 py-1.5 text-[13px] text-muted-foreground">Escribe un código («WEB-12») o parte del título</li>}
      </ul>
      <p className="flex gap-3 border-t px-3.5 py-2 font-mono text-[11px] text-muted-foreground">
        <span>
          <kbd className="text-foreground">↑↓</kbd> elegir
        </span>
        <span>
          <kbd className="text-foreground">↵</kbd> enlazar
        </span>
        <span>
          <kbd className="text-foreground">esc</kbd> cerrar
        </span>
      </p>
    </div>
  )
}
