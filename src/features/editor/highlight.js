/**
 * Colores mínimos para los bloques de código de la vista de lectura: textos, claves («"error":», «nombre:»),
 * comentarios y signos. No es un resaltador completo (no conoce lenguajes); alcanza para JSON, YAML, JS o SQL
 * sin cargar una librería.
 */

/** Antes de `index` (sin contar espacios) hay un principio de línea, «{» o «,». */
function startsKey(code, index) {
  let at = index - 1
  while (at >= 0 && (code[at] === ' ' || code[at] === '\t')) at -= 1
  return at < 0 || code[at] === '\n' || code[at] === '{' || code[at] === ','
}

const HASH_COMMENTS =new Set(['sh', 'bash', 'shell', 'zsh', 'py', 'python', 'yaml', 'yml', 'rb', 'ruby', 'toml', 'dockerfile', 'ini', 'conf'])

/**
 * @param {string} code
 * @param {string | null} [language]
 * @returns {{ type: 'text' | 'str' | 'key' | 'comment' | 'punct', text: string }[]}
 */
export function highlightCode(code, language) {
  const lang = (language ?? '').toLowerCase()
  const comment = HASH_COMMENTS.has(lang) ? /\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*/y : /\/\/[^\n]*|\/\*[\s\S]*?\*\/|--[^\n]*/y
  const string = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/y
  const bareKey = /[A-Za-z_][\w-]*(?=\s*:(?!\/))/y
  const punct = /[{}[\](),:;]/y
  const tokens = []
  const push = (type, text) => {
    const last = tokens.at(-1)
    if (last && last.type === type) last.text += text
    else tokens.push({ type, text })
  }
  let index = 0
  while (index < code.length) {
    let matched = false
    for (const [type, regex] of [
      ['comment', comment],
      ['str', string],
      ['key', bareKey],
      ['punct', punct],
    ]) {
      // Las claves sin comillas solo al principio de una línea (YAML) o después de «{» / «,» (JS)
      if (type === 'key' && !startsKey(code, index)) continue
      regex.lastIndex = index
      const match = regex.exec(code)
      if (match && match[0]) {
        // Un texto entre comillas seguido de «:» es una clave
        const isKey = type === 'str' && /^\s*:/.test(code.slice(index + match[0].length))
        push(isKey ? 'key' : type, match[0])
        index += match[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      push('text', code[index])
      index += 1
    }
  }
  return tokens
}
