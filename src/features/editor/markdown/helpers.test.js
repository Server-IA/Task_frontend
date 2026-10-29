import { describe, expect, it } from 'vitest'
import { markdownToDoc } from './parse'
import { markdownToPlainText } from './plainText'
import { docToMarkdown } from './serialize'
import { listTaskItems, numberTaskItems, removeMovedTaskItems, setTaskChecked, takeTaskItems } from './taskItems'
import { parseUserStory } from './userStory'

const UUID = '0b6f6d2e-1c1a-4d4e-9a55-3f1f6a1b2c3d'

describe('markdownToPlainText', () => {
  it('quita el formato y deja una sola línea', () => {
    const markdown = '## Pasos\n1. Abrir **/contacto**\n2. Pulsar `Enviar`\n\n> nota\n\n- [ ] probar en ~~Safari~~ Chrome'
    expect(markdownToPlainText(markdown)).toBe('Pasos Abrir /contacto Pulsar Enviar nota probar en Safari Chrome')
  })

  it('un bloque por línea con singleLine: false', () => {
    expect(markdownToPlainText('# Uno\n\nDos *tres*', { singleLine: false })).toBe('Uno\nDos tres')
  })

  it('las menciones quedan como «@Nombre» o como token', () => {
    const markdown = `Hola @[Ana Gómez](${UUID}), revisa esto`
    expect(markdownToPlainText(markdown)).toBe('Hola @Ana Gómez, revisa esto')
    expect(markdownToPlainText(markdown, { mentionTokens: true })).toBe(markdown)
  })

  it('tablas y enlaces se leen como texto', () => {
    const markdown = '| Método | Ruta |\n| --- | --- |\n| POST | /auth |\n\nVer [la guía](https://owasp.org)'
    expect(markdownToPlainText(markdown)).toBe('Método · Ruta POST · /auth Ver la guía')
  })

  it('un extracto cortado no deja delimitadores sueltos', () => {
    expect(markdownToPlainText('Esto es **importa…')).toBe('Esto es importa…')
  })

  it('el texto plano de siempre no cambia', () => {
    expect(markdownToPlainText('Revisé el flujo.\nFaltan dos cosas')).toBe('Revisé el flujo. Faltan dos cosas')
  })

  it('corta con «…»', () => {
    expect(markdownToPlainText('uno dos tres cuatro', { maxLength: 8 })).toBe('uno dos…')
  })

  it('vacío', () => {
    expect(markdownToPlainText(null)).toBe('')
    expect(markdownToPlainText('')).toBe('')
  })
})

describe('parseUserStory', () => {
  const story = (markdown) => parseUserStory(markdownToDoc(markdown).content[0])

  it('detecta la historia en varias líneas', () => {
    expect(story('> **Como** persona registrada\n> **quiero** ver mi perfil\n> **para** mantener mis datos al día')).toEqual({
      como: 'persona registrada',
      quiero: 'ver mi perfil',
      para: 'mantener mis datos al día',
    })
  })

  it('y en una sola línea, o en varios párrafos de la cita', () => {
    const expected = { como: 'admin', quiero: 'exportar', para: 'auditar' }
    expect(story('> **Como** admin **quiero** exportar **para** auditar')).toEqual(expected)
    expect(story('> **Como** admin\n>\n> **quiero** exportar\n>\n> **para** auditar')).toEqual(expected)
  })

  it('acepta la negrita que sigue con el texto y las mayúsculas', () => {
    expect(story('> **Como persona** **Quiero** algo **PARA** algo más')).toEqual({ como: 'persona', quiero: 'algo', para: 'algo más' })
  })

  it('el esqueleto vacío de la plantilla también es una historia (sin texto aún)', () => {
    expect(story('> **Como**\n> **quiero**\n> **para**')).toEqual({ como: '', quiero: '', para: '' })
  })

  it('una cita normal no es una historia', () => {
    expect(story('> Como dijo Ana, quiero que esto salga para el viernes')).toBeNull()
    expect(story('> Nota: **Como** admin **quiero** x **para** y')).toBeNull()
    expect(story('> **Como** admin **quiero** exportar')).toBeNull()
  })

  it('solo las citas', () => {
    expect(story('**Como** admin **quiero** exportar **para** auditar')).toBeNull()
  })

  it('el «para» dentro del texto no corta la historia', () => {
    expect(story('> **Como** jefa\n> **quiero** un botón para exportar\n> **para** auditar')?.quiero).toBe('un botón para exportar')
  })
})

