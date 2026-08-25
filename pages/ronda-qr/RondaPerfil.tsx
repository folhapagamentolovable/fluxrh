import React, { useState } from 'react';
import RondaLayout from './components/RondaLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Mail, Lock, Save, Loader2, CheckCircle2, Shield } from 'lucide-react';

export default function RondaPerfil() {
  const { user, profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'As senhas não coincidem', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'A senha deve ter pelo menos 6 caracteres', type: 'error' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <RondaLayout title="Perfil" subtitle="Gerencie suas informações">
      <div className="max-w-lg space-y-6">
        {/* User info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(profile?.user_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{profile?.user_name || 'Usuário'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <Shield className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Último acesso</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-400" />
            Alterar Senha
          </h3>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
              message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={loading || !newPassword}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </RondaLayout>
  );
}
