import { describe, expect, it } from 'vitest'
import { wordListsToHtml } from './wordPaste'

/** Un párrafo de lista como lo copia Word (Chrome deja el comentario condicional y la viñeta en un span Ignore). */
const item = (level, marker, text, cls = 'MsoListParagraphCxSpMiddle') =>
  `<p class=${cls} style='text-indent:-18.0pt;mso-list:l0 level${level} lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>${marker}<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>${text}<o:p></o:p></p>`

const clean = (html) => html.replace(/<o:p><\/o:p>/g, '').replace(/\s+</g, '<')

describe('wordListsToHtml', () => {
  it('las viñetas de Word se pegan como una lista, sin la viñeta escrita', () => {
    const html = `<p class=MsoNormal>Antes</p>\n${item(1, '·', 'Primer punto')}\n${item(1, '·', '<b>Segundo</b> punto')}\n<p class=MsoNormal>Después</p>`
    expect(clean(wordListsToHtml(html))).toBe(
      '<p class="MsoNormal">Antes</p><ul><li><p>Primer punto</p></li><li><p><b>Segundo</b> punto</p></li></ul><p class="MsoNormal">Después</p>',
    )
  })

  it('los números («1.», «a)») hacen una lista numerada y el nivel, una anidada', () => {
    const html = [item(1, '1.', 'Uno'), item(2, 'a)', 'Uno A'), item(2, 'b)', 'Uno B'), item(1, '2.', 'Dos')].join('\n')
    expect(clean(wordListsToHtml(html))).toBe(
      '<ol><li><p>Uno</p><ol><li><p>Uno A</p></li><li><p>Uno B</p></li></ol></li><li><p>Dos</p></li></ol>',
    )
  })

  it('«o» de segundo nivel es una viñeta, no una letra', () => {
    const html = [item(1, '·', 'Padre'), item(2, 'o', 'Hijo')].join('')
    expect(clean(wordListsToHtml(html))).toBe('<ul><li><p>Padre</p><ul><li><p>Hijo</p></li></ul></li></ul>')
  })

  it('dos listas separadas por un párrafo quedan como dos listas', () => {
    const html = [item(1, '·', 'A'), '<p class=MsoNormal>Texto</p>', item(1, '·', 'B')].join('')
    expect(clean(wordListsToHtml(html))).toBe('<ul><li><p>A</p></li></ul><p class="MsoNormal">Texto</p><ul><li><p>B</p></li></ul>')
  })

  it('HTML que no viene de Word queda igual', () => {
    const html = '<ul><li>uno</li></ul><p>texto</p>'
    expect(wordListsToHtml(html)).toBe(html)
  })
})
