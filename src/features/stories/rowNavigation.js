/**
 * Fila a la que van j/k en la lista de historias. Si ninguna fila tiene el foco (recién entras a la página o
 * hiciste clic en otro lado), la tecla va a la última que lo tuvo —al entrar, la primera— en vez de saltársela.
 * @param {{ current: number, step: number, count: number, onRow: boolean }} args
 */
export function nextRowIndex({ current, step, count, onRow }) {
  if (count <= 0) return 0
  const target = onRow ? current + step : current
  return Math.max(0, Math.min(count - 1, target))
}
