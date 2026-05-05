import { CalendarDays } from 'lucide-react';

/**
 * Input de fecha estilizado con ícono y soporte de color-scheme
 * para que el calendario nativo use tema oscuro cuando corresponde.
 */
export default function DateInput({ value, onChange, min, max, error = false, required = false }) {
  const borderClass = error
    ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
    : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500';

  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10" />
      <input
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={required}
        className={[
          'w-full pl-10 pr-3 py-2.5',
          'bg-slate-50 dark:bg-slate-700/50',
          'border rounded-xl',
          'text-slate-800 dark:text-white',
          'focus:outline-none focus:ring-2 transition-all',
          '[color-scheme:light] dark:[color-scheme:dark]',
          borderClass,
        ].join(' ')}
      />
    </div>
  );
}
