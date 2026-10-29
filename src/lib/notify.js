import { toast } from 'sonner'
import { toApiError } from '@/lib/errors'

/**
 * Muestra un error de la API como toast. Para un 429 indica cuánto esperar y devuelve los
 * segundos (para deshabilitar el botón con useCooldown).
 */
export function notifyError(error, fallbackTitle) {
  const apiError = toApiError(error)
  if (apiError.status === 429) {
    const seconds = apiError.retryAfter ?? 60
    toast.warning('Demasiados intentos', {
      description: `Espera ${seconds} segundos antes de volver a intentarlo.`,
    })
    return seconds
  }
  if (fallbackTitle) {
    toast.error(fallbackTitle, { description: apiError.message })
  } else {
    toast.error(apiError.message)
  }
  return 0
}
