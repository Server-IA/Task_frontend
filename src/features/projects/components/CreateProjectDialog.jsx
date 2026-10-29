import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateProject, useProjects } from '../hooks'
import { suggestProjectColor } from '../projectColors'
import { ProjectForm } from './ProjectForm'

export function CreateProjectDialog({ slug, open, onOpenChange }) {
  const createProject = useCreateProject(slug)
  const { data: projects } = useProjects(slug)
  const navigate = useNavigate()

  const handleSubmit = (values, { onError }) => {
    createProject.mutate(values, {
      onSuccess: (project) => {
        toast.success(`Proyecto «${project.name}» creado`)
        onOpenChange(false)
        navigate(`/${slug}/projects/${project.id}/issues`)
      },
      onError,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Se crearán los estados Backlog, Todo, In Progress, Done y Cancelled. Podrás cambiarlos después.
          </DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        <ProjectForm
          suggestedColor={suggestProjectColor(projects)}
          onSubmit={handleSubmit}
          pending={createProject.isPending}
          submitLabel="Crear proyecto"
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
