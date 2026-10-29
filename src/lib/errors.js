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
 * Devuelve true si había errores por campo.
 */
export function applyFieldErrors(error, setError) {
  const { errors } = toApiError(error)
  if (!errors) return false
  Object.entries(errors).forEach(([field, message]) => {
    setError(field, { type: 'server', message })
  })
  return true
}
