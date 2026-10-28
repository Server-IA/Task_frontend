/** En Mac el modificador de los atajos es ⌘; en los demás sistemas, Ctrl. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Atajo de la paleta de búsqueda y comandos, como se muestra en la interfaz. */
export const COMMAND_SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K'
