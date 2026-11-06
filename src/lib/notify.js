import { toast } from 'sonner'
import { SESSION_EXPIRED, toApiError } from '@/lib/errors'

/**
 * Muestra un error de la API como toast. Para un 429 indica cuánto esperar y devuelve los
 * segundos (para deshabilitar el botón con useCooldown).
 */
export function notifyError(error, fallbackTitle) {
  const apiError = toApiError(error)
  // Sesión vencida: la app ya va al login, que lo dice; un toast más solo confunde
  if (apiError.code === SESSION_EXPIRED) return 0
  if (apiError.status === 429) {
    const seconds = apiError.retryAfter ?? 60
    toast.warning('Demasiados intentos', {
      description: `Espera ${seconds} segundos antes de volver a intentarlo.`,
    })
    return seconds
  }
  const message = validationDetail(apiError) ?? apiError.message
  if (fallbackTitle) {
    toast.error(fallbackTitle, { description: message })
  } else {
    toast.error(message)
  }
  return 0
}

/**
 * Un 400 de validación trae «Datos inválidos» y el detalle por campo (`errors`). Fuera de un formulario no hay campo
 * donde mostrarlo: el toast dice qué falló («El título no puede superar 255 caracteres») en vez del mensaje general.
 */
function validationDetail(apiError) {
  if (apiError.status !== 400 || !apiError.errors) return null
  const messages = [...new Set(Object.values(apiError.errors).filter((value) => typeof value === 'string' && value))]
  return messages.length ? messages.slice(0, 2).join(' · ') : null
}
