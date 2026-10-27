import { cn } from '@/lib/utils'

/** Reglas de la contraseña (las mismas del backend) con su estado para el valor escrito. */
export function passwordChecks(value = '') {
  return [
    { label: 'al menos 8 caracteres', ok: value.length >= 8 },
    { label: 'una letra y un número', ok: /[A-Za-z]/.test(value) && /[0-9]/.test(value) },
  ]
}

/** Fuerza aproximada de 0 a 4: largo, letras + números, 12+ caracteres y mayúsculas o símbolos. */
function strength(value = '') {
  if (!value) return 0
  return [
    value.length >= 8,
    /[A-Za-z]/.test(value) && /[0-9]/.test(value),
    value.length >= 12,
    /[A-Z]/.test(value) && /[a-z]/.test(value) ? true : /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length
}

/** Lista «✓ al menos 8 caracteres» y, si `meter`, la barra de fuerza de cuatro tramos. */
export function PasswordRules({ value, meter = false, className }) {
  const score = strength(value)
  return (
    <div className={cn('space-y-2', className)}>
      {meter && (
        <div aria-hidden="true" className="flex gap-1">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn('h-1 flex-1 rounded-full bg-column', step <= score && (score >= 3 ? 'bg-ok-dot' : 'bg-soon'))}
            />
          ))}
        </div>
      )}
      <ul aria-label="Requisitos de la contraseña" className="space-y-1 font-mono text-xs">
        {passwordChecks(value).map((check) => (
          <li key={check.label} className={cn('flex gap-2', check.ok ? 'text-ok' : 'text-muted-foreground')}>
            <span aria-hidden="true">{check.ok ? '✓' : '·'}</span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
