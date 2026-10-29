/**
 * Clic en la vista de lectura → el mismo lugar en el editor. Se cuenta la posición del clic en el texto (las
 * letras antes del clic, con cada mención y salto de línea como una), y el editor pone el cursor en esa misma
 * letra de su documento. Así no importa que la lectura y el editor midan un poco distinto.
 *
 * En la vista, lo que no es texto del documento lleva `data-md-ui` (casillas, botones, el lenguaje de un bloque de
 * código); las menciones llevan `data-md-atom`, las pastillas de tarea `data-md-text` con el código que hay en el
 * texto y la tarjeta de la historia `data-md-len` con las letras de la cita.
 */

/** Nodo y desplazamiento del texto bajo el punto (Chrome / Safari o Firefox). */
function caretAt(x, y) {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y)
    return range ? { node: range.startContainer, offset: range.startOffset } : null
  }
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y)
    return position ? { node: position.offsetNode, offset: position.offset } : null
  }
  return null
}

/**
 * Letras antes del punto `(x, y)` dentro de `root`, o `null` si el punto no cae en el texto.
 * @param {HTMLElement} root
 */
export function textIndexFromPoint(root, x, y) {
  const caret = caretAt(x, y)
  if (!caret || !root.contains(caret.node)) return null
  let count = 0
  let result = null
  const visit = (node) => {
    if (result != null) return
    if (node.nodeType === Node.TEXT_NODE) {
      if (node === caret.node) result = count + Math.min(caret.offset, node.length)
      else count += node.length
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = /** @type {HTMLElement} */ (node)
    const inside = element.contains(caret.node)
    if (element.hasAttribute('data-md-ui')) {
      if (inside) result = count
      return
    }
    if (element.hasAttribute('data-md-atom')) {
      if (inside) result = count + (caret.node === element ? Math.min(caret.offset, 1) : 1)
      count += 1
      return
    }
    if (element.hasAttribute('data-md-text') || element.hasAttribute('data-md-len')) {
      const length = element.hasAttribute('data-md-len') ? Number(element.getAttribute('data-md-len')) : element.getAttribute('data-md-text').length
      if (inside) result = count + length
      count += length
      return
    }
    if (element.tagName === 'BR') {
      count += 1
      return
    }
    if (element === caret.node) {
      // El punto cae entre hijos de un elemento: se cuentan los hijos anteriores
      const children = [...element.childNodes]
      children.slice(0, caret.offset).forEach(visit)
      if (result == null) result = count
      return
    }
    element.childNodes.forEach(visit)
  }
  visit(root)
  return result
}
