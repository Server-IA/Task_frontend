import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Ban, Check, CircleDot, Flag, Layers, RefreshCw, Shapes, Tag, UserRound, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorDot } from '@/components/common/LabelChip'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useHotkey } from '@/hooks/useHotkey'
import { cn } from '@/lib/utils'
import { PRIORITIES } from '../constants'
import { FILTER_KINDS, splitFilters } from '../filterMenu'
import { DEFAULT_TYPES, effectiveTypes, ISSUE_TYPES, isAllTypes } from '../issueTypes'
import { PriorityIcon } from './PriorityIcon'
import { TypeIcon } from './IssueTypeBits'

const KINDS = Object.fromEntries(FILTER_KINDS.map((kind) => [kind.key, kind]))

/** Ícono de cada filtro en el menú «+ filtro». */
const KIND_ICONS = { state: CircleDot, priority: Flag, assignee: UserRound, label: Tag, type: Shapes, cycle: RefreshCw, module: Layers, blocked: Ban }

/** Explicación de «bloqueadas» (en la pastilla y en el menú). */
const BLOCKED_HINT = 'Solo las tareas que esperan a otra tarea abierta'

/**
 * Búsqueda tipo consola («> buscar o saltar a WEB-12»: Enter con un código abre esa tarea) y filtros como pastillas: punteadas cuando están vacías
 * («+ prioridad») y oscuras cuando tienen valor («asignado: Luis ×»). «+ filtro» agrega los demás (ciclo, módulo,
 * bloqueadas); con una vista guardada aplicada (`compact`) solo se ven los filtros con valor y todo lo demás se
 * agrega desde ahí. Los valores viven en la URL (useIssueFilters). `changed` marca los filtros que ya no coinciden
 * con la vista guardada activa. Ciclo y módulo solo se ofrecen si el proyecto tiene (`meta.cycles`, `meta.modules`).
 */
