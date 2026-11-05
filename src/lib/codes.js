/**
 * Código de ejemplo para las ayudas («pega un código como PORT-12»): con el identificador del proyecto actual o, si no
 * se conoce, uno genérico.
 * @param {string | null | undefined} identifier
 */
export function exampleCode(identifier) {
  const prefix = String(identifier ?? '').trim().toUpperCase()
  return `${prefix || 'PROY'}-12`
}

/** El identificador de proyecto de un código de tarea («PORT-12» → «PORT»). */
export function identifierOf(code) {
  const match = /^([A-Za-z][A-Za-z0-9]*)-\d+$/.exec(String(code ?? '').trim())
  return match ? match[1] : null
}
