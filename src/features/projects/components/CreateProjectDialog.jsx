import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { stateName, t } from '@/i18n'
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
        toast.success(t('Proyecto «{name}» creado', { name: project.name }))
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
          <DialogTitle>{t('Nuevo proyecto')}</DialogTitle>
          <DialogDescription>
            {/* Los estados de fábrica, con el nombre que se les ve en el idioma elegido */}
            {t('Se crearán los estados {backlog}, {todo}, {inProgress}, {done} y {cancelled}. Podrás cambiarlos después.', {
              backlog: stateName('Backlog'),
              todo: stateName('Todo'),
              inProgress: stateName('In Progress'),
              done: stateName('Done'),
              cancelled: stateName('Cancelled'),
            })}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        <ProjectForm
          suggestedColor={suggestProjectColor(projects)}
          onSubmit={handleSubmit}
          pending={createProject.isPending}
          submitLabel={t('Crear proyecto')}
          footer={
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('Cancelar')}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  )
}
