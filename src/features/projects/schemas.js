import { z } from 'zod'

/** Mismas reglas que el backend. */
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/
export const PROJECT_IDENTIFIER = /^[A-Za-z][A-Za-z0-9]{0,11}$/

export const STATE_GROUPS = ['BACKLOG', 'UNSTARTED', 'STARTED', 'COMPLETED', 'CANCELLED']

export const colorSchema = z.string().regex(HEX_COLOR, 'Usa el formato #RRGGBB')

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  identifier: z
    .string()
    .trim()
    .min(1, 'El identificador es obligatorio')
    .regex(PROJECT_IDENTIFIER, 'Debe empezar por letra; solo letras y números, hasta 12'),
  description: z.string().max(10000, 'La descripción es demasiado larga'),
})

export const stateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  color: colorSchema,
  group: z.enum(STATE_GROUPS),
})

export const labelSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  color: colorSchema,
})

/** «Sitio web corporativo» → «SWC»; «Marketing» → «MARK». */
export function suggestIdentifier(name) {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
  if (words.length === 0) return ''
  const raw = words.length === 1 ? words[0].slice(0, 4) : words.map((word) => word[0]).join('').slice(0, 5)
  return raw.replace(/^[0-9]+/, '')
}