describe('Casillas de la descripción', () => {
  const markdown = '## Pendiente\n\n- [x] Plantilla del correo\n- [ ] Revisar el texto\n  - [ ] Con Luis\n- [ ] Probar con Gmail\n\nFin'

  it('se numeran en orden, con las anidadas después de su madre', () => {
    expect(listTaskItems(markdownToDoc(markdown))).toEqual([
      { index: 0, text: 'Plantilla del correo', checked: true },
      { index: 1, text: 'Revisar el texto', checked: false },
      { index: 2, text: 'Con Luis', checked: false },
      { index: 3, text: 'Probar con Gmail', checked: false },
    ])
  })

  it('marcar una casilla cambia solo esa línea del Markdown', () => {
    const doc = setTaskChecked(markdownToDoc(markdown), 3, true)
    expect(docToMarkdown(doc)).toBe(markdown.replace('- [ ] Probar', '- [x] Probar'))
  })

  it('«Pasar al checklist» quita las casillas y devuelve sus textos', () => {
    const { doc, items } = takeTaskItems(markdownToDoc(markdown), [0, 3])
    expect(items).toEqual([
      { text: 'Plantilla del correo', checked: true },
      { text: 'Probar con Gmail', checked: false },
    ])
    expect(docToMarkdown(doc)).toBe('## Pendiente\n\n- [ ] Revisar el texto\n  - [ ] Con Luis\n\nFin')
  })

  it('una casilla con anidadas se lleva las anidadas', () => {
    const { doc, items } = takeTaskItems(markdownToDoc(markdown), [1])
    expect(items.map((item) => item.text)).toEqual(['Revisar el texto', 'Con Luis'])
    expect(listTaskItems(doc).map((item) => item.text)).toEqual(['Plantilla del correo', 'Probar con Gmail'])
  })

  it('si la lista queda vacía se quita, y las menciones pasan como «@Nombre»', () => {
    const { doc, items } = takeTaskItems(markdownToDoc(`- [ ] Hablar con @[Ana](${UUID})`), [0])
    expect(items).toEqual([{ text: 'Hablar con @Ana', checked: false }])
    expect(docToMarkdown(doc)).toBe('')
  })
})

describe('Casillas: numeración y pasos que no se crearon', () => {
  const markdown = '- [ ] A\n  - [ ] A1\n- [ ] B\n- [ ] C'

  it('numberTaskItems numera en el orden del documento (la anidada antes que la hermana siguiente)', () => {
    const doc = markdownToDoc(markdown)
    const numbers = numberTaskItems(doc)
    const byText = Object.fromEntries([...numbers].map(([node, index]) => [node.content[0].content[0].text, index]))
    expect(byText).toEqual({ A: 0, A1: 1, B: 2, C: 3 })
    expect(listTaskItems(doc).map((item) => item.text)).toEqual(['A', 'A1', 'B', 'C'])
  })

  it('takeTaskItems dice de qué casilla salió cada paso', () => {
    const { items, groups } = takeTaskItems(markdownToDoc(markdown), [0, 3])
    expect(items.map((item) => item.text)).toEqual(['A', 'A1', 'C'])
    expect(groups).toEqual([0, 0, 3])
  })

  const paragraph = (text) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] })
  const list = (...items) => ({ type: 'taskList', content: items })
  const task = (text, ...nested) => ({ type: 'taskItem', attrs: { checked: false }, content: [paragraph(text), ...nested] })
  const left = (md, indexes, created) => docToMarkdown(removeMovedTaskItems(markdownToDoc(md), indexes, created))

  it('removeMovedTaskItems: con todos creados es lo mismo que takeTaskItems (también quita las vacías)', () => {
    expect(left(markdown, [0, 2, 3], 4)).toBe(docToMarkdown(takeTaskItems(markdownToDoc(markdown), [0, 2, 3]).doc))
    const withEmpty = { type: 'doc', content: [list(task('A'), task(''), task('B')), paragraph('Fin')] }
    expect(docToMarkdown(removeMovedTaskItems(withEmpty, [0, 1, 2], 2))).toBe('Fin')
  })

  it('removeMovedTaskItems: quita las casillas cuyo paso se creó y deja las demás', () => {
    // Pasos: A, A1, B, C; se crearon A, A1 y B
    expect(left(markdown, [0, 2, 3], 3)).toBe('- [ ] C')
    expect(left(markdown, [0, 2, 3], 0)).toBe(markdown)
  })

  it('removeMovedTaskItems: si falla una anidada, su madre (ya creada) sí se quita y la anidada sube a su lugar', () => {
    // A creada, A1 no: antes A se quedaba (y su paso quedaba dos veces)
    expect(left(markdown, [0, 2, 3], 1)).toBe('- [ ] A1\n- [ ] B\n- [ ] C')
    expect(left('- [x] A\n  - [ ] A1\n  - [ ] A2\n- [ ] B', [0], 2)).toBe('- [ ] A2\n- [ ] B')
  })

  it('removeMovedTaskItems: una casilla elegida junto con su madre cuenta en el grupo de la madre', () => {
    // La selección del editor tomó A y A1 (índices 0 y 1): A1 va con A, no se repite
    const { items, groups } = takeTaskItems(markdownToDoc(markdown), [0, 1])
    expect(items.map((item) => item.text)).toEqual(['A', 'A1'])
    expect(groups).toEqual([0, 0])
    expect(left(markdown, [0, 1], 1)).toBe('- [ ] A1\n- [ ] B\n- [ ] C')
    expect(left(markdown, [0, 1], 2)).toBe('- [ ] B\n- [ ] C')
  })

  it('removeMovedTaskItems: las vacías de un grupo sin pasos creados se quedan', () => {
    const untouched = { type: 'doc', content: [list(task('A', list(task(''))), task('B'))] }
    expect(removeMovedTaskItems(untouched, [0, 2], 0)).toEqual(untouched)
    // En un grupo con pasos creados, la vacía se va con ellos (y la que no se creó sube)
    const touched = { type: 'doc', content: [list(task('A', list(task(''), task('A2'))), task('B'))] }
    expect(docToMarkdown(removeMovedTaskItems(touched, [0, 3], 1))).toBe('- [ ] A2\n- [ ] B')
  })

  it('takeTaskItems también se lleva las casillas anidadas dentro de otra lista', () => {
    const { items } = takeTaskItems(markdownToDoc('- [ ] A\n  - Nota\n    - [ ] Profunda\n- [ ] B'), [0])
    expect(items.map((item) => item.text)).toEqual(['A', 'Profunda'])
  })
})

