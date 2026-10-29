/**
 * Comparar dos versiones de un Markdown línea por línea (el aviso «Alguien cambió la descripción»): marca en cada
 * lado las líneas que el otro no tiene. Usa la subsecuencia común más larga; con textos muy largos (más de
 * `MAX_CELLS` comparaciones) solo compara el principio y el final que tienen en común.
 */

const MAX_CELLS = 2_000_000

/** @typedef {{ text: string, changed: boolean }} DiffLine */

/**
 * @param {string} left
 * @param {string} right
 * @returns {{ left: DiffLine[], right: DiffLine[], same: boolean }}
 */
export function diffLines(left = '', right = '') {
  const a = left.split('\n')
  const b = right.split('\n')
  const leftChanged = new Array(a.length).fill(true)
  const rightChanged = new Array(b.length).fill(true)

  // Lo que coincide al principio y al final no hace falta compararlo
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) {
    leftChanged[start] = rightChanged[start] = false
    start += 1
  }
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1
    endB -= 1
    leftChanged[endA] = rightChanged[endB] = false
  }

  const n = endA - start
  const m = endB - start
  if (n > 0 && m > 0 && n * m <= MAX_CELLS) {
    // lengths[i][j]: subsecuencia común más larga de a[start+i..] y b[start+j..]
    const lengths = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        lengths[i][j] = a[start + i] === b[start + j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < n && j < m) {
      if (a[start + i] === b[start + j]) {
        leftChanged[start + i] = rightChanged[start + j] = false
        i += 1
        j += 1
      } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
        i += 1
      } else {
        j += 1
      }
    }
  }

  return {
    left: a.map((text, index) => ({ text, changed: leftChanged[index] })),
    right: b.map((text, index) => ({ text, changed: rightChanged[index] })),
    same: left === right,
  }
}
