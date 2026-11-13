/**
 * Esta pestaña. Va en cada petición (`X-Client-Id`) y el servidor la devuelve en el aviso en tiempo real del cambio
 * (`origin`): así la pestaña que hizo algo no vuelve a pedir lo que ya actualizó ella misma.
 */
export const CLIENT_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
