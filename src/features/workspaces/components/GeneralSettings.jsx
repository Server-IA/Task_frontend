import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LockNote } from '@/components/common/LockNote'
import { isManager } from '@/lib/permissions'
import { notifyError } from '@/lib/notify'
import { useSessionStore } from '@/stores/sessionStore'
import { useDeleteWorkspace, useRemoveMember, useUpdateWorkspace } from '../hooks'
import { WorkspaceForm } from './WorkspaceForm'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function GeneralSettings({ workspace }) {
  const navigate = useNavigate()
  const update = useUpdateWorkspace(workspace.slug)
  const canManage = isManager(workspace.myRole)

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
          {canManage ? (
            <CardDescription>Cambiar la URL rompe los enlaces que hayas compartido.</CardDescription>
          ) : (
            <LockNote>Solo el project manager puede editar el workspace.</LockNote>
          )}
        </CardHeader>
        <CardContent>
          <WorkspaceForm
            key={workspace.slug}
            defaultValues={{ name: workspace.name, slug: workspace.slug }}
            onSubmit={handleSubmit}
            pending={update.isPending}
            submitLabel="Guardar cambios"
            disabled={!canManage}
          />
        </CardContent>
      </Card>

      <LeaveWorkspaceCard workspace={workspace} isManager={canManage} />
      {canManage && <DeleteWorkspaceCard workspace={workspace} />}
    </div>
  )
}

function DeleteWorkspaceCard({ workspace }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const remove = useDeleteWorkspace(workspace.slug, {
    onGone: () => {
      toast.success(`Workspace «${workspace.name}» eliminado`)
      navigate('/', { replace: true })
    },
  })

  const handleDelete = () => {
    remove.mutate(undefined, { onError: (error) => notifyError(error) })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Eliminar workspace</CardTitle>
        <CardDescription>
          Se borrarán todos sus proyectos, tareas, ciclos y módulos. Esta acción no se puede deshacer.
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

function LeaveWorkspaceCard({ workspace, isManager }) {
  const [open, setOpen] = useState(false)
  const user = useSessionStore((state) => state.user)
  const navigate = useNavigate()
  const leave = useRemoveMember(workspace.slug, {
    onGone: () => {
      toast.success(`Saliste de «${workspace.name}»`)
      navigate('/', { replace: true })
    },
  })

  const handleLeave = () => {
    leave.mutate(user.id, { onError: (error) => notifyError(error) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salir del workspace</CardTitle>
        <CardDescription>
          Dejarás de ver sus proyectos. Necesitarás otra invitación para volver.
          {isManager && ' Si eres el único project manager, antes nombra a otro.'}
        </CardDescription>
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
