/**
 * Códigos de tarea («WEB-12») dentro del texto. Se guardan como texto plano y la vista los dibuja como pastilla
 * cuando la tarea existe en el workspace. Nunca dentro de código (`WEB-12` o un bloque de código).
 */

/** Identificador del proyecto (letra y hasta 12 letras o números, en mayúsculas), guion y número. */
const CODE = '[A-Z][A-Z0-9]{0,11}-[1-9][0-9]{0,8}'
const CODE_IN_TEXT = new RegExp(`(?<![\\p{L}\\p{N}_-])(${CODE})(?![\\p{L}\\p{N}_]|-[\\p{L}\\p{N}])`, 'gu')
const CODE_ONLY = new RegExp(`^${CODE}$`)

/** Si el texto es exactamente un código de tarea («WEB-12», sin espacios). */
export const isTaskCode = (value = '') => CODE_ONLY.test(value.trim())

/**
 * Divide un texto en trozos de texto y códigos de tarea.
 * @param {string} text
 * @returns {({ type: 'text', text: string } | { type: 'ref', code: string })[]}
 */
export function splitTaskRefs(text = '') {
  const segments = []
  let last = 0
  for (const match of text.matchAll(CODE_IN_TEXT)) {
    if (match.index > last) segments.push({ type: 'text', text: text.slice(last, match.index) })
    segments.push({ type: 'ref', code: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) })
  return segments
}

/** Rangos `[desde, hasta)` de los códigos dentro de un texto (para resaltarlos en el editor). */
export function taskRefRanges(text = '') {
  return [...text.matchAll(CODE_IN_TEXT)].map((match) => [match.index, match.index + match[0].length])
}

/**
 * Códigos que aparecen en el documento, sin repetir y en orden, fuera del código.
 * @param {import('./parse').DocNode} doc
 * @returns {string[]}
 */
export function collectTaskCodes(doc) {
  const codes = new Set()
  const visit = (node) => {
    if (node.type === 'codeBlock') return
    if (node.type === 'text') {
      if (node.marks?.some((mark) => mark.type === 'code')) return
      for (const segment of splitTaskRefs(node.text)) if (segment.type === 'ref') codes.add(segment.code)
      return
    }
    node.content?.forEach(visit)
  }
  if (doc) visit(doc)
  return [...codes]
}
