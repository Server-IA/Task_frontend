/**
 * Lo que leen los lectores de pantalla al arrastrar con dnd-kit, en el idioma elegido (los de la librería vienen solo
 * en inglés y nombran los elementos por su id, un UUID).
 */
import { t } from '@/i18n'

/** Cómo se arrastra con el teclado. Va en `accessibility.screenReaderInstructions` del DndContext. */
export const DND_INSTRUCTIONS = {
  draggable: t(
    'Para levantar este elemento, pulsa Espacio. Mientras lo arrastras, muévelo con las flechas. Pulsa Espacio de nuevo para soltarlo, o Escape para cancelar.',
  ),
}

/**
 * Cómo se presenta lo que se arrastra (`aria-roledescription`; el de dnd-kit dice «sortable», en inglés). Va en
 * `useSortable({ attributes: { roleDescription } })`.
 */
export const DRAG_ROLE = {
  card: t('tarjeta arrastrable'),
  item: t('elemento arrastrable'),
}

/**
 * Anuncios del arrastre. `itemLabel(id)` nombra lo que se arrastra («WEB-12 «Arreglar el login»»); `placeLabel(overId)`
 * dice dónde quedaría (««En curso», posición 2 de 4») o null si no se sabe.
 * @param {{ itemLabel: (id: string) => string, placeLabel: (overId: string) => string | null }} labels
 */
export function dndAnnouncements({ itemLabel, placeLabel }) {
  const place = (over) => (over ? placeLabel(over.id) : null)
  return {
    onDragStart: ({ active }) => t('Levantaste {item}.', { item: itemLabel(active.id) }),
    onDragOver: ({ active, over }) => {
      const where = place(over)
      const item = itemLabel(active.id)
      return where ? t('{item} está en {where}.', { item, where }) : t('{item} ya no está sobre un lugar donde soltarlo.', { item })
    },
    onDragEnd: ({ active, over }) => {
      const where = place(over)
      const item = itemLabel(active.id)
      return where ? t('Soltaste {item} en {where}.', { item, where }) : t('Soltaste {item}.', { item })
    },
    onDragCancel: ({ active }) => t('Cancelaste el arrastre. {item} volvió a su lugar.', { item: itemLabel(active.id) }),
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
      return index >= 0 ? t('la posición {position} de {total}', { position: index + 1, total: ids.length }) : null
    },
  })
}

/** ««texto»» recortado para un anuncio (en inglés, con comillas “ ”). */
export function quoted(text, max = 60) {
  const value = String(text ?? '').trim()
  return t('«{text}»', { text: value.length > max ? `${value.slice(0, max - 1)}…` : value })
}
