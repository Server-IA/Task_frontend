import { describe, expect, it } from 'vitest'
import { markdownToDoc } from './parse'
import { docToMarkdown } from './serialize'
import { collectTaskCodes, isTaskCode, splitTaskRefs } from './taskRefs'

const roundTrip = (markdown) => docToMarkdown(markdownToDoc(markdown))
const UUID = '0b6f6d2e-1c1a-4d4e-9a55-3f1f6a1b2c3d'

describe('Markdown: ida y vuelta', () => {
  it.each([
    ['títulos', '# Uno\n\n## Dos\n\n### Tres'],
    ['párrafos con marcas', 'Texto **negrita**, *cursiva*, ~~tachado~~ y `código`.'],
    ['enlace', 'Ver [la guía de OWASP](https://owasp.org/x) hoy'],
    ['enlace suelto', 'Ver https://owasp.org/x hoy'],
    ['lista', '- uno\n- dos\n  - dos punto uno\n- tres'],
    ['lista numerada', '1. uno\n2. dos\n3. tres'],
    ['lista numerada que empieza en 3', '3. tres\n4. cuatro'],
    ['lista de tareas', '- [ ] pendiente\n- [x] hecha\n  - [ ] anidada'],
    ['cita', '> Una decisión\n>\n> en dos párrafos'],
    ['bloque de código con lenguaje', '```json\n{ "error": "TOKEN_VENCIDO" }\n```'],
    ['separador', 'Antes\n\n---\n\nDespués'],
    ['tabla', '| Método | Ruta |\n| --- | --- |\n| POST | `/auth/recuperar` |'],
    ['salto de línea simple', 'línea uno\nlínea dos'],
    ['mención', `Lo vemos con @[Ana Gómez](${UUID}) mañana`],
    ['código de tarea', 'Igual que WEB-12 y que `WEB-13`'],
    ['tabla dentro de un punto', '- Primer punto\n\n  | Campo | Valor |\n  | --- | --- |\n  | Navegador | Chrome |\n- Segundo'],
    ['tabla dentro de un punto numerado', '1. Numerado\n\n   | Campo | Valor |\n   | --- | --- |\n   | a | b |\n2. Otro'],
    ['tabla dentro de una casilla', '- [ ] Casilla con tabla\n\n  | Paso | Hecho |\n  | --- | --- |\n  | Uno | sí |\n- [x] Otra'],
  ])('%s', (_name, markdown) => {
    expect(roundTrip(markdown)).toBe(markdown)
  })

  it('una lista de tareas con líneas en blanco no deja «[ ]» en el texto (ni lo suma al guardar)', () => {
    const markdown = '- [ ] Uno\n\n- [x] Dos'
    const doc = markdownToDoc(markdown)
    expect(doc.content[0].type).toBe('taskList')
    expect(doc.content[0].content.map((item) => [item.attrs.checked, item.content[0].content[0].text])).toEqual([
      [false, 'Uno'],
      [true, 'Dos'],
    ])
    expect(roundTrip(roundTrip(markdown))).toBe('- [ ] Uno\n- [x] Dos')
  })

  it('los títulos se leen como títulos (el esqueleto de una plantilla)', () => {
    const doc = markdownToDoc('## Pasos para reproducir\n1. Abrir /contacto\n\n## Qué pasó')
    expect(doc.content.map((node) => node.type)).toEqual(['heading', 'orderedList', 'heading'])
    expect(doc.content[0].attrs.level).toBe(2)
  })

  it('una lista de tareas es una taskList con sus casillas', () => {
    const doc = markdownToDoc('- [ ] uno\n- [x] dos')
    expect(doc.content[0].type).toBe('taskList')
    expect(doc.content[0].content.map((item) => item.attrs.checked)).toEqual([false, true])
  })

  it('las menciones son nodos con el nombre y el id', () => {
    const doc = markdownToDoc(`Hola @[Luis Muñoz Pérez](${UUID})`)
    expect(doc.content[0].content[1]).toEqual({ type: 'mention', attrs: { id: UUID, label: 'Luis Muñoz Pérez' } })
  })

  it('el texto plano de antes se lee igual (saltos de línea incluidos)', () => {
    const plain = 'Primera línea\nSegunda línea\n\nOtro párrafo'
    const doc = markdownToDoc(plain)
    expect(doc.content).toHaveLength(2)
    expect(doc.content[0].content.map((node) => node.type)).toEqual(['text', 'hardBreak', 'text'])
    expect(roundTrip(plain)).toBe(plain)
  })

  it('el HTML no se interpreta: queda como texto y se vuelve a guardar escapado', () => {
    const doc = markdownToDoc('Hola <b>mundo</b> <script>alert(1)</script>')
    const texts = doc.content[0].content
    expect(texts.every((node) => node.type === 'text' && !node.marks)).toBe(true)
    expect(texts.map((node) => node.text).join('')).toBe('Hola <b>mundo</b> <script>alert(1)</script>')
    const saved = docToMarkdown(doc)
    expect(saved).toBe('Hola \\<b>mundo\\</b> \\<script>alert(1)\\</script>')
    expect(markdownToDoc(saved)).toEqual(doc)
  })

  it('un bloque de HTML también queda como texto', () => {
    const doc = markdownToDoc('<div>hola</div>')
    expect(doc.content[0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: '<div>hola</div>' }] })
  })

  it('las entidades se leen como caracteres', () => {
    expect(markdownToDoc('Q&amp;A &lt;3').content[0].content[0].text).toBe('Q&A <3')
  })
})

