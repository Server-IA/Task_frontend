import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  formatDateTyping,
  formatLocalDate,
  isIsoDateInRange,
  parseDisplayDate,
  toInputDateValue,
} from '@/shared/lib/dateUtils';

/**
 * Input de fecha con visualización DD/MM/AAAA.
 * Emite y recibe el valor en formato YYYY-MM-DD (compatible con el backend).
 */
export default function DateInput({ value, onChange, min, max, error = false, required = false }) {
  const hiddenRef = useRef(null);
  const isoValue = toInputDateValue(value);
  const [display, setDisplay] = useState(() => (isoValue ? formatLocalDate(isoValue) : ''));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(isoValue ? formatLocalDate(isoValue) : '');
    }
  }, [isoValue, focused]);

  const borderClass = error
    ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
    : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500';

  const emitChange = (iso) => {
    onChange?.({ target: { value: iso || '' } });
  };

  const applyIso = (iso) => {
    if (!iso) {
      setDisplay('');
      emitChange('');
      return;
    }
    if (!isIsoDateInRange(iso, min, max)) return;
    setDisplay(formatLocalDate(iso));
    emitChange(iso);
  };

  const handleTextChange = (e) => {
    const formatted = formatDateTyping(e.target.value);
    setDisplay(formatted);
    if (formatted.length === 10) {
      const iso = parseDisplayDate(formatted);
      if (iso && isIsoDateInRange(iso, min, max)) {
        emitChange(iso);
      }
    } else if (!formatted) {
      emitChange('');
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (!display) {
      emitChange('');
      return;
    }
    const iso = parseDisplayDate(display);
    if (!iso || !isIsoDateInRange(iso, min, max)) {
      setDisplay(isoValue ? formatLocalDate(isoValue) : '');
      return;
    }
    setDisplay(formatLocalDate(iso));
    emitChange(iso);
  };

  const openPicker = () => {
    const input = hiddenRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        tabIndex={-1}
        aria-label="Abrir calendario"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        <CalendarDays className="w-4 h-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder="DD/MM/AAAA"
        required={required}
        maxLength={10}
        autoComplete="off"
        className={[
          'w-full pl-10 pr-3 py-2.5',
          'bg-slate-50 dark:bg-slate-700/50',
          'border rounded-xl',
          'text-slate-800 dark:text-white',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 transition-all',
          borderClass,
        ].join(' ')}
      />
      <input
        ref={hiddenRef}
        type="date"
        value={isoValue}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => applyIso(e.target.value)}
        className="sr-only"
      />
    </div>
  );
}
