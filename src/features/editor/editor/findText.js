const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Primera aparición de `search` como palabra suelta en el documento (ProseMirror): su rango. Un código de tarea
 * no se confunde con otro que lo contiene («TF-1» no es parte de «TF-12» ni de «XTF-1»).
 * @param {import('@tiptap/pm/model').Node} doc
 * @param {string} search
 * @returns {{ from: number, to: number } | null}
 */
export function findText(doc, search) {
  const pattern = new RegExp(`(?<![\\w-])${escapeRegExp(search)}(?![\\w-])`)
  let found = null
  doc.descendants((node, pos) => {
    if (found) return false
    if (node.isText) {
      const match = pattern.exec(node.text)
      if (match) found = { from: pos + match.index, to: pos + match.index + search.length }
    }
    return true
  })
  return found
}

const WORD_CHAR = /[\w-]/

/**
 * El código que reemplaza al texto de `range` («Crear subtarea»), con un espacio antes o después si quedaría pegado
 * a una letra, un número o un guion: «xy ana» + «2» no debe quedar «WEB-292» (otro código, y el deshacer ya no lo
 * encuentra).
 * @param {import('@tiptap/pm/model').Node} doc
 * @param {{ from: number, to: number }} range
 * @param {string} code
 */
export function codeReplacement(doc, range, code) {
  const before = range.from > 0 ? doc.textBetween(Math.max(0, range.from - 1), range.from, '\n', '\n') : ''
  const after = range.to < doc.content.size ? doc.textBetween(range.to, Math.min(doc.content.size, range.to + 1), '\n', '\n') : ''
  return `${WORD_CHAR.test(before) ? ' ' : ''}${code}${WORD_CHAR.test(after) ? ' ' : ''}`
}