describe('Markdown: escapes al guardar', () => {
  const save = (content) => docToMarkdown({ type: 'doc', content: [{ type: 'paragraph', content }] })
  const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })

  it.each([
    ['asteriscos', '2 * 3 * 4'],
    ['guion bajo en los bordes', '_no es cursiva_'],
    ['corchetes (no son enlace ni mención)', '@[Ana](x) y [ ] casilla'],
    ['principio de lista', '- no es lista'],
    ['principio de lista numerada', '1. no es lista'],
    ['principio de título', '# no es título'],
    ['principio de cita', '> no es cita'],
    ['entidad', 'escribe &amp; tal cual'],
    ['barra invertida', 'C:\\carpeta'],
    ['virgulillas', '~~no tachado~~'],
  ])('%s: el texto vuelve igual', (_name, text) => {
    const saved = save([t(text)])
    expect(markdownToDoc(saved).content[0].content).toEqual([t(text)])
  })

  it('snake_case no se escapa', () => {
    expect(save([t('usa user_id y ok')])).toBe('usa user_id y ok')
  })

  it('el espacio queda fuera de los delimitadores', () => {
    expect(save([t('hola '), t('negrita ', [{ type: 'bold' }]), t('fin')])).toBe('hola **negrita** fin')
  })

  it('una línea de guiones no convierte la anterior en título', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [t('arriba'), { type: 'hardBreak' }, t('---')] }] }
    expect(markdownToDoc(docToMarkdown(doc))).toEqual(doc)
  })

  it('marcas anidadas', () => {
    const content = [t('a '), t('b', [{ type: 'bold' }]), t('c', [{ type: 'bold' }, { type: 'italic' }]), t(' d')]
    expect(markdownToDoc(save(content)).content[0].content).toEqual(content)
  })

  it('código con comillas invertidas dentro', () => {
    const content = [t('usa '), t('a`b', [{ type: 'code' }])]
    expect(markdownToDoc(save(content)).content[0].content).toEqual(content)
  })

  it('las celdas de una tabla escapan «|»', () => {
    const cell = (type, text) => ({ type, content: [{ type: 'paragraph', content: [t(text)] }] })
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [cell('tableHeader', 'a|b'), cell('tableHeader', 'c')] },
            { type: 'tableRow', content: [cell('tableCell', '1'), cell('tableCell', '2')] },
          ],
        },
      ],
    }
    expect(markdownToDoc(docToMarkdown(doc))).toEqual(doc)
  })

  it('los párrafos vacíos no se guardan', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'heading', attrs: { level: 2 }, content: [t('Hola')] }, { type: 'paragraph' }] }
    expect(docToMarkdown(doc)).toBe('## Hola')
  })

  it('dos listas seguidas del mismo tipo no se unen', () => {
    const list = (text) => ({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [t(text)] }] }] })
    const doc = { type: 'doc', content: [list('a'), list('b')] }
    expect(markdownToDoc(docToMarkdown(doc)).content).toHaveLength(2)
  })

  it('un bloque de código que contiene ``` usa una valla más larga', () => {
    const doc = { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'md' }, content: [t('```js\nx\n```')] }] }
    expect(markdownToDoc(docToMarkdown(doc))).toEqual(doc)
  })
})

describe('Códigos de tarea', () => {
  it('reconoce los códigos sueltos', () => {
    expect(splitTaskRefs('Ver WEB-12, y también API2-7.')).toEqual([
      { type: 'text', text: 'Ver ' },
      { type: 'ref', code: 'WEB-12' },
      { type: 'text', text: ', y también ' },
      { type: 'ref', code: 'API2-7' },
      { type: 'text', text: '.' },
    ])
  })

  it('no reconoce minúsculas ni códigos pegados a otras palabras', () => {
    expect(splitTaskRefs('web-12 XWEB-12a WEB-0 a-WEB-3').every((segment) => segment.type === 'text')).toBe(true)
  })

  it('los códigos dentro de código no cuentan', () => {
    const doc = markdownToDoc('WEB-1 y `WEB-2`\n\n```\nWEB-3\n```\n\n- WEB-4 otra vez WEB-1')
    expect(collectTaskCodes(doc)).toEqual(['WEB-1', 'WEB-4'])
  })

  it('isTaskCode', () => {
    expect(isTaskCode(' WEB-12 ')).toBe(true)
    expect(isTaskCode('WEB-12 x')).toBe(false)
    expect(isTaskCode('https://x.com')).toBe(false)
  })
})

describe('Markdown: bloques que el formato no admite', () => {
  const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

  it('una lista dentro de una celda se aplana en vez de perderse', () => {
    const list = { type: 'bulletList', content: [{ type: 'listItem', content: [p('uno')] }, { type: 'listItem', content: [p('dos')] }] }
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [p('Col')] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [p('intro'), list] }] },
          ],
        },
      ],
    }
    expect(docToMarkdown(doc)).toBe('| Col |\n| --- |\n| intro • uno • dos |')
  })

  it('un bloque de código con una cerca con sangría adentro no se corta', () => {
    const text = 'Ejemplo:\n  ```js\n  code\n  ```\ndespués'
    const doc = { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'md' }, content: [{ type: 'text', text }] }] }
    const back = markdownToDoc(docToMarkdown(doc))
    expect(back.content).toEqual(doc.content)
  })
})

