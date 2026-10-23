import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { isAdminRole, isOwnerRole } from '@/lib/permissions'
import { notifyError } from '@/lib/notify'
import { useSessionStore } from '@/stores/sessionStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useDeleteWorkspace, useRemoveMember, useUpdateWorkspace } from '../hooks'
import { WorkspaceForm } from './WorkspaceForm'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function GeneralSettings({ workspace }) {
  const navigate = useNavigate()
  const update = useUpdateWorkspace(workspace.slug)
  const isAdmin = isAdminRole(workspace.myRole)
  const isOwner = isOwnerRole(workspace.myRole)

  const handleSubmit = (values, { onError }) => {
    update.mutate(values, {
      onSuccess: (updated) => {
        toast.success('Workspace actualizado')
        if (updated.slug !== workspace.slug) {
          navigate(`/${updated.slug}/settings`, { replace: true })
        }
      },
      onError,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Cambiar la URL rompe los enlaces que hayas compartido.'
              : 'Solo los administradores pueden editar el workspace.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceForm
            key={workspace.slug}
            defaultValues={{ name: workspace.name, slug: workspace.slug }}
            onSubmit={handleSubmit}
            pending={update.isPending}
            submitLabel="Guardar cambios"
            disabled={!isAdmin}
          />
        </CardContent>
      </Card>

      {isOwner ? <DeleteWorkspaceCard workspace={workspace} /> : <LeaveWorkspaceCard workspace={workspace} />}
    </div>
  )
}

function DeleteWorkspaceCard({ workspace }) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteWorkspace(workspace.slug)
  const navigate = useNavigate()
  const setLastWorkspaceSlug = usePreferencesStore((state) => state.setLastWorkspaceSlug)

  const handleDelete = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(`Workspace «${workspace.name}» eliminado`)
        setLastWorkspaceSlug(null)
        navigate('/', { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Eliminar workspace</CardTitle>
        <CardDescription>
          Se borrarán todos sus proyectos, issues, ciclos y módulos. Esta acción no se puede deshacer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Eliminar workspace
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`¿Eliminar «${workspace.name}»?`}
          description="Se perderán todos los proyectos y tareas del workspace para todos sus miembros."
          confirmLabel="Eliminar definitivamente"
          loading={remove.isPending}
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}

function LeaveWorkspaceCard({ workspace }) {
  const [open, setOpen] = useState(false)
  const user = useSessionStore((state) => state.user)
  const leave = useRemoveMember(workspace.slug)
  const navigate = useNavigate()
  const setLastWorkspaceSlug = usePreferencesStore((state) => state.setLastWorkspaceSlug)

  const handleLeave = () => {
    leave.mutate(user.id, {
      onSuccess: () => {
        toast.success(`Saliste de «${workspace.name}»`)
        setLastWorkspaceSlug(null)
        navigate('/', { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salir del workspace</CardTitle>
        <CardDescription>Dejarás de ver sus proyectos. Necesitarás otra invitación para volver.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Salir del workspace
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`¿Salir de «${workspace.name}»?`}
          confirmLabel="Salir"
          loading={leave.isPending}
          onConfirm={handleLeave}
        />
      </CardContent>
    </Card>
  )
}
