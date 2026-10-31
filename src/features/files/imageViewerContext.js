import { createContext, useContext } from 'react'

/**
 * El visor de imágenes de la tarea abierta: `open(fileId)` lo abre en esa imagen (y recorre todas las de la tarea:
 * descripción, adjuntos y comentarios). Fuera de una tarea no hay visor (`null`) y la imagen se abre en otra pestaña.
 * @type {import('react').Context<{ open: (fileId: string) => void } | null>}
 */
export const ImageViewerContext = createContext(null)

export const useImageViewer = () => useContext(ImageViewerContext)
