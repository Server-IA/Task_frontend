import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Layers, Search } from 'lucide-react';
import { toast } from 'sonner';
import { estadosService } from '../../shared/services';
import { getErrorMessage } from '../../shared/lib/errorUtils';
import FormEstados from './FormEstados';

export default function Estados() {
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setEstados(await estadosService.getAll());
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al cargar los estados'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (estado) => {
    if (!confirm(`¿Eliminar el estado "${estado.nombre}"?`)) return;
    try {
      await estadosService.delete(estado.id);
      toast.success('Estado eliminado');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar el estado'));
    }
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await estadosService.update(editItem.id, data);
        toast.success('Estado actualizado');
      } else {
        await estadosService.create(data);
        toast.success('Estado creado');
      }
      setFormOpen(false);
      setEditItem(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al guardar el estado'));
    }
  };

  const filtered = estados.filter((e) =>
    e.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estados</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{estados.length} estados configurados</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Estado
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar estado..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((estado) => (
            <motion.div
              key={estado.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (estado.color || '#6366f1') + '20' }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: estado.color || '#6366f1' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{estado.nombre}</h3>
                    {estado.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{estado.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditItem(estado); setFormOpen(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(estado)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron estados</p>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <FormEstados
            onClose={() => { setFormOpen(false); setEditItem(null); }}
            onSave={handleSave}
            initialData={editItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
