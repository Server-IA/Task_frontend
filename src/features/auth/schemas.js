import { z } from 'zod'
import { t } from '@/i18n'

/** Mismas reglas que el backend: 8 a 72 caracteres, al menos una letra y un número. */
export const passwordSchema = z
  .string()
  .min(8, t('Debe tener al menos 8 caracteres'))
  .max(72, t('Debe tener como máximo 72 caracteres'))
  .regex(/[A-Za-z]/, t('Debe incluir al menos una letra'))
  .regex(/[0-9]/, t('Debe incluir al menos un número'))

export const emailSchema = z.string().trim().min(1, t('El correo es obligatorio')).email(t('El correo no es válido'))

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, t('La contraseña es obligatoria')),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, t('El nombre es obligatorio')).max(120, t('Máximo 120 caracteres')),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: t('Las contraseñas no coinciden'),
  })

export const emailOnlySchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: t('Las contraseñas no coinciden'),
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, t('Ingresa tu contraseña actual')),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: t('Las contraseñas no coinciden'),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: t('Debe ser distinta de la actual'),
  })

/** La foto de perfil no va aquí: se sube aparte (`POST /users/me/avatar`). */
export const profileSchema = z.object({
  fullName: z.string().trim().min(1, t('El nombre es obligatorio')).max(120, t('Máximo 120 caracteres')),
})
