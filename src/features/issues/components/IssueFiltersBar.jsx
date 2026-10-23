import { useEffect, useState } from 'react'
import { Check, ListFilter, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorDot } from '@/components/common/LabelChip'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { PRIORITIES } from '../constants'
import { PriorityIcon } from './PriorityIcon'

/** Búsqueda y filtros del listado de issues. Los valores viven en la URL (useIssueFilters). */
export function IssueFiltersBar({ filters, activeCount, setFilter, clearFilters, meta, hideState = false, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
      <SearchBox value={filters.search} onChange={(value) => setFilter('search', value)} />
      {!hideState && (
        <MultiFilter
          title="Estado"
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
        title="Prioridad"
        values={filters.priority}
        onChange={(values) => setFilter('priority', values)}
        options={PRIORITIES.map((priority) => ({
          value: priority.value,
          label: priority.label,
          icon: <PriorityIcon priority={priority.value} />,
        }))}
      />
      <MultiFilter
        title="Asignado"
        values={filters.assignee}
        onChange={(values) => setFilter('assignee', values)}
        options={meta.users.map((user) => ({
          value: user.id,
          label: user.fullName,
          keywords: user.email,
          icon: <UserAvatar user={user} size="xs" />,
        }))}
      />
      <MultiFilter
        title="Etiqueta"
        values={filters.label}
        onChange={(values) => setFilter('label', values)}
        options={meta.labels.map((label) => ({ value: label.id, label: label.name, icon: <ColorDot color={label.color} /> }))}
      />
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearFilters}>
          <X />
          Limpiar
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

function SearchBox({ value, onChange }) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 350)

  // La URL cambia por fuera (p. ej. «Limpiar»): se sincroniza el campo
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="relative w-full sm:w-56">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar por título o código"
        className="h-8 pl-8 text-sm"
        aria-label="Buscar issues"
      />
    </div>
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 border-dashed', selected.size > 0 && 'border-solid')}>
          <ListFilter className="size-3.5" />
          {title}
          {selected.size > 0 && (
            <Badge variant="secondary" className="h-5 rounded-sm px-1.5 font-normal">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filtrar por ${title.toLowerCase()}…`} />
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
                      selected.has(option.value) && 'border-primary bg-primary text-primary-foreground',
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
        {selected.size > 0 && (
          <div className="border-t p-1">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              Quitar filtro
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
