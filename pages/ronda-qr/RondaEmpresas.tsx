import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { Building2, Loader2 } from 'lucide-react';

export default function RondaEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    setLoading(true);
    const { data } = await supabase.from('empresas').select('*').order('nome_empresa');
    if (data) setEmpresas(data);
    setLoading(false);
  };

  return (
    <RondaLayout title="Empresas" subtitle="Empresas cadastradas no sistema">
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" /></div>
      ) : empresas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhuma empresa cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map(emp => (
            <div key={emp.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{emp.nome_empresa}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{emp.cnpj}</p>
                  {emp.cidade && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{emp.cidade}{emp.estado ? ` - ${emp.estado}` : ''}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
