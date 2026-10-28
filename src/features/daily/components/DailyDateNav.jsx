import { useState } from 'react'
import { parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatShortDate } from '@/lib/dates'
import { shiftWorkday, toIsoDay, weekdayDate } from '../daily'

/**
 * Fecha de la daily: día hábil anterior / siguiente (sin pasar de hoy), un calendario y volver a hoy.
 * @param {{ date: string, today: string, onChange: (date: string) => void }} props
 */
export function DailyDateNav({ date, today, onChange }) {
  const [open, setOpen] = useState(false)
  const isToday = date === today
  const next = shiftWorkday(date, 1)
  const canGoNext = !isToday && next <= today

  return (
    <div className="flex items-center gap-2">
      {!isToday && (
        <Button variant="ghost" size="sm" className="h-10 rounded-xl px-3" onClick={() => onChange(today)}>
          Hoy
        </Button>
      )}
      <div role="group" aria-label="Fecha" className="flex items-center gap-0.5 rounded-xl border bg-card p-[3px]">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-[9px]"
          aria-label="Día hábil anterior"
          title="Día hábil anterior"
          onClick={() => onChange(shiftWorkday(date, -1))}
        >
          <ChevronLeft strokeWidth={2.5} />
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Elegir fecha (${isToday ? 'hoy' : weekdayDate(date)})`}
              className="flex h-8 items-center gap-2 rounded-[9px] bg-accent-soft px-2.5 text-sm font-semibold text-accent-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {isToday ? `Hoy · ${formatShortDate(date)}` : weekdayDate(date)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              locale={es}
              selected={parseISO(date)}
              defaultMonth={parseISO(date)}
              disabled={{ after: parseISO(today) }}
              onSelect={(selected) => {
                setOpen(false)
                if (selected) onChange(toIsoDay(selected))
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-[9px] disabled:opacity-35"
          aria-label="Día hábil siguiente"
          title={canGoNext ? 'Día hábil siguiente' : undefined}
          disabled={!canGoNext}
          onClick={() => onChange(next)}
        >
          <ChevronRight strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  )
}
