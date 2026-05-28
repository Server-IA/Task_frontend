export function getAsignadoIds(tarea) {
  if (tarea?.asignadoIds?.length) {
    return tarea.asignadoIds.map((id) => Number(id));
  }
  if (tarea?.asignadoId != null) {
    return [Number(tarea.asignadoId)];
  }
  return [];
}

export function formatAsignados(tarea) {
  if (tarea?.asignadoNombres?.length) {
    return tarea.asignadoNombres.join(', ');
  }
  if (tarea?.asignadoNombre) {
    return tarea.asignadoNombre;
  }
  return null;
}

export function isUserAssignedToTarea(tarea, userId) {
  if (!userId) return false;
  return getAsignadoIds(tarea).includes(Number(userId));
}
