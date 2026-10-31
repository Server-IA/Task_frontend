import { afterEach, describe, expect, it } from 'vitest'
import { popupPosition } from './popups'

const rect = (top, bottom, left = 0, width = 600) => ({ top, bottom, left, right: left + width, width, height: bottom - top })

/** Un contenedor con scroll (como el diálogo «Nueva tarea») que deja ver de `top` a `bottom`, con el editor adentro. */
function setup({ top, bottom, editor }) {
  const dialog = document.createElement('div')
  dialog.style.overflowY = 'auto'
  dialog.getBoundingClientRect = () => rect(top, bottom)
  const container = document.createElement('div')
  container.getBoundingClientRect = () => editor
  dialog.appendChild(container)
  document.body.appendChild(dialog)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('popupPosition', () => {
  it('con fit, un menú abierto hacia arriba se achica al lugar que queda sobre el cursor', () => {
    const container = setup({ top: 97, bottom: 815, editor: rect(250, 530) })
    const style = popupPosition(rect(500, 520, 20, 2), container, { width: 330, height: 420, fit: true })
    expect(style.bottom).toBeDefined()
    // 500 (cursor) - 97 (borde del diálogo) - 6 (separación) - 4 = 393: no se sale por arriba
    expect(style.maxHeight).toBe(393)
  })

  it('con lugar de sobra no limita más que la altura pedida', () => {
    const container = setup({ top: 0, bottom: 900, editor: rect(100, 300) })
    const style = popupPosition(rect(120, 140, 20, 2), container, { width: 330, height: 420, fit: true })
    expect(style.top).toBeDefined()
    expect(style.maxHeight).toBe(420)
  })

  it('sin fit no agrega maxHeight', () => {
    const container = setup({ top: 97, bottom: 815, editor: rect(250, 530) })
    expect(popupPosition(rect(500, 520, 20, 2), container, { height: 260 })).not.toHaveProperty('maxHeight')
  })
})
