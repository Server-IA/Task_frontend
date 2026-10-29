import { useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ISSUE_TYPES, TYPE_LABELS, typeChangeBlock, typeOf } from '../issueTypes'
import { TypeIcon } from './IssueTypeBits'

const PILL = {
  STORY: 'bg-ty-story-soft text-ty-story-text',
  TASK: 'bg-ty-task-soft text-ty-task-text',
  BUG: 'bg-ty-bug-soft text-ty-bug-text',
}

/**
 * Pastilla del tipo en la cabecera del panel («▣ Tarea ⌄»); abre «Cambiar tipo». Los tipos que no se pueden elegir
 * se ven apagados con el motivo (una historia con tareas no cambia de tipo; convertir en historia o dejar de serlo es
 * del project manager).
 * @param {{ issue: import('@/api/types').IssueResponse, isManager: boolean, onChange: (type: string) => void }} props
 */
export function TypePicker({ issue, isManager, onChange }) {
  const [open, setOpen] = useState(false)
  const current = typeOf(issue)
  const context = { isManager, hasChildren: (issue.subIssueCount ?? 0) > 0 }
  const options = ISSUE_TYPES.map((type) => ({ ...type, block: typeChangeBlock(issue, type.value, context) }))
  const reasons = [...new Set(options.map((option) => option.block).filter(Boolean))]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Tipo: ${TYPE_LABELS[current]}. Cambiar tipo`}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-lg py-1 pr-2 pl-1 text-[13px] font-semibold outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
          PILL[current],
        )}
      >
        <TypeIcon type={current} />
        {TYPE_LABELS[current]}
        <ChevronDown className="size-3.5" strokeWidth={2.5} />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1.5" align="start">
        <p className="px-2 pt-1 pb-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Cambiar tipo</p>
        {options.map((option) => {
          const selected = option.value === current
          const disabled = Boolean(option.block)
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              title={option.block ?? undefined}
              onClick={() => {
                setOpen(false)
                if (!selected) onChange(option.value)
              }}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
                selected && 'bg-accent-soft hover:bg-accent-soft',
              )}
            >
              <TypeIcon type={option.value} className="mt-0.5" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
              {selected && <Check className="mt-0.5 size-4 text-accent-text" />}
            </button>
          )
        })}
        {reasons.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t px-2 pt-2 pb-1">
            {reasons.map((reason) => (
              <p key={reason} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                {reason}
              </p>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
