/**
 * Cálculos de los gráficos de estadísticas (SVG hecho a mano, sin librería de gráficos).
 * Funciones puras: reciben números y devuelven escalas, rutas y textos.
 */

/**
 * Escala del eje Y para conteos (enteros): máximo «redondo» y sus marcas, p. ej. 9 → 0 / 5 / 10.
 * @param {number} maxValue mayor valor de los datos
 * @param {number} segments cuántos tramos entre marcas (2 = tres marcas)
 * @returns {{ max: number, ticks: number[] }}
 */
export function niceScale(maxValue, segments = 2) {
  const raw = Math.max(maxValue, 1) / segments
  // Los conteos son enteros: el paso nunca baja de 1
  const magnitude = Math.max(1, 10 ** Math.floor(Math.log10(raw)))
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw)
  const max = step * segments
  return { max, ticks: Array.from({ length: segments + 1 }, (_, index) => index * step) }
}

/**
 * Ruta de una barra vertical con la punta redondeada y la base recta (crece desde el eje).
 * Si la barra es más baja que el radio, el radio se achica para no salirse.
 */
export function barPath(x, y, width, baseline, radius = 4) {
  const height = baseline - y
  if (height <= 0) return ''
  const r = Math.min(radius, height, width / 2)
  return [
    `M${x},${baseline}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${baseline}`,
    'Z',
  ].join(' ')
}

/** Ruta de una línea que une los puntos en orden. */
export function linePath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)},${round(y)}`).join(' ')
}

/** Índice del valor de `positions` (ordenadas) más cercano a `x`: el crosshair salta al dato más próximo. */
export function nearestIndex(positions, x) {
  let best = 0
  positions.forEach((position, index) => {
    if (Math.abs(position - x) < Math.abs(positions[best] - x)) best = index
  })
  return best
}

/** Tareas que deberían quedar en el día `day` (0 = inicio) si se cerraran al mismo ritmo hasta `days`. */
export function idealRemaining(total, day, days) {
  if (days <= 0) return 0
  return Math.max(0, total - (total * day) / days)
}

const decimal = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

/** «3,4» (un decimal como mucho, coma decimal). */
export function formatDecimal(value) {
  return decimal.format(value)
}

/** Diferencia con signo para los indicadores: «+3», «−0,6» (signo menos tipográfico) o «±0». */
export function formatDelta(value) {
  if (value === 0) return '±0'
  const text = formatDecimal(Math.abs(value))
  return value > 0 ? `+${text}` : `−${text}`
}

/** Promedio de una lista de números (0 si está vacía). */
export function average(values) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

/** Porcentaje entero de `part` sobre `total` (0 si el total es 0). */
export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

const round = (value) => Math.round(value * 10) / 10
