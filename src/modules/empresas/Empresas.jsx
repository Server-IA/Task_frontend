import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { empresasService } from '@/shared/services';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { ConfirmDialog } from '@/shared/components';
import FormEmpresas from './FormEmpresas';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);

  const loadData = async () => {
    try {
      const e = await empresasService.getAll();
      setEmpresas(e);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al cargar las empresas'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = (empresa) => setConfirmItem(empresa);

  const doDelete = async () => {
    try {
      await empresasService.delete(confirmItem.id);
      toast.success('Empresa eliminada');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar la empresa'));
    } finally {
      setConfirmItem(null);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await empresasService.update(editItem.id, data);
        toast.success('Empresa actualizada');
      } else {
        await empresasService.create(data);
        toast.success('Empresa creada');
      }
      setFormOpen(false);
      setEditItem(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al guardar la empresa'));
    }
  };

  const filtered = empresas.filter(
    (e) =>
      e.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      e.nit?.toLowerCase().includes(search.toLowerCase()) ||
      e.sector?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Empresas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{empresas.length} empresas registradas</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Empresa
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, NIT o sector..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((empresa) => (
            <motion.div
              key={empresa.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{empresa.nombre}</h3>
                    {empresa.sector && <p className="text-xs text-slate-500 dark:text-slate-400">{empresa.sector}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditItem(empresa); setFormOpen(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(empresa)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {empresa.descripcion && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{empresa.descripcion}</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {empresa.nit && (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-lg">
                    NIT: {empresa.nit}
                  </span>
                )}
                {empresa.correo && (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-lg">
                    {empresa.correo}
                  </span>
                )}
                {(empresa.ciudad || empresa.departamento || empresa.pais) && (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-lg">
                    {[empresa.ciudad, empresa.departamento, empresa.pais].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron empresas</p>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <FormEmpresas
            onClose={() => { setFormOpen(false); setEditItem(null); }}
            onSave={handleSave}
            initialData={editItem}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmItem}
        title="Eliminar empresa"
        message={`¿Estás seguro de que quieres eliminar "${confirmItem?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}
