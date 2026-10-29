import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateWorkspace } from '../hooks'
import { WorkspaceForm } from './WorkspaceForm'

export function CreateWorkspaceDialog({ open, onOpenChange }) {
  const createWorkspace = useCreateWorkspace()
  const navigate = useNavigate()

  const handleSubmit = (values, { onError }) => {
    createWorkspace.mutate(values, {
      onSuccess: (workspace) => {
        toast.success(`Workspace «${workspace.name}» creado`)
        onOpenChange(false)
        navigate(`/${workspace.slug}`)
      },
      onError,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear workspace</DialogTitle>
          <DialogDescription>Un espacio para tu equipo, sus proyectos y sus tareas.</DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        <WorkspaceForm
          onSubmit={handleSubmit}
          pending={createWorkspace.isPending}
          submitLabel="Crear workspace"
          footer={
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  )
}
