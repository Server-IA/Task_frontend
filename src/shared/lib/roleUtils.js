const ROLE_LABELS = {
  ADMIN: 'Administrador',
  MIEMBRO: 'Miembro',
  DESARROLLADOR: 'Desarrollador',
  DESARROLLADOR_BACKEND: 'Desarrollador Backend',
  DESARROLLADOR_FRONTEND: 'Desarrollador Frontend',
  QA: 'QA',
  DISENADOR: 'Diseñador',
  'DISEÑADOR': 'Diseñador',
  LIDER: 'Líder',
};

export function formatRoleLabel(role) {
  if (!role) return '';
  const key = String(role).toUpperCase();
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
