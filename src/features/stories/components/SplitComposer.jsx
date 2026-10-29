import { useEffect, useRef, useState } from 'react'
import { GitBranch, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PRIORITIES, PRIORITY_LABELS } from '@/features/issues/constants'
import { PriorityChip } from '@/features/issues/components/PriorityIcon'
import { TypeIcon } from '@/features/issues/components/IssueTypeBits'
import { opensAbove } from '@/features/editor/editor/popups'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useSplitStory } from '../hooks'
import { emptyLine, linesToItems, pickerQuery, removeToken } from '../splitLines'

/** Alto máximo del selector de «@» o «!» (seis personas). */
const PICKER_HEIGHT = 230
/** Al abrirse, durante cuánto se lo sigue mostrando entero mientras carga lo de arriba. */
const REVEAL_MS = 1500

/**
 * «Partir en tareas» (project manager): una línea por tarea. Enter agrega una línea, «@» asigna, «!» pone la
 * prioridad, Tab cambia el tipo (Tarea / Bug), Esc cancela y «Crear N tareas» (ctrl ↵) las crea todas juntas. Heredan
 * de la historia su ciclo, sus módulos, sus etiquetas y, si la línea no la trae, su prioridad.
 * Al abrirse (con «Partir en tareas» o solo, en una historia sin partir) el panel se desplaza hasta mostrarlo entero.
 * @param {{ slug: string, project: object, story: import('@/api/types').IssueResponse, members: object[],
 *           onDone: () => void, onCancel: () => void }} props
 */
