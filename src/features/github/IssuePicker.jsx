import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/common/Loaders'
import { useIssues } from '@/features/issues/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { t } from '@/i18n'

/**
 * Elegir una tarea del proyecto buscándola por título o código. `children` es el botón que lo abre.
 * @param {{ slug: string, projectId: string, onPick: (issue: import('@/api/types').IssueResponse | null) => void,
 *           clearLabel?: string, align?: 'start' | 'end', children: React.ReactNode }} props
 *        `clearLabel`: si se pasa, ofrece esa opción para quitar la tarea elegida (`onPick(null)`)
 */
export function IssuePicker({ slug, projectId, onPick, clearLabel, align = 'start', children }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const { data, isFetching } = useIssues(
    slug,
    projectId,
    { search: debounced || undefined, size: 20, sort: 'sequenceId,desc' },
    { enabled: open },
  )
  const issues = data?.content ?? []

  const pick = (issue) => {
    setOpen(false)
    setSearch('')
    onPick(issue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align={align}>
        <Command shouldFilter={false}>
          <CommandInput placeholder={t('Buscar una tarea…')} value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && (
              <div className="flex justify-center py-3">
                <Spinner className="text-muted-foreground" />
              </div>
            )}
            {!isFetching && <CommandEmpty>{t('Sin resultados')}</CommandEmpty>}
            <CommandGroup>
              {clearLabel && (
                <CommandItem value="__none__" onSelect={() => pick(null)}>
                  <X className="text-muted-foreground size-3.5" />
                  {clearLabel}
                </CommandItem>
              )}
              {issues.map((issue) => (
                <CommandItem key={issue.id} value={issue.id} onSelect={() => pick(issue)}>
                  <span className="text-muted-foreground font-mono text-xs">{issue.code}</span>
                  <span className="truncate">{issue.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
