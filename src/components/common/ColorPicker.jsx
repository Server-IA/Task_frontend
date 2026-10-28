import { useState } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#A3A3A3',
  '#525252',
]

const HEX = /^#[0-9A-Fa-f]{6}$/

/**
 * Muestra redonda de un color, con ✓ si está elegida. El fondo va en `style` o en `className`;
 * `checkClassName` es el color del ✓ (blanco por defecto).
 */
export function ColorSwatch({ selected, className, checkClassName = 'text-white', ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-popover outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {selected && <Check className={cn('size-3.5', checkClassName)} />}
    </button>
  )
}

/** Selector de color: paleta de colores + campo hexadecimal. */
export function ColorPicker({ value, onChange, disabled, className }) {
  const [draft, setDraft] = useState(value ?? '')
  const [open, setOpen] = useState(false)

  const choose = (color) => {
    onChange(color.toUpperCase())
    setDraft(color.toUpperCase())
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(value ?? '')
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-input px-2.5 text-sm shadow-xs hover:bg-accent disabled:opacity-50',
            className,
          )}
          aria-label="Elegir color"
        >
          <span className="size-4 rounded-full border" style={{ backgroundColor: value }} />
          <span className="font-mono text-xs text-muted-foreground uppercase">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-3 p-3" align="start">
        <div className="grid grid-cols-7 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              onClick={() => {
                choose(color)
                setOpen(false)
              }}
              style={{ backgroundColor: color }}
              aria-label={color}
              selected={value?.toUpperCase() === color}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="size-6 shrink-0 rounded-full border" style={{ backgroundColor: HEX.test(draft) ? draft : value }} />
          <Input
            value={draft}
            onChange={(event) => {
              const next = event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`
              setDraft(next)
              if (HEX.test(next)) onChange(next.toUpperCase())
            }}
            maxLength={7}
            className="h-8 font-mono text-xs uppercase"
            aria-label="Color hexadecimal"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
