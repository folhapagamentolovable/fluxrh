import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

interface Funcionario {
  id: string;
  nome_completo: string;
  nome_empresa: string | null;
  nome_posto: string | null;
  posto_trabalho_id: string | null;
  empresa_id: string | null;
  ativo: boolean | null;
  cargo_id: string | null;
  nome_cargo: string | null;
  foto_url: string | null;
  ronda: boolean | null;
}

export default function RondaSelecao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = async () => {
    setLoading(true);
    
    // First, find the logged-in user's employee record to get their posto
    let postoId: string | null = null;
    if (user) {
      const { data: myEmployee } = await supabase
        .from('funcionarios')
        .select('posto_trabalho_id')
        .eq('user_id', user.id)
        .maybeSingle();
      postoId = myEmployee?.posto_trabalho_id || null;
    }

    // Query only employees marked as ronda=true
    let query = supabase
      .from('funcionarios')
      .select('id, nome_completo, nome_empresa, nome_posto, posto_trabalho_id, empresa_id, ativo, cargo_id, nome_cargo, foto_url, ronda')
      .eq('ativo', true)
      .eq('ronda', true)
      .order('nome_completo');
    
    // Filter by same posto if the logged-in user has one
    if (postoId) {
      query = query.eq('posto_trabalho_id', postoId);
    }

    const { data, error } = await query;
    if (!error && data) setFuncionarios(data);
    setLoading(false);
  };

  const filteredFuncionarios = funcionarios.filter(f =>
    f.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    (f.nome_empresa?.toLowerCase().includes(search.toLowerCase())) ||
    (f.nome_posto?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (func: Funcionario) => {
    setSelectedId(func.id);
    // Store selected employee in sessionStorage
    sessionStorage.setItem('ronda_funcionario', JSON.stringify({
      id: func.id,
      nome: func.nome_completo,
      empresa: func.nome_empresa,
      posto: func.nome_posto,
      postoId: func.posto_trabalho_id,
      empresaId: func.empresa_id,
    }));
    navigate('/ronda-qr/execucao');
  };

  return (
    <RondaLayout title="Seleção de Funcionário" subtitle="Selecione o funcionário para iniciar a ronda">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, empresa ou posto..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Carregando funcionários...</p>
        </div>
      ) : filteredFuncionarios.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredFuncionarios.map(func => (
            <button
              key={func.id}
              onClick={() => handleSelect(func)}
              className={`w-full text-left p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group
                ${selectedId === func.id
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow flex-shrink-0">
                  {func.nome_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {func.nome_completo}
                  </p>
                  {func.nome_empresa && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{func.nome_empresa}</span>
                    </div>
                  )}
                  {func.nome_posto && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{func.nome_posto}</span>
                    </div>
                  )}
                  {func.nome_cargo && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                      {func.nome_cargo}
                    </span>
                  )}
                </div>
                {selectedId === func.id && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
