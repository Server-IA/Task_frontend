import { describe, expect, it } from 'vitest'
import en, { AREAS } from './en'

/**
 * Comprueba que el inglés esté completo: toda clave que el código le pasa a `t`, `tn`, `tc`, `tx` o `msg` como texto
 * literal tiene su traducción, las variables `{x}` de cada traducción son las de su clave y una misma clave no se
 * traduce distinto en dos áreas.
 */

const sources = import.meta.glob(['../**/*.{js,jsx}', '!../**/*.test.{js,jsx}', '!../i18n/**', '!../test/**'], {
  query: '?raw',
  eager: true,
  import: 'default',
})

const LITERAL = String.raw`'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|` + '`((?:[^`\\\\$]|\\\\.)*)`'
const literal = () => `(?:${LITERAL})`
const unescape = (raw) => raw.replace(/\\(n|.)/g, (match, char) => (char === 'n' ? '\n' : char))
const value = (groups) => unescape(groups.find((group) => group !== undefined) ?? '')

/** Las claves literales de un archivo: [{ key, call }]. */
function keysOf(code) {
  const found = []
  const scan = (pattern, toKeys) => {
    for (const match of code.matchAll(new RegExp(pattern, 'g'))) found.push(...toKeys(match.slice(1)).map((key) => ({ key, call: match[0].slice(0, 80) })))
  }
  // t('…'), tx('…'), msg('…'): el primer argumento
  scan(String.raw`(?<![\w.$])(?:t|tx|msg)\(\s*${literal()}`, (groups) => [value(groups)])
  // tn(cuenta, 'singular', 'plural'): la cuenta es una expresión sin comas
  scan(String.raw`(?<![\w.$])tn\(\s*[^,()]+(?:\([^()]*\))?[^,()]*,\s*${literal()}\s*,\s*${literal()}`, (groups) => [value(groups.slice(0, 3)), value(groups.slice(3))])
  // tc('contexto', 'texto')
  scan(String.raw`(?<![\w.$])tc\(\s*${literal()}\s*,\s*${literal()}`, (groups) => [`${value(groups.slice(3))} [[${value(groups.slice(0, 3))}]]`])
  return found
}

const placeholders = (text) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort()

describe('idiomas: el inglés está completo', () => {
  it('cada texto del código tiene su traducción', () => {
    const missing = []
    for (const [path, code] of Object.entries(sources)) {
      for (const { key } of keysOf(code)) {
        if (!(key in en)) missing.push(`${path.replace('../', 'src/')}: ${JSON.stringify(key)}`)
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })

  it('las llamadas a tn y tc se pueden leer (la cuenta sin comas, los textos literales)', () => {
    const unreadable = []
    for (const [path, code] of Object.entries(sources)) {
      const calls = [...code.matchAll(/(?<![\w.$])(tn|tc)\(/g)].length
      const read = keysOf(code).filter(({ call }) => /^(tn|tc)\(/.test(call)).length
      const expected = [...code.matchAll(/(?<![\w.$])tn\(/g)].length * 2 + [...code.matchAll(/(?<![\w.$])tc\(/g)].length
      if (calls > 0 && read !== expected) unreadable.push(path.replace('../', 'src/'))
    }
    expect(unreadable).toEqual([])
  })

  it('ningún texto se arma pegando pedazos dentro de t()', () => {
    const glued = []
    for (const [path, code] of Object.entries(sources)) {
      for (const match of code.matchAll(new RegExp(String.raw`(?<![\w.$])(?:t|tx)\(\s*${literal()}\s*\+`, 'g'))) {
        glued.push(`${path.replace('../', 'src/')}: ${match[0].slice(0, 60)}`)
      }
    }
    expect(glued).toEqual([])
  })

  it('cada traducción usa las mismas variables que su clave', () => {
    const wrong = Object.entries(en)
      .filter(([key, translation]) => placeholders(key).join() !== placeholders(translation).join())
      .map(([key]) => key)
    expect(wrong).toEqual([])
  })

  it('ninguna traducción quedó vacía', () => {
    expect(Object.entries(en).filter(([, translation]) => typeof translation !== 'string' || translation.trim() === '').map(([key]) => key)).toEqual([])
  })

  it('una misma clave se traduce igual en todas las áreas', () => {
    const seen = new Map()
    const conflicts = []
    for (const [area, dictionary] of Object.entries(AREAS)) {
      for (const [key, translation] of Object.entries(dictionary)) {
        if (seen.has(key) && seen.get(key).translation !== translation) conflicts.push(`${JSON.stringify(key)}: ${seen.get(key).area} ≠ ${area}`)
        else seen.set(key, { area, translation })
      }
    }
    expect(conflicts).toEqual([])
  })
})
