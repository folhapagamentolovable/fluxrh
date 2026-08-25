import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { Monitor, User, MapPin, Clock, Shield, RefreshCw, Filter, Building2 } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatarHora } from './utils/rondaUtils';

export default function RondaMonitoramento() {
  const [execucoes, setExecucoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');

  useEffect(() => {
    loadExecucoes();
    const interval = setInterval(loadExecucoes, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadExecucoes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rq_execucoes')
      .select('*, funcionarios(nome_completo, nome_posto, nome_empresa)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setExecucoes(data);
    setLoading(false);
  };

  return (
    <RondaLayout title="Monitoramento" subtitle="Acompanhe as rondas em tempo real">
      {/* Refresh button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          {/* Future: filters */}
        </div>
        <button
          onClick={loadExecucoes}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {execucoes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Monitor className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhuma ronda registrada</p>
          <p className="text-slate-500 dark:text-slate-400 mt-1">As rondas aparecerão aqui quando forem iniciadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {execucoes.map(exec => (
            <div
              key={exec.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  exec.status === 'em_andamento' ? 'bg-blue-500 animate-pulse' :
                  exec.status === 'concluida' ? 'bg-green-500' :
                  exec.status === 'incompleta' ? 'bg-orange-500' :
                  'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {exec.funcionarios?.nome_completo || 'Funcionário'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${getStatusColor(exec.status)}`}>
                      {getStatusLabel(exec.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {exec.funcionarios?.nome_empresa || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {exec.funcionarios?.nome_posto || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exec.iniciada_em ? new Date(exec.iniciada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                    <span>
                      {exec.total_pontos_lidos}/{exec.total_pontos_esperados} pontos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