export function IssueFiltersBar({
  filters,
  activeCount,
  setFilter,
  clearFilters,
  meta,
  hideState = false,
  compact = false,
  changed = [],
  onJumpToCode,
  codeExample = 'WEB-12',
  storiesUrl,
  hideType = false,
  fixedChips,
  children,
}) {
  const cycles = meta.cycles ?? []
  const modules = meta.modules ?? []
  const split = splitFilters({
    filters,
    changed,
    compact,
    hideState,
    hasCycles: cycles.length > 0,
    hasModules: modules.length > 0,
  })
  // La vista «Bugs» fija el tipo
  const pills = hideType ? split.pills.filter((key) => key !== 'type') : split.pills
  const menu = hideType ? split.menu.filter((key) => key !== 'type') : split.menu

  /** Opciones de cada filtro de lista (los de un solo valor llevan `single`). */
  const optionsFor = (key) => {
    switch (key) {
      case 'state':
        return meta.states.map((state) => ({
          value: state.id,
          label: state.name,
          icon: <StateIcon group={state.group} color={state.color} />,
        }))
      case 'priority':
        return PRIORITIES.map((priority) => ({
          value: priority.value,
          label: priority.label,
          icon: <PriorityIcon priority={priority.value} />,
        }))
      case 'assignee':
        return meta.users.map((user) => ({
          value: user.id,
          label: user.fullName,
          short: user.fullName.split(' ')[0],
          keywords: user.email,
          icon: <UserAvatar user={user} size="xs" />,
        }))
      case 'label':
        return meta.labels.map((label) => ({ value: label.id, label: label.name, icon: <ColorDot color={label.color} /> }))
      case 'cycle':
        return cycles.map((cycle) => ({
          value: cycle.id,
          label: cycle.name,
          keywords: cycle.status === 'CURRENT' ? 'actual en curso' : '',
          hint: cycle.status === 'CURRENT' ? 'actual' : cycle.status === 'COMPLETED' ? 'cerrado' : '',
          icon: <RefreshCw className="size-3.5 text-muted-foreground" />,
        }))
      case 'module':
        return modules.map((module) => ({
          value: module.id,
          label: module.name,
          icon: <Layers className="size-3.5 text-muted-foreground" />,
        }))
      default:
        return []
    }
  }

  /** Valores de un filtro de lista como arreglo, y cómo guardarlos (ciclo y módulo, uno solo). */
  const valuesOf = (key) => (KINDS[key].type === 'single' ? (filters[key] ? [filters[key]] : []) : filters[key])
  const setValues = (key, values) => setFilter(key, KINDS[key].type === 'single' ? (values[0] ?? null) : values)

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <SearchBox value={filters.search} onChange={(value) => setFilter('search', value)} onJump={onJumpToCode} codeExample={codeExample} />
      {fixedChips}
      {pills.map((key) =>
        key === 'type' ? (
          <TypeFilter
            key={key}
            types={effectiveTypes(filters.type)}
            changed={changed.includes(key)}
            onChange={(types) => setFilter('type', types)}
            storiesUrl={storiesUrl}
          />
        ) : key === 'blocked' ? (
          <ToggleFilter
            key={key}
            title={KINDS[key].title}
            hint={BLOCKED_HINT}
            active={Boolean(filters.blocked)}
            changed={changed.includes(key)}
            onChange={(value) => setFilter('blocked', value)}
          />
        ) : (
          <MultiFilter
            key={key}
            single={KINDS[key].type === 'single'}
            title={KINDS[key].title}
            changed={changed.includes(key)}
            values={valuesOf(key)}
            onChange={(values) => setValues(key, values)}
            options={optionsFor(key)}
          />
        ),
      )}
      {menu.length > 0 && (
        <AddFilterMenu
          kinds={menu}
          optionsFor={optionsFor}
          valuesOf={valuesOf}
          onChange={setValues}
          onToggle={(key) => setFilter(key, true)}
          types={effectiveTypes(filters.type)}
          onTypes={(types) => setFilter('type', types)}
        />
      )}
      {activeCount > 1 && (
        <button type="button" className="px-2 text-[13px] text-muted-foreground hover:text-foreground hover:underline" onClick={clearFilters}>
          limpiar todo
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

/** Código de tarea («WEB-12», «web-12»): Enter salta a esa tarea en vez de solo filtrar. */
const ISSUE_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]*-\d+$/

function SearchBox({ value, onChange, onJump, codeExample }) {
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
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.blur()
          const code = draft.trim()
          if (event.key === 'Enter' && onJump && ISSUE_CODE_PATTERN.test(code)) {
            event.preventDefault()
            setDraft('')
            onJump(code.toUpperCase())
          }
        }}
        placeholder={`buscar o saltar a ${codeExample}`}
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

/** Pastilla vacía y punteada («+ prioridad», «+ filtro»). */
const DASHED_PILL =
  'flex items-center gap-1.5 rounded-full border border-dashed border-dash px-3 py-1.5 text-[13px] text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Lista con búsqueda para elegir valores de un filtro. Con `single` se elige uno solo (elegir otro lo reemplaza) y
 * se avisa con `onDone`.
 */
function FilterOptions({ title, options, values, onChange, single = false, onDone }) {
  const selected = new Set(values)
  const toggle = (value) => {
    if (single) {
      onChange(selected.has(value) ? [] : [value])
      onDone?.()
      return
    }
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  return (
    <Command>
      <CommandInput placeholder={`Filtrar por ${title}…`} />
      <CommandList>
        <CommandEmpty>Sin resultados</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem key={option.value} value={`${option.label} ${option.keywords ?? ''} ${option.value}`} onSelect={() => toggle(option.value)}>
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
  )
}

/**
 * Filtro como pastilla con un menú para elegir valores. Con `single` se elige uno solo (ciclo, módulo): elegir otro
 * lo reemplaza y el menú se cierra.
 */
function MultiFilter({ title, options, values, onChange, changed = false, single = false }) {
  const [open, setOpen] = useState(false)
  const selected = new Set(values)
  const chosen = options.filter((option) => selected.has(option.value))
  // Un valor de la URL que ya no existe (un ciclo borrado) se muestra igual, para poder quitarlo
  const missing = chosen.length === 0 && values.length > 0
  const summary = missing ? 'otro' : chosen.length === 1 ? (chosen[0].short ?? chosen[0].label) : `${chosen.length}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {chosen.length > 0 || missing ? (
        <span className="tf-pop flex max-w-full items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
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
        <PopoverTrigger className={cn(DASHED_PILL, changed && 'border-accent-text')}>
          + {title}
          {changed && <ChangedMark />}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-60 p-0" align="start">
        <FilterOptions title={title} options={options} values={values} onChange={onChange} single={single} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

/**
 * «+ filtro»: primero qué filtro agregar y después sus valores, en el mismo menú. «Bloqueadas» se pone de una vez.
 * Al elegir un valor, el filtro aparece como pastilla en la barra.
 */
function AddFilterMenu({ kinds, optionsFor, valuesOf, onChange, onToggle, types, onTypes }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(null)
  const kind = step ? KINDS[step] : null
  // Al cerrar (también al elegir un ciclo o «bloqueadas») vuelve a la lista de filtros
  const onOpenChange = (next) => {
    setOpen(next)
    if (!next) setStep(null)
  }
  const close = () => onOpenChange(false)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className={DASHED_PILL}>+ filtro</PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        {kind?.type === 'types' ? (
          <div className="tf-fade">
            <button
              type="button"
              onClick={() => setStep(null)}
              className="flex w-full items-center gap-1.5 border-b px-3 py-2 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {kind.title}
            </button>
            <TypeOptions types={types} onChange={onTypes} />
          </div>
        ) : kind ? (
          <div className="tf-fade">
            <button
              type="button"
              onClick={() => setStep(null)}
              className="flex w-full items-center gap-1.5 border-b px-3 py-2 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {kind.title}
            </button>
            <FilterOptions
              title={kind.title}
              options={optionsFor(kind.key)}
              values={valuesOf(kind.key)}
              onChange={(values) => onChange(kind.key, values)}
              single={kind.type === 'single'}
              onDone={close}
            />
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Agregar filtro…" />
            <CommandList>
              <CommandEmpty>Sin resultados</CommandEmpty>
              <CommandGroup>
                {kinds.map((key) => {
                  const Icon = KIND_ICONS[key]
                  const toggle = KINDS[key].type === 'toggle'
                  return (
                    <CommandItem
                      key={key}
                      value={`${KINDS[key].title} ${key}`}
                      onSelect={() => {
                        if (!toggle) return setStep(key)
                        onToggle(key)
                        close()
                      }}
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate first-letter:uppercase">{KINDS[key].title}</span>
                      {toggle ? (
                        <span className="text-[11px] text-muted-foreground" title={BLOCKED_HINT}>
                          solo esas
                        </span>
                      ) : (
                        <span aria-hidden="true" className="text-muted-foreground">
                          ›
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
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
      className={cn(DASHED_PILL, changed && 'border-accent-text')}
    >
      + {title}
      {changed && <ChangedMark />}
    </button>
  )
}

/**
 * Elegir tipos: Historia (no se mueve en el tablero), Tarea y Bug. Siempre queda al menos uno.
 * @param {{ types: string[], onChange: (types: string[]) => void }} props
 */
function TypeOptions({ types, onChange }) {
  const selected = new Set(types)
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    if (next.size > 0) onChange(ISSUE_TYPES.map((type) => type.value).filter((type) => next.has(type)))
  }
  return (
    <div role="group" aria-label="Tipos" className="flex flex-col p-1">
      {ISSUE_TYPES.map((type) => {
        const checked = selected.has(type.value)
        return (
          <button
            key={type.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(type.value)}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                checked && 'border-foreground bg-foreground text-background',
              )}
            >
              {checked && <Check className="size-3" />}
            </span>
            <TypeIcon type={type.value} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span>{type.label}</span>
              {type.value === 'STORY' && <span className="text-xs text-muted-foreground">no se mueven en el tablero</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * «tipo: ▣ Tarea, ▣ Bug ×»: los tipos que se ven. Por defecto tareas y bugs (las historias van en su sección); «×»
 * quita el filtro y muestra los tres («+ tipo» punteado). Desde el menú se llega a «Historias».
 */
function TypeFilter({ types, changed, onChange, storiesUrl }) {
  const [open, setOpen] = useState(false)
  const all = isAllTypes(types)
  const isDefault = !all && types.length === DEFAULT_TYPES.length && DEFAULT_TYPES.every((type) => types.includes(type))
  const content = (
    <PopoverContent className="w-64 p-0" align="start">
      <p className="px-3 pt-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Tipo</p>
      <TypeOptions types={types} onChange={onChange} />
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
        {storiesUrl ? (
          <Link to={storiesUrl} className="font-semibold text-accent-text underline underline-offset-2" onClick={() => setOpen(false)}>
            Solo historias →
          </Link>
        ) : (
          <span />
        )}
        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange(DEFAULT_TYPES)}>
          Limpiar
        </button>
      </div>
    </PopoverContent>
  )

  if (all) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={cn(DASHED_PILL, changed && 'border-accent-text')}>
          + tipo
          {changed && <ChangedMark />}
        </PopoverTrigger>
        {content}
      </Popover>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span
        className={cn(
          'tf-pop flex max-w-full items-center rounded-full text-[13px]',
          isDefault ? 'border border-accent-text/50 bg-card text-foreground' : 'bg-foreground font-semibold text-background',
        )}
      >
        <PopoverTrigger className="flex min-w-0 items-center gap-1.5 rounded-l-full py-1.5 pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={cn('font-mono text-xs', isDefault ? 'text-muted-foreground' : 'opacity-80')}>tipo:</span>
          {ISSUE_TYPES.filter((type) => types.includes(type.value)).map((type, index, list) => (
            <span key={type.value} className="flex items-center gap-1">
              <TypeIcon type={type.value} size={14} />
              {type.label}
              {index < list.length - 1 && ','}
            </span>
          ))}
          {changed && <ChangedMark />}
        </PopoverTrigger>
        <button
          type="button"
          className="rounded-r-full py-1.5 pr-3 pl-1 opacity-70 hover:opacity-100"
          onClick={() => onChange(ISSUE_TYPES.map((type) => type.value))}
          aria-label="Quitar filtro de tipo (ver todos)"
          title="Ver los tres tipos"
        >
          <X className="size-3.5" />
        </button>
      </span>
      {content}
    </Popover>
  )
}
