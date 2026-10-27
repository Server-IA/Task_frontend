/** Ruta del workspace para el encabezado de página: «equipo-diseno». */
export function workspacePath(workspace) {
  return [{ label: workspace.slug, to: `/${workspace.slug}` }]
}

/** Ruta base de un proyecto para el encabezado de página: «equipo-diseno / web». */
export function projectPath(workspace, project) {
  return [
    ...workspacePath(workspace),
    { label: project.identifier.toLowerCase(), to: `/${workspace.slug}/projects/${project.id}/issues` },
  ]
}
