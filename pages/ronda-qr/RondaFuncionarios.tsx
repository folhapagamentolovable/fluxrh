import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { Users, Loader2, Building2, MapPin, Search } from 'lucide-react';

export default function RondaFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadFuncionarios(); }, []);

  const loadFuncionarios = async () => {
    setLoading(true);
    const { data } = await supabase.from('funcionarios').select('id, nome_completo, nome_empresa, nome_posto, nome_cargo, ativo, foto_url, ronda').eq('ativo', true).order('nome_completo');
    if (data) setFuncionarios(data);
    setLoading(false);
  };

  const filtered = funcionarios.filter(f =>
    f.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    (f.nome_empresa?.toLowerCase().includes(search.toLowerCase())) ||
    (f.nome_posto?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <RondaLayout title="Funcionários" subtitle="Funcionários ativos no sistema">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, empresa ou posto..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow flex-shrink-0">
                  {f.nome_completo.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{f.nome_completo}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {f.nome_empresa && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3" />{f.nome_empresa}</span>}
                    {f.nome_posto && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{f.nome_posto}</span>}
                  </div>
                  {f.nome_cargo && <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{f.nome_cargo}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
