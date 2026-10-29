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
 * `indexes` de la que salió `items[i]` (ella misma o una que la contiene): si no todos se pueden crear, se sabe qué
 * casillas quitar (`movedIndexes`).
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
    item.content?.slice(1).forEach((block) => block.content?.forEach((child) => child.type === 'taskItem' && collect(child, group)))
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
 * Casillas de `indexes` que se pasaron completas al checklist cuando solo se crearon los primeros `created` pasos
 * (se crean en orden). Si se crearon todos, son todas. Si no, solo las que tenían pasos y se crearon todos: las demás
 * (y las vacías o anidadas en otra, que van con su casilla) se quedan en la descripción.
 * @param {number[]} indexes
 * @param {number[]} groups los de `takeTaskItems`
 * @param {number} created
 */
export function movedIndexes(indexes, groups, created) {
  if (created >= groups.length) return indexes
  const failed = new Set(groups.slice(created))
  const done = new Set(groups.slice(0, created))
  return indexes.filter((index) => done.has(index) && !failed.has(index))
}
