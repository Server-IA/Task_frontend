import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useSessionStore } from '@/stores/sessionStore'
import { UserMenu } from '@/layouts/UserMenu'
import { WorkspaceForm } from '../components/WorkspaceForm'
import { useCreateWorkspace, useWorkspaces } from '../hooks'

/** Crear el primer workspace (o uno nuevo desde fuera de la app). */
export function OnboardingPage() {
  const user = useSessionStore((state) => state.user)
  const createWorkspace = useCreateWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const navigate = useNavigate()

  const handleSubmit = (values, { onError }) => {
    createWorkspace.mutate(values, {
      onSuccess: (workspace) => {
        toast.success('¡Workspace creado!')
        navigate(`/${workspace.slug}`, { replace: true })
      },
      onError,
    })
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="w-56">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {workspaces.length ? 'Crea un workspace' : `¡Hola, ${user?.fullName?.split(' ')[0] ?? ''}!`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Un workspace agrupa a tu equipo, sus proyectos y sus tareas. Si te invitaron a uno, abre el enlace
              del correo de invitación.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <WorkspaceForm
                onSubmit={handleSubmit}
                pending={createWorkspace.isPending}
                submitLabel="Crear workspace"
              />
            </CardContent>
          </Card>
          {workspaces.length > 0 && (
            <p className="mt-6 text-center text-sm">
              <Link to="/" className="text-primary hover:underline">
                Volver a mis workspaces
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
