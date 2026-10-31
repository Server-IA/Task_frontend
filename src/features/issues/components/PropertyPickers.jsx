import { useId, useState } from 'react'
import { CalendarDays, Check, Clock3, Tag, UserRound, X } from 'lucide-react'
import { es } from 'date-fns/locale'
import { parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AvatarStack } from '@/components/common/AvatarStack'
import { DUE_TONES } from '@/components/common/DueChip'
import { ColorDot, LabelChip } from '@/components/common/LabelChip'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { describeDueDate, formatShortDate, toIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PRIORITIES, PRIORITY_LABELS } from '../constants'
import { PriorityChip, PriorityIcon } from './PriorityIcon'

/** Botón pequeño para mostrar/editar una propiedad; sin borde hasta pasar el mouse. */
export function PropertyButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs text-foreground/90 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Selector genérico (simple o múltiple) sobre Popover + Command.
 * options: [{ value, label, icon?, keywords? }]
 */
function OptionsPicker({ trigger, options, value, onChange, multiple = false, placeholder, emptyText, disabled, align = 'start' }) {
  const [open, setOpen] = useState(false)
  // Múltiple: mientras está abierto manda la selección local. `value` llega cuando el backend responde: si se
  // marcan dos opciones antes de eso, la segunda no debe partir de la lista vieja y deshacer la primera.
  const [draft, setDraft] = useState(null)
  const selected = new Set(multiple ? (draft ?? value ?? []) : value ? [value] : [])

  const toggle = (optionValue) => {
    if (!multiple) {
      setOpen(false)
      if (optionValue !== value) onChange(optionValue)
      return
    }
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    setDraft([...next])
    onChange([...next])
  }

  const onOpenChange = (next) => {
    setOpen(next)
    if (!next) setDraft(null)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align={align} onClick={(event) => event.stopPropagation()}>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText ?? 'Sin resultados'}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ''} ${option.value}`}
                  onSelect={() => toggle(option.value)}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected.has(option.value) && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Opción «sin estado» del selector cuando el estado es opcional. */
const NO_STATE = '__none__'

/**
 * `noneLabel`: el estado es opcional; agrega esa opción («Sin estado») y `onChange(null)` al elegirla.
 * @param {{ states: import('@/api/types').StateResponse[], value: string | null, onChange: (id: string | null) => void,
 *           noneLabel?: string }} props
 */
export function StatePicker({ states = [], value, onChange, disabled, showLabel = true, noneLabel, className }) {
  const current = states.find((state) => state.id === value)
  const options = states.map((state) => ({
    value: state.id,
    label: state.name,
    icon: <StateIcon group={state.group} color={state.color} />,
  }))
  if (noneLabel) {
    options.unshift({
      value: NO_STATE,
      label: noneLabel,
      icon: <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border-[1.5px] border-dashed border-dash" />,
    })
  }
  return (
    <OptionsPicker
      disabled={disabled}
      placeholder="Cambiar estado…"
      value={current ? value : noneLabel ? NO_STATE : value}
      onChange={(next) => onChange(next === NO_STATE ? null : next)}
      options={options}
      trigger={
        <PropertyButton className={className} aria-label="Estado">
          {current ? <StateIcon group={current.group} color={current.color} /> : <StateIcon group="UNSTARTED" />}
          {showLabel && <span className="truncate">{current?.name ?? 'Estado'}</span>}
        </PropertyButton>
      }
    />
  )
}

/** `chip`: muestra la pastilla de prioridad del diseño («▮▮▯ media») en lugar de solo el ícono. */
export function PriorityPicker({
  value = 'NONE',
  onChange,
  disabled,
  showLabel = true,
  chip = false,
  iconOnlyWhenEmpty = false,
  className,
}) {
  return (
    <OptionsPicker
      disabled={disabled}
      placeholder="Cambiar prioridad…"
      value={value}
      onChange={onChange}
      options={PRIORITIES.map((priority) => ({
        value: priority.value,
        label: priority.label,
        icon: <PriorityIcon priority={priority.value} />,
      }))}
      trigger={
        chip ? (
          <PropertyButton className={cn('h-auto p-0 hover:bg-transparent hover:opacity-80', className)} aria-label="Prioridad">
            <PriorityChip priority={value} iconOnlyWhenEmpty={iconOnlyWhenEmpty} />
          </PropertyButton>
        ) : (
          <PropertyButton className={className} aria-label="Prioridad">
            <PriorityIcon priority={value} />
            {showLabel && <span className="truncate">{PRIORITY_LABELS[value]}</span>}
          </PropertyButton>
        )
      }
    />
  )
}

/**
 * @param {{ members: import('@/api/types').UserSummary[], value: string[], onChange: (ids: string[]) => void }} props
 */
export function AssigneesPicker({ members = [], value = [], onChange, disabled, showLabel = true, avatarSize = 'xs', className }) {
  const selectedUsers = members.filter((user) => value.includes(user.id))
  return (
    <OptionsPicker
      multiple
      disabled={disabled}
      placeholder="Asignar a…"
      emptyText="Nadie con ese nombre en el proyecto"
      value={value}
      onChange={onChange}
      options={members.map((user) => ({
        value: user.id,
        label: user.fullName,
        keywords: user.email,
        icon: <UserAvatar user={user} size="xs" />,
      }))}
      trigger={
        <PropertyButton className={className} aria-label="Asignados">
          {selectedUsers.length ? (
            <>
              <AvatarStack users={selectedUsers} size={avatarSize} />
              {showLabel && selectedUsers.length === 1 && <span className="truncate">{selectedUsers[0].fullName}</span>}
            </>
          ) : (
            <>
              <UserRound className="size-3.5 text-muted-foreground" />
              {showLabel && <span className="text-muted-foreground">Asignar</span>}
            </>
          )}
        </PropertyButton>
      }
    />
  )
}

/** @param {{ labels: import('@/api/types').LabelResponse[], value: string[], onChange: (ids: string[]) => void }} props */
export function LabelsPicker({ labels = [], value = [], onChange, disabled, className, compact = false }) {
  const selected = labels.filter((label) => value.includes(label.id))
  return (
    <OptionsPicker
      multiple
      disabled={disabled}
      placeholder="Etiquetas…"
      emptyText="No hay etiquetas (créalas en Ajustes)"
      value={value}
      onChange={onChange}
      options={labels.map((label) => ({ value: label.id, label: label.name, icon: <ColorDot color={label.color} /> }))}
      trigger={
        <PropertyButton className={cn('h-auto min-h-7 flex-wrap py-1', className)} aria-label="Etiquetas">
          {selected.length === 0 && (
            <>
              <Tag className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Etiquetas</span>
            </>
          )}
          {selected.length > 0 && compact && (
            <span className="flex flex-wrap items-center gap-1.5">
              {selected.slice(0, 2).map((label) => (
                <LabelChip key={label.id} label={label} />
              ))}
              {selected.length > 2 && <span className="font-mono text-[11px] text-muted-foreground">+{selected.length - 2}</span>}
            </span>
          )}
          {selected.length > 0 && !compact && selected.map((label) => <LabelChip key={label.id} label={label} />)}
        </PropertyButton>
      }
    />
  )
}

/**
 * Fecha opcional (LocalDate 'yyyy-MM-dd'). `onChange(null)` la quita.
 * `labelId`: id de una etiqueta visible; el botón se nombra con ella y con la fecha («Inicio 3 nov»).
 * `isOverdue` pinta la fecha en rojo (fecha límite vencida).
 * `due`: se muestra como pastilla de fecha límite en lenguaje humano («mañana», «venció hace 2 días»).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Fecha',
  disabled,
  className,
  isOverdue = false,
  due,
  minDate,
  maxDate,
  labelId,
}) {
  const [open, setOpen] = useState(false)
  const valueId = useId()
  const date = value ? parseISO(value) : undefined
  const dueInfo = due && value ? describeDueDate(value, due) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {dueInfo ? (
          <PropertyButton
            className={cn(
              // Nunca en dos líneas: en una tarjeta angosta «venció ayer» se partía y se montaba sobre el clip
              'h-6 shrink-0 gap-1 rounded-md px-2 font-medium whitespace-nowrap hover:opacity-85',
              DUE_TONES[dueInfo.tone],
              className,
            )}
            aria-label={`${placeholder}: ${formatShortDate(value)}`}
            title={formatShortDate(value)}
          >
            <Clock3 className="size-3" />
            {dueInfo.text}
          </PropertyButton>
        ) : (
          <PropertyButton
            className={cn(isOverdue && 'text-late', className)}
            aria-label={labelId ? undefined : placeholder}
            aria-labelledby={labelId ? `${labelId} ${valueId}` : undefined}
          >
            <CalendarDays className={cn('size-3.5', !value && 'text-muted-foreground')} />
            <span id={valueId} className={cn(!value && 'text-muted-foreground')}>
              {value ? formatShortDate(value) : placeholder}
            </span>
          </PropertyButton>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Calendar
          mode="single"
          locale={es}
          selected={date}
          defaultMonth={date}
          disabled={[
            ...(minDate ? [{ before: parseISO(minDate) }] : []),
            ...(maxDate ? [{ after: parseISO(maxDate) }] : []),
          ]}
          onSelect={(selected) => {
            setOpen(false)
            if (selected) onChange(toIsoDate(selected))
          }}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                setOpen(false)
                onChange(null)
              }}
            >
              <X />
              Quitar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
