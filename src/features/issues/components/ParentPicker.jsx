import { useState } from 'react'
import { Check, CornerUpLeft, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useIssues } from '../hooks'
import { IssueTypeIcon } from './IssueTypeBits'
import { PropertyButton } from './PropertyPickers'

/** Elegir el issue padre buscando en el proyecto (por título o código). */
export function ParentPicker({ slug, projectId, issue, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const { data, isFetching } = useIssues(
    slug,
    projectId,
    { search: debounced || undefined, size: 20, sort: 'sequenceId,desc' },
    { enabled: open },
  )
  // Las historias primero (lo normal es que una tarea o un bug sea de una historia)
  const candidates = (data?.content ?? [])
    .filter((candidate) => candidate.id !== issue.id)
    .sort((a, b) => (b.type === 'STORY') - (a.type === 'STORY'))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Una historia no tiene padre */}
      <PopoverTrigger asChild disabled={disabled || issue.type === 'STORY'}>
        <PropertyButton aria-label="Tarea padre">
          <CornerUpLeft className="size-3.5 text-muted-foreground" />
          {issue.parent ? (
            <span className="truncate">
              <span className="font-mono text-muted-foreground">{issue.parent.code}</span> {issue.parent.title}
            </span>
          ) : (
            <span className="text-muted-foreground">Sin padre</span>
          )}
        </PropertyButton>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar tarea padre…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && (
              <div className="flex justify-center py-3">
                <Spinner className="text-muted-foreground" />
              </div>
            )}
            {!isFetching && <CommandEmpty>Sin resultados</CommandEmpty>}
            <CommandGroup>
              {issue.parent && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    setOpen(false)
                    onChange(null)
                  }}
                >
                  <X />
                  Quitar padre
                </CommandItem>
              )}
              {candidates.map((candidate) => (
                <CommandItem
                  key={candidate.id}
                  value={candidate.id}
                  onSelect={() => {
                    setOpen(false)
                    if (candidate.id !== issue.parent?.id) onChange(candidate.id)
                  }}
                >
                  <StateIcon group={candidate.state?.group} color={candidate.state?.color} />
                  <IssueTypeIcon issue={candidate} size={14} />
                  <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{candidate.code}</span>
                  <span className="min-w-0 flex-1 truncate">{candidate.title}</span>
                  {candidate.id === issue.parent?.id && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
