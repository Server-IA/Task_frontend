import { useCallback, useEffect, useRef, useState } from 'react'
import { Ban, Check, Layers, RefreshCw, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorDot } from '@/components/common/LabelChip'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useHotkey } from '@/hooks/useHotkey'
import { cn } from '@/lib/utils'
import { PRIORITIES } from '../constants'
import { PriorityIcon } from './PriorityIcon'

/**
 * Búsqueda tipo consola («> buscar o saltar a WEB-12») y filtros como pastillas:
 * punteadas cuando están vacías («+ prioridad») y oscuras cuando tienen valor («asignado: Luis ×»).
 * Los valores viven en la URL (useIssueFilters). `changed` marca los filtros que ya no coinciden con la vista
 * guardada activa. Ciclo y módulo solo aparecen si el proyecto tiene (`meta.cycles`, `meta.modules`).
 */
export function IssueFiltersBar({ filters, activeCount, setFilter, clearFilters, meta, hideState = false, changed = [], children }) {
  const cycles = meta.cycles ?? []
  const modules = meta.modules ?? []
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <SearchBox value={filters.search} onChange={(value) => setFilter('search', value)} />
      {!hideState && (
        <MultiFilter
          title="estado"
          changed={changed.includes('state')}
          values={filters.state}
          onChange={(values) => setFilter('state', values)}
          options={meta.states.map((state) => ({
            value: state.id,
            label: state.name,
            icon: <StateIcon group={state.group} color={state.color} />,
          }))}
        />
      )}
      <MultiFilter
        title="prioridad"
        changed={changed.includes('priority')}
        values={filters.priority}
        onChange={(values) => setFilter('priority', values)}
        options={PRIORITIES.map((priority) => ({
          value: priority.value,
          label: priority.label,
          icon: <PriorityIcon priority={priority.value} />,
        }))}
      />
      <MultiFilter
        title="asignado"
        changed={changed.includes('assignee')}
        values={filters.assignee}
        onChange={(values) => setFilter('assignee', values)}
        options={meta.users.map((user) => ({
          value: user.id,
          label: user.fullName,
          short: user.fullName.split(' ')[0],
          keywords: user.email,
          icon: <UserAvatar user={user} size="xs" />,
        }))}
      />
      <MultiFilter
        title="etiqueta"
        changed={changed.includes('label')}
        values={filters.label}
        onChange={(values) => setFilter('label', values)}
        options={meta.labels.map((label) => ({ value: label.id, label: label.name, icon: <ColorDot color={label.color} /> }))}
      />
      {(cycles.length > 0 || filters.cycle) && (
        <MultiFilter
          single
          title="ciclo"
          changed={changed.includes('cycle')}
          values={filters.cycle ? [filters.cycle] : []}
          onChange={(values) => setFilter('cycle', values[0] ?? null)}
          options={cycles.map((cycle) => ({
            value: cycle.id,
            label: cycle.name,
            keywords: cycle.status === 'CURRENT' ? 'actual en curso' : '',
            hint: cycle.status === 'CURRENT' ? 'actual' : cycle.status === 'COMPLETED' ? 'cerrado' : '',
            icon: <RefreshCw className="size-3.5 text-muted-foreground" />,
          }))}
        />
      )}
      {(modules.length > 0 || filters.module) && (
        <MultiFilter
          single
          title="módulo"
          changed={changed.includes('module')}
          values={filters.module ? [filters.module] : []}
          onChange={(values) => setFilter('module', values[0] ?? null)}
          options={modules.map((module) => ({
            value: module.id,
            label: module.name,
            icon: <Layers className="size-3.5 text-muted-foreground" />,
          }))}
        />
      )}
      <ToggleFilter
        title="bloqueadas"
        hint="Solo las tareas que esperan a otra tarea abierta"
        active={Boolean(filters.blocked)}
        changed={changed.includes('blocked')}
        onChange={(value) => setFilter('blocked', value)}
      />
      {activeCount > 1 && (
        <button type="button" className="px-2 text-[13px] text-muted-foreground hover:text-foreground hover:underline" onClick={clearFilters}>
          limpiar todo
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

function SearchBox({ value, onChange }) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 350)
  const inputRef = useRef(null)

  // La URL cambia por fuera (p. ej. «limpiar»): se sincroniza el campo
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // «/» enfoca la búsqueda
  useHotkey('/', useCallback(() => inputRef.current?.focus(), []))

  return (
    <label className="flex w-full items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 font-mono text-[13px] focus-within:ring-2 focus-within:ring-ring/40 sm:w-80">
      <span aria-hidden="true" className="font-semibold text-accent-text">
        &gt;
      </span>
      <span className="sr-only">Buscar tareas</span>
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
        placeholder="buscar o saltar a WEB-12"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <kbd className="text-[11px] text-muted-foreground">/</kbd>
    </label>
  )
}

/** Marca «cambiado» respecto de la vista guardada activa. */
function ChangedMark() {
  return (
    <span className="tf-pop rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold text-primary-foreground">cambiado</span>
  )
}

/**
 * Filtro como pastilla con un menú para elegir valores. Con `single` se elige uno solo (ciclo, módulo): elegir otro
 * lo reemplaza y el menú se cierra.
 */
function MultiFilter({ title, options, values, onChange, changed = false, single = false }) {
  const [open, setOpen] = useState(false)
  const selected = new Set(values)
  const toggle = (value) => {
    if (single) {
      onChange(selected.has(value) ? [] : [value])
      setOpen(false)
      return
    }
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }
  const chosen = options.filter((option) => selected.has(option.value))
  // Un valor de la URL que ya no existe (un ciclo borrado) se muestra igual, para poder quitarlo
  const missing = chosen.length === 0 && values.length > 0
  const summary = missing ? 'otro' : chosen.length === 1 ? (chosen[0].short ?? chosen[0].label) : `${chosen.length}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {chosen.length > 0 || missing ? (
        <span className="flex max-w-full items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
          <PopoverTrigger className="flex min-w-0 items-center gap-1.5 rounded-l-full py-1.5 pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {chosen.length === 1 && !single && chosen[0].icon}
            <span className="max-w-56 truncate">
              {title}: {summary}
            </span>
            {changed && <ChangedMark />}
          </PopoverTrigger>
          <button
            type="button"
            className="rounded-r-full py-1.5 pr-3 pl-1 opacity-80 hover:opacity-100"
            onClick={() => onChange([])}
            aria-label={`Quitar filtro de ${title}`}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <PopoverTrigger
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-dashed border-dash px-3 py-1.5 text-[13px] text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            changed && 'border-accent-text',
          )}
        >
          + {title}
          {changed && <ChangedMark />}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filtrar por ${title}…`} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ''} ${option.value}`}
                  onSelect={() => toggle(option.value)}
                >
                  {!single && (
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border',
                        selected.has(option.value) && 'border-foreground bg-foreground text-background',
                      )}
                    >
                      {selected.has(option.value) && <Check className="size-3" />}
                    </span>
                  )}
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint && <span className="font-mono text-[11px] text-muted-foreground">{option.hint}</span>}
                  {single && selected.has(option.value) && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Filtro de sí o no: «+ bloqueadas» punteado; puesto, oscuro con «⊘ bloqueadas ×». */
function ToggleFilter({ title, hint, active, onChange, changed = false }) {
  if (active) {
    return (
      <span className="tf-pop flex items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
        <span className="flex items-center gap-1.5 py-1.5 pr-1 pl-3" title={hint}>
          <Ban className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          {title}
          {changed && <ChangedMark />}
        </span>
        <button
          type="button"
          className="rounded-r-full py-1.5 pr-3 pl-1 opacity-80 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onChange(false)}
          aria-label={`Quitar filtro ${title}`}
        >
          <X className="size-3.5" />
        </button>
      </span>
    )
  }
  return (
    <button
      type="button"
      title={hint}
      onClick={() => onChange(true)}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-dashed border-dash px-3 py-1.5 text-[13px] text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        changed && 'border-accent-text',
      )}
    >
      + {title}
      {changed && <ChangedMark />}
    </button>
  )
}
