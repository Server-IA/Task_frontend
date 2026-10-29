/**
 * Casillas («- [ ] …») de la descripción: marcarlas sin entrar a editar y «Pasar al checklist».
 * Se numeran en el orden del documento (las anidadas después de su madre), empezando en 0.
 */

/** @typedef {import('./parse').DocNode} DocNode */

/** Texto de una casilla (su primer párrafo), con las menciones como «@Nombre». */
export function taskItemText(item) {
  const first = item.content?.[0]
  return (first?.content ?? [])
    .map((node) => {
      if (node.type === 'text') return node.text
      if (node.type === 'hardBreak') return ' '
      if (node.type === 'mention') return `@${node.attrs?.label ?? ''}`
      return ''
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Copia del documento con `update(item, index)` aplicado a cada casilla (devuelve el nodo nuevo, o `null` para
 * quitarla). Las listas que quedan vacías se quitan.
 */
function mapTaskItems(doc, update) {
  let index = 0
  const visit = (node) => {
    if (node.type === 'taskItem') {
      const current = index
      index += 1
      // Primero las anidadas, para numerar en el orden del documento
      const children = node.content?.map(visit).filter(Boolean)
      return update({ ...node, content: children }, current)
    }
    if (!node.content) return node
    const content = node.content.map(visit).filter(Boolean)
    if (node.type === 'taskList' && content.length === 0) return null
    return { ...node, content }
  }
  const result = visit(doc)
  return result.content?.length ? result : { ...result, content: [{ type: 'paragraph' }] }
}

/**
 * Número de cada casilla en el orden del documento (el de `setTaskChecked` y `takeTaskItems`: la casilla, luego sus
 * anidadas, luego la siguiente). La vista de lectura lo calcula antes de dibujar: contar mientras React pinta
 * numeraría las anidadas después de sus hermanas.
 * @param {DocNode} doc
 * @returns {Map<DocNode, number>}
 */
export function numberTaskItems(doc) {
  const numbers = new Map()
  const visit = (node) => {
    if (node.type === 'taskItem') numbers.set(node, numbers.size)
    node.content?.forEach(visit)
  }
  if (doc) visit(doc)
  return numbers
}

/** Marca o desmarca la casilla número `index`. */
export function setTaskChecked(doc, index, checked) {
  return mapTaskItems(doc, (item, current) => (current === index ? { ...item, attrs: { ...item.attrs, checked } } : item))
}

/** Casillas del documento en orden: `{ index, text, checked }`. */
export function listTaskItems(doc) {
  const items = []
  mapTaskItems(doc, (item, index) => {
    items.push({ index, text: taskItemText(item), checked: Boolean(item.attrs?.checked) })
    return item
  })
  return items.sort((a, b) => a.index - b.index)
}

/**
 * «Pasar al checklist»: quita del documento las casillas `indexes` (con las que tengan anidadas) y devuelve sus
 * textos, en orden, para crearlas como pasos del checklist. Las vacías no se pasan. `groups[i]` es la casilla de
 * `indexes` de la que salió `items[i]` (ella misma o una que la contiene). Si no todos se pueden crear, lo que queda
 * del documento lo da `removeMovedTaskItems`.
 * @param {DocNode} doc
 * @param {number[]} indexes
 * @returns {{ doc: DocNode, items: { text: string, checked: boolean }[], groups: number[] }}
 */
export function takeTaskItems(doc, indexes) {
  const wanted = new Set(indexes)
  const taken = []
  const groups = []
  const collect = (item, group) => {
    const text = taskItemText(item)
    if (text) {
      taken.push({ text, checked: Boolean(item.attrs?.checked) })
      groups.push(group)
    }
    // Las anidadas, a cualquier profundidad (también dentro de otra lista): ninguna con texto se pierde
    const nested = (node) => (node.type === 'taskItem' ? collect(node, group) : node.content?.forEach(nested))
    item.content?.slice(1).forEach(nested)
  }
  let index = 0
  const visit = (node) => {
    if (node.type === 'taskItem') {
      const current = index
      index += 1
      if (wanted.has(current)) {
        // Las anidadas se van con ella: se cuentan para no correr la numeración
        const countNested = (child) => {
          if (child.type === 'taskItem') index += 1
          child.content?.forEach(countNested)
        }
        node.content?.forEach(countNested)
        collect(node, current)
        return null
      }
    }
    if (!node.content) return node
    const content = node.content.map(visit).filter(Boolean)
    if (node.type === 'taskList' && content.length === 0) return null
    return { ...node, content }
  }
  const result = visit(doc)
  return {
    doc: result.content?.length ? result : { ...result, content: [{ type: 'paragraph' }] },
    items: taken,
    groups,
  }
}

/**
 * Lo que queda del documento cuando de los pasos de `takeTaskItems(doc, indexes)` solo se crearon los primeros
 * `created` (se crean en orden). Se quita cada casilla cuyo paso se creó, aunque el que falló sea una anidada suya
 * (si no, ese paso quedaría dos veces: en el checklist y en la descripción); sus anidadas que no se crearon suben a su
 * lugar. Las vacías se quitan si en su grupo se creó algún paso. Las de un grupo donde no se creó ninguno no cambian.
 * Con todos creados es `takeTaskItems(doc, indexes).doc`.
 * @param {DocNode} doc
 * @param {number[]} indexes
 * @param {number} created
 * @returns {DocNode}
 */
export function removeMovedTaskItems(doc, indexes, created) {
  const taken = takeTaskItems(doc, indexes)
  // Todos creados: se quitan también las casillas vacías que se eligieron solas
  if (created >= taken.items.length) return taken.doc
  const wanted = new Set(indexes)
  const touched = new Set(taken.groups.slice(0, created))
  // Número de cada casilla cuyo paso se creó (en takeTaskItems los pasos salen en el orden de las casillas con texto)
  const createdBoxes = new Set()
  let step = 0
  let index = 0
  const lift = (nodes) => nodes.flatMap((node) => (node.type === 'taskItem' ? [node] : lift(node.content ?? [])))
  /** @returns {DocNode[]} los nodos que reemplazan a `node` */
  const visit = (node, group) => {
    if (node.type === 'taskItem') {
      const current = index
      index += 1
      const own = group ?? (wanted.has(current) ? current : null)
      const hasText = own != null && Boolean(taskItemText(node))
      if (hasText) {
        if (step < created) createdBoxes.add(current)
        step += 1
      }
      const content = (node.content ?? []).flatMap((child) => visit(child, own))
      if (own != null && touched.has(own) && (createdBoxes.has(current) || !hasText)) return lift(content.slice(1))
      return [{ ...node, content }]
    }
    if (!node.content) return [node]
    const content = node.content.flatMap((child) => visit(child, group))
    if (node.type === 'taskList' && content.length === 0) return []
    return [{ ...node, content }]
  }
  const [result] = visit(doc, null)
  return result.content?.length ? result : { ...result, content: [{ type: 'paragraph' }] }
}
