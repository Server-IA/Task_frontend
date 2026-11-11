/**
 * Diccionario en inglés: cada clave es el texto en español tal como está en el código y su valor, la traducción.
 * Va partido por área (un archivo por carpeta de `features`, más los comunes) para que cada pantalla tenga lo suyo a
 * mano. Si la misma clave está en dos áreas, debe traducirse igual en las dos (lo comprueba `coverage.test.js`).
 */
const areas = import.meta.glob('./*.js', { eager: true, import: 'default' })

/** Cada área con su diccionario, para las comprobaciones. */
export const AREAS = Object.fromEntries(
  Object.entries(areas)
    .filter(([path]) => path !== './index.js')
    .map(([path, dictionary]) => [path.slice(2, -3), dictionary]),
)

export default Object.assign({}, ...Object.values(AREAS))
