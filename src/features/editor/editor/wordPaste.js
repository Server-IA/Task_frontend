/**
 * Listas pegadas desde Word. Word no copia `<ul>`/`<ol>`: cada elemento es un párrafo con `mso-list:l0 level1 lfo1`
 * y la viñeta escrita a mano adentro («·», «o», «§», «1.», «a)»), en un `<span style="mso-list:Ignore">`. Sin esto
 * se pegaban como párrafos sueltos que empiezan con «·    ». Se arman las listas de verdad (con su nivel) y se quita
 * la viñeta; lo demás del HTML queda igual.
 */

const LEVEL = /mso-list:\s*l\d+\s+level(\d+)/i
/** «1.», «10)», «a.», «iv)»: numerada. Lo demás («·», «o», «§», «-», «•») es una viñeta. */
const ORDERED_MARKER = /^[0-9a-z]{1,4}[.)]$/i

const levelOf = (element) => {
  if (element.nodeType !== 1 || element.tagName !== 'P') return 0
  const match = LEVEL.exec(element.getAttribute('style') ?? '')
  return match ? Number(match[1]) : 0
}

/** Quita la viñeta (y los comentarios condicionales de Word) y dice si era un número. */
function takeMarker(paragraph) {
  let marker = ''
  for (const span of paragraph.querySelectorAll('[style*="mso-list"]')) {
    if (!/mso-list:\s*ignore/i.test(span.getAttribute('style') ?? '')) continue
    marker ||= span.textContent.replace(/\s+/g, ' ').trim()
    // La viñeta suele ir envuelta en otro span (con la fuente Symbol): se va el envoltorio si queda vacío
    const wrapper = span.parentElement
    span.remove()
    if (wrapper && wrapper !== paragraph && !wrapper.textContent.trim() && !wrapper.querySelector('img')) wrapper.remove()
  }
  for (const node of [...paragraph.childNodes]) {
    if (node.nodeType === 8) node.remove()
  }
  return ORDERED_MARKER.test(marker)
}

/** Agrupa una tira de párrafos de lista seguidos en listas anidadas. */
function buildList(doc, items) {
  const root = doc.createElement(items[0].ordered ? 'ol' : 'ul')
  const stack = [{ level: items[0].level, list: root }]
  for (const { paragraph, level, ordered } of items) {
    while (stack.length > 1 && level < stack.at(-1).level) stack.pop()
    let top = stack.at(-1)
    if (level > top.level) {
      let parentItem = top.list.lastElementChild
      if (!parentItem) {
        parentItem = doc.createElement('li')
        top.list.append(parentItem)
      }
      const nested = doc.createElement(ordered ? 'ol' : 'ul')
      parentItem.append(nested)
      top = { level, list: nested }
      stack.push(top)
    }
    const item = doc.createElement('li')
    const content = doc.createElement('p')
    content.append(...paragraph.childNodes)
    item.append(content)
    top.list.append(item)
  }
  return root
}

/**
 * HTML del portapapeles → el mismo HTML con las listas de Word como `<ul>`/`<ol>`. Si no viene de Word, sin cambios.
 * @param {string} html
 */
export function wordListsToHtml(html) {
  if (!html || !/mso-list/i.test(html) || typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const paragraphs = [...doc.body.querySelectorAll('p')].filter((paragraph) => levelOf(paragraph) > 0)
  if (paragraphs.length === 0) return html

  const done = new Set()
  for (const first of paragraphs) {
    if (done.has(first)) continue
    // La tira: este párrafo y los de lista que le siguen (sin contar espacios entre ellos)
    const items = []
    // Los saltos de línea entre los párrafos de la tira también se van (no los que siguen al último)
    const between = []
    let pending = []
    let node = first
    while (node) {
      if (node.nodeType === 3 && !node.textContent.trim()) {
        pending.push(node)
        node = node.nextSibling
        continue
      }
      const level = levelOf(node)
      if (!level) break
      between.push(...pending)
      pending = []
      items.push({ paragraph: node, level, ordered: false })
      done.add(node)
      node = node.nextSibling
    }
    for (const item of items) item.ordered = takeMarker(item.paragraph)
    const list = buildList(doc, items)
    first.before(list)
    for (const item of items) item.paragraph.remove()
    for (const gap of between) gap.remove()
  }
  return doc.body.innerHTML
}
