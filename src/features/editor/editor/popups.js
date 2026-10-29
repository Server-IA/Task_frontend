/**
 * Posición de un menú flotante del editor (el menú «/», las personas, el enlace…). Los menús van con
 * `position: absolute` dentro del contenedor del editor (así funcionan igual en el panel, la página y los
 * diálogos, y se mueven con el scroll). Debajo del ancla, o arriba si abajo no hay lugar en la ventana.
 * @param {DOMRect | null | undefined} anchor rectángulo del cursor o de la selección (coordenadas de la ventana)
 * @param {HTMLElement | null} container
 * @param {{ width?: number, height?: number, gap?: number, offsetX?: number }} [options]
 * @returns {React.CSSProperties}
 */
export function popupPosition(anchor, container, { width = 320, height = 320, gap = 6, offsetX = -6 } = {}) {
  if (!anchor || !container) return { display: 'none' }
  const box = container.getBoundingClientRect()
  const left = Math.max(0, Math.min(anchor.left - box.left + offsetX, box.width - width))
  // Lo visible es lo que deja ver el contenedor con scroll (el panel, el diálogo), no toda la ventana
  const visible = scrollParent(container)?.getBoundingClientRect()
  const bottom = Math.min(window.innerHeight, visible?.bottom ?? Infinity)
  const top = Math.max(0, visible?.top ?? 0)
  const spaceBelow = bottom - anchor.bottom
  const above = spaceBelow < height + gap && anchor.top - top > spaceBelow
  return above ? { left, bottom: box.bottom - anchor.top + gap } : { left, top: anchor.bottom - box.top + gap }
}

/**
 * Si un menú de `height` px que cuelga de `element` tiene que abrirse hacia arriba: abajo no cabe en lo visible (la
 * ventana o el contenedor con scroll, como el panel) y arriba hay más lugar.
 * @param {HTMLElement | null | undefined} element
 * @param {number} height
 */
export function opensAbove(element, height, gap = 6) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  const visible = scrollParent(element)?.getBoundingClientRect()
  const bottom = Math.min(window.innerHeight, visible?.bottom ?? Infinity)
  const top = Math.max(0, visible?.top ?? 0)
  const spaceBelow = bottom - rect.bottom
  return spaceBelow < height + gap && rect.top - top > spaceBelow
}

function scrollParent(element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}

/** Rectángulo de una posición del documento (el cursor). */
export function caretRect(view, pos) {
  try {
    const coords = view.coordsAtPos(pos)
    return { left: coords.left, right: coords.right, top: coords.top, bottom: coords.bottom }
  } catch {
    return null
  }
}
