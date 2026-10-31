import { useMemo } from 'react'
import { toast } from 'sonner'
import { notifyError } from '@/lib/notify'
import { openActionOf } from './attachmentView'
import { downloadFile, openFileInNewTab } from './fileUrls'
import { useImageViewer } from './imageViewerContext'

/** Un error al abrir o descargar: los de la API con su mensaje; los demás («ya no existe») tal cual. */
export function notifyFileError(error) {
  if (error?.response || !error?.message) notifyError(error)
  else toast.error(error.message)
}

const run = (action) => Promise.resolve().then(action).catch(notifyFileError)

/**
 * Abrir y descargar archivos de la tarea. `open` hace lo de un clic: las imágenes van al visor de la tarea (fuera de
 * una tarea, a otra pestaña), los PDF a otra pestaña y el resto se descarga.
 * @returns {{ open: (file: { id: string, contentType?: string, fileName?: string, image?: boolean }) => void,
 *             download: (id: string) => void, openInTab: (id: string) => void }}
 */
export function useFileActions() {
  const viewer = useImageViewer()
  return useMemo(() => {
    const download = (id) => run(() => downloadFile(id))
    const openInTab = (id) => run(() => openFileInNewTab(id))
    const open = (file) => {
      const action = openActionOf(file)
      if (action === 'viewer' && viewer) viewer.open(file.id)
      else if (action === 'download') download(file.id)
      else openInTab(file.id)
    }
    return { open, download, openInTab }
  }, [viewer])
}
