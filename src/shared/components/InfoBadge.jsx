/**
 * Muestra un dato con su etiqueta de contexto (ej. "Empresa: Acme").
 */
export function InfoBadge({
  label,
  value,
  icon: Icon,
  className = '',
  labelClassName = 'text-slate-500 dark:text-slate-400 font-normal',
  valueClassName = '',
  style,
}) {
  if (value == null || value === '') return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={style}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span className={labelClassName}>{label}:</span>
      <span className={valueClassName}>{value}</span>
    </span>
  );
}

/**
 * Línea de metadato para listas compactas (sin fondo de badge).
 */
export function MetaItem({ label, value, icon: Icon, className = '', valueClassName = '', style }) {
  if (value == null || value === '') return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ${className}`}
      style={style}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}:</span>
      <span className={valueClassName}>{value}</span>
    </span>
  );
}
