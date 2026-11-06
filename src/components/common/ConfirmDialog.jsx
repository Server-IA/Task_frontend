import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { focusOrigin, isFocusable } from '@/lib/focusReturn'

/** El primer elemento que se puede enfocar de una ref o una lista de refs. */
const firstFocusable = (refs) => (Array.isArray(refs) ? refs : [refs]).map((ref) => ref?.current).find(isFocusable)

/**
 * Confirmación para acciones irreversibles (eliminar, quitar, salir…).
 * `onConfirm` puede devolver una promesa: el diálogo se queda abierto mientras se resuelve.
 * Mientras se cierra conserva el último texto (quien lo usa suele limpiar el elemento al cerrarlo).
 *
 * Se abre sin un disparador propio (lo abre el estado de quien lo usa), así que Radix no sabría a dónde devolver el
 * foco al cerrarse y quedaba en el `body`: se recuerda lo que tenía el foco al abrirse (si era una opción de un menú,
 * el botón que abrió el menú) y se vuelve ahí. Si ya no está (la acción lo quitó), se usa `returnFocusRef`.
 * `focusAfterConfirmRef`: a dónde va el foco si se confirmó (por ejemplo, el campo en el que se sigue escribiendo).
 * Al quitar una fila conviene pasarlo también: la lista puede recargarse justo después de cerrar el diálogo y el botón
 * de la fila desaparecer con el foco adentro.
 * Los dos aceptan una ref o una lista de refs (va el primero que se pueda enfocar: «Agregar» si está, si no el título).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  destructive = true,
  loading = false,
  onConfirm,
  returnFocusRef,
  focusAfterConfirmRef,
}) {
  const returnFocus = useRef(null)
  const confirmed = useRef(false)
  const [lastText, setLastText] = useState({ title, description })
  if (open && (title !== lastText.title || description !== lastText.description)) setLastText({ title, description })
  const text = open ? { title, description } : lastText

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={() => {
          // Todavía no se movió el foco: es el elemento que abrió la confirmación
          returnFocus.current = focusOrigin(document.activeElement)
          confirmed.current = false
        }}
        onCloseAutoFocus={(event) => {
          const afterConfirm = confirmed.current ? firstFocusable(focusAfterConfirmRef) : null
          const target = [afterConfirm, returnFocus.current, firstFocusable(returnFocusRef)].find(isFocusable)
          returnFocus.current = null
          confirmed.current = false
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          {text.description && <AlertDialogDescription>{text.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? buttonVariants({ variant: 'destructive' }) : undefined}
            disabled={loading}
            onClick={(event) => {
              event.preventDefault()
              confirmed.current = true
              onConfirm?.()
            }}
          >
            {loading && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
