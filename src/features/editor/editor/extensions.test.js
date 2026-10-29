import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { docToMarkdown } from '../markdown/serialize'
import { buildExtensions, exitMark } from './extensions'
import { codeReplacement, findText } from './findText'

let editor
afterEach(() => editor?.destroy())

/** Editor con `html` y el cursor después del texto `after` (o al final del primer párrafo). */
function setup(html, after) {
  editor = new Editor({ extensions: buildExtensions({ bridge: { current: {} } }), content: html })
  let pos = null
  editor.state.doc.descendants((node, at) => {
    if (pos == null && node.isText && after && node.text.includes(after)) pos = at + node.text.indexOf(after) + after.length
  })
  if (pos == null) pos = editor.state.doc.firstChild.nodeSize - 1
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)))
  return editor
}

const type = (text) => editor.view.dispatch(editor.state.tr.insertText(text))
const pressRight = () => exitMark(editor.state, editor.view.dispatch)
const markdown = () => docToMarkdown(editor.getJSON())

describe('salir de una marca con →', () => {
  it('al final del código, lo que se escribe después va como texto normal', () => {
    setup('<p>usa <code>npm ci</code></p>')
    type('X')
    expect(markdown()).toBe('usa `npm ciX`')
    expect(pressRight()).toBe(true)
    type(' y listo')
    expect(markdown()).toBe('usa `npm ciX` y listo')
  })

  it('en medio del texto también sale del código, y un segundo → ya mueve el cursor', () => {
    setup('<p>usa <code>npm</code> ahora</p>', 'npm')
    expect(pressRight()).toBe(true)
    expect(pressRight()).toBe(false)
    type('!')
    expect(markdown()).toBe('usa `npm`! ahora')
  })

  it('dentro del código (no al final) → se mueve como siempre', () => {
    setup('<p><code>npm ci</code></p>', 'np')
    expect(pressRight()).toBe(false)
  })

  it('negrita: sale al final de la línea, pero no en medio del texto', () => {
    setup('<p>es <strong>importante</strong></p>')
    expect(pressRight()).toBe(true)
    type(' hoy')
    expect(markdown()).toBe('es **importante** hoy')

    setup('<p>es <strong>muy</strong> importante</p>', 'muy')
    expect(pressRight()).toBe(false)
  })

  it('Enter al final del código no lo pasa a la línea siguiente', () => {
    setup('<p>corre <code>npm ci</code></p>')
    editor.commands.splitBlock()
    type('siguiente')
    expect(markdown()).toBe('corre `npm ci`\n\nsiguiente')
  })
})

describe('tablas', () => {
  it('una celda solo admite párrafos: una lista pegada queda como texto y se guarda', () => {
    setup('<table><tr><th>Col</th></tr><tr><td><ul><li>uno</li><li>dos</li></ul></td></tr></table>')
    const cell = editor.getJSON().content[0].content[1].content[0]
    expect(cell.content.every((block) => block.type === 'paragraph')).toBe(true)
    expect(markdown()).toContain('uno')
    expect(markdown()).toContain('dos')
  })
})

describe('findText (deshacer «Crear subtarea»)', () => {
  it('encuentra el código como palabra suelta, no dentro de otro más largo', () => {
    setup('<p>Ver TF-12 y luego TF-1.</p>')
    const range = findText(editor.state.doc, 'TF-1')
    expect(editor.state.doc.textBetween(range.from, range.to)).toBe('TF-1')
    expect(range.from).toBe(editor.state.doc.textContent.indexOf('TF-1.') + 1)
  })

  it('sin aparición suelta devuelve null', () => {
    setup('<p>Solo TF-12 y XTF-1</p>')
    expect(findText(editor.state.doc, 'TF-1')).toBeNull()
  })
})


describe('codeReplacement («Crear subtarea» con una selección a media palabra)', () => {
  const rangeOf = (text) => {
    const at = editor.state.doc.textContent.indexOf(text) + 1
    return { from: at, to: at + text.length }
  }

  it('si el código quedaría pegado a una letra o número, lo separa con un espacio', () => {
    setup('<p>xy ana1 ana2</p>')
    expect(codeReplacement(editor.state.doc, rangeOf('xy ana1 ana'), 'WEB-29')).toBe('WEB-29 ')
    expect(codeReplacement(editor.state.doc, rangeOf('na1 ana2'), 'WEB-29')).toBe(' WEB-29')
  })

  it('con espacios o al borde del párrafo, el código va tal cual', () => {
    setup('<p>Primer paso y más</p>')
    expect(codeReplacement(editor.state.doc, rangeOf('Primer paso'), 'WEB-28')).toBe('WEB-28')
    expect(codeReplacement(editor.state.doc, rangeOf('y más'), 'WEB-28')).toBe('WEB-28')
  })
})
