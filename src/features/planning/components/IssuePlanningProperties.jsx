import { useState } from 'react'
import { Check, Layers, RefreshCcw, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PropertyRow } from '@/features/issues/components/IssueDetail'
import { PropertyButton } from '@/features/issues/components/PropertyPickers'
import { notifyError } from '@/lib/notify'
import { useAddPlanningIssues, usePlanningList, useRemovePlanningIssue } from '../hooks'

/**
 * Filas «Ciclo» y «Módulos» del panel de propiedades del issue.
 * @param {{ slug: string, projectId: string, issue: import('@/api/types').IssueResponse }} props
 */
export function IssuePlanningProperties({ slug, projectId, issue }) {
  return (
    <>
      <PropertyRow label="Ciclo">
        <CyclePicker slug={slug} projectId={projectId} issue={issue} />
      </PropertyRow>
      <PropertyRow label="Módulos">
        <ModulesPicker slug={slug} projectId={projectId} issue={issue} />
      </PropertyRow>
    </>
  )
}

function CyclePicker({ slug, projectId, issue }) {
  const [open, setOpen] = useState(false)
  const { data: cycles = [] } = usePlanningList('cycles', slug, projectId)
  const add = useAddPlanningIssues('cycles', slug, projectId)
  const remove = useRemovePlanningIssue('cycles', slug, projectId)
  const current = issue.cycle

  const choose = (cycleId) => {
    setOpen(false)
    const options = { onError: (error) => notifyError(error) }
    if (cycleId === null) {
      if (current) remove.mutate({ id: current.id, issueId: issue.id }, options)
    } else if (cycleId !== current?.id) {
      // Agregarlo a otro ciclo lo saca del anterior (el backend lo mueve)
      add.mutate({ id: cycleId, issueIds: [issue.id] }, options)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PropertyButton aria-label="Ciclo" disabled={add.isPending || remove.isPending}>
          <RefreshCcw className="size-3.5 text-muted-foreground" />
          <span className={current ? 'truncate' : 'text-muted-foreground'}>{current?.name ?? 'Sin ciclo'}</span>
        </PropertyButton>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ciclo…" />
          <CommandList>
            <CommandEmpty>No hay ciclos (créalos en la sección Ciclos)</CommandEmpty>
            <CommandGroup>
              {current && (
                <CommandItem value="__none__ sin ciclo" onSelect={() => choose(null)}>
                  <X />
                  Quitar del ciclo
                </CommandItem>
              )}
              {cycles.map((cycle) => (
                <CommandItem key={cycle.id} value={`${cycle.name} ${cycle.id}`} onSelect={() => choose(cycle.id)}>
                  <RefreshCcw className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{cycle.name}</span>
                  {cycle.id === current?.id && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ModulesPicker({ slug, projectId, issue }) {
  const { data: modules = [] } = usePlanningList('modules', slug, projectId)
  const add = useAddPlanningIssues('modules', slug, projectId)
  const remove = useRemovePlanningIssue('modules', slug, projectId)
  const selected = new Set((issue.modules ?? []).map((module) => module.id))

  const toggle = (moduleId) => {
    const options = { onError: (error) => notifyError(error) }
    if (selected.has(moduleId)) remove.mutate({ id: moduleId, issueId: issue.id }, options)
    else add.mutate({ id: moduleId, issueIds: [issue.id] }, options)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PropertyButton className="h-auto min-h-7 py-1" aria-label="Módulos">
          <Layers className="size-3.5 text-muted-foreground" />
          {issue.modules?.length ? (
            <span className="truncate">{issue.modules.map((module) => module.name).join(', ')}</span>
          ) : (
            <span className="text-muted-foreground">Sin módulos</span>
          )}
        </PropertyButton>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar módulo…" />
          <CommandList>
            <CommandEmpty>No hay módulos (créalos en la sección Módulos)</CommandEmpty>
            <CommandGroup>
              {modules.map((module) => (
                <CommandItem key={module.id} value={`${module.name} ${module.id}`} onSelect={() => toggle(module.id)}>
                  <Layers className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{module.name}</span>
                  {selected.has(module.id) && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
