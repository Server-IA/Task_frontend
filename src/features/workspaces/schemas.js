import { z } from 'zod'
import { emailSchema } from '@/features/auth/schemas'
import { t } from '@/i18n'
import { RESERVED_SLUGS, SLUG_PATTERN } from '@/lib/slug'

export const slugSchema = z
  .string()
  .trim()
  .min(3, t('Mínimo 3 caracteres'))
  .max(48, t('Máximo 48 caracteres'))
  .regex(SLUG_PATTERN, t('Solo minúsculas, números y guiones (ej. mi-equipo)'))
  .refine((value) => !RESERVED_SLUGS.has(value), t('Ese slug está reservado, elige otro'))

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, t('El nombre es obligatorio')).max(80, t('Máximo 80 caracteres')),
  slug: slugSchema,
})

/** Invitar: solo el correo. Las personas entran como miembros; el project manager cambia el rol después. */
export const inviteSchema = z.object({
  email: emailSchema,
})
