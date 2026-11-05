/**
 * Lo que leen los lectores de pantalla al arrastrar con dnd-kit, en español (los de la librería vienen en inglés y
 * nombran los elementos por su id, un UUID).
 */

/** Cómo se arrastra con el teclado. Va en `accessibility.screenReaderInstructions` del DndContext. */
export const DND_INSTRUCTIONS = {
  draggable:
    'Para levantar este elemento, pulsa Espacio. Mientras lo arrastras, muévelo con las flechas. Pulsa Espacio de nuevo para soltarlo, o Escape para cancelar.',
}

/**
 * Anuncios del arrastre. `itemLabel(id)` nombra lo que se arrastra («WEB-12 «Arreglar el login»»); `placeLabel(overId)`
 * dice dónde quedaría (««En curso», posición 2 de 4») o null si no se sabe.
 * @param {{ itemLabel: (id: string) => string, placeLabel: (overId: string) => string | null }} labels
 */
export function dndAnnouncements({ itemLabel, placeLabel }) {
  const place = (over) => (over ? placeLabel(over.id) : null)
  return {
    onDragStart: ({ active }) => `Levantaste ${itemLabel(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const where = place(over)
      return where ? `${itemLabel(active.id)} está en ${where}.` : `${itemLabel(active.id)} ya no está sobre un lugar donde soltarlo.`
    },
    onDragEnd: ({ active, over }) => {
      const where = place(over)
      return where ? `Soltaste ${itemLabel(active.id)} en ${where}.` : `Soltaste ${itemLabel(active.id)}.`
    },
    onDragCancel: ({ active }) => `Cancelaste el arrastre. ${itemLabel(active.id)} volvió a su lugar.`,
  }
}

/**
 * Anuncios de una lista que se reordena (casillas, vistas, plantillas): el lugar es la posición en la lista.
 * @param {string[]} ids el orden actual
 * @param {(id: string) => string} itemLabel
 */
export function sortableAnnouncements(ids, itemLabel) {
  return dndAnnouncements({
    itemLabel,
    placeLabel: (overId) => {
      const index = ids.indexOf(overId)
      return index >= 0 ? `la posición ${index + 1} de ${ids.length}` : null
    },
  })
}

/** ««texto»» recortado para un anuncio. */
export function quoted(text, max = 60) {
  const value = String(text ?? '').trim()
  return `«${value.length > max ? `${value.slice(0, max - 1)}…` : value}»`
}
