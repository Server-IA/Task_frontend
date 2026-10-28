import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Command as CommandPrimitive } from 'cmdk'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { usePlanningList } from '@/features/planning/hooks'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { PROJECT_SECTIONS } from '@/layouts/SidebarProjects'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRouteParams } from '@/hooks/useRouteParams'
import { useTheme } from '@/hooks/useTheme'
import { IS_MAC } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useIssueSearch } from './hooks'

/** Sin tildes y en minúscula: «Módulos» coincide con «modulos». */
const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const matches = (item, query) => !query || normalize(`${item.label} ${item.keywords ?? ''}`).includes(normalize(query))

/**
 * Paleta de búsqueda y comandos (Ctrl/⌘ K desde cualquier pantalla, incluso escribiendo en un campo):
 * tareas de todos los proyectos, secciones a las que saltar y acciones (crear tarea, cambiar el tema).
 * Se monta una vez en el layout de la app; la sidebar la abre con el botón «Buscar».
 */
export function CommandPalette() {
  const open = useLayoutStore((state) => state.commandOpen)
  const setOpen = useLayoutStore((state) => state.setCommandOpen)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
      event.preventDefault()
      setOpen(!useLayoutStore.getState().commandOpen)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden rounded-[18px] p-0 shadow-[0_24px_60px_rgb(35_32_27/0.28)] sm:max-w-[640px]"
      >
        <DialogTitle className="sr-only">Buscar y comandos</DialogTitle>
        <DialogDescription className="sr-only">Busca tareas, salta a una sección o ejecuta una acción.</DialogDescription>
        <PaletteContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PaletteContent({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { slug: routeSlug, projectId } = useRouteParams()
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)
  // Fuera de un workspace (bandeja, perfil) se busca en el último abierto, como hace la sidebar
  const slug = routeSlug ?? lastWorkspaceSlug
  const { resolvedTheme, setTheme } = useTheme()
  const [query, setQuery] = useState('')
  const text = query.trim()
  const debounced = useDebouncedValue(text, 200)
  const search = useIssueSearch(slug, debounced)
  const { data: projects = [] } = useProjects(slug)
  const project = projects.find((item) => item.id === projectId)
  const { data: cycles = [] } = usePlanningList('cycles', slug, project?.id)
  const { data: modules = [] } = usePlanningList('modules', slug, project?.id)
  const projectsById = new Map(projects.map((item) => [item.id, item]))

  const run = (action) => {
    onClose()
    action()
  }

  const issues = text ? (search.data ?? []) : []
  const searching = Boolean(text) && (search.isFetching || debounced !== text)

  // «Ir a»: secciones del proyecto actual, sus ciclos y módulos (al buscar), el workspace y los demás proyectos
  const goItems = []
  if (project) {
    const base = `/${slug}/projects/${project.id}`
    for (const section of PROJECT_SECTIONS) {
      goItems.push({
        id: `section-${section.path}`,
        icon: section.hint,
        label: `${section.label} de ${project.name}`,
        hint: 'proyecto',
        shortcut: section.hint,
        to: `${base}/${section.path}`,
      })
    }
    if (text) {
      for (const [kind, items] of [
        ['cycles', cycles],
        ['modules', modules],
      ]) {
        for (const item of items) {
          goItems.push({
            id: `${kind}-${item.id}`,
            icon: kind === 'cycles' ? 'Y' : 'M',
            label: `${kind === 'cycles' ? 'Ciclo' : 'Módulo'} «${item.name}»`,
            hint: `${project.name} · ${item.progress.percentage} % completado`,
            to: `${base}/${kind}/${item.id}`,
          })
        }
      }
    }
  }
  if (slug) {
    goItems.push(
      { id: 'my-work', icon: '~', label: 'Mi trabajo', hint: 'tus tareas abiertas', to: `/${slug}/my-work` },
      { id: 'activity', icon: '~', label: 'Actividad', hint: 'lo que pasó en el workspace', to: `/${slug}/activity` },
    )
  }
  goItems.push({ id: 'inbox', icon: '~', label: 'Bandeja', hint: 'notificaciones', keywords: 'notificaciones', to: '/notifications' })
  if (slug) {
    goItems.push(
      { id: 'projects', icon: '~', label: 'Proyectos', hint: 'todos los proyectos', to: `/${slug}` },
      { id: 'settings', icon: '~', label: 'Ajustes del workspace', hint: 'miembros e invitaciones', to: `/${slug}/settings` },
    )
    for (const other of projects) {
      if (other.id === project?.id) continue
      goItems.push({
        id: `project-${other.id}`,
        project: other,
        label: other.name,
        keywords: other.identifier,
        hint: `${other.openIssueCount ?? 0} ${other.openIssueCount === 1 ? 'abierta' : 'abiertas'}`,
        to: `/${slug}/projects/${other.id}/issues`,
      })
    }
  }

  // Acciones: crear tarea (con lo escrito como título) y cambiar el tema
  const createIn = project ? [project] : projects.slice(0, 3)
  const actions = createIn.map((target) => ({
    id: `create-${target.id}`,
    icon: '+',
    label: text ? `Crear tarea «${text}»` : 'Crear tarea',
    hint: `en ${target.name}`,
    shortcut: project ? 'C' : undefined,
    perform: () => {
      const path = `/${slug}/projects/${target.id}/issues`
      // En la misma página se conservan los filtros de la URL
      const params = new URLSearchParams(location.pathname === path ? location.search : '')
      params.set('create', '1')
      if (text) params.set('title', text)
      else params.delete('title')
      navigate(`${path}?${params}`)
    },
  }))
  const themeAction = {
    id: 'theme',
    icon: '◐',
    label: resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    hint: 'tema',
    keywords: 'tema oscuro claro apariencia',
    perform: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  }
  if (matches(themeAction, text)) actions.push(themeAction)

  const visibleGo = goItems.filter((item) => matches(item, text))

  // Cuando cambia la primera opción (llegan resultados, se escribe otra cosa) se vuelve a elegir la primera:
  // así Enter abre la tarea encontrada y no lo que estaba elegido antes de que llegaran los resultados
  const firstValue = issues[0] ? `issue-${issues[0].id}` : (visibleGo[0]?.id ?? actions[0]?.id ?? '')
  const [selected, setSelected] = useState(firstValue)
  const [lastFirstValue, setLastFirstValue] = useState(firstValue)
  if (firstValue !== lastFirstValue) {
    setLastFirstValue(firstValue)
    setSelected(firstValue)
  }
  const scope = projects.length === 0 ? null : projects.length <= 2 ? projects.map((item) => item.name).join(' y ') : `${projects.length} proyectos`

  return (
    <Command shouldFilter={false} loop value={selected} onValueChange={setSelected} className="rounded-none bg-card">
      <label className="flex items-center gap-2.5 border-b px-4 py-3.5 font-mono text-[15px]">
        <span aria-hidden="true" className="font-semibold text-accent-text">
          &gt;
        </span>
        <span className="sr-only">Buscar tareas, secciones o acciones</span>
        <CommandPrimitive.Input
          value={query}
          onValueChange={setQuery}
          autoFocus
          placeholder="buscar tareas, ir a una sección o crear"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {searching && <Spinner className="size-3.5 text-muted-foreground" />}
        <kbd className="rounded-[5px] border px-1.5 text-[11px] text-muted-foreground">esc</kbd>
      </label>

      <CommandList className="max-h-[min(470px,60vh)] p-2">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          {searching ? 'Buscando…' : `Nada coincide con «${text}»`}
        </CommandEmpty>
        {issues.length > 0 && (
          <PaletteGroup heading="Tareas">
            {issues.map((issue) => {
              const issueProject = projectsById.get(issue.projectId) ?? issue.project
              const assignee = issue.assignees?.[0]
              return (
                <PaletteItem
                  key={issue.id}
                  value={`issue-${issue.id}`}
                  onSelect={() => run(() => navigate(`/${slug}/projects/${issue.projectId}/issues?issue=${issue.id}`))}
                  icon={<ProjectIcon project={issueProject ?? { identifier: issue.code.split('-')[0] }} className="h-6.5 rounded-lg px-1.5" />}
                  label={issue.title}
                  hint={
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span>{issue.code}</span>·
                      <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3" />
                      <span className="truncate">{issue.state?.name}</span>·
                      <span className="truncate">
                        {assignee ? assignee.fullName.split(' ')[0] : 'sin asignar'}
                        {issue.assignees?.length > 1 && ` +${issue.assignees.length - 1}`}
                      </span>
                    </span>
                  }
                />
              )
            })}
          </PaletteGroup>
        )}
        {visibleGo.length > 0 && (
          <PaletteGroup heading="Ir a">
            {visibleGo.map((item) => (
              <PaletteItem
                key={item.id}
                value={item.id}
                onSelect={() => run(() => navigate(item.to))}
                icon={item.project ? <ProjectIcon project={item.project} className="h-6.5 rounded-lg px-1.5" /> : item.icon}
                label={item.label}
                hint={item.hint}
                shortcut={item.shortcut}
              />
            ))}
          </PaletteGroup>
        )}
        {actions.length > 0 && (
          <PaletteGroup heading="Acciones">
            {actions.map((action) => (
              <PaletteItem
                key={action.id}
                value={action.id}
                onSelect={() => run(action.perform)}
                icon={action.icon}
                label={action.label}
                hint={action.hint}
                shortcut={action.shortcut}
              />
            ))}
          </PaletteGroup>
        )}
      </CommandList>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-column px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
        <span>
          <kbd className="text-foreground">↑ ↓</kbd> moverse
        </span>
        <span>
          <kbd className="text-foreground">↵</kbd> abrir
        </span>
        <span className="hidden sm:inline">
          <kbd className="text-foreground">{IS_MAC ? '⌘ K' : 'ctrl K'}</kbd> abrir desde cualquier pantalla
        </span>
        {scope && <span className="ml-auto truncate">busca en {scope}</span>}
      </footer>
    </Command>
  )
}

function PaletteGroup({ heading, children }) {
  return (
    <CommandGroup
      heading={heading}
      className="p-0 [&_[cmdk-group-heading]]:mx-2 [&_[cmdk-group-heading]]:mt-1.5 [&_[cmdk-group-heading]]:mb-0.5 [&_[cmdk-group-heading]]:px-0 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </CommandGroup>
  )
}

/** Opción de la paleta: ícono en un cuadrito, texto con una pista debajo y su atajo (o ↵ si está elegida). */
function PaletteItem({ value, onSelect, icon, label, hint, shortcut }) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="group/item gap-2.5 rounded-[10px] px-2.5 py-2 data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-6.5 shrink-0 items-center justify-center font-mono text-[11px] font-semibold',
          typeof icon === 'string' && 'rounded-lg bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {hint && <span className="block truncate font-mono text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {shortcut ? (
        <kbd className="font-mono text-[11px] text-muted-foreground">{shortcut}</kbd>
      ) : (
        <kbd className="hidden font-mono text-[11px] text-muted-foreground group-data-[selected=true]/item:inline">↵</kbd>
      )}
    </CommandItem>
  )
}
