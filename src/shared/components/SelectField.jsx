import { useState, useRef, useEffect, Children, isValidElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown completamente personalizado que reemplaza el <select> nativo.
 * Acepta hijos <option> igual que un <select> estándar.
 */
export default function SelectField({
  value,
  onChange,
  children,
  error = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parsear hijos <option> en array { value, label }
  const options = Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === 'option')
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children,
    }));

  const selected = options.find((o) => String(o.value) === String(value ?? ''));
  const isPlaceholder = !selected || selected.value === '';

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (optVal) => {
    onChange({ target: { value: optVal } });
    setOpen(false);
  };

  const triggerClass = [
    'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-xl',
    'text-left flex items-center justify-between gap-2',
    'focus:outline-none focus:ring-2 transition-all text-sm',
    error
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-500',
  ].join(' ');

  return (
    <div ref={ref} className="relative">
      {/* Botón disparador */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={triggerClass}
      >
        <span className={isPlaceholder ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}>
          {isPlaceholder ? (selected?.label ?? 'Seleccionar...') : selected?.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Lista desplegable animada */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute z-[9999] w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = String(value ?? '') === opt.value;
                const isEmpty = opt.value === '';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={[
                      'w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors',
                      isEmpty
                        ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        : isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40',
                    ].join(' ')}
                  >
                    {opt.label}
                    {isSelected && !isEmpty && (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
