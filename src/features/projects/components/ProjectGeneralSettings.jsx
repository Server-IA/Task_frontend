import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LockNote } from '@/components/common/LockNote'
import { t } from '@/i18n'
import { can } from '@/lib/permissions'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useDeleteProject, useUpdateProject } from '../hooks'
import { ProjectForm } from './ProjectForm'

export function ProjectGeneralSettings({ workspace, project }) {
  const update = useUpdateProject(workspace.slug, project.id)
  const canManage = can(workspace, 'PROJECT_EDIT')
  const canDelete = can(workspace, 'PROJECT_DELETE')

  const handleSubmit = (values, { onError }) => {
    update.mutate(values, {
      onSuccess: () => toast.success(t('Proyecto actualizado')),
      onError,
    })
  }

  return (
    // En pantallas anchas, el formulario a la izquierda y eliminar a la derecha
    <div className={cn('grid items-start gap-3.5', canDelete && 'xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('General')}</CardTitle>
          {canManage ? (
            <CardDescription>{t('Si cambias el identificador, cambian los códigos de todas las tareas.')}</CardDescription>
          ) : (
            <LockNote>{t('Tu rol no permite editar el proyecto.')}</LockNote>
          )}
        </CardHeader>
        <CardContent>
          <ProjectForm
            key={project.updatedAt}
            defaultValues={{
              name: project.name,
              identifier: project.identifier,
              description: project.description ?? '',
              color: project.color ?? 'TEAL',
            }}
            onSubmit={handleSubmit}
            pending={update.isPending}
            submitLabel={t('Guardar cambios')}
            disabled={!canManage}
          />
        </CardContent>
      </Card>
      {canDelete && <DeleteProjectCard workspace={workspace} project={project} />}
    </div>
  )
}

function DeleteProjectCard({ workspace, project }) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteProject(workspace.slug, project.id)
  const navigate = useNavigate()

  const handleDelete = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('Proyecto «{name}» eliminado', { name: project.name }))
        navigate(`/${workspace.slug}`, { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{t('Eliminar proyecto')}</CardTitle>
        <CardDescription>
          {t('Se borrarán sus tareas, comentarios, ciclos y módulos. Esta acción no se puede deshacer.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {t('Eliminar proyecto')}
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={t('¿Eliminar «{name}»?', { name: project.name })}
          description={t('Todas las tareas del proyecto se perderán para siempre.')}
          confirmLabel={t('Eliminar definitivamente')}
          loading={remove.isPending}
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}