export function SplitComposer({ slug, project, story, members, onDone, onCancel }) {
  const split = useSplitStory(slug, project.id)
  const [lines, setLines] = useState(() => [emptyLine()])
  // Selector abierto (personas con «@», prioridades con «!») en la línea `lineId`
  const [picker, setPicker] = useState(null)
  const inputs = useRef(new Map())
  const rootRef = useRef(null)
  const items = linesToItems(lines)

  // Esc cierra el selector abierto o cancela, sin cerrar también el panel de la historia (Radix escucha Escape
  // antes que el onKeyDown de React)
  useLocalEscape(rootRef, () => {
    if (picker) setPicker(null)
    else onCancel()
  })

  // Abierto al final del panel quedaba fuera de la vista (el foco solo mostraba la primera línea, y los selectores
  // de «@» y «!» se abrían debajo, fuera de la pantalla). Al abrirse se muestra entero; lo de arriba (criterios,
  // checklist) puede crecer al cargar y empujarlo hacia abajo, así que durante un momento se sigue mostrando. Al
  // escribir, también
  const reveal = () => rootRef.current?.scrollIntoView?.({ block: 'nearest' })
  useEffect(() => {
    const element = rootRef.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => element.scrollIntoView?.({ block: 'nearest' }))
      return () => cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.intersectionRatio < 1) element.scrollIntoView?.({ block: 'nearest' })
      },
      { threshold: [1] },
    )
    observer.observe(element)
    const stop = setTimeout(() => observer.disconnect(), REVEAL_MS)
    return () => {
      clearTimeout(stop)
      observer.disconnect()
    }
  }, [])

  const focusLine = (id) => requestAnimationFrame(() => inputs.current.get(id)?.focus())
  const updateLine = (id, change) => setLines((current) => current.map((line) => (line.id === id ? { ...line, ...change } : line)))

  const options = (() => {
    if (!picker) return []
    const query = picker.query.toLowerCase()
    if (picker.kind === 'person') {
      return members
        .filter((user) => user.fullName.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query))
        .slice(0, 6)
        .map((user) => ({ value: user, key: user.id, label: user.fullName }))
    }
    return PRIORITIES.filter((priority) => priority.value !== 'NONE' && priority.label.toLowerCase().includes(query)).map((priority) => ({
      value: priority.value,
      key: priority.value,
      label: priority.label,
    }))
  })()

  const choose = (line, option) => {
    const title = removeToken(line.title, picker.start, picker.end)
    updateLine(line.id, picker.kind === 'person' ? { title, assignee: option.value } : { title, priority: option.value })
    setPicker(null)
    focusLine(line.id)
  }

  const onInput = (line, event) => {
    const value = event.target.value
    updateLine(line.id, { title: value })
    reveal()
    const found = pickerQuery(value, event.target.selectionStart ?? value.length)
    // Cerca del borde de abajo de lo visible, el selector se abre hacia arriba
    setPicker(found ? { ...found, lineId: line.id, active: 0, above: opensAbove(event.target, PICKER_HEIGHT) } : null)
  }

  const submit = () => {
    if (items.length === 0 || split.isPending) return
    split.mutate(
      { storyId: story.id, items },
      {
        onSuccess: (created) => {
          toast.success(`${created.length} ${created.length === 1 ? 'tarea creada' : 'tareas creadas'} en ${story.code}`)
          setLines([emptyLine()])
          onDone()
        },
        onError: (error) => notifyError(error, 'No se pudieron crear las tareas'),
      },
    )
  }

  const onKeyDown = (line, index, event) => {
    const pickerHere = picker?.lineId === line.id && options.length > 0
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
      return
    }
    if (pickerHere && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setPicker({ ...picker, active: (picker.active + step + options.length) % options.length })
      return
    }
    if (pickerHere && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault()
      choose(line, options[picker.active] ?? options[0])
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const next = emptyLine(line.type)
      setLines((current) => [...current.slice(0, index + 1), next, ...current.slice(index + 1)])
      focusLine(next.id)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      updateLine(line.id, { type: line.type === 'BUG' ? 'TASK' : 'BUG' })
      return
    }
    if (event.key === 'Backspace' && line.title === '' && lines.length > 1) {
      event.preventDefault()
      setLines((current) => current.filter((other) => other.id !== line.id))
      focusLine(lines[Math.max(0, index - 1)].id === line.id ? lines[index + 1]?.id : lines[Math.max(0, index - 1)].id)
    }
  }

  const inherited = [
    story.cycle?.name,
    ...(story.modules ?? []).map((module) => module.name),
    ...(story.labels ?? []).map((label) => label.name),
  ].filter(Boolean)
  const storyPriority = story.priority && story.priority !== 'NONE' ? PRIORITY_LABELS[story.priority].toLowerCase() : 'sin prioridad'

  return (
    <div ref={rootRef} className="tf-pop flex flex-col rounded-[14px] border border-ring/60 bg-card shadow-card">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Partir en tareas</h3>
        <span className="text-xs text-muted-foreground">una línea por tarea</span>
      </div>
      <ol className="flex flex-col py-1">
        {lines.map((line, index) => (
          <li key={line.id} className="relative flex items-center gap-2.5 px-3.5 py-1.5">
            <span className="w-4 text-right font-mono text-xs text-muted-foreground">{index + 1}</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => updateLine(line.id, { type: line.type === 'BUG' ? 'TASK' : 'BUG' })}
              title={`${line.type === 'BUG' ? 'Bug' : 'Tarea'} · Tab cambia el tipo`}
              aria-label={`Tipo de la línea ${index + 1}: ${line.type === 'BUG' ? 'Bug' : 'Tarea'}`}
            >
              <TypeIcon type={line.type} />
            </button>
            <input
              ref={(element) => (element ? inputs.current.set(line.id, element) : inputs.current.delete(line.id))}
              autoFocus={index === 0}
              value={line.title}
              onChange={(event) => onInput(line, event)}
              onKeyDown={(event) => onKeyDown(line, index, event)}
              onBlur={() => setTimeout(() => setPicker((current) => (current?.lineId === line.id ? null : current)), 150)}
              placeholder={index === 0 ? 'Qué hay que hacer… (@ asignar, ! prioridad)' : ''}
              aria-label={`Tarea ${index + 1}`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {line.assignee && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => updateLine(line.id, { assignee: null })}
                title="Quitar asignado"
                className="group flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5 text-xs font-medium"
              >
                <UserAvatar user={line.assignee} size="xs" className="size-4.5" />@{line.assignee.fullName.split(' ')[0]}
                <X className="hidden size-3 group-hover:block" />
              </button>
            )}
            {line.priority && (
              <button type="button" tabIndex={-1} onClick={() => updateLine(line.id, { priority: null })} title="Quitar prioridad">
                <PriorityChip priority={line.priority} />
              </button>
            )}
            {picker?.lineId === line.id && options.length > 0 && (
              <div
                role="listbox"
                aria-label={picker.kind === 'person' ? 'Asignar a' : 'Prioridad'}
                className={cn(
                  'absolute left-24 z-20 w-60 rounded-xl border bg-popover p-1 shadow-xl',
                  picker.above ? 'bottom-full mb-0.5' : 'top-full mt-0.5',
                )}
              >
                {options.map((option, optionIndex) => (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={optionIndex === picker.active}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(line, option)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px]',
                      optionIndex === picker.active && 'bg-accent-soft font-semibold',
                    )}
                  >
                    {picker.kind === 'person' ? <UserAvatar user={option.value} size="xs" /> : <PriorityChip priority={option.value} />}
                    {picker.kind === 'person' && <span className="min-w-0 flex-1 truncate">{option.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="border-t border-dashed px-3.5 py-2 text-xs text-muted-foreground">
        heredan de la historia: <span className="text-foreground">{inherited.length ? inherited.join(' · ') : 'nada'}</span> · sin{' '}
        <span className="font-mono">!</span>, prioridad {storyPriority}
      </p>
      <div className="flex flex-wrap items-center gap-3 rounded-b-[14px] border-t bg-subtle px-3.5 py-2.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          <kbd className="text-foreground">Enter</kbd> nueva línea · <kbd className="text-foreground">@</kbd> asignar ·{' '}
          <kbd className="text-foreground">!</kbd> prioridad · <kbd className="text-foreground">Tab</kbd> tipo ·{' '}
          <kbd className="text-foreground">Esc</kbd> cancelar
        </span>
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={items.length === 0 || split.isPending} onClick={submit}>
          {split.isPending && <Spinner />}
          Crear {items.length} {items.length === 1 ? 'tarea' : 'tareas'}
          <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">ctrl ↵</kbd>
        </Button>
      </div>
    </div>
  )
}
