/**
 * Errores de la API normalizados al formato del backend:
 * `{ status, message, errors?, retryAfter?, code? }`; `data` es el cuerpo tal cual (por ejemplo, el 409 de una
 * descripción que cambió trae la versión actual).
 */

const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Revisa tu conexión.'
const UNEXPECTED_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo.'

export class ApiError extends Error {
  constructor({ status, message, errors = null, retryAfter = null, code = null, data = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.retryAfter = retryAfter
    this.code = code
    this.data = data
  }
}

/** Código del error de una petición que falló porque la sesión venció (el refresh ya no sirve): no se avisa con un toast. */
export const SESSION_EXPIRED = 'SESSION_EXPIRED'
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Vuelve a iniciar sesión.'

/** Si el error es el de una sesión vencida (la app ya lleva al login y lo dice ahí). */
export function isSessionExpired(error) {
  return toApiError(error).code === SESSION_EXPIRED
}

/** Convierte un error de axios (o cualquier otro) en un ApiError. */
export function toApiError(error) {
  if (error instanceof ApiError) return error

  const response = error?.response
  if (!response) {
    return new ApiError({ status: 0, message: NETWORK_MESSAGE })
  }

  const data = response.data ?? {}
  const retryAfterHeader = response.headers?.['retry-after']
  return new ApiError({
    status: response.status,
    message: data.message ?? UNEXPECTED_MESSAGE,
    errors: data.errors ?? null,
    retryAfter: retryAfterHeader ? Number(retryAfterHeader) : null,
    code: data.code ?? null,
    data,
  })
}

/** Mensaje listo para mostrar en un toast. */
export function getErrorMessage(error) {
  return toApiError(error).message
}

/**
 * Pinta en los campos del formulario los errores de validación del backend.
 * Devuelve true si había errores por campo y todos se pudieron mostrar.
 * @param {{ aliases?: Record<string, string>, fields?: string[] }} [options] `aliases`: nombre del campo en la API →
 *   en el formulario; `fields`: los campos que tiene el formulario (los demás errores se avisan aparte).
 */
export function applyFieldErrors(error, setError, { aliases = {}, fields } = {}) {
  const { errors } = toApiError(error)
  if (!errors) return false
  let unshown = false
  Object.entries(errors).forEach(([apiField, message]) => {
    // El backend puede nombrar el campo distinto que el formulario (un módulo manda targetDate; el form usa endDate)
    const field = aliases[apiField] ?? apiField
    if (fields && !fields.includes(field)) {
      unshown = true
      return
    }
    setError(field, { type: 'server', message })
  })
  // Con `fields`, un error de un campo que el formulario no tiene se avisa aparte (si no, el guardado fallaba en silencio)
  return !unshown
}

/**
 * El mensaje como oración, para seguirlo con otra: con punto final si no lo trae (el backend a veces lo omite y
 * quedaba «… ya expiró Pide un enlace nuevo»).
 */
export function asSentence(message) {
  const text = String(message ?? '').trim()
  if (!text) return ''
  return /[.!?…]$/.test(text) ? text : `${text}.`
}
