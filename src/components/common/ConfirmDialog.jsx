import { useState } from 'react'
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

/**
 * Confirmación para acciones irreversibles (eliminar, quitar, salir…).
 * `onConfirm` puede devolver una promesa: el diálogo se queda abierto mientras se resuelve.
 * Mientras se cierra conserva el último texto (quien lo usa suele limpiar el elemento al cerrarlo).
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
}) {
  const [lastText, setLastText] = useState({ title, description })
  if (open && (title !== lastText.title || description !== lastText.description)) setLastText({ title, description })
  const text = open ? { title, description } : lastText

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
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
