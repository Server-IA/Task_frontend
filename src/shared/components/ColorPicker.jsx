import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Pipette } from 'lucide-react';

const PRESETS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#64748b',
];

export default function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || '#8b5cf6');
  const ref = useRef(null);
  const nativeRef = useRef(null);

  useEffect(() => { setHex(value || '#8b5cf6'); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const apply = (color) => { setHex(color); onChange(color); };

  const handleHex = (val) => {
    setHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onChange(val);
  };

  return (
    <div ref={ref} className="relative">
      {/* Botón disparador */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      >
        <span
          className="w-6 h-6 rounded-lg shrink-0 border border-black/10 shadow-sm"
          style={{ backgroundColor: value || '#8b5cf6' }}
        />
        <span className="flex-1 text-left text-sm font-mono text-slate-700 dark:text-slate-300">
          {value || '#8b5cf6'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute z-[9999] w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4"
          >
            {/* Preview grande */}
            <div
              className="w-full h-10 rounded-xl mb-3 border border-black/10"
              style={{ backgroundColor: value || '#8b5cf6' }}
            />

            {/* Presets */}
            <div className="grid grid-cols-8 gap-1.5 mb-3">
              {PRESETS.map((color) => {
                const isSelected = value === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => apply(color)}
                    className="aspect-square rounded-lg transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: color,
                      outline: isSelected ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                    }}
                    title={color}
                  />
                );
              })}
            </div>

            {/* Hex input + selector nativo */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
                <span
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <input
                  value={hex}
                  onChange={(e) => handleHex(e.target.value)}
                  className="flex-1 text-sm font-mono bg-transparent text-slate-800 dark:text-white focus:outline-none min-w-0"
                  placeholder="#8b5cf6"
                  maxLength={7}
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={() => nativeRef.current?.click()}
                title="Selector de color personalizado"
                className="p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Pipette className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
              <input
                ref={nativeRef}
                type="color"
                value={hex}
                onChange={(e) => apply(e.target.value)}
                className="sr-only"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
