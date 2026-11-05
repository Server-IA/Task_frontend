import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// El texto de las barras del roadmap sobre el relleno del avance: contraste AA (4,5:1) en los dos temas
const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')

/** Variables de un bloque (`:root {` o `.dark {`). */
function tokens(selector) {
  const start = css.indexOf(`${selector} {`)
  const block = css.slice(start, css.indexOf('\n}', start))
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value]))
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

describe('roadmap: texto sobre el avance', () => {
  for (const theme of [':root', '.dark']) {
    it(`se lee en ${theme === ':root' ? 'modo claro' : 'modo oscuro'}`, () => {
      const t = tokens(theme)
      for (const kind of ['current', 'upcoming', 'completed', 'module']) {
        expect(contrast(t[`roadmap-${kind}`], t['roadmap-on-fill']), kind).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrast(t['roadmap-draft'], t['roadmap-on-draft']), 'draft').toBeGreaterThanOrEqual(4.5)
    })
  }
})
