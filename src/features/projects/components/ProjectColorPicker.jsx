import { ColorSwatch } from '@/components/common/ColorPicker'
import { PROJECT_COLORS } from '../projectColors'
import { ProjectIcon } from './ProjectIcon'

/**
 * Color del proyecto: las muestras de la paleta (con ← → para moverse entre ellas) y cómo queda la pastilla con
 * el identificador.
 * @param {{ value: string, onChange: (color: string) => void, identifier?: string, disabled?: boolean }} props
 */
export function ProjectColorPicker({ value, onChange, identifier, disabled = false }) {
  const index = Math.max(0, PROJECT_COLORS.findIndex((color) => color.key === value))

  const handleKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (index + step + PROJECT_COLORS.length) % PROJECT_COLORS.length
    onChange(PROJECT_COLORS[next].key)
    event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus()
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div
        role="radiogroup"
        aria-label="Color del proyecto"
        className="flex flex-wrap gap-1.5"
        onKeyDown={handleKeyDown}
      >
        {PROJECT_COLORS.map((color, position) => {
          const selected = position === index
          return (
            <ColorSwatch
              key={color.key}
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              title={color.label}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              selected={selected}
              data-project-color={color.key}
              className="bg-(--project) ring-offset-card"
              checkClassName="text-(--project-ink)"
              onClick={() => onChange(color.key)}
            />
          )
        })}
      </div>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        Así se ve
        <ProjectIcon project={{ identifier: identifier || 'WEB', color: value }} className="tf-pop" key={value} />
      </span>
    </div>
  )
}
