import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/shared/lib/errorUtils';

export default function ForgotPassword() {
  const { solicitarReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await solicitarReset(email);
      setSuccessMessage(data?.mensaje || 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña.');
      setSent(true);
      if (data?.correoEnviado === false) {
        toast.warning(data?.mensaje || 'No se pudo enviar el correo.');
      } else {
        toast.success('Correo enviado');
      }
    } catch (error) {
      const msg = getErrorMessage(error, 'Error al solicitar la recuperación de contraseña');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600 mb-4"
            >
              <Mail className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
            <p className="text-slate-400 mt-2">
              {sent
                ? 'Revisa tu correo electrónico'
                : 'Ingresa tu email para recibir un enlace de recuperación'}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400 text-sm">{successMessage}</p>
                <p className="text-emerald-400/80 text-xs mt-2">Enviado a <strong>{email}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setSuccessMessage(''); setErrorMessage(''); }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Enviar a otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errorMessage) setErrorMessage(''); }}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar enlace
                  </>
                )}
              </motion.button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
