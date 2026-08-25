import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { MapPin, Loader2, Building2 } from 'lucide-react';

export default function RondaPostos() {
  const [postos, setPostos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPostos(); }, []);

  const loadPostos = async () => {
    setLoading(true);
    const { data } = await supabase.from('postos_trabalho').select('*').order('nome_posto');
    if (data) setPostos(data);
    setLoading(false);
  };

  return (
    <RondaLayout title="Postos de Trabalho" subtitle="Postos cadastrados no sistema">
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" /></div>
      ) : postos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum posto cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {postos.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{p.nome_posto}</p>
                  {p.nome_empresa && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.nome_empresa}</p>
                    </div>
                  )}
                  <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full ${p.ativo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
