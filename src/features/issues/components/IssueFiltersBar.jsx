import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
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
 * Los valores viven en la URL (useIssueFilters).
 */
export function IssueFiltersBar({ filters, activeCount, setFilter, clearFilters, meta, hideState = false, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <SearchBox value={filters.search} onChange={(value) => setFilter('search', value)} />
      {!hideState && (
        <MultiFilter
          title="estado"
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
        values={filters.label}
        onChange={(values) => setFilter('label', values)}
        options={meta.labels.map((label) => ({ value: label.id, label: label.name, icon: <ColorDot color={label.color} /> }))}
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

function MultiFilter({ title, options, values, onChange }) {
  const selected = new Set(values)
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }
  const chosen = options.filter((option) => selected.has(option.value))
  const summary = chosen.length === 1 ? (chosen[0].short ?? chosen[0].label) : `${chosen.length}`

  return (
    <Popover>
      {chosen.length > 0 ? (
        <span className="flex items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
          <PopoverTrigger className="flex items-center gap-1.5 rounded-l-full py-1.5 pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {chosen.length === 1 && chosen[0].icon}
            {title}: {summary}
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
        <PopoverTrigger className="rounded-full border border-dashed border-dash px-3 py-1.5 text-[13px] text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          + {title}
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
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border',
                      selected.has(option.value) && 'border-foreground bg-foreground text-background',
                    )}
                  >
                    {selected.has(option.value) && <Check className="size-3" />}
                  </span>
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
