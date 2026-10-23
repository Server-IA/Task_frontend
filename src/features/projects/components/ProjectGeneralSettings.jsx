import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { isAdminRole } from '@/lib/permissions'
import { notifyError } from '@/lib/notify'
import { useDeleteProject, useUpdateProject } from '../hooks'
import { ProjectForm } from './ProjectForm'

export function ProjectGeneralSettings({ workspace, project }) {
  const update = useUpdateProject(workspace.slug, project.id)

  const handleSubmit = (values, { onError }) => {
    update.mutate(values, {
      onSuccess: () => toast.success('Proyecto actualizado'),
      onError,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Si cambias el identificador, cambian los códigos de todos los issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            key={project.updatedAt}
            defaultValues={{
              name: project.name,
              identifier: project.identifier,
              description: project.description ?? '',
            }}
            onSubmit={handleSubmit}
            pending={update.isPending}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
      {isAdminRole(workspace.myRole) && <DeleteProjectCard workspace={workspace} project={project} />}
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
        toast.success(`Proyecto «${project.name}» eliminado`)
        navigate(`/${workspace.slug}`, { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Eliminar proyecto</CardTitle>
        <CardDescription>
          Se borrarán sus issues, comentarios, ciclos y módulos. Esta acción no se puede deshacer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Eliminar proyecto
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`¿Eliminar «${project.name}»?`}
          description="Todos los issues del proyecto se perderán para siempre."
          confirmLabel="Eliminar definitivamente"
          loading={remove.isPending}
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}
