import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Filtro de un solo valor como pastilla, igual que los de la barra de tareas: punteada cuando está vacía
 * («+ proyecto») y oscura con su valor cuando está elegida («proyecto: Sitio web ×»).
 * @param {{ title: string, value?: string | null, onChange: (value: string | null) => void,
 *           options: { value: string, label: string, short?: string, keywords?: string, icon?: React.ReactNode }[] }} props
 */
export function SingleFilter({ title, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {chosen ? (
        <span className="flex items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
          <PopoverTrigger className="flex max-w-56 items-center gap-1.5 rounded-l-full py-1.5 pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {chosen.icon}
            <span className="truncate">
              {title}: {chosen.short ?? chosen.label}
            </span>
          </PopoverTrigger>
          <button
            type="button"
            className="rounded-r-full py-1.5 pr-3 pl-1 opacity-80 hover:opacity-100"
            onClick={() => onChange(null)}
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
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filtrar por ${title}…`} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ''} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value === value ? null : option.value)
                    setOpen(false)
                  }}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
