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
